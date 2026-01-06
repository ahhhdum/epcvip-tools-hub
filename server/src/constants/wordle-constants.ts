/**
 * Wordle Game Constants
 *
 * Centralized constants for Wordle Battle game logic.
 * Extracted from wordle-room.ts for clarity and maintainability.
 */

// Game Rules
export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const MAX_PLAYERS_PER_ROOM = 6;
export const MIN_PLAYERS_FOR_MULTIPLAYER = 2;

// Countdown Configuration
export const COUNTDOWN_SECONDS = 3;
export const COUNTDOWN_INTERVAL_MS = 1000;

// Timer Configuration
export const TIMER_SYNC_INTERVAL_MS = 1000;

// Solo Mode
/** Brief delay to allow client to process roomJoined before countdown starts */
export const SOLO_START_DELAY_MS = 100;

// Scoring (Competitive Mode)
export const SCORING = {
  /** Base multiplier: (MAX_GUESSES + 1 - guesses) * GUESS_BONUS */
  GUESS_BONUS_MULTIPLIER: 100,
  /** Time bonus threshold in ms (1 minute) - faster solves get bonus points */
  TIME_BONUS_THRESHOLD_MS: 60000,
  /** Divisor for time bonus calculation (converts ms to seconds) */
  TIME_BONUS_DIVISOR: 1000,
} as const;

// Player ID Generation
export const PLAYER_ID_PREFIX = 'wp';

// Log File Paths
export const FORCED_WORDS_LOG_FILE = 'forced-words.jsonl';
export const LOGS_DIRECTORY = 'logs';

// Sabotage Mode
/** Time allowed for word selection phase in sabotage mode */
export const SELECTION_TIMEOUT_MS = 30000; // 30 seconds
/** Check interval for selection timeout */
export const SELECTION_CHECK_INTERVAL_MS = 1000;

// Grace Periods (milliseconds)
// Time before disconnected players are permanently removed
export const GRACE_PERIOD = {
  /** Waiting room - longest, host may be sharing code */
  WAITING_MS: 120000, // 2 minutes
  /** During countdown - short, but allow for network blips */
  COUNTDOWN_MS: 10000, // 10 seconds
  /** Active game - balance between fairness and allowing reconnect */
  PLAYING_MS: 60000, // 1 minute
  /** Results screen - no rush, let them see results */
  RESULTS_MS: 300000, // 5 minutes
  /** Solo games - shorter, only affects the solo player */
  SOLO_MS: 30000, // 30 seconds
  /** Default fallback */
  DEFAULT_MS: 60000, // 1 minute
} as const;
