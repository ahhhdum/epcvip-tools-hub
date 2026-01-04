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
