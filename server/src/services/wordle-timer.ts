/**
 * Wordle Timer Service
 *
 * Manages countdown and game timer functionality.
 * Fixes race condition by snapshotting player state before async operations.
 */

import {
  COUNTDOWN_SECONDS,
  COUNTDOWN_INTERVAL_MS,
  TIMER_SYNC_INTERVAL_MS,
} from '../constants/wordle-constants';

/**
 * Player timer data for sync broadcasts
 */
export interface PlayerTimerData {
  elapsed: number;
  finished: boolean;
  finishTime: number | null;
}

/**
 * Minimal player interface for timer operations
 */
export interface TimerPlayer {
  id: string;
  isFinished: boolean;
  finishTime: number | null;
}

/**
 * Countdown state and callbacks
 */
export interface CountdownCallbacks {
  onTick: (count: number) => void;
  onComplete: () => void;
}

/**
 * Timer sync callbacks
 */
export interface TimerSyncCallbacks {
  getPlayers: () => Map<string, TimerPlayer>;
  getStartTime: () => number | null;
  isPlaying: () => boolean;
  onSync: (gameTime: number, playerTimes: Record<string, PlayerTimerData>) => void;
  onStop: () => void;
}

/**
 * Start a countdown timer (3... 2... 1...)
 *
 * @param callbacks - Callbacks for tick and completion events
 * @returns Timer handle for cleanup
 */
export function startCountdown(callbacks: CountdownCallbacks): NodeJS.Timeout {
  let count = COUNTDOWN_SECONDS;

  // Emit initial count
  callbacks.onTick(count);

  const timer = setInterval(() => {
    count--;

    if (count > 0) {
      callbacks.onTick(count);
    } else {
      clearInterval(timer);
      callbacks.onComplete();
    }
  }, COUNTDOWN_INTERVAL_MS);

  return timer;
}

/**
 * Clear a countdown timer
 */
export function clearCountdown(timer: NodeJS.Timeout | null): void {
  if (timer) {
    clearInterval(timer);
  }
}

/**
 * Start timer synchronization broadcasts.
 *
 * FIX: Uses snapshot pattern to prevent race condition.
 * The original bug was iterating over `room.players` Map while
 * `handleDisconnect` could mutate it during the async broadcast.
 *
 * @param callbacks - Callbacks for getting state and broadcasting
 * @returns Timer handle for cleanup
 */
export function startTimerSync(callbacks: TimerSyncCallbacks): NodeJS.Timeout {
  const timer = setInterval(() => {
    // Check if game is still active
    if (!callbacks.isPlaying()) {
      clearInterval(timer);
      callbacks.onStop();
      return;
    }

    const startTime = callbacks.getStartTime();
    if (!startTime) {
      return;
    }

    const now = Date.now();

    // CRITICAL FIX: Snapshot players at the start of this tick
    // This prevents race conditions if a player disconnects during iteration
    const playersSnapshot = Array.from(callbacks.getPlayers().entries());

    const playerTimes: Record<string, PlayerTimerData> = {};

    for (const [id, player] of playersSnapshot) {
      if (player.isFinished && player.finishTime) {
        playerTimes[id] = {
          elapsed: player.finishTime,
          finished: true,
          finishTime: player.finishTime,
        };
      } else {
        playerTimes[id] = {
          elapsed: now - startTime,
          finished: false,
          finishTime: null,
        };
      }
    }

    callbacks.onSync(now - startTime, playerTimes);
  }, TIMER_SYNC_INTERVAL_MS);

  return timer;
}

/**
 * Stop timer synchronization
 */
export function stopTimerSync(timer: NodeJS.Timeout | null): void {
  if (timer) {
    clearInterval(timer);
  }
}

/**
 * Calculate elapsed time from start
 */
export function calculateElapsedTime(startTime: number | null): number {
  if (!startTime) return 0;
  return Date.now() - startTime;
}
