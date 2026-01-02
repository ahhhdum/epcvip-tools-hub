/**
 * Wordle Battle Room Manager
 *
 * Handles room creation, player management, and game logic.
 */

import { WebSocket } from 'ws';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateUniqueRoomCode } from '../utils/room-codes';
import { getRandomWord, isValidGuess } from '../utils/word-list';

// Supabase client for stats persistence
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (!supabase && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// Letter result types
export type LetterResult = 'correct' | 'present' | 'absent';

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
  word: string | null;
  startTime: number | null;
  creatorId: string;
}

// Player counter for unique IDs
let playerCounter = 0;

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

    const playerId = `wp${++playerCounter}_${Date.now()}`;

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
      word: null,
      startTime: null,
      creatorId: playerId,
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

    if (room.players.size >= 6) {
      this.send(socket, { type: 'error', message: 'Room is full (max 6 players).' });
      return false;
    }

    const playerId = `wp${++playerCounter}_${Date.now()}`;

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
   * Start the game
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

    if (room.players.size < 2) {
      this.send(socket, { type: 'error', message: 'Need at least 2 players to start.' });
      return;
    }

    // Reset all players
    for (const p of room.players.values()) {
      p.guesses = [];
      p.guessResults = [];
      p.isFinished = false;
      p.won = false;
      p.finishTime = null;
      p.score = 0;
    }

    // Select word and start
    room.word = getRandomWord();
    room.gameState = 'playing';
    room.startTime = Date.now();

    console.log(`[Wordle] Game started in room ${roomCode}, word: ${room.word}`);

    // Send game start to all players
    const players = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
    }));

    this.broadcastToRoom(roomCode, {
      type: 'gameStarted',
      wordLength: 5,
      players,
      gameMode: room.gameMode,
    });
  }

  /**
   * Handle a guess
   */
  handleGuess(socket: WebSocket, word: string): void {
    const playerId = this.socketToPlayer.get(socket);
    if (!playerId) return;

    const roomCode = this.playerToRoom.get(playerId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.gameState !== 'playing' || !room.word) return;

    const player = room.players.get(playerId);
    if (!player || player.isFinished) return;

    // Validate guess
    const guess = word.toUpperCase();
    if (!isValidGuess(guess)) {
      this.send(socket, { type: 'error', message: 'Invalid guess. Must be 5 letters.' });
      return;
    }

    // Check if already used 6 guesses
    if (player.guesses.length >= 6) {
      this.send(socket, { type: 'error', message: 'No more guesses remaining.' });
      return;
    }

    // Validate guess against target word
    const result = this.validateGuess(guess, room.word);
    player.guesses.push(guess);
    player.guessResults.push(result);

    const isWin = result.every((r) => r === 'correct');
    const isLoss = !isWin && player.guesses.length >= 6;

    if (isWin || isLoss) {
      player.isFinished = true;
      player.won = isWin;
      player.finishTime = Date.now() - (room.startTime || 0);

      if (isWin && room.gameMode === 'competitive') {
        // Score = (7 - guesses) * 100 + time bonus
        const guessBonus = (7 - player.guesses.length) * 100;
        const timeBonus = Math.max(0, 60000 - player.finishTime) / 1000;
        player.score = Math.round(guessBonus + timeBonus);
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
    const greenCount = result.filter((r) => r === 'correct').length;

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
   * Validate a guess against the target word
   */
  private validateGuess(guess: string, target: string): LetterResult[] {
    const result: LetterResult[] = new Array(5).fill('absent');
    const targetChars = target.split('');
    const used = new Set<number>();

    // First pass: mark exact matches
    for (let i = 0; i < 5; i++) {
      if (guess[i] === target[i]) {
        result[i] = 'correct';
        used.add(i);
      }
    }

    // Second pass: mark present (in word but wrong position)
    for (let i = 0; i < 5; i++) {
      if (result[i] === 'correct') continue;

      const foundIdx = targetChars.findIndex((c, j) => c === guess[i] && !used.has(j));
      if (foundIdx >= 0) {
        result[i] = 'present';
        used.add(foundIdx);
      }
    }

    return result;
  }

  /**
   * End the game and show results
   */
  private async endGame(room: WordleRoom): Promise<void> {
    room.gameState = 'finished';

    // Build results
    const results = Array.from(room.players.values())
      .map((p, index) => ({
        playerId: p.id,
        name: p.name,
        email: p.email,
        won: p.won,
        guesses: p.guesses.length,
        time: p.finishTime || 0,
        score: p.score,
      }))
      .sort((a, b) => {
        // Sort by: won first, then by guesses (fewer is better), then by time
        if (a.won !== b.won) return a.won ? -1 : 1;
        if (a.guesses !== b.guesses) return a.guesses - b.guesses;
        return a.time - b.time;
      });

    // Add finish position after sorting
    const resultsWithPosition = results.map((r, idx) => ({
      ...r,
      finishPosition: idx + 1,
    }));

    this.broadcastToRoom(room.code, {
      type: 'gameEnded',
      word: room.word,
      results: resultsWithPosition,
      gameMode: room.gameMode,
    });

    console.log(`[Wordle] Game ended in room ${room.code}`);

    // Save to database (async, don't block the response)
    this.saveGameResults(room, resultsWithPosition).catch((err) => {
      console.error('[Wordle] Failed to save game results:', err);
    });
  }

  /**
   * Save game results to database
   */
  private async saveGameResults(
    room: WordleRoom,
    results: Array<{
      playerId: string;
      name: string;
      email: string | null;
      won: boolean;
      guesses: number;
      time: number;
      score: number;
      finishPosition: number;
    }>
  ): Promise<void> {
    const db = getSupabase();
    if (!db) {
      console.log('[Wordle] Database not configured, skipping stats save');
      return;
    }

    try {
      // Insert game record
      const { data: game, error: gameError } = await db
        .from('wordle_games')
        .insert({
          room_code: room.code,
          word: room.word,
          game_mode: room.gameMode,
          started_at: room.startTime
            ? new Date(room.startTime).toISOString()
            : new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (gameError) {
        console.error('[Wordle] Failed to insert game:', gameError);
        return;
      }

      // Insert player results
      const resultRecords = results.map((r) => ({
        game_id: game.id,
        player_email: r.email,
        player_name: r.name,
        guesses: r.guesses,
        solve_time_ms: r.time,
        won: r.won,
        score: r.score,
        finish_position: r.finishPosition,
      }));

      const { error: resultsError } = await db.from('wordle_results').insert(resultRecords);

      if (resultsError) {
        console.error('[Wordle] Failed to insert results:', resultsError);
      }

      // Update stats for authenticated players
      for (const r of results) {
        if (r.email) {
          await this.updatePlayerStats(db, r.email, r.won, r.guesses);
        }
      }

      console.log(`[Wordle] Saved game ${game.id} with ${results.length} player results`);
    } catch (err) {
      console.error('[Wordle] Database error:', err);
    }
  }

  /**
   * Update aggregate stats for a player
   */
  private async updatePlayerStats(
    db: SupabaseClient,
    email: string,
    won: boolean,
    guesses: number
  ): Promise<void> {
    // Get existing stats or create new
    const { data: existing } = await db
      .from('wordle_stats')
      .select('*')
      .eq('player_email', email)
      .single();

    if (existing) {
      // Update existing stats
      const newStreak = won ? existing.current_streak + 1 : 0;
      await db
        .from('wordle_stats')
        .update({
          games_played: existing.games_played + 1,
          games_won: existing.games_won + (won ? 1 : 0),
          total_guesses: existing.total_guesses + guesses,
          current_streak: newStreak,
          best_streak: Math.max(existing.best_streak, newStreak),
          updated_at: new Date().toISOString(),
        })
        .eq('player_email', email);
    } else {
      // Create new stats record
      await db.from('wordle_stats').insert({
        player_email: email,
        games_played: 1,
        games_won: won ? 1 : 0,
        total_guesses: guesses,
        current_streak: won ? 1 : 0,
        best_streak: won ? 1 : 0,
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
        case 'joinRoom':
          this.joinRoom(socket, msg.roomCode, msg.playerName, msg.playerEmail);
          break;
        case 'setGameMode':
          this.setGameMode(socket, msg.mode);
          break;
        case 'startGame':
          this.startGame(socket);
          break;
        case 'guess':
          this.handleGuess(socket, msg.word);
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
