/**
 * Wordle Player Handler
 *
 * Handles player lifecycle: join, disconnect, reconnect, grace period.
 * Extracted from WordleRoomManager for modularity.
 */

import { WebSocket } from 'ws';
import {
  WordleRoom,
  WordlePlayer,
  getConnectedPlayers,
  getConnectedPlayerCount,
} from './wordle-room-types';
import { clearCountdown, stopTimerSync } from '../services/wordle-timer';
import { GRACE_PERIOD } from '../constants/wordle-constants';

/**
 * Dependencies injected from the coordinator
 */
export interface PlayerHandlerDeps {
  rooms: Map<string, WordleRoom>;
  socketToPlayer: Map<WebSocket, string>;
  playerToRoom: Map<string, string>;
  lobbySubscribers: Set<WebSocket>;
  send: (socket: WebSocket | null, msg: object) => void;
  broadcastToRoom: (roomCode: string, msg: object, excludeId?: string) => void;
  broadcastPublicRoomsList: () => void;
  endGame: (room: WordleRoom) => Promise<void>;
}

/**
 * Manages player lifecycle: disconnect, reconnect, leave, grace period
 */
export class WordlePlayerHandler {
  private rooms: Map<string, WordleRoom>;
  private socketToPlayer: Map<WebSocket, string>;
  private playerToRoom: Map<string, string>;
  private lobbySubscribers: Set<WebSocket>;
  private send: (socket: WebSocket | null, msg: object) => void;
  private broadcastToRoom: (roomCode: string, msg: object, excludeId?: string) => void;
  private broadcastPublicRoomsList: () => void;
  private endGame: (room: WordleRoom) => Promise<void>;

  constructor(deps: PlayerHandlerDeps) {
    this.rooms = deps.rooms;
    this.socketToPlayer = deps.socketToPlayer;
    this.playerToRoom = deps.playerToRoom;
    this.lobbySubscribers = deps.lobbySubscribers;
    this.send = deps.send;
    this.broadcastToRoom = deps.broadcastToRoom;
    this.broadcastPublicRoomsList = deps.broadcastPublicRoomsList;
    this.endGame = deps.endGame;
  }

  // ===========================================================================
  // Grace Period System
  // ===========================================================================

  /**
   * Get the appropriate grace period based on room state
   *
   * Longer grace periods for low-urgency states (waiting room),
   * shorter for time-sensitive states (active game).
   */
  getGracePeriod(room: WordleRoom): number {
    // Solo games get shorter grace period (only affects the solo player)
    if (room.isSolo) {
      return GRACE_PERIOD.SOLO_MS;
    }

    switch (room.gameState) {
      case 'waiting':
        return GRACE_PERIOD.WAITING_MS;
      case 'selecting':
        // Selection phase is time-sensitive (30s timeout), use shorter grace
        return GRACE_PERIOD.PLAYING_MS;
      case 'playing':
        return GRACE_PERIOD.PLAYING_MS;
      case 'finished':
        return GRACE_PERIOD.RESULTS_MS;
      default:
        return GRACE_PERIOD.DEFAULT_MS;
    }
  }

  /**
   * Permanently remove a player after their grace period expires
   *
   * This contains the logic that was previously executed immediately
   * in handleDisconnect. Now it only runs after the grace period.
   */
  removePlayerPermanently(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`[Wordle] Room ${roomCode} already deleted, skipping removal of ${playerId}`);
      return;
    }

    const player = room.players.get(playerId);
    if (!player) {
      console.log(`[Wordle] Player ${playerId} already removed from ${roomCode}`);
      return;
    }

    // If player reconnected, they won't be in disconnected state
    if (player.connectionState === 'connected') {
      console.log(`[Wordle] Player ${player.name} reconnected, skipping removal`);
      return;
    }

    // Clear any pending timer (safety check)
    if (player.reconnectTimer) {
      clearTimeout(player.reconnectTimer);
      player.reconnectTimer = null;
    }

    const wasCreator = player.isCreator;
    const playerName = player.name;

    // Now actually remove the player
    room.players.delete(playerId);
    this.playerToRoom.delete(playerId);

    console.log(
      `[Wordle] ${playerName} permanently removed from ${roomCode} (grace period expired)`
    );

    // If room is empty, delete it
    if (room.players.size === 0) {
      clearCountdown(room.countdownTimer);
      room.countdownTimer = null;
      stopTimerSync(room.timerInterval);
      room.timerInterval = null;
      // Clear selection timer (sabotage mode)
      if (room.selectionTimer) {
        clearTimeout(room.selectionTimer);
        room.selectionTimer = null;
      }
      this.rooms.delete(roomCode);
      // Update lobby (room removed)
      this.broadcastPublicRoomsList();
      console.log(`[Wordle] Room ${roomCode} deleted (empty)`);
      return;
    }

    // If creator left, assign new creator (prefer connected players)
    if (wasCreator) {
      const connectedPlayers = getConnectedPlayers(room);
      const newCreator =
        connectedPlayers.length > 0 ? connectedPlayers[0] : room.players.values().next().value;

      if (newCreator) {
        newCreator.isCreator = true;
        room.creatorId = newCreator.id;
        if (newCreator.socket && newCreator.connectionState === 'connected') {
          this.send(newCreator.socket, { type: 'becameCreator' });
        }
        console.log(`[Wordle] ${newCreator.name} is now host of ${roomCode}`);
      }
    }

    // Notify remaining connected players that player has left
    this.broadcastToRoom(roomCode, { type: 'playerLeft', playerId });

    // Update lobby (player count changed)
    this.broadcastPublicRoomsList();

    // Check if game should end (only connected players count for active games)
    if (room.gameState === 'playing') {
      const connectedCount = getConnectedPlayerCount(room);
      if (connectedCount <= 1) {
        console.log(`[Wordle] Only ${connectedCount} connected player(s) left, ending game`);
        this.endGame(room);
      }
    }
  }

  /**
   * Force close a room immediately
   *
   * Used when the last connected player voluntarily leaves and there are
   * only disconnected players in grace period remaining.
   * Clears all grace period timers and deletes the room.
   */
  forceCloseRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    // Clear all grace period timers for remaining players
    for (const player of room.players.values()) {
      if (player.reconnectTimer) {
        clearTimeout(player.reconnectTimer);
        player.reconnectTimer = null;
      }
      // Clean up player-to-room mapping
      this.playerToRoom.delete(player.id);
    }

    // Clean up room timers
    clearCountdown(room.countdownTimer);
    room.countdownTimer = null;
    stopTimerSync(room.timerInterval);
    room.timerInterval = null;
    // Clear selection timer (sabotage mode)
    if (room.selectionTimer) {
      clearTimeout(room.selectionTimer);
      room.selectionTimer = null;
    }

    // Delete the room
    this.rooms.delete(roomCode);

    // Update lobby
    this.broadcastPublicRoomsList();

    console.log(`[Wordle] Room ${roomCode} force closed (no connected players)`);
  }

  /**
   * Handle host closing the room
   *
   * Only the room creator can close the room. All players are notified
   * and kicked back to the lobby immediately.
   */
  handleCloseRoom(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) {
      this.send(socket, { type: 'error', message: 'Not in a room' });
      return;
    }

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) {
      this.send(socket, { type: 'error', message: 'Not in a room' });
      return;
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.send(socket, { type: 'error', message: 'Room not found' });
      return;
    }

    const player = room.players.get(playerId);
    if (!player) {
      this.send(socket, { type: 'error', message: 'Player not found' });
      return;
    }

    // Only the host can close the room
    if (!player.isCreator) {
      this.send(socket, { type: 'error', message: 'Only the host can close the room' });
      return;
    }

    console.log(`[Wordle] Host ${player.name} closing room ${roomCode}`);

    // Notify all players that the room was closed by host
    this.broadcastToRoom(roomCode, {
      type: 'roomClosed',
      reason: 'hostClosed',
      message: 'The host closed the room',
    });

    // Clean up socket mappings for all players
    for (const p of room.players.values()) {
      this.socketToPlayer.delete(p.socket!);
      this.playerToRoom.delete(p.id);
    }

    // Force close the room
    this.forceCloseRoom(roomCode);
  }

  // ===========================================================================
  // Leave and Disconnect
  // ===========================================================================

  /**
   * Handle voluntary leave - player explicitly wants to leave the room
   *
   * Unlike disconnect (which has a grace period), voluntary leave is immediate.
   * For daily challenges, we send back the current progress so the client
   * can save it to localStorage for potential resumption.
   */
  handleLeaveRoom(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) {
      this.send(socket, { type: 'error', message: 'Not in a room' });
      return;
    }

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) {
      this.send(socket, { type: 'error', message: 'Not in a room' });
      return;
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.send(socket, { type: 'error', message: 'Room not found' });
      return;
    }

    const player = room.players.get(playerId);
    if (!player) {
      this.send(socket, { type: 'error', message: 'Player not found' });
      return;
    }

    // For daily challenges, send progress so client can save for resumption
    const progress =
      room.isDailyChallenge && player.guesses.length > 0
        ? {
            dailyNumber: room.dailyNumber,
            guesses: player.guesses,
            guessResults: player.guessResults,
            elapsedMs: room.startTime ? Date.now() - room.startTime : 0,
          }
        : null;

    // Send confirmation with any progress data
    this.send(socket, {
      type: 'leftRoom',
      roomCode,
      progress,
    });

    console.log(
      `[Wordle] ${player.name} voluntarily left ${roomCode}` +
        (progress ? ` (${progress.guesses.length} guesses saved)` : '')
    );

    // Clear any reconnect timer (in case they were in grace period)
    if (player.reconnectTimer) {
      clearTimeout(player.reconnectTimer);
      player.reconnectTimer = null;
    }

    // Remove player immediately (no grace period for voluntary leave)
    this.removePlayerPermanently(roomCode, playerId);

    // Force close room if no connected players remain
    const roomAfterLeave = this.rooms.get(roomCode);
    if (roomAfterLeave && getConnectedPlayerCount(roomAfterLeave) === 0) {
      console.log(
        `[Wordle] Room ${roomCode} has no connected players after voluntary leave, force closing`
      );
      this.forceCloseRoom(roomCode);
    }
  }

  /**
   * Handle player disconnect - start grace period instead of immediate removal
   *
   * When a player disconnects (close tab, refresh, network issue), they are
   * marked as disconnected and given a grace period to reconnect. If they
   * don't reconnect within the grace period, they are permanently removed.
   */
  handleDisconnect(socket: WebSocket): void {
    // Clean up lobby subscription if any
    this.lobbySubscribers.delete(socket);

    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player) return;

    // If player is already disconnected, this is a duplicate close event
    if (player.connectionState === 'disconnected') {
      console.log(`[Wordle] Ignoring duplicate disconnect for ${player.name}`);
      return;
    }

    // Mark as disconnected instead of removing immediately
    player.socket = null;
    player.connectionState = 'disconnected';
    player.disconnectedAt = Date.now();

    // Clean up socket mapping (socket is gone, but player persists)
    this.socketToPlayer.delete(socket);

    // Determine grace period based on game state
    const gracePeriod = this.getGracePeriod(room);

    // Start reconnect timer - player will be removed after grace period
    player.reconnectTimer = setTimeout(() => {
      this.removePlayerPermanently(roomCode, playerId);
    }, gracePeriod);

    console.log(
      `[Wordle] ${player.name} disconnected from ${roomCode}, grace period: ${gracePeriod / 1000}s`
    );

    // Notify connected players that this player disconnected
    this.broadcastToRoom(roomCode, {
      type: 'playerDisconnected',
      playerId,
      playerName: player.name,
      gracePeriodSeconds: gracePeriod / 1000,
    });
  }

  // ===========================================================================
  // Reconnection
  // ===========================================================================

  /**
   * Handle a player attempting to rejoin after disconnect
   *
   * This is called when a client reconnects and has stored session data
   * from a previous connection. The client sends their old playerId and
   * roomCode, and we try to restore their connection.
   */
  handleRejoin(socket: WebSocket, roomCode: string, playerId: string): void {
    // Validate inputs
    if (!roomCode || !playerId) {
      this.send(socket, {
        type: 'rejoinFailed',
        reason: 'invalidParams',
        message: 'Missing room code or player ID',
      });
      return;
    }

    const room = this.rooms.get(roomCode.toUpperCase());

    // Room doesn't exist (deleted, game ended, etc.)
    if (!room) {
      this.send(socket, {
        type: 'rejoinFailed',
        reason: 'roomNotFound',
        message: 'Room no longer exists',
      });
      console.log(`[Wordle] Rejoin failed: room ${roomCode} not found`);
      return;
    }

    const player = room.players.get(playerId);

    // Player not in room (grace period expired, never joined, etc.)
    if (!player) {
      this.send(socket, {
        type: 'rejoinFailed',
        reason: 'playerNotFound',
        message: 'You are no longer in this room',
      });
      console.log(`[Wordle] Rejoin failed: player ${playerId} not in room ${roomCode}`);
      return;
    }

    // Player is already connected (duplicate tab scenario)
    if (player.connectionState === 'connected' && player.socket) {
      // Close the old connection, take over with the new one
      this.send(player.socket, {
        type: 'replacedByNewConnection',
        message: 'Connected from another tab',
      });
      try {
        player.socket.close();
      } catch {
        // Socket may already be closed
      }
      console.log(`[Wordle] ${player.name} reconnecting, closing old connection`);
    }

    // Cancel the removal timer if one is pending
    if (player.reconnectTimer) {
      clearTimeout(player.reconnectTimer);
      player.reconnectTimer = null;
    }

    // Restore the connection
    player.socket = socket;
    player.connectionState = 'connected';
    player.disconnectedAt = null;
    this.socketToPlayer.set(socket, playerId);

    console.log(`[Wordle] ${player.name} reconnected to ${roomCode}`);

    // Send appropriate state based on game phase
    this.sendRejoinState(socket, room, player);

    // Notify other players
    this.broadcastToRoom(
      roomCode,
      {
        type: 'playerReconnected',
        playerId,
        playerName: player.name,
      },
      playerId
    );
  }

  /**
   * Send the appropriate room/game state to a rejoining player
   */
  private sendRejoinState(socket: WebSocket, room: WordleRoom, player: WordlePlayer): void {
    const players = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isCreator: p.isCreator,
      isReady: p.isReady,
      connectionState: p.connectionState,
    }));

    switch (room.gameState) {
      case 'waiting':
        this.send(socket, {
          type: 'rejoinWaiting',
          roomCode: room.code,
          playerId: player.id,
          isCreator: player.isCreator,
          gameMode: room.gameMode,
          wordMode: room.wordMode,
          dailyNumber: room.dailyNumber,
          players,
          isReady: player.isReady,
        });
        break;

      case 'selecting': {
        // Rejoin during sabotage word selection phase
        const hasSubmitted = room.wordAssignments?.has(
          room.pickerAssignments?.get(player.id) || ''
        );
        const submittedCount = room.wordAssignments?.size || 0;
        const timeRemaining = room.selectionDeadline
          ? Math.max(0, room.selectionDeadline - Date.now())
          : 0;

        this.send(socket, {
          type: 'rejoinSelecting',
          roomCode: room.code,
          playerId: player.id,
          deadline: room.selectionDeadline,
          timeRemaining,
          hasSubmitted: !!hasSubmitted,
          submittedCount,
          totalPlayers: room.players.size,
        });
        break;
      }

      case 'playing':
        // Send full game state so player can resume
        this.send(socket, {
          type: 'rejoinGame',
          roomCode: room.code,
          playerId: player.id,
          wordLength: room.word?.length || 5,
          gameMode: room.gameMode,
          // Player's own state
          guesses: player.guesses,
          guessResults: player.guessResults,
          isFinished: player.isFinished,
          won: player.won,
          // Timer info
          gameStartTime: room.startTime,
          playerFinishTime: player.finishTime,
          // Opponent state (colors only, not words)
          opponents: Array.from(room.players.values())
            .filter((p) => p.id !== player.id)
            .map((p) => ({
              id: p.id,
              name: p.name,
              guessResults: p.guessResults,
              guessCount: p.guesses.length,
              isFinished: p.isFinished,
              won: p.won,
              connectionState: p.connectionState,
            })),
        });
        break;

      case 'finished':
        // Send results
        const results = Array.from(room.players.values())
          .map((p) => ({
            playerId: p.id,
            name: p.name,
            won: p.won,
            guesses: p.guesses.length,
            time: p.finishTime || 0,
            score: p.score,
          }))
          .sort((a, b) => {
            if (a.won !== b.won) return a.won ? -1 : 1;
            if (a.guesses !== b.guesses) return a.guesses - b.guesses;
            return a.time - b.time;
          });

        this.send(socket, {
          type: 'rejoinResults',
          roomCode: room.code,
          word: room.word,
          results,
          gameMode: room.gameMode,
        });
        break;
    }
  }
}
