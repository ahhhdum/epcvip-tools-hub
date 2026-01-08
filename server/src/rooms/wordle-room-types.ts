/**
 * Wordle Battle Room Types
 *
 * Shared type definitions for room management, players, and game state.
 * Extracted from wordle-room.ts to enable modular architecture.
 */

import { WebSocket } from 'ws';
import { LetterResult } from '../services/wordle-validator';
import { WordMode } from '../utils/daily-word';

// Re-export for convenience
export type { LetterResult, WordMode };

// =============================================================================
// Game Types
// =============================================================================

/** Game mode determines scoring and competitive features */
export type GameMode = 'casual' | 'competitive';

/** Game state progression: waiting -> selecting (sabotage only) -> playing -> finished */
export type GameState = 'waiting' | 'selecting' | 'playing' | 'finished';

/** Player connection state for grace period handling */
export type ConnectionState = 'connected' | 'disconnected';

// =============================================================================
// Sabotage Mode Types
// =============================================================================

/** Word assignment for sabotage mode - tracks who picked which word for whom */
export interface WordAssignment {
  pickerId: string; // Who picked this word
  pickerName: string; // Picker's display name (for results)
  targetId: string; // Who solves this word
  word: string; // The chosen word
  submittedAt: number; // Timestamp when submitted
}

// =============================================================================
// Player Interface
// =============================================================================

/** Player in a Wordle room */
export interface WordlePlayer {
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

// =============================================================================
// Room Interface
// =============================================================================

/** Wordle room state */
export interface WordleRoom {
  code: string;
  players: Map<string, WordlePlayer>;
  gameState: GameState;
  gameMode: GameMode;
  wordMode: WordMode;
  hardMode: boolean; // True if Hard Mode is enabled (must use revealed hints)
  testWord: string | null; // For E2E tests: deterministic word (ignored in production)
  word: string | null;
  startTime: number | null;
  creatorId: string;
  countdownTimer: NodeJS.Timeout | null;
  timerInterval: NodeJS.Timeout | null;
  isDailyChallenge: boolean; // True if this is a daily challenge room
  dailyNumber: number | null; // The specific daily number (for historical dailies)
  isSolo: boolean; // True if this is a solo game (skip 2-player requirement)
  gameId: string | null; // Database game ID for tracking guesses
  isPublic: boolean; // True if room is visible in public rooms list (default: true)

  // Sabotage mode fields
  wordAssignments: Map<string, WordAssignment> | null; // targetId -> assignment (who solves what)
  pickerAssignments: Map<string, string> | null; // pickerId -> targetId (who picks for whom)
  selectionDeadline: number | null; // Timestamp when selection phase ends
  selectionTimer: NodeJS.Timeout | null; // Timer for auto-assign on timeout
}

// =============================================================================
// Public Room Info (for lobby display)
// =============================================================================

/** Public room info sent to lobby subscribers */
export interface PublicRoomInfo {
  code: string;
  playerCount: number;
  maxPlayers: number;
  creatorName: string;
  gameMode: GameMode;
  wordMode: WordMode;
  isDailyChallenge: boolean;
  dailyNumber: number | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a player is currently connected
 */
export function isPlayerConnected(player: WordlePlayer): boolean {
  return player.connectionState === 'connected' && player.socket !== null;
}

/**
 * Get only connected players from a room
 */
export function getConnectedPlayers(room: WordleRoom): WordlePlayer[] {
  return Array.from(room.players.values()).filter(isPlayerConnected);
}

/**
 * Get count of connected players in a room
 */
export function getConnectedPlayerCount(room: WordleRoom): number {
  return getConnectedPlayers(room).length;
}
