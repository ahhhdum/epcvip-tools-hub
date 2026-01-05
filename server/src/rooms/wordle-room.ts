/**
 * Wordle Battle Room Manager (Coordinator)
 *
 * Thin coordinator that owns the data maps and delegates to focused handlers:
 * - WordleLobbyManager: Public room listing and subscriptions
 * - WordleGameController: Game lifecycle (ready, start, guess, end)
 * - WordlePlayerHandler: Player lifecycle (disconnect, reconnect, leave)
 */

import { WebSocket } from 'ws';
import { generateUniqueRoomCode } from '../utils/room-codes';
import { getDailyNumber } from '../utils/daily-word';

// Types
import {
  GameMode,
  GameState,
  WordlePlayer,
  WordleRoom,
  PublicRoomInfo,
  WordMode,
  LetterResult,
} from './wordle-room-types';

// Modular managers
import { WordleLobbyManager } from './wordle-lobby-manager';
import { WordleGameController } from './wordle-game-controller';
import { WordlePlayerHandler } from './wordle-player-handler';

// Constants
import {
  MAX_PLAYERS_PER_ROOM,
  PLAYER_ID_PREFIX,
  SOLO_START_DELAY_MS,
} from '../constants/wordle-constants';

// Services
import { hasCompletedDailyChallenge } from '../services/wordle-database';

// Re-export types for consumers
export type { LetterResult, GameMode, GameState, WordlePlayer, WordleRoom, PublicRoomInfo };

// Player counter for unique IDs
let playerCounter = 0;

/**
 * Generate a unique player ID
 */
function generatePlayerId(): string {
  return `${PLAYER_ID_PREFIX}${++playerCounter}_${Date.now()}`;
}

/**
 * Wordle Room Manager
 */
export class WordleRoomManager {
  private rooms: Map<string, WordleRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private socketToPlayer: Map<WebSocket, string> = new Map();
  private lobbySubscribers: Set<WebSocket> = new Set();

  // Modular managers
  private lobbyManager: WordleLobbyManager;
  private gameController: WordleGameController;
  private playerHandler: WordlePlayerHandler;

  constructor() {
    this.lobbyManager = new WordleLobbyManager(this.rooms, this.lobbySubscribers);
    this.gameController = new WordleGameController({
      rooms: this.rooms,
      socketToPlayer: this.socketToPlayer,
      playerToRoom: this.playerToRoom,
      send: this.send.bind(this),
      broadcastToRoom: this.broadcastToRoom.bind(this),
      broadcastPublicRoomsList: this.broadcastPublicRoomsList.bind(this),
    });
    this.playerHandler = new WordlePlayerHandler({
      rooms: this.rooms,
      socketToPlayer: this.socketToPlayer,
      playerToRoom: this.playerToRoom,
      lobbySubscribers: this.lobbySubscribers,
      send: this.send.bind(this),
      broadcastToRoom: this.broadcastToRoom.bind(this),
      broadcastPublicRoomsList: this.broadcastPublicRoomsList.bind(this),
      endGame: this.gameController.endGame.bind(this.gameController),
    });
  }

  /**
   * Create a new room
   */
  createRoom(
    socket: WebSocket,
    playerName: string,
    playerEmail?: string,
    isPublic: boolean = true,
    gameMode: GameMode = 'casual',
    wordMode: WordMode = 'daily'
  ): { roomCode: string; playerId: string } | null {
    const existingCodes = new Set(this.rooms.keys());
    const roomCode = generateUniqueRoomCode(existingCodes);

    if (!roomCode) {
      this.send(socket, { type: 'error', message: 'Failed to create room. Please try again.' });
      return null;
    }

    const playerId = generatePlayerId();

    const player: WordlePlayer = {
      id: playerId,
      name: playerName || 'Player',
      email: playerEmail || null,
      isCreator: true,
      isReady: false,

      // Connection state
      socket,
      connectionState: 'connected',
      disconnectedAt: null,
      reconnectTimer: null,

      // Game state
      guesses: [],
      guessResults: [],
      isFinished: false,
      won: false,
      finishTime: null,
      score: 0,
      lastGuessTime: null,
    };

    const room: WordleRoom = {
      code: roomCode,
      players: new Map([[playerId, player]]),
      gameState: 'waiting',
      gameMode,
      wordMode,
      word: null,
      startTime: null,
      creatorId: playerId,
      countdownTimer: null,
      timerInterval: null,
      isDailyChallenge: wordMode === 'daily',
      dailyNumber: wordMode === 'daily' ? getDailyNumber() : null,
      isSolo: false,
      gameId: null,
      isPublic, // Visible in lobby (default true)
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);
    this.socketToPlayer.set(socket, playerId);

    this.send(socket, {
      type: 'roomCreated',
      roomCode,
      playerId,
      gameMode,
      wordMode,
      dailyNumber: room.dailyNumber,
      isPublic,
    });

    // Notify lobby subscribers about new room
    this.broadcastPublicRoomsList();

    console.log(`[Wordle] Room ${roomCode} created by ${playerName}`);
    return { roomCode, playerId };
  }

  /**
   * Create a daily challenge room (auth required, checks completion)
   * @param dailyNumber The daily challenge number (can be today's or historical)
   * @param solo If true, start game immediately without waiting for other players
   */
  async createDailyChallengeRoom(
    socket: WebSocket,
    playerName: string,
    playerEmail: string | undefined,
    dailyNumber: number,
    solo: boolean = false
  ): Promise<{ roomCode: string; playerId: string } | null> {
    // Verify email provided (auth required for daily challenge)
    if (!playerEmail) {
      this.send(socket, { type: 'error', message: 'Login required for Daily Challenge' });
      return null;
    }

    // Validate daily number is in valid range
    const currentDailyNumber = getDailyNumber();
    if (dailyNumber < 1 || dailyNumber > currentDailyNumber) {
      this.send(socket, { type: 'error', message: 'Invalid daily number' });
      return null;
    }

    const isHistorical = dailyNumber < currentDailyNumber;

    // Check if already completed this daily
    const alreadyCompleted = await hasCompletedDailyChallenge(playerEmail, dailyNumber);
    if (alreadyCompleted) {
      const message = isHistorical
        ? `You've already completed Daily #${dailyNumber}`
        : "You've already completed today's Daily Challenge";
      this.send(socket, { type: 'error', message });
      return null;
    }

    // Create room with daily challenge settings locked
    const result = this.createRoom(socket, playerName, playerEmail);
    if (result) {
      const room = this.rooms.get(result.roomCode);
      if (room) {
        room.isDailyChallenge = true;
        room.dailyNumber = dailyNumber;
        room.wordMode = 'daily';
        room.isSolo = solo;
        const dailyType = isHistorical ? `Historical #${dailyNumber}` : `Today's #${dailyNumber}`;
        console.log(
          `[DAILY] ${solo ? 'Solo' : 'Multiplayer'} room ${result.roomCode} created by ${playerName} (${dailyType})`
        );

        // For solo mode: immediately start countdown
        if (solo) {
          console.log(`[DAILY] Solo mode - starting countdown immediately for ${playerEmail}`);
          // Send roomJoined with isSolo flag so client knows to expect countdown
          this.send(socket, {
            type: 'roomJoined',
            roomCode: result.roomCode,
            playerId: result.playerId,
            isHost: true,
            players: [{ id: result.playerId, name: playerName, isReady: true, isCreator: true }],
            gameMode: room.gameMode,
            wordMode: room.wordMode,
            dailyNumber: dailyNumber,
            isSolo: true,
          });
          // Start countdown after a brief delay to let client receive roomJoined
          setTimeout(() => this.gameController.startCountdown(room), SOLO_START_DELAY_MS);
        }
      }
    }
    return result;
  }

  /**
   * Join an existing room
   */
  joinRoom(socket: WebSocket, roomCode: string, playerName: string, playerEmail?: string): boolean {
    const room = this.rooms.get(roomCode.toUpperCase());

    if (!room) {
      this.send(socket, { type: 'error', message: 'Room not found.' });
      return false;
    }

    if (room.gameState !== 'waiting') {
      this.send(socket, { type: 'error', message: 'Game already in progress.' });
      return false;
    }

    if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
      this.send(socket, {
        type: 'error',
        message: `Room is full (max ${MAX_PLAYERS_PER_ROOM} players).`,
      });
      return false;
    }

    // BUG-001 FIX: Check if player with same email already exists in room
    // This prevents duplicate player entries during grace period
    if (playerEmail) {
      const existingPlayer = Array.from(room.players.values()).find((p) => p.email === playerEmail);
      if (existingPlayer) {
        console.log(`[Wordle] ${playerEmail} already in room ${roomCode}, redirecting to rejoin`);
        this.handleRejoin(socket, roomCode, existingPlayer.id);
        return true; // Handled via rejoin flow
      }
    }

    const playerId = generatePlayerId();

    const player: WordlePlayer = {
      id: playerId,
      name: playerName || 'Player',
      email: playerEmail || null,
      isCreator: false,
      isReady: false,

      // Connection state
      socket,
      connectionState: 'connected',
      disconnectedAt: null,
      reconnectTimer: null,

      // Game state
      guesses: [],
      guessResults: [],
      isFinished: false,
      won: false,
      finishTime: null,
      score: 0,
      lastGuessTime: null,
    };

    room.players.set(playerId, player);
    this.playerToRoom.set(playerId, room.code);
    this.socketToPlayer.set(socket, playerId);

    // Send room state to the joining player
    const players = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isCreator: p.isCreator,
      isReady: p.isReady,
    }));

    this.send(socket, {
      type: 'roomJoined',
      roomCode: room.code,
      playerId,
      players,
      isCreator: false,
      gameState: room.gameState,
      gameMode: room.gameMode,
      wordMode: room.wordMode,
    });

    // Notify other players
    this.broadcastToRoom(
      room.code,
      {
        type: 'playerJoined',
        player: { id: playerId, name: player.name, isCreator: false, isReady: false },
      },
      playerId
    );

    // Update lobby (player count changed)
    this.broadcastPublicRoomsList();

    console.log(`[Wordle] ${playerName} joined room ${roomCode}`);
    return true;
  }

  // ===========================================================================
  // Connection Management (Delegated to PlayerHandler)
  // ===========================================================================

  /**
   * Handle voluntary leave - player explicitly wants to leave the room
   */
  handleLeaveRoom(socket: WebSocket): void {
    this.playerHandler.handleLeaveRoom(socket);
  }

  /**
   * Handle player disconnect - start grace period instead of immediate removal
   */
  handleDisconnect(socket: WebSocket): void {
    this.playerHandler.handleDisconnect(socket);
  }

  /**
   * Set game mode
   */
  setGameMode(socket: WebSocket, mode: GameMode): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player?.isCreator) {
      this.send(socket, { type: 'error', message: 'Only the room creator can change settings.' });
      return;
    }

    room.gameMode = mode;
    this.broadcastToRoom(roomCode, { type: 'gameModeChanged', mode });
  }

  /**
   * Set word mode (daily or random)
   */
  setWordMode(socket: WebSocket, mode: WordMode): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player?.isCreator) {
      this.send(socket, { type: 'error', message: 'Only the room creator can change settings.' });
      return;
    }

    room.wordMode = mode;
    this.broadcastToRoom(roomCode, {
      type: 'wordModeChanged',
      mode,
      dailyNumber: mode === 'daily' ? getDailyNumber() : null,
    });
  }

  // ===========================================================================
  // Game Flow (Delegated to GameController)
  // ===========================================================================

  /**
   * Set player ready status
   */
  setReady(socket: WebSocket, ready: boolean): void {
    this.gameController.setReady(socket, ready);
  }

  /**
   * Start the game (initiates countdown)
   */
  startGame(socket: WebSocket): void {
    this.gameController.startGame(socket);
  }

  /**
   * Handle a guess
   */
  async handleGuess(socket: WebSocket, word: string, forced: boolean = false): Promise<void> {
    await this.gameController.handleGuess(socket, word, forced);
  }

  /**
   * Handle play again request
   */
  handlePlayAgain(socket: WebSocket): void {
    this.gameController.handlePlayAgain(socket);
  }

  // ===========================================================================
  // Reconnection (Delegated to PlayerHandler)
  // ===========================================================================

  /**
   * Handle a player attempting to rejoin after disconnect
   */
  handleRejoin(socket: WebSocket, roomCode: string, playerId: string): void {
    this.playerHandler.handleRejoin(socket, roomCode, playerId);
  }

  /**
   * Handle incoming message
   */
  handleMessage(socket: WebSocket, data: string): void {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'createRoom':
          this.createRoom(
            socket,
            msg.playerName,
            msg.playerEmail,
            msg.isPublic ?? true,
            msg.gameMode ?? 'casual',
            msg.wordMode ?? 'daily'
          );
          break;
        case 'subscribeLobby':
          this.subscribeLobby(socket);
          break;
        case 'unsubscribeLobby':
          this.unsubscribeLobby(socket);
          break;
        case 'setRoomVisibility':
          this.setRoomVisibility(socket, msg.isPublic);
          break;
        case 'createDailyChallenge':
          this.createDailyChallengeRoom(
            socket,
            msg.playerName,
            msg.playerEmail,
            msg.dailyNumber,
            msg.solo ?? false
          );
          break;
        case 'joinRoom':
          this.joinRoom(socket, msg.roomCode, msg.playerName, msg.playerEmail);
          break;
        case 'setGameMode':
          this.setGameMode(socket, msg.mode);
          break;
        case 'setWordMode':
          this.setWordMode(socket, msg.mode);
          break;
        case 'setReady':
          this.setReady(socket, msg.ready);
          break;
        case 'startGame':
          this.startGame(socket);
          break;
        case 'guess':
          this.handleGuess(socket, msg.word, msg.forced || false);
          break;
        case 'playAgain':
          this.handlePlayAgain(socket);
          break;
        case 'rejoin':
          this.handleRejoin(socket, msg.roomCode, msg.playerId);
          break;
        case 'leaveRoom':
          this.handleLeaveRoom(socket);
          break;
        default:
          console.log(`[Wordle] Unknown message type: ${msg.type}`);
      }
    } catch (e) {
      console.error('[Wordle] Error handling message:', e);
    }
  }

  /**
   * Send a message to a socket
   *
   * Safely handles null sockets (disconnected players).
   */
  private send(socket: WebSocket | null, msg: object): void {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }

  /**
   * Broadcast a message to all CONNECTED players in a room
   *
   * Only sends to players who are currently connected (not in grace period).
   */
  private broadcastToRoom(roomCode: string, msg: object, excludeId?: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const data = JSON.stringify(msg);
    for (const player of room.players.values()) {
      // Only send to connected players with open sockets
      if (
        player.id !== excludeId &&
        player.connectionState === 'connected' &&
        player.socket &&
        player.socket.readyState === WebSocket.OPEN
      ) {
        player.socket.send(data);
      }
    }
  }

  // ===========================================================================
  // Lobby / Public Rooms (Delegated to LobbyManager)
  // ===========================================================================

  /**
   * Subscribe a socket to lobby updates (public room list)
   */
  subscribeLobby(socket: WebSocket): void {
    this.lobbyManager.subscribeLobby(socket);
  }

  /**
   * Unsubscribe a socket from lobby updates
   */
  unsubscribeLobby(socket: WebSocket): void {
    this.lobbyManager.unsubscribeLobby(socket);
  }

  /**
   * Broadcast public rooms list to all lobby subscribers
   */
  broadcastPublicRoomsList(): void {
    this.lobbyManager.broadcastPublicRoomsList();
  }

  /**
   * Set room visibility (public/private) - creator only
   */
  setRoomVisibility(socket: WebSocket, isPublic: boolean): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player?.isCreator) {
      this.send(socket, { type: 'error', message: 'Only the room creator can change visibility.' });
      return;
    }

    room.isPublic = isPublic;

    // Notify room members
    this.broadcastToRoom(roomCode, { type: 'roomVisibilityChanged', isPublic });

    // Update lobby subscribers
    this.broadcastPublicRoomsList();

    console.log(
      `[Wordle] Room ${roomCode} visibility changed to ${isPublic ? 'public' : 'private'}`
    );
  }
}
