/**
 * Wordle Battle Room Manager
 *
 * Handles room creation, player management, and game logic.
 * Refactored to use modular services for validation, timing, and persistence.
 */

import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { generateUniqueRoomCode } from '../utils/room-codes';
import { getRandomWord, isValidGuess } from '../utils/word-list';
import { getDailyNumber, getDailyWordByNumber, WordMode } from '../utils/daily-word';

// Constants
import {
  MAX_GUESSES,
  MAX_PLAYERS_PER_ROOM,
  MIN_PLAYERS_FOR_MULTIPLAYER,
  PLAYER_ID_PREFIX,
  SOLO_START_DELAY_MS,
  FORCED_WORDS_LOG_FILE,
  LOGS_DIRECTORY,
  GRACE_PERIOD,
} from '../constants/wordle-constants';

// Services
import {
  validateGuess,
  isWinningResult,
  isOutOfGuesses,
  countCorrectLetters,
  calculateScore,
  normalizeGuess,
  LetterResult,
} from '../services/wordle-validator';
import {
  startCountdown,
  clearCountdown,
  startTimerSync,
  stopTimerSync,
  PlayerTimerData,
} from '../services/wordle-timer';
import {
  hasCompletedDailyChallenge,
  createGame,
  saveGuess,
  saveGameResults,
  saveDailyChallengeCompletions,
  GameResultData,
  DailyChallengePlayerData,
  GuessData,
} from '../services/wordle-database';

// Re-export LetterResult for consumers
export type { LetterResult };

// Game modes
export type GameMode = 'casual' | 'competitive';

// Game states
export type GameState = 'waiting' | 'playing' | 'finished';

// Player connection state
type ConnectionState = 'connected' | 'disconnected';

// Player in a Wordle room
interface WordlePlayer {
  id: string;
  name: string;
  email: string | null; // Email from SSO (null for guests)
  isCreator: boolean;
  isReady: boolean;

  // Connection state - enables grace period on disconnect
  socket: WebSocket | null; // null when disconnected
  connectionState: ConnectionState;
  disconnectedAt: number | null; // Timestamp when disconnected
  reconnectTimer: ReturnType<typeof setTimeout> | null; // Timer for removal

  // Game state
  guesses: string[];
  guessResults: LetterResult[][];
  isFinished: boolean;
  won: boolean;
  finishTime: number | null;
  score: number;
  lastGuessTime: number | null; // For tracking time between guesses
}

// Wordle room
interface WordleRoom {
  code: string;
  players: Map<string, WordlePlayer>;
  gameState: GameState;
  gameMode: GameMode;
  wordMode: WordMode;
  word: string | null;
  startTime: number | null;
  creatorId: string;
  countdownTimer: NodeJS.Timeout | null;
  timerInterval: NodeJS.Timeout | null;
  isDailyChallenge: boolean; // True if this is a daily challenge room
  dailyNumber: number | null; // The specific daily number (for historical dailies)
  isSolo: boolean; // True if this is a solo game (skip 2-player requirement)
  gameId: string | null; // Database game ID for tracking guesses
}

// Player counter for unique IDs
let playerCounter = 0;

/**
 * Generate a unique player ID
 */
function generatePlayerId(): string {
  return `${PLAYER_ID_PREFIX}${++playerCounter}_${Date.now()}`;
}

// =============================================================================
// Connection State Helpers
// =============================================================================

/**
 * Check if a player is currently connected
 */
function isPlayerConnected(player: WordlePlayer): boolean {
  return player.connectionState === 'connected' && player.socket !== null;
}

/**
 * Get only connected players from a room
 */
function getConnectedPlayers(room: WordleRoom): WordlePlayer[] {
  return Array.from(room.players.values()).filter(isPlayerConnected);
}

/**
 * Get count of connected players in a room
 */
function getConnectedPlayerCount(room: WordleRoom): number {
  return getConnectedPlayers(room).length;
}

/**
 * Wordle Room Manager
 */
export class WordleRoomManager {
  private rooms: Map<string, WordleRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private socketToPlayer: Map<WebSocket, string> = new Map();

  /**
   * Create a new room
   */
  createRoom(
    socket: WebSocket,
    playerName: string,
    playerEmail?: string
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
      gameMode: 'casual',
      wordMode: 'daily',
      word: null,
      startTime: null,
      creatorId: playerId,
      countdownTimer: null,
      timerInterval: null,
      isDailyChallenge: false,
      dailyNumber: null,
      isSolo: false,
      gameId: null,
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);
    this.socketToPlayer.set(socket, playerId);

    this.send(socket, {
      type: 'roomCreated',
      roomCode,
      playerId,
    });

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
          setTimeout(() => this.startCountdown(room), SOLO_START_DELAY_MS);
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

    console.log(`[Wordle] ${playerName} joined room ${roomCode}`);
    return true;
  }

  // ===========================================================================
  // Connection Management (Grace Period System)
  // ===========================================================================

  /**
   * Get the appropriate grace period based on room state
   *
   * Longer grace periods for low-urgency states (waiting room),
   * shorter for time-sensitive states (active game).
   */
  private getGracePeriod(room: WordleRoom): number {
    // Solo games get shorter grace period (only affects the solo player)
    if (room.isSolo) {
      return GRACE_PERIOD.SOLO_MS;
    }

    switch (room.gameState) {
      case 'waiting':
        return GRACE_PERIOD.WAITING_MS;
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
  private removePlayerPermanently(roomCode: string, playerId: string): void {
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
      this.rooms.delete(roomCode);
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
   * Handle player disconnect - start grace period instead of immediate removal
   *
   * When a player disconnects (close tab, refresh, network issue), they are
   * marked as disconnected and given a grace period to reconnect. If they
   * don't reconnect within the grace period, they are permanently removed.
   */
  handleDisconnect(socket: WebSocket): void {
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

  /**
   * Set player ready status
   */
  setReady(socket: WebSocket, ready: boolean): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.gameState !== 'waiting') return;

    const player = room.players.get(playerId);
    if (!player) return;

    player.isReady = ready;

    // Broadcast ready status to all players
    this.broadcastToRoom(roomCode, {
      type: 'playerReadyChanged',
      playerId,
      isReady: ready,
    });

    // Check if all connected players are ready and notify creator
    const connectedPlayers = getConnectedPlayers(room);
    const allReady = connectedPlayers.every((p) => p.isReady);
    const creator = room.players.get(room.creatorId);
    if (creator && creator.socket && creator.connectionState === 'connected') {
      this.send(creator.socket, {
        type: 'allPlayersReadyStatus',
        allReady,
      });
    }
  }

  /**
   * Start the countdown and then the game
   */
  private startCountdown(room: WordleRoom): void {
    room.countdownTimer = startCountdown({
      onTick: (count) => {
        this.broadcastToRoom(room.code, {
          type: 'countdown',
          count,
        });
      },
      onComplete: () => {
        room.countdownTimer = null;
        this.beginGame(room);
      },
    });
  }

  /**
   * Actually begin the game (after countdown)
   */
  private async beginGame(room: WordleRoom): Promise<void> {
    // Reset all players
    for (const p of room.players.values()) {
      p.guesses = [];
      p.guessResults = [];
      p.isFinished = false;
      p.won = false;
      p.finishTime = null;
      p.score = 0;
      p.lastGuessTime = null;
    }

    // Select word based on word mode
    if (room.wordMode === 'daily') {
      // Use specific daily number if set (historical), otherwise today's
      const dailyNum = room.dailyNumber ?? getDailyNumber();
      room.word = getDailyWordByNumber(dailyNum);
    } else {
      room.word = getRandomWord();
    }
    room.gameState = 'playing';
    room.startTime = Date.now();

    // Create game record in database for tracking guesses
    room.gameId = await createGame({
      roomCode: room.code,
      word: room.word!,
      gameMode: room.gameMode,
      wordMode: room.wordMode,
      dailyNumber: room.dailyNumber,
      isSolo: room.isSolo,
      playerCount: room.players.size,
      startTime: room.startTime,
    });

    const wordModeInfo =
      room.wordMode === 'daily' ? `Daily #${room.dailyNumber ?? getDailyNumber()}` : 'Random';
    console.log(`[Wordle] Game started in room ${room.code}, word: ${room.word} (${wordModeInfo})`);

    // Send game start to all players
    const players = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
    }));

    this.broadcastToRoom(room.code, {
      type: 'gameStarted',
      wordLength: 5,
      players,
      gameMode: room.gameMode,
    });

    // Start timer sync interval (broadcasts every second)
    this.startTimerSync(room);
  }

  /**
   * Start broadcasting timer updates
   *
   * Uses the timer service with snapshot pattern to prevent race conditions
   * when players disconnect during iteration.
   */
  private startTimerSync(room: WordleRoom): void {
    // Clear any existing timer
    stopTimerSync(room.timerInterval);

    room.timerInterval = startTimerSync({
      getPlayers: () => room.players,
      getStartTime: () => room.startTime,
      isPlaying: () => room.gameState === 'playing',
      onSync: (gameTime, playerTimes) => {
        this.broadcastToRoom(room.code, {
          type: 'timerSync',
          gameTime,
          playerTimes,
        });
      },
      onStop: () => {
        room.timerInterval = null;
      },
    });
  }

  /**
   * Stop timer sync
   */
  private stopRoomTimerSync(room: WordleRoom): void {
    stopTimerSync(room.timerInterval);
    room.timerInterval = null;
  }

  /**
   * Start the game (initiates countdown)
   */
  startGame(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player?.isCreator) {
      this.send(socket, { type: 'error', message: 'Only the room creator can start the game.' });
      return;
    }

    if (room.gameState !== 'waiting') {
      this.send(socket, { type: 'error', message: 'Game already started.' });
      return;
    }

    // Skip player count check for solo rooms
    if (!room.isSolo && room.players.size < MIN_PLAYERS_FOR_MULTIPLAYER) {
      this.send(socket, {
        type: 'error',
        message: `Need at least ${MIN_PLAYERS_FOR_MULTIPLAYER} players to start.`,
      });
      return;
    }

    // Check that all connected players are ready
    const connectedPlayers = getConnectedPlayers(room);
    const allReady = connectedPlayers.every((p) => p.isReady);
    if (!allReady) {
      this.send(socket, { type: 'error', message: 'All players must be ready to start.' });
      return;
    }

    console.log(`[Wordle] Starting countdown in room ${roomCode}`);

    // Start the countdown (game will begin after 3... 2... 1...)
    this.startCountdown(room);
  }

  /**
   * Handle a guess
   */
  async handleGuess(socket: WebSocket, word: string, forced: boolean = false): Promise<void> {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.gameState !== 'playing' || !room.word) return;

    const player = room.players.get(playerId);
    if (!player || player.isFinished) return;

    // Normalize and validate guess format
    const guess = normalizeGuess(word);
    if (!isValidGuess(guess)) {
      this.send(socket, { type: 'error', message: 'Invalid guess. Must be 5 letters.' });
      return;
    }

    // Log forced words for dictionary review
    if (forced) {
      this.logForcedWord(guess, player.name, player.email, roomCode);
    }

    // Check if already used all guesses
    if (isOutOfGuesses(player.guesses.length)) {
      this.send(socket, { type: 'error', message: 'No more guesses remaining.' });
      return;
    }

    // Calculate timing for this guess
    const now = Date.now();
    const elapsedMs = now - (room.startTime || now);
    const timeSinceLastMs = player.lastGuessTime ? now - player.lastGuessTime : null;

    // Validate guess against target word using validator service
    const result = validateGuess(guess, room.word);
    player.guesses.push(guess);
    player.guessResults.push(result);
    player.lastGuessTime = now;

    const isWin = isWinningResult(result);
    const isLoss = !isWin && isOutOfGuesses(player.guesses.length);

    if (isWin || isLoss) {
      player.isFinished = true;
      player.won = isWin;
      player.finishTime = Date.now() - (room.startTime || 0);

      if (isWin && room.gameMode === 'competitive') {
        player.score = calculateScore(player.guesses.length, player.finishTime);
      }
    }

    // Save guess to database (async, don't block the response)
    if (room.gameId && player.email) {
      const correctCount = countCorrectLetters(result);
      const presentCount = result.filter((r) => r === 'present').length;

      saveGuess({
        gameId: room.gameId,
        playerEmail: player.email,
        guessNumber: player.guesses.length,
        guessWord: guess,
        elapsedMs,
        timeSinceLastMs,
        letterResults: result,
        correctCount,
        presentCount,
        isWinningGuess: isWin,
      }).catch((err) => {
        console.error('[Wordle] Failed to save guess:', err);
      });
    }

    // Send result to the guesser
    this.send(socket, {
      type: 'guessResult',
      word: guess,
      result,
      guessNumber: player.guesses.length,
      isWin,
      isLoss,
    });

    // Count greens for progress indicator
    const greenCount = countCorrectLetters(result);

    // Broadcast progress to other players (colors only, not letters)
    this.broadcastToRoom(
      roomCode,
      {
        type: 'opponentGuess',
        playerId,
        rowIndex: player.guesses.length - 1,
        colors: result,
        guessCount: player.guesses.length,
        greenCount,
        isFinished: player.isFinished,
        won: player.won,
      },
      playerId
    );

    // Check if game should end
    // Disconnected players count as "finished" (they can't guess anymore)
    const allFinished = Array.from(room.players.values()).every(
      (p) => p.isFinished || p.connectionState === 'disconnected'
    );
    if (allFinished) {
      this.endGame(room);
    }
  }

  /**
   * Log a forced word for dictionary review
   */
  private logForcedWord(
    word: string,
    playerName: string,
    playerEmail: string | null,
    roomCode: string
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      word,
      player: playerName,
      playerEmail,
      roomCode,
    };

    // Ensure logs directory exists
    const logsDir = path.join(__dirname, `../../${LOGS_DIRECTORY}`);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Append to JSONL file
    const logPath = path.join(logsDir, FORCED_WORDS_LOG_FILE);
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');

    console.log(`[Wordle] Forced word logged: ${word} by ${playerName}`);
  }

  /**
   * End the game and show results
   */
  private async endGame(room: WordleRoom): Promise<void> {
    room.gameState = 'finished';

    // Stop the timer sync
    this.stopRoomTimerSync(room);

    // Build results - snapshot players to avoid mutation during async
    const playerSnapshot = Array.from(room.players.values());

    const results: GameResultData[] = playerSnapshot
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        email: p.email,
        won: p.won,
        guesses: p.guesses.length,
        time: p.finishTime || 0,
        score: p.score,
        finishPosition: 0, // Will be set after sorting
      }))
      .sort((a, b) => {
        // Sort by: won first, then by guesses (fewer is better), then by time
        if (a.won !== b.won) return a.won ? -1 : 1;
        if (a.guesses !== b.guesses) return a.guesses - b.guesses;
        return a.time - b.time;
      });

    // Add finish position after sorting
    results.forEach((r, idx) => {
      r.finishPosition = idx + 1;
    });

    this.broadcastToRoom(room.code, {
      type: 'gameEnded',
      word: room.word,
      results,
      gameMode: room.gameMode,
    });

    console.log(`[Wordle] Game ended in room ${room.code}`);

    // Save to database using service (async, don't block the response)
    saveGameResults(room.gameId, results).catch((err) => {
      console.error('[Wordle] Failed to save game results:', err);
    });

    // Save daily challenge completions if applicable
    if (room.isDailyChallenge && room.word) {
      const dailyNumber = room.dailyNumber ?? getDailyNumber();

      // Collect player data for daily completions (snapshot to avoid mutation)
      const dailyPlayers: DailyChallengePlayerData[] = playerSnapshot
        .filter((p) => p.email) // Only authenticated players
        .map((p) => ({
          email: p.email!,
          guesses: p.guesses,
          guessCount: p.guesses.length,
          won: p.won,
          solveTimeMs: p.finishTime,
        }));

      saveDailyChallengeCompletions(dailyNumber, room.word, dailyPlayers).catch((err) => {
        console.error('[Wordle] Failed to save daily challenge completions:', err);
      });
    }
  }

  /**
   * Handle play again request
   */
  handlePlayAgain(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.gameState !== 'finished') return;

    // Reset room to waiting state
    room.gameState = 'waiting';
    room.word = null;
    room.startTime = null;
    room.gameId = null;

    for (const p of room.players.values()) {
      p.guesses = [];
      p.guessResults = [];
      p.isFinished = false;
      p.won = false;
      p.finishTime = null;
      p.score = 0;
      p.isReady = false;
      p.lastGuessTime = null;
    }

    this.broadcastToRoom(roomCode, { type: 'returnedToLobby' });
  }

  // ===========================================================================
  // Reconnection (Phase 1)
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

  /**
   * Handle incoming message
   */
  handleMessage(socket: WebSocket, data: string): void {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'createRoom':
          this.createRoom(socket, msg.playerName, msg.playerEmail);
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
}
