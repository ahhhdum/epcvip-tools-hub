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
  saveGameResults,
  saveDailyChallengeCompletions,
  GameResultData,
  DailyChallengePlayerData,
} from '../services/wordle-database';

// Re-export LetterResult for consumers
export type { LetterResult };

// Game modes
export type GameMode = 'casual' | 'competitive';

// Game states
export type GameState = 'waiting' | 'playing' | 'finished';

// Player in a Wordle room
interface WordlePlayer {
  id: string;
  name: string;
  email: string | null; // Email from SSO (null for guests)
  socket: WebSocket;
  isCreator: boolean;
  isReady: boolean;
  guesses: string[];
  guessResults: LetterResult[][];
  isFinished: boolean;
  won: boolean;
  finishTime: number | null;
  score: number;
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
}

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
      socket,
      isCreator: true,
      isReady: false,
      guesses: [],
      guessResults: [],
      isFinished: false,
      won: false,
      finishTime: null,
      score: 0,
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
      socket,
      isCreator: false,
      isReady: false,
      guesses: [],
      guessResults: [],
      isFinished: false,
      won: false,
      finishTime: null,
      score: 0,
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

  /**
   * Handle player disconnect
   */
  handleDisconnect(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    const wasCreator = player?.isCreator;

    room.players.delete(playerId);
    this.playerToRoom.delete(playerId);
    this.socketToPlayer.delete(socket);

    console.log(`[Wordle] Player ${playerId} left room ${roomCode}`);

    // If room is empty, delete it
    if (room.players.size === 0) {
      // Clear any active countdown
      clearCountdown(room.countdownTimer);
      room.countdownTimer = null;
      // Clear timer sync
      stopTimerSync(room.timerInterval);
      room.timerInterval = null;
      this.rooms.delete(roomCode);
      console.log(`[Wordle] Room ${roomCode} deleted (empty)`);
      return;
    }

    // If creator left, assign new creator
    if (wasCreator) {
      const newCreator = room.players.values().next().value;
      if (newCreator) {
        newCreator.isCreator = true;
        room.creatorId = newCreator.id;
        this.send(newCreator.socket, { type: 'becameCreator' });
      }
    }

    // Notify remaining players
    this.broadcastToRoom(roomCode, { type: 'playerLeft', playerId });

    // Check if game should end (only one player left during game)
    if (room.gameState === 'playing' && room.players.size === 1) {
      this.endGame(room);
    }
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

    // Check if all players are ready and notify creator
    const allReady = Array.from(room.players.values()).every((p) => p.isReady);
    const creator = room.players.get(room.creatorId);
    if (creator) {
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
  private beginGame(room: WordleRoom): void {
    // Reset all players
    for (const p of room.players.values()) {
      p.guesses = [];
      p.guessResults = [];
      p.isFinished = false;
      p.won = false;
      p.finishTime = null;
      p.score = 0;
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

    // Check that all players are ready
    const allReady = Array.from(room.players.values()).every((p) => p.isReady);
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
  handleGuess(socket: WebSocket, word: string, forced: boolean = false): void {
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

    // Validate guess against target word using validator service
    const result = validateGuess(guess, room.word);
    player.guesses.push(guess);
    player.guessResults.push(result);

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
    const allFinished = Array.from(room.players.values()).every((p) => p.isFinished);
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
    saveGameResults(room.code, room.word || '', room.gameMode, room.startTime, results).catch(
      (err) => {
        console.error('[Wordle] Failed to save game results:', err);
      }
    );

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

    for (const p of room.players.values()) {
      p.guesses = [];
      p.guessResults = [];
      p.isFinished = false;
      p.won = false;
      p.finishTime = null;
      p.score = 0;
      p.isReady = false;
    }

    this.broadcastToRoom(roomCode, { type: 'returnedToLobby' });
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
        default:
          console.log(`[Wordle] Unknown message type: ${msg.type}`);
      }
    } catch (e) {
      console.error('[Wordle] Error handling message:', e);
    }
  }

  /**
   * Send a message to a socket
   */
  private send(socket: WebSocket, msg: object): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }

  /**
   * Broadcast a message to all players in a room
   */
  private broadcastToRoom(roomCode: string, msg: object, excludeId?: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const data = JSON.stringify(msg);
    for (const player of room.players.values()) {
      if (player.id !== excludeId && player.socket.readyState === WebSocket.OPEN) {
        player.socket.send(data);
      }
    }
  }
}
