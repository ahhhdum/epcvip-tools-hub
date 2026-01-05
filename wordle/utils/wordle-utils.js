/**
 * Wordle Client Utility Functions
 * Pure functions with no dependencies.
 */

// Daily word epoch (shared concept with server)
const DAILY_EPOCH = '2024-01-01T00:00:00Z';

/**
 * Format milliseconds as timer display
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string "M:SS"
 */
export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Compute best known state per position from all guesses
 * Returns the best result for each position across all guesses.
 * Priority: correct > present > empty
 *
 * @param {Array<Array<string>>} guessResults - Array of result arrays
 * @returns {string[]} Array of 5 states: '', 'present', or 'correct'
 */
export function computeBestKnownState(guessResults) {
  const bestState = ['', '', '', '', '']; // empty = unknown

  for (const row of guessResults) {
    if (!row) continue;
    for (let col = 0; col < 5; col++) {
      const result = row[col];
      if (result === 'correct') {
        // Green always wins
        bestState[col] = 'correct';
      } else if (result === 'present' && bestState[col] !== 'correct') {
        // Yellow only if not already green
        bestState[col] = 'present';
      }
    }
  }

  return bestState;
}

/**
 * Count filled rows (guesses made)
 * @param {Array<Array<string>>} guessResults - Array of result arrays
 * @returns {number} Count of non-empty rows
 */
export function countFilledRows(guessResults) {
  return guessResults.filter((row) => row && row.length > 0).length;
}

/**
 * Calculate date string from daily challenge number
 * Daily #1 = 2024-01-01 (epoch date)
 *
 * @param {number} dailyNum - Daily challenge number (1-indexed)
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function calculateDateFromDailyNumber(dailyNum) {
  const epoch = new Date(DAILY_EPOCH);
  const date = new Date(epoch.getTime() + (dailyNum - 1) * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Format date for display in UI
 * Shows "Yesterday" for yesterday's date, otherwise "Mon, Jan 1" format
 *
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} Human-readable date
 */
export function formatDateForDisplay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
