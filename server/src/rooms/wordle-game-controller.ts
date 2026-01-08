/**
 * Wordle Game Controller
 *
 * Handles game lifecycle: ready, start, guess, end, play again.
 * Extracted from WordleRoomManager for modularity.
 */

import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { WordleRoom, WordlePlayer, WordAssignment, getConnectedPlayers } from './wordle-room-types';
import { getRandomWord, WORD_LIST } from '../utils/word-list';
import { getDailyNumber, getDailyWordByNumber } from '../utils/daily-word';
import {
  MAX_GUESSES,
  MIN_PLAYERS_FOR_MULTIPLAYER,
  FORCED_WORDS_LOG_FILE,
  LOGS_DIRECTORY,
  SELECTION_TIMEOUT_MS,
} from '../constants/wordle-constants';
import {
  validateGuess,
  validateHardMode,
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

    console.log(`[Wordle] Starting game in room ${roomCode}`);

    // For sabotage mode, enter selection phase first
    if (room.wordMode === 'sabotage') {
      this.startSelectionPhase(room);
    } else {
      // Start the countdown (game will begin after 3... 2... 1...)
      this.startCountdown(room);
    }
  }

  /**
   * Start the word selection phase for sabotage mode
   * Each player picks a word for another player in a circular chain
   */
  private startSelectionPhase(room: WordleRoom): void {
    room.gameState = 'selecting';

    // Calculate circular assignments: each picker → target
    // For 2 players: A picks for B, B picks for A
    // For 3+ players: shuffle then chain (A→B→C→A)
    const playerIds = Array.from(room.players.keys());
    const shuffled = this.shuffleArray([...playerIds]);

    room.pickerAssignments = new Map();
    room.wordAssignments = new Map();

    for (let i = 0; i < shuffled.length; i++) {
      const pickerId = shuffled[i];
      const targetId = shuffled[(i + 1) % shuffled.length];
      room.pickerAssignments.set(pickerId, targetId);
    }

    // Set deadline
    room.selectionDeadline = Date.now() + SELECTION_TIMEOUT_MS;

    // Send selection phase started to each player
    // Players learn they're picking, but NOT who for (mystery until results!)
    for (const player of room.players.values()) {
      if (player.socket && player.connectionState === 'connected') {
        this.send(player.socket, {
          type: 'selectionPhaseStarted',
          deadline: room.selectionDeadline,
          timeRemaining: SELECTION_TIMEOUT_MS,
        });
      }
    }

    // Start timeout timer
    room.selectionTimer = setTimeout(() => {
      this.handleSelectionTimeout(room);
    }, SELECTION_TIMEOUT_MS);

    console.log(`[Wordle] Selection phase started in room ${room.code}`);

    // Update lobby (room no longer joinable during selection)
    this.broadcastPublicRoomsList();
  }

  /**
   * Handle word submission during sabotage selection phase
   */
  handleSubmitWord(socket: WebSocket, word: string): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.gameState !== 'selecting') {
      this.send(socket, { type: 'error', message: 'Not in word selection phase.' });
      return;
    }

    const player = room.players.get(playerId);
    if (!player) return;

    // Validate word is in the answer word list (666 words, not full 12K)
    const normalizedWord = word.toUpperCase().trim();
    if (!WORD_LIST.includes(normalizedWord)) {
      this.send(socket, {
        type: 'wordValidation',
        valid: false,
        message: 'Word not in answer list. Try another!',
      });
      return;
    }

    // Get target player
    const targetId = room.pickerAssignments?.get(playerId);
    if (!targetId) {
      this.send(socket, { type: 'error', message: 'No assignment found.' });
      return;
    }

    // Check if already submitted
    if (room.wordAssignments?.has(targetId)) {
      this.send(socket, { type: 'error', message: 'You already submitted a word.' });
      return;
    }

    // Store the assignment
    const assignment: WordAssignment = {
      pickerId: playerId,
      pickerName: player.name,
      targetId,
      word: normalizedWord,
      submittedAt: Date.now(),
    };
    room.wordAssignments!.set(targetId, assignment);

    // Confirm to picker
    this.send(socket, {
      type: 'wordSubmitted',
      success: true,
    });

    // Broadcast that someone submitted (without revealing who or what)
    const submittedCount = room.wordAssignments!.size;
    const totalPlayers = room.players.size;

    this.broadcastToRoom(room.code, {
      type: 'selectionProgress',
      submittedCount,
      totalPlayers,
    });

    console.log(`[Wordle] Word submitted in room ${room.code}: ${submittedCount}/${totalPlayers}`);

    // Check if all players have submitted
    if (submittedCount === totalPlayers) {
      // Clear timeout and start game
      if (room.selectionTimer) {
        clearTimeout(room.selectionTimer);
        room.selectionTimer = null;
      }

      // Brief pause then start countdown
      this.broadcastToRoom(room.code, { type: 'allWordsSubmitted' });
      setTimeout(() => {
        this.startCountdown(room);
      }, 500);
    }
  }

  /**
   * Handle selection timeout - assign random words to players who didn't submit
   */
  private handleSelectionTimeout(room: WordleRoom): void {
    room.selectionTimer = null;

    if (room.gameState !== 'selecting') return;

    const autoAssigned: string[] = [];

    // For each player who needs a word assigned
    for (const [pickerId, targetId] of room.pickerAssignments!) {
      if (!room.wordAssignments!.has(targetId)) {
        // Picker didn't submit - assign random word
        const picker = room.players.get(pickerId);
        const randomWord = getRandomWord();

        const assignment: WordAssignment = {
          pickerId,
          pickerName: picker?.name || 'Unknown',
          targetId,
          word: randomWord,
          submittedAt: Date.now(),
        };
        room.wordAssignments!.set(targetId, assignment);
        autoAssigned.push(pickerId);
      }
    }

    if (autoAssigned.length > 0) {
      console.log(
        `[Wordle] Selection timeout in room ${room.code}, auto-assigned ${autoAssigned.length} words`
      );
    }

    this.broadcastToRoom(room.code, {
      type: 'selectionTimeout',
      autoAssignedCount: autoAssigned.length,
    });

    // Start the game countdown
    setTimeout(() => {
      this.startCountdown(room);
    }, 500);
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
    } else if (room.wordMode === 'sabotage') {
      // In sabotage mode, each player has their own word from wordAssignments
      // Set room.word to null - individual words are in wordAssignments
      room.word = null;
    } else {
      // Use testWord if set (for E2E tests), otherwise random
      room.word = room.testWord || getRandomWord();
    }
    room.gameState = 'playing';
    room.startTime = Date.now();

    // Create game record in database for tracking guesses
    // For sabotage mode, use placeholder word (individual words tracked separately)
    const dbWord = room.wordMode === 'sabotage' ? 'SABOTAGE' : room.word!;
    room.gameId = await createGame({
      roomCode: room.code,
      word: dbWord,
      gameMode: room.gameMode,
      wordMode: room.wordMode,
      dailyNumber: room.dailyNumber,
      isSolo: room.isSolo,
      playerCount: room.players.size,
      startTime: room.startTime,
    });

    const wordModeInfo =
      room.wordMode === 'daily'
        ? `Daily #${room.dailyNumber ?? getDailyNumber()}`
        : room.wordMode === 'sabotage'
          ? 'Sabotage'
          : 'Random';
    console.log(
      `[Wordle] Game started in room ${room.code}, mode: ${wordModeInfo}` +
        (room.word ? `, word: ${room.word}` : '')
    );

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
    if (!room || room.gameState !== 'playing') return;

    // Determine the target word for this player
    let targetWord: string;
    if (room.wordMode === 'sabotage') {
      // In sabotage mode, each player has their own word from wordAssignments
      const assignment = room.wordAssignments?.get(playerId);
      if (!assignment) {
        this.send(socket, { type: 'error', message: 'No word assigned.' });
        return;
      }
      targetWord = assignment.word;
    } else {
      // Normal mode - everyone solves the same word
      if (!room.word) return;
      targetWord = room.word;
    }

    const player = room.players.get(playerId);
    if (!player || player.isFinished) return;

    // Normalize and validate guess format
    const guess = normalizeGuess(word);
    if (!isValidGuess(guess)) {
      this.send(socket, { type: 'error', message: 'Invalid guess. Must be 5 letters.' });
      return;
    }

    // Hard Mode validation - must use revealed hints
    if (room.hardMode && player.guesses.length > 0) {
      const hardModeCheck = validateHardMode(guess, player.guesses, player.guessResults);
      if (!hardModeCheck.valid) {
        this.send(socket, {
          type: 'hardModeViolation',
          message: hardModeCheck.violation,
          letter: hardModeCheck.letter,
          position: hardModeCheck.position,
        });
        return;
      }
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
    const result = validateGuess(guess, targetWord);
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

    // Build word assignments for sabotage mode results
    // Convert Map to array of objects for JSON serialization
    const wordAssignments =
      room.wordMode === 'sabotage' && room.wordAssignments
        ? Array.from(room.wordAssignments.entries()).map(([targetId, assignment]) => ({
            targetId,
            targetName: room.players.get(targetId)?.name || 'Unknown',
            word: assignment.word,
            pickerId: assignment.pickerId,
            pickerName: assignment.pickerName,
          }))
        : null;

    this.broadcastToRoom(room.code, {
      type: 'gameEnded',
      word: room.word, // null in sabotage mode
      results,
      gameMode: room.gameMode,
      wordAssignments, // Array of { targetId, targetName, word, pickerId, pickerName }
      canRematch: !room.isDailyChallenge, // Dailies can't be rematched
      dailyNumber: room.dailyNumber ?? null, // For UI messaging
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

    // Block rematch for Daily Challenges - they can only be played once
    if (room.isDailyChallenge) {
      this.send(socket, {
        type: 'error',
        message: 'Daily Challenge completed. Return to lobby for a new game.',
      });
      return;
    }

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
