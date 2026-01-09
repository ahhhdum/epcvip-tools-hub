/**
 * Word Service
 *
 * Database-backed word validation and selection service.
 * Replaces in-memory word list checks with cached DB queries.
 *
 * Features:
 * - Cached lookups for fast validation
 * - Tier-based word selection
 * - Sabotage eligibility checks
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface Word {
  id: string;
  word: string;
  length: number;
  tier: 'common' | 'challenging' | 'expert' | 'obscure';
  is_valid_guess: boolean;
  is_answer_eligible: boolean;
  is_sabotage_eligible: boolean;
  frequency_score?: number;
  letter_pattern?: string;
  has_double_letters: boolean;
  has_uncommon_letters: boolean;
  unique_letters?: number;
}

export interface WordSelectionOptions {
  length?: number;
  tiers?: Array<'common' | 'challenging' | 'expert'>;
  sabotageOnly?: boolean;
  answerOnly?: boolean;
}

// ============================================================================
// CACHE
// ============================================================================

/**
 * In-memory cache for word lookups.
 * Loaded once on startup, refreshed periodically.
 */
class WordCache {
  private sabotageWords: Set<string> = new Set();
  private answerWords: Set<string> = new Set();
  private allWords: Set<string> = new Set();
  private lastRefresh: number = 0;
  private refreshInterval: number = 5 * 60 * 1000; // 5 minutes

  isStale(): boolean {
    return Date.now() - this.lastRefresh > this.refreshInterval;
  }

  setSabotageWords(words: string[]): void {
    this.sabotageWords = new Set(words.map((w) => w.toUpperCase()));
  }

  setAnswerWords(words: string[]): void {
    this.answerWords = new Set(words.map((w) => w.toUpperCase()));
  }

  setAllWords(words: string[]): void {
    this.allWords = new Set(words.map((w) => w.toUpperCase()));
  }

  markRefreshed(): void {
    this.lastRefresh = Date.now();
  }

  isSabotageEligible(word: string): boolean {
    return this.sabotageWords.has(word.toUpperCase());
  }

  isAnswerEligible(word: string): boolean {
    return this.answerWords.has(word.toUpperCase());
  }

  isValidWord(word: string): boolean {
    return this.allWords.has(word.toUpperCase());
  }

  getSabotageCount(): number {
    return this.sabotageWords.size;
  }

  getAnswerCount(): number {
    return this.answerWords.size;
  }
}

// ============================================================================
// WORD SERVICE
// ============================================================================

export class WordService {
  private supabase: SupabaseClient | null = null;
  private cache: WordCache = new WordCache();
  private initialized: boolean = false;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Initialize the cache from database
   */
  async initialize(): Promise<void> {
    if (!this.supabase) {
      console.warn('[WordService] No Supabase connection, using fallback');
      this.useFallback();
      return;
    }

    try {
      // Load sabotage-eligible words
      const { data: sabotageWords, error: sabotageError } = await this.supabase
        .from('words')
        .select('word')
        .eq('is_sabotage_eligible', true);

      if (sabotageError) throw sabotageError;

      // Load answer-eligible words
      const { data: answerWords, error: answerError } = await this.supabase
        .from('words')
        .select('word')
        .eq('is_answer_eligible', true);

      if (answerError) throw answerError;

      // Load all words
      const { data: allWords, error: allError } = await this.supabase
        .from('words')
        .select('word')
        .eq('is_valid_guess', true);

      if (allError) throw allError;

      this.cache.setSabotageWords(sabotageWords?.map((w) => w.word) || []);
      this.cache.setAnswerWords(answerWords?.map((w) => w.word) || []);
      this.cache.setAllWords(allWords?.map((w) => w.word) || []);
      this.cache.markRefreshed();
      this.initialized = true;

      console.log(
        `[WordService] Initialized: ${this.cache.getSabotageCount()} sabotage, ${this.cache.getAnswerCount()} answer words`
      );
    } catch (err) {
      console.error('[WordService] Failed to initialize from DB:', err);
      this.useFallback();
    }
  }

  /**
   * Fall back to in-memory word lists if DB unavailable
   */
  private useFallback(): void {
    // Import the in-memory lists as fallback
    const { WORD_LIST } = require('../utils/word-list');
    const { CHALLENGING_WORDS } = require('../data/challenging-words');

    const sabotageWords = [...WORD_LIST, ...CHALLENGING_WORDS];
    this.cache.setSabotageWords(sabotageWords);
    this.cache.setAnswerWords(WORD_LIST);
    this.cache.setAllWords(sabotageWords);
    this.cache.markRefreshed();
    this.initialized = true;

    console.log(`[WordService] Using fallback: ${this.cache.getSabotageCount()} sabotage words`);
  }

  /**
   * Refresh cache if stale
   */
  async refreshIfNeeded(): Promise<void> {
    if (this.cache.isStale()) {
      await this.initialize();
    }
  }

  /**
   * Check if a word is sabotage-eligible
   */
  async isSabotageEligible(word: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.cache.isSabotageEligible(word);
  }

  /**
   * Check if a word is answer-eligible (for Daily/Random)
   */
  async isAnswerEligible(word: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.cache.isAnswerEligible(word);
  }

  /**
   * Check if a word is valid (can be guessed)
   */
  async isValidWord(word: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.cache.isValidWord(word);
  }

  /**
   * Get a random word from the database
   */
  async getRandomWord(options: WordSelectionOptions = {}): Promise<string | null> {
    if (!this.supabase) {
      // Fallback to in-memory
      const { getRandomWord } = require('../utils/word-list');
      return getRandomWord();
    }

    let query = this.supabase.from('words').select('word');

    if (options.length) {
      query = query.eq('length', options.length);
    }

    if (options.tiers && options.tiers.length > 0) {
      query = query.in('tier', options.tiers);
    }

    if (options.sabotageOnly) {
      query = query.eq('is_sabotage_eligible', true);
    }

    if (options.answerOnly) {
      query = query.eq('is_answer_eligible', true);
    }

    // Get count first
    const { count } = await query;
    if (!count || count === 0) return null;

    // Random offset
    const offset = Math.floor(Math.random() * count);
    const { data } = await query.range(offset, offset).single();

    return data?.word || null;
  }

  /**
   * Get sabotage-eligible word count
   */
  getSabotageWordCount(): number {
    return this.cache.getSabotageCount();
  }

  /**
   * Get answer-eligible word count
   */
  getAnswerWordCount(): number {
    return this.cache.getAnswerCount();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let wordServiceInstance: WordService | null = null;

export function getWordService(): WordService {
  if (!wordServiceInstance) {
    wordServiceInstance = new WordService();
  }
  return wordServiceInstance;
}

/**
 * Initialize word service (call on server startup)
 */
export async function initializeWordService(): Promise<void> {
  const service = getWordService();
  await service.initialize();
}
