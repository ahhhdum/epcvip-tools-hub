/**
 * Wordle Game Controller
 *
 * Handles game lifecycle: ready, start, guess, end, play again.
 * Extracted from WordleRoomManager for modularity.
 */

import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { WordleRoom, WordlePlayer, getConnectedPlayers } from './wordle-room-types';
import { getRandomWord } from '../utils/word-list';
import { getDailyNumber, getDailyWordByNumber } from '../utils/daily-word';
import {
  MAX_GUESSES,
  MIN_PLAYERS_FOR_MULTIPLAYER,
  FORCED_WORDS_LOG_FILE,
  LOGS_DIRECTORY,
} from '../constants/wordle-constants';
import {
  validateGuess,
  isWinningResult,
  isOutOfGuesses,
  countCorrectLetters,
  calculateScore,
  normalizeGuess,
} from '../services/wordle-validator';
import { startCountdown, startTimerSync, stopTimerSync } from '../services/wordle-timer';
import {
  createGame,
  saveGuess,
  saveGameResults,
  saveDailyChallengeCompletions,
  GameResultData,
  DailyChallengePlayerData,
} from '../services/wordle-database';
import { isValidGuess } from '../utils/word-list';

/**
 * Dependencies injected from the coordinator
 */
export interface GameControllerDeps {
  rooms: Map<string, WordleRoom>;
  socketToPlayer: Map<WebSocket, string>;
  playerToRoom: Map<string, string>;
  send: (socket: WebSocket, msg: object) => void;
  broadcastToRoom: (roomCode: string, msg: object, excludeId?: string) => void;
  broadcastPublicRoomsList: () => void;
}

/**
 * Manages game lifecycle: ready, start, guess, end
 */
export class WordleGameController {
  private rooms: Map<string, WordleRoom>;
  private socketToPlayer: Map<WebSocket, string>;
  private playerToRoom: Map<string, string>;
  private send: (socket: WebSocket, msg: object) => void;
  private broadcastToRoom: (roomCode: string, msg: object, excludeId?: string) => void;
  private broadcastPublicRoomsList: () => void;

  constructor(deps: GameControllerDeps) {
    this.rooms = deps.rooms;
    this.socketToPlayer = deps.socketToPlayer;
    this.playerToRoom = deps.playerToRoom;
    this.send = deps.send;
    this.broadcastToRoom = deps.broadcastToRoom;
    this.broadcastPublicRoomsList = deps.broadcastPublicRoomsList;
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
   * Start the countdown and then the game
   * Public to allow coordinator to trigger for solo games
   */
  startCountdown(room: WordleRoom): void {
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

    // Update lobby (room no longer joinable)
    this.broadcastPublicRoomsList();

    // Start timer sync interval (broadcasts every second)
    this.startTimerSync(room);
  }

  /**
   * Start broadcasting timer updates
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
  stopRoomTimerSync(room: WordleRoom): void {
    stopTimerSync(room.timerInterval);
    room.timerInterval = null;
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
  async endGame(room: WordleRoom): Promise<void> {
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

    // Update lobby (room is joinable again)
    this.broadcastPublicRoomsList();
  }
}
