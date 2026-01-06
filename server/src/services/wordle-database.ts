/**
 * Wordle Database Service
 *
 * Handles all Supabase database operations for Wordle Battle.
 * Provides async-safe patterns with proper error handling.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LetterResult } from './wordle-validator';
import { WordMode } from '../utils/daily-word';

// Supabase client singleton
let supabase: SupabaseClient | null = null;

/**
 * Initialize or get Supabase client
 */
export function getSupabase(): SupabaseClient | null {
  if (supabase) {
    return supabase;
  }

  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || '';

  if (url && key) {
    supabase = createClient(url, key);
  }

  return supabase;
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return getSupabase() !== null;
}

/**
 * Game result for saving
 */
export interface GameResultData {
  playerId: string;
  name: string;
  email: string | null;
  won: boolean;
  guesses: number;
  time: number;
  score: number;
  finishPosition: number;
}

/**
 * Player data for daily challenge completion
 */
export interface DailyChallengePlayerData {
  email: string;
  guesses: string[];
  guessCount: number;
  won: boolean;
  solveTimeMs: number | null;
}

/**
 * Data for saving an individual guess
 */
export interface GuessData {
  gameId: string;
  playerEmail: string;
  guessNumber: number;
  guessWord: string;
  elapsedMs: number;
  timeSinceLastMs: number | null;
  letterResults: LetterResult[];
  correctCount: number;
  presentCount: number;
  isWinningGuess: boolean;
}

/**
 * Game metadata for creating a game record
 */
export interface GameMetadata {
  roomCode: string;
  word: string;
  gameMode: 'casual' | 'competitive';
  wordMode: WordMode;
  dailyNumber: number | null;
  isSolo: boolean;
  playerCount: number;
  startTime: number | null;
}

/**
 * Create a game record and return the game ID
 *
 * @param metadata - Game metadata
 * @returns The game ID, or null if creation failed
 */
export async function createGame(metadata: GameMetadata): Promise<string | null> {
  const db = getSupabase();
  if (!db) {
    console.log('[Wordle] Database not configured, skipping game creation');
    return null;
  }

  try {
    const { data: game, error } = await db
      .from('wordle_games')
      .insert({
        room_code: metadata.roomCode,
        word: metadata.word,
        game_mode: metadata.gameMode,
        word_mode: metadata.wordMode,
        daily_number: metadata.dailyNumber,
        is_solo: metadata.isSolo,
        player_count: metadata.playerCount,
        started_at: metadata.startTime
          ? new Date(metadata.startTime).toISOString()
          : new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Wordle] Failed to create game:', error);
      return null;
    }

    console.log(`[Wordle] Created game ${game.id}`);
    return game.id;
  } catch (err) {
    console.error('[Wordle] Database error creating game:', err);
    return null;
  }
}

/**
 * Save an individual guess with timing and letter results
 *
 * @param data - Guess data
 */
export async function saveGuess(data: GuessData): Promise<void> {
  const db = getSupabase();
  if (!db || !data.gameId) return;

  try {
    const { error } = await db.from('wordle_guesses').insert({
      game_id: data.gameId,
      player_email: data.playerEmail,
      guess_number: data.guessNumber,
      guess_word: data.guessWord,
      elapsed_ms: data.elapsedMs,
      time_since_last_ms: data.timeSinceLastMs,
      letter_results: data.letterResults,
      correct_count: data.correctCount,
      present_count: data.presentCount,
      is_winning_guess: data.isWinningGuess,
    });

    if (error) {
      console.error('[Wordle] Failed to save guess:', error);
    }
  } catch (err) {
    console.error('[Wordle] Database error saving guess:', err);
  }
}

/**
 * Check if player has already completed a daily challenge
 *
 * @param playerEmail - Player's email
 * @param dailyNumber - The daily challenge number
 * @returns true if already completed, false otherwise
 */
export async function hasCompletedDailyChallenge(
  playerEmail: string,
  dailyNumber: number
): Promise<boolean> {
  const db = getSupabase();
  if (!db) return false;

  try {
    const { data } = await db
      .from('daily_challenge_completions')
      .select('id')
      .eq('player_email', playerEmail)
      .eq('daily_number', dailyNumber)
      .single();

    return data !== null;
  } catch {
    // PGRST116 = not found, which is OK
    // Other errors we'll treat as "not completed" to allow play
    return false;
  }
}

/**
 * Save game results to database
 *
 * @param gameId - Game ID (from createGame, or null to create new)
 * @param results - Array of player results
 */
export async function saveGameResults(
  gameId: string | null,
  results: GameResultData[]
): Promise<void> {
  const db = getSupabase();
  if (!db) {
    console.log('[Wordle] Database not configured, skipping stats save');
    return;
  }

  if (!gameId) {
    console.log('[Wordle] No game ID provided, skipping results save');
    return;
  }

  try {
    // Mark game as ended
    await db.from('wordle_games').update({ ended_at: new Date().toISOString() }).eq('id', gameId);

    // Insert player results
    const resultRecords = results.map((r) => ({
      game_id: gameId,
      player_email: r.email,
      player_name: r.name,
      guesses: r.guesses,
      solve_time_ms: r.time,
      won: r.won,
      score: r.score,
      finish_position: r.finishPosition,
    }));

    const { error: resultsError } = await db.from('wordle_results').insert(resultRecords);

    if (resultsError) {
      console.error('[Wordle] Failed to insert results:', resultsError);
    }

    // Update stats for authenticated players
    for (const r of results) {
      if (r.email) {
        await updatePlayerStats(db, r.email, r.won, r.guesses, r.time);
      }
    }

    console.log(`[Wordle] Saved game ${gameId} with ${results.length} player results`);
  } catch (err) {
    console.error('[Wordle] Database error:', err);
  }
}

/**
 * Save daily challenge completions for all authenticated players
 *
 * FIX: Uses pre-collected player data to avoid iterating over mutable Map during async
 *
 * @param dailyNumber - The daily challenge number
 * @param word - Target word
 * @param players - Array of player completion data (pre-collected from room)
 */
export async function saveDailyChallengeCompletions(
  dailyNumber: number,
  word: string,
  players: DailyChallengePlayerData[]
): Promise<void> {
  const db = getSupabase();
  if (!db) return;

  // Process each player sequentially
  for (const player of players) {
    try {
      await db.from('daily_challenge_completions').upsert(
        {
          player_email: player.email,
          daily_number: dailyNumber,
          word: word,
          guesses: player.guesses,
          guess_count: player.guessCount,
          won: player.won,
          solve_time_ms: player.solveTimeMs,
        },
        { onConflict: 'player_email,daily_number' }
      );
      console.log(`[Wordle] Daily completion saved for ${player.email}`);
    } catch (e) {
      console.error(`[Wordle] Failed to save daily completion for ${player.email}:`, e);
    }
  }
}

/**
 * Update aggregate stats for a player
 *
 * @param db - Supabase client
 * @param email - Player email
 * @param won - Whether player won
 * @param guesses - Number of guesses used (1-6)
 * @param solveTimeMs - Solve time in milliseconds (only for wins)
 */
async function updatePlayerStats(
  db: SupabaseClient,
  email: string,
  won: boolean,
  guesses: number,
  solveTimeMs: number | null
): Promise<void> {
  // Get existing stats or create new
  const { data: existing } = await db
    .from('wordle_stats')
    .select('*')
    .eq('player_email', email)
    .single();

  // Build guess distribution update (guesses_1 through guesses_6)
  const guessDistKey = `guesses_${Math.min(Math.max(guesses, 1), 6)}` as
    | 'guesses_1'
    | 'guesses_2'
    | 'guesses_3'
    | 'guesses_4'
    | 'guesses_5'
    | 'guesses_6';

  if (existing) {
    // Update existing stats
    const newStreak = won ? existing.current_streak + 1 : 0;
    const newGamesPlayed = existing.games_played + 1;

    // Calculate new time stats (only for wins)
    let fastestSolveMs = existing.fastest_solve_ms;
    let avgSolveTimeMs = existing.avg_solve_time_ms;

    if (won && solveTimeMs !== null) {
      // Update fastest time
      if (fastestSolveMs === null || solveTimeMs < fastestSolveMs) {
        fastestSolveMs = solveTimeMs;
      }

      // Calculate new average (weighted average with new game)
      const totalWins = existing.games_won + 1;
      if (avgSolveTimeMs !== null) {
        // Weighted average: ((old_avg * old_wins) + new_time) / new_wins
        avgSolveTimeMs = Math.round(
          (avgSolveTimeMs * existing.games_won + solveTimeMs) / totalWins
        );
      } else {
        avgSolveTimeMs = solveTimeMs;
      }
    }

    // Increment the guess distribution column
    const currentDistValue = (existing[guessDistKey] as number) || 0;

    await db
      .from('wordle_stats')
      .update({
        games_played: newGamesPlayed,
        games_won: existing.games_won + (won ? 1 : 0),
        total_guesses: existing.total_guesses + guesses,
        current_streak: newStreak,
        best_streak: Math.max(existing.best_streak, newStreak),
        [guessDistKey]: currentDistValue + 1,
        fastest_solve_ms: fastestSolveMs,
        avg_solve_time_ms: avgSolveTimeMs,
        updated_at: new Date().toISOString(),
      })
      .eq('player_email', email);
  } else {
    // Create new stats record
    await db.from('wordle_stats').insert({
      player_email: email,
      games_played: 1,
      games_won: won ? 1 : 0,
      total_guesses: guesses,
      current_streak: won ? 1 : 0,
      best_streak: won ? 1 : 0,
      [guessDistKey]: 1,
      fastest_solve_ms: won ? solveTimeMs : null,
      avg_solve_time_ms: won ? solveTimeMs : null,
    });
  }
}
