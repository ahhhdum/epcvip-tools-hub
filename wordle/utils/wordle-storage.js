/**
 * Wordle Storage Module
 * Session and daily progress management via localStorage.
 */

// Storage Keys
const SESSION_STORAGE_KEY = 'wordle_session';
const DAILY_PROGRESS_KEY = 'wordle_daily_progress';

// Session Configuration
const SESSION_MAX_AGE_MS = 120000; // 2 minutes - matches server grace period

// =============================================================================
// Session Storage (for reconnection)
// =============================================================================

/**
 * Save session data when joining a room
 * This allows reconnection if the page is refreshed or connection is lost
 * @param {string} roomCode - The room code
 * @param {string} playerId - The player ID
 */
export function saveSession(roomCode, playerId) {
  try {
    const session = {
      roomCode,
      playerId,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log('[Wordle] Session saved:', session.roomCode);
  } catch (e) {
    console.warn('[Wordle] Failed to save session:', e);
  }
}

/**
 * Clear session data when intentionally leaving a room
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('[Wordle] Session cleared');
  } catch (e) {
    console.warn('[Wordle] Failed to clear session:', e);
  }
}

/**
 * Get session data if it exists and is still valid
 * @returns {Object|null} Session object { roomCode, playerId, savedAt } or null if expired/missing
 */
export function getSession() {
  try {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return null;

    const session = JSON.parse(data);
    const age = Date.now() - session.savedAt;

    // Session expired
    if (age > SESSION_MAX_AGE_MS) {
      console.log('[Wordle] Session expired, clearing');
      clearSession();
      return null;
    }

    return session;
  } catch (e) {
    console.warn('[Wordle] Failed to get session:', e);
    return null;
  }
}

// =============================================================================
// Daily Progress Storage (for mid-game leave/resume)
// =============================================================================

/**
 * Save daily challenge progress when leaving mid-game
 * Progress is keyed by email+dailyNumber so users can resume their specific attempt
 * @param {Object} progress - Progress object with dailyNumber, guesses, guessResults
 * @param {string} email - User email for keying (passed explicitly for decoupling)
 */
export function saveDailyProgress(progress, email) {
  if (!progress || !email) return;

  try {
    const key = `${DAILY_PROGRESS_KEY}_${email}_${progress.dailyNumber}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        ...progress,
        savedAt: Date.now(),
      })
    );
    console.log(
      `[Wordle] Daily #${progress.dailyNumber} progress saved (${progress.guesses.length} guesses)`
    );
  } catch (e) {
    console.warn('[Wordle] Failed to save daily progress:', e);
  }
}

/**
 * Get saved daily progress for a specific daily challenge
 * @param {number} dailyNumber - Daily challenge number
 * @param {string} email - User email for keying
 * @returns {Object|null} Progress object or null
 */
export function getDailyProgress(dailyNumber, email) {
  if (!email) return null;

  try {
    const key = `${DAILY_PROGRESS_KEY}_${email}_${dailyNumber}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const progress = JSON.parse(data);
    // Progress is valid indefinitely for daily challenges (unlike session which expires)
    return progress;
  } catch (e) {
    console.warn('[Wordle] Failed to get daily progress:', e);
    return null;
  }
}

/**
 * Clear daily progress after completion or explicit clear
 * @param {number} dailyNumber - Daily challenge number
 * @param {string} email - User email for keying
 */
export function clearDailyProgress(dailyNumber, email) {
  if (!email) return;

  try {
    const key = `${DAILY_PROGRESS_KEY}_${email}_${dailyNumber}`;
    localStorage.removeItem(key);
    console.log(`[Wordle] Daily #${dailyNumber} progress cleared`);
  } catch (e) {
    console.warn('[Wordle] Failed to clear daily progress:', e);
  }
}

// Export constants for testing
export { SESSION_STORAGE_KEY, SESSION_MAX_AGE_MS, DAILY_PROGRESS_KEY };
