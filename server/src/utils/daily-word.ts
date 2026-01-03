/**
 * Daily Word System for Wordle Battle
 *
 * Provides the same word for everyone on a given day.
 * Uses date-based indexing on the word list.
 */

import { WORD_LIST } from './word-list';

// Our epoch - the starting date for daily word indexing
const EPOCH = new Date('2024-01-01T00:00:00Z');

/**
 * Get the daily word for a specific date (defaults to today)
 * Everyone playing on the same day gets the same word
 */
export function getDailyWord(date?: Date): string {
  const targetDate = date || new Date();

  // Normalize to midnight UTC
  const normalized = new Date(
    Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  );

  // Calculate days since epoch
  const daysSinceEpoch = Math.floor(
    (normalized.getTime() - EPOCH.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Use absolute value in case date is before epoch
  const index = Math.abs(daysSinceEpoch) % WORD_LIST.length;

  return WORD_LIST[index];
}

/**
 * Get the day number (for display purposes)
 * e.g., "Daily Challenge #365"
 */
export function getDailyNumber(date?: Date): number {
  const targetDate = date || new Date();

  const normalized = new Date(
    Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  );

  const daysSinceEpoch = Math.floor(
    (normalized.getTime() - EPOCH.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.abs(daysSinceEpoch) + 1;
}

export type WordMode = 'daily' | 'random';
