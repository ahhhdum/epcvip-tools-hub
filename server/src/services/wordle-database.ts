/**
 * Wordle Database Service
 *
 * Handles all Supabase database operations for Wordle Battle.
 * Provides async-safe patterns with proper error handling.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
 * @param roomCode - Room code
 * @param word - Target word
 * @param gameMode - Game mode (casual/competitive)
 * @param startTime - Game start timestamp
 * @param results - Array of player results
 */
export async function saveGameResults(
  roomCode: string,
  word: string,
  gameMode: string,
  startTime: number | null,
  results: GameResultData[]
): Promise<void> {
  const db = getSupabase();
  if (!db) {
    console.log('[Wordle] Database not configured, skipping stats save');
    return;
  }

  try {
    // Insert game record
    const { data: game, error: gameError } = await db
      .from('wordle_games')
      .insert({
        room_code: roomCode,
        word: word,
        game_mode: gameMode,
        started_at: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        ended_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (gameError) {
      console.error('[Wordle] Failed to insert game:', gameError);
      return;
    }

    // Insert player results
    const resultRecords = results.map((r) => ({
      game_id: game.id,
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
        await updatePlayerStats(db, r.email, r.won, r.guesses);
      }
    }

    console.log(`[Wordle] Saved game ${game.id} with ${results.length} player results`);
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
 */
async function updatePlayerStats(
  db: SupabaseClient,
  email: string,
  won: boolean,
  guesses: number
): Promise<void> {
  // Get existing stats or create new
  const { data: existing } = await db
    .from('wordle_stats')
    .select('*')
    .eq('player_email', email)
    .single();

  if (existing) {
    // Update existing stats
    const newStreak = won ? existing.current_streak + 1 : 0;
    await db
      .from('wordle_stats')
      .update({
        games_played: existing.games_played + 1,
        games_won: existing.games_won + (won ? 1 : 0),
        total_guesses: existing.total_guesses + guesses,
        current_streak: newStreak,
        best_streak: Math.max(existing.best_streak, newStreak),
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
    });
  }
}
