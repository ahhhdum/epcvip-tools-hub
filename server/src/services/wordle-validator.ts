/**
 * Wordle Guess Validation Service
 *
 * Pure functions for validating guesses against target words.
 * Stateless and easily testable.
 */

import { WORD_LENGTH, MAX_GUESSES, SCORING } from '../constants/wordle-constants';

// Letter result types
export type LetterResult = 'correct' | 'present' | 'absent';

/**
 * Validate a guess against the target word.
 *
 * Algorithm:
 * 1. First pass: Mark exact position matches as 'correct'
 * 2. Second pass: Mark letters present in wrong position as 'present'
 *    (only if that letter hasn't been used by a 'correct' match)
 *
 * @param guess - The player's guess (uppercase, 5 letters)
 * @param target - The target word (uppercase, 5 letters)
 * @returns Array of 5 LetterResults
 */
export function validateGuess(guess: string, target: string): LetterResult[] {
  const result: LetterResult[] = new Array(WORD_LENGTH).fill('absent');
  const targetChars = target.split('');
  const used = new Set<number>();

  // First pass: mark exact matches
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === target[i]) {
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
 * Check if a guess result represents a win (all correct).
 */
export function isWinningResult(result: LetterResult[]): boolean {
  return result.every((r) => r === 'correct');
}

/**
 * Check if player has exhausted all guesses.
 */
export function isOutOfGuesses(guessCount: number): boolean {
  return guessCount >= MAX_GUESSES;
}

/**
 * Count the number of correct (green) letters in a result.
 */
export function countCorrectLetters(result: LetterResult[]): number {
  return result.filter((r) => r === 'correct').length;
}

/**
 * Calculate competitive mode score.
 *
 * Score formula:
 * - Base: (7 - guesses) * 100 (fewer guesses = more points)
 * - Time bonus: up to 60 bonus points for faster solves
 *
 * @param guessCount - Number of guesses used (1-6)
 * @param solveTimeMs - Time to solve in milliseconds
 * @returns Calculated score (integer)
 */
export function calculateScore(guessCount: number, solveTimeMs: number): number {
  const guessBonus = (MAX_GUESSES + 1 - guessCount) * SCORING.GUESS_BONUS_MULTIPLIER;
  const timeBonus =
    Math.max(0, SCORING.TIME_BONUS_THRESHOLD_MS - solveTimeMs) / SCORING.TIME_BONUS_DIVISOR;
  return Math.round(guessBonus + timeBonus);
}

/**
 * Normalize a guess to uppercase.
 */
export function normalizeGuess(word: string): string {
  return word.toUpperCase();
}

// =============================================================================
// Hard Mode Validation
// =============================================================================

export interface HardModeViolation {
  valid: boolean;
  violation?: string;
  letter?: string;
  position?: number;
}

/**
 * Validate a guess meets Hard Mode constraints.
 *
 * Hard Mode rules (matches official Wordle):
 * 1. Any letter revealed as green (correct) MUST be in the same position
 * 2. Any letter revealed as yellow (present) MUST appear somewhere in the guess
 *
 * @param currentGuess - The guess being submitted (uppercase)
 * @param previousGuesses - All previous guesses (uppercase)
 * @param previousResults - All previous letter results
 * @returns Validation result with optional violation message
 */
export function validateHardMode(
  currentGuess: string,
  previousGuesses: string[],
  previousResults: LetterResult[][]
): HardModeViolation {
  // Build constraints from all previous guesses
  const greenLetters = new Map<number, string>(); // position -> required letter
  const yellowLetters = new Map<string, number>(); // letter -> minimum occurrences required

  for (let guessIdx = 0; guessIdx < previousGuesses.length; guessIdx++) {
    const guess = previousGuesses[guessIdx];
    const result = previousResults[guessIdx];

    for (let pos = 0; pos < WORD_LENGTH; pos++) {
      const letter = guess[pos];
      const letterResult = result[pos];

      if (letterResult === 'correct') {
        // Green: must be in same position
        greenLetters.set(pos, letter);
      } else if (letterResult === 'present') {
        // Yellow: must appear somewhere (track count for duplicates)
        yellowLetters.set(letter, (yellowLetters.get(letter) || 0) + 1);
      }
    }
  }

  // Check green letter constraints (exact position)
  for (const [pos, requiredLetter] of greenLetters) {
    if (currentGuess[pos] !== requiredLetter) {
      const ordinal = getOrdinal(pos + 1);
      return {
        valid: false,
        violation: `${ordinal} letter must be ${requiredLetter}`,
        letter: requiredLetter,
        position: pos,
      };
    }
  }

  // Check yellow letter constraints (must appear somewhere)
  // Count occurrences of each letter in current guess
  const currentLetterCounts = new Map<string, number>();
  for (const letter of currentGuess) {
    currentLetterCounts.set(letter, (currentLetterCounts.get(letter) || 0) + 1);
  }

  // But don't count letters that are already satisfying green constraints
  for (const [pos, letter] of greenLetters) {
    const count = currentLetterCounts.get(letter) || 0;
    if (count > 0) {
      currentLetterCounts.set(letter, count - 1);
    }
  }

  // Now check yellow requirements (simplified: just check if letter appears)
  for (const [letter] of yellowLetters) {
    if (!currentGuess.includes(letter)) {
      return {
        valid: false,
        violation: `Guess must contain ${letter}`,
        letter,
      };
    }
  }

  return { valid: true };
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
