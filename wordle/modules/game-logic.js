/**
 * Wordle Game Logic Module
 *
 * iOS-PORTABLE: This module contains NO DOM or WebSocket dependencies.
 * All functions are pure and can be directly translated to Swift.
 *
 * Run from server/: npm test -- --testPathPattern=game-logic
 */

// =============================================================================
// Constants (mirrored from server for portability)
// =============================================================================

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

// Scoring constants
export const SCORING = {
  GUESS_BONUS_MULTIPLIER: 100, // (7 - guesses) * 100
  TIME_BONUS_THRESHOLD_MS: 60000, // 60 seconds
  TIME_BONUS_DIVISOR: 1000, // Convert to seconds for bonus
};

// =============================================================================
// Core Game Logic (Pure Functions)
// =============================================================================

/**
 * Calculate letter results for a guess against target word.
 *
 * Algorithm:
 * 1. First pass: Mark exact position matches as 'correct'
 * 2. Second pass: Mark letters present in wrong position as 'present'
 *    (only if that letter hasn't been used by a 'correct' match)
 *
 * iOS: func calculateResult(_ guess: String, targetWord: String) -> [LetterResult]
 *
 * @param {string} guess - The player's guess (uppercase, 5 letters)
 * @param {string} targetWord - The target word (uppercase, 5 letters)
 * @returns {string[]} Array of 5 results: 'correct', 'present', or 'absent'
 */
export function calculateResult(guess, targetWord) {
  const result = new Array(WORD_LENGTH).fill('absent');
  const targetChars = targetWord.split('');
  const used = new Set();

  // First pass: mark exact matches
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === targetWord[i]) {
      result[i] = 'correct';
      used.add(i);
    }
  }

  // Second pass: mark present (in word but wrong position)
  for (let i = 0; i < WORD_LENGTH; i++) {
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
 * Check if a result represents a win (all letters correct).
 *
 * iOS: func isWinningResult(_ result: [LetterResult]) -> Bool
 *
 * @param {string[]} result - Array of letter results
 * @returns {boolean} True if all 'correct'
 */
export function isWinningResult(result) {
  return result.every((r) => r === 'correct');
}

/**
 * Check if player has used all guesses.
 *
 * iOS: func isOutOfGuesses(_ guessCount: Int) -> Bool
 *
 * @param {number} guessCount - Number of guesses made
 * @returns {boolean} True if guessCount >= MAX_GUESSES
 */
export function isOutOfGuesses(guessCount) {
  return guessCount >= MAX_GUESSES;
}

/**
 * Count correct (green) letters in a result.
 *
 * iOS: func countCorrectLetters(_ result: [LetterResult]) -> Int
 *
 * @param {string[]} result - Array of letter results
 * @returns {number} Count of 'correct' results
 */
export function countCorrectLetters(result) {
  return result.filter((r) => r === 'correct').length;
}

/**
 * Calculate competitive mode score.
 *
 * Score formula:
 * - Base: (7 - guesses) * 100 (fewer guesses = more points)
 * - Time bonus: up to 60 points for faster solves (under 60 seconds)
 *
 * iOS: func calculateScore(guessCount: Int, solveTimeMs: Int) -> Int
 *
 * @param {number} guessCount - Number of guesses used (1-6)
 * @param {number} solveTimeMs - Time to solve in milliseconds
 * @returns {number} Calculated score (integer)
 */
export function calculateScore(guessCount, solveTimeMs) {
  const guessBonus = (MAX_GUESSES + 1 - guessCount) * SCORING.GUESS_BONUS_MULTIPLIER;
  const timeBonus =
    Math.max(0, SCORING.TIME_BONUS_THRESHOLD_MS - solveTimeMs) / SCORING.TIME_BONUS_DIVISOR;
  return Math.round(guessBonus + timeBonus);
}

/**
 * Normalize a guess to uppercase.
 *
 * iOS: func normalizeGuess(_ word: String) -> String
 *
 * @param {string} word - Input word
 * @returns {string} Uppercase word
 */
export function normalizeGuess(word) {
  return word.toUpperCase();
}

// =============================================================================
// Dictionary Validation
// =============================================================================

/**
 * Validate a word against the dictionary.
 *
 * iOS: func validateWord(_ word: String, dictionary: Set<String>) -> ValidationResult
 *
 * @param {string} word - The word to validate (should be uppercase)
 * @param {Set<string>} dictionary - Set of valid words
 * @returns {{ valid: boolean, reason?: string }} Validation result
 */
export function validateWord(word, dictionary) {
  if (word.length !== WORD_LENGTH) {
    return { valid: false, reason: 'wrong-length' };
  }

  if (!dictionary.has(word)) {
    return { valid: false, reason: 'not-in-dictionary' };
  }

  return { valid: true };
}

// =============================================================================
// Keyboard State Management
// =============================================================================

/**
 * GameLogic class for stateful keyboard tracking.
 *
 * iOS: class GameLogic { var keyboardState: [Character: LetterState] }
 *
 * Manages keyboard letter states across guesses with priority:
 * correct > present > absent > unknown
 */
export class GameLogic {
  constructor() {
    /** @type {Map<string, string>} Letter -> 'correct' | 'present' | 'absent' */
    this.keyboardState = new Map();
  }

  /**
   * Update keyboard state for a letter.
   * Priority: correct > present > absent
   *
   * @param {string} letter - Single letter (uppercase)
   * @param {string} result - 'correct', 'present', or 'absent'
   * @returns {Map<string, string>} Updated keyboard state
   */
  updateKeyboardState(letter, result) {
    const current = this.keyboardState.get(letter);

    // Priority: correct always wins
    if (result === 'correct') {
      this.keyboardState.set(letter, 'correct');
    } else if (result === 'present' && current !== 'correct') {
      // Yellow only if not already green
      this.keyboardState.set(letter, 'present');
    } else if (result === 'absent' && !current) {
      // Gray only if no state yet
      this.keyboardState.set(letter, 'absent');
    }

    return this.keyboardState;
  }

  /**
   * Update keyboard state for an entire guess result.
   *
   * @param {string} guess - The guessed word (uppercase)
   * @param {string[]} result - Array of letter results
   * @returns {Map<string, string>} Updated keyboard state
   */
  updateKeyboardFromGuess(guess, result) {
    for (let i = 0; i < guess.length; i++) {
      this.updateKeyboardState(guess[i], result[i]);
    }
    return this.keyboardState;
  }

  /**
   * Reset keyboard state for new game.
   */
  resetKeyboard() {
    this.keyboardState.clear();
  }

  /**
   * Get state for a specific letter.
   *
   * @param {string} letter - Single letter
   * @returns {string|undefined} 'correct', 'present', 'absent', or undefined
   */
  getLetterState(letter) {
    return this.keyboardState.get(letter.toUpperCase());
  }
}

// =============================================================================
// Force-Submit Logic (Dictionary Bypass)
// =============================================================================

/**
 * Handle dictionary rejection with force-submit logic.
 *
 * If a word is rejected twice in a row, allow force-submit to bypass dictionary.
 * This handles edge cases where valid words aren't in our dictionary.
 *
 * iOS: struct RejectionResult { action: RejectionAction, count: Int, lastRejected: String? }
 *
 * @param {string} word - The rejected word
 * @param {string|null} lastRejected - Previously rejected word
 * @param {number} rejectionCount - Number of times current word rejected
 * @returns {{ action: string, count: number, lastRejected: string|null }}
 */
export function handleRejection(word, lastRejected, rejectionCount) {
  if (word === lastRejected) {
    const newCount = rejectionCount + 1;
    if (newCount >= 3) {
      // Allow force-submit on third rejection of same word (after two warnings)
      return { action: 'force-submit', count: 0, lastRejected: null };
    }
    return { action: 'warn', count: newCount, lastRejected: word };
  }
  // New word - reset count
  return { action: 'reject', count: 1, lastRejected: word };
}

// =============================================================================
// Game State Helpers
// =============================================================================

/**
 * Check if game is over (won or out of guesses).
 *
 * @param {string[]} guesses - Array of guesses made
 * @param {string[]|null} lastResult - Result of last guess
 * @returns {{ gameOver: boolean, won: boolean }}
 */
export function checkGameOver(guesses, lastResult) {
  if (lastResult && isWinningResult(lastResult)) {
    return { gameOver: true, won: true };
  }

  if (isOutOfGuesses(guesses.length)) {
    return { gameOver: true, won: false };
  }

  return { gameOver: false, won: false };
}

/**
 * Get remaining guesses count.
 *
 * @param {number} guessCount - Current guess count
 * @returns {number} Remaining guesses (0-6)
 */
export function getRemainingGuesses(guessCount) {
  return Math.max(0, MAX_GUESSES - guessCount);
}
