-- Migration 003: Create wordle_games, wordle_results, wordle_stats tables
-- These tables are already referenced in code but never had migrations created
-- This fixes the technical debt of missing schema definitions

-- Drop existing tables if they exist (they may have incomplete schemas)
DROP TABLE IF EXISTS wordle_results CASCADE;
DROP TABLE IF EXISTS wordle_games CASCADE;
DROP TABLE IF EXISTS wordle_stats CASCADE;

-- Game sessions
CREATE TABLE wordle_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  word TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (game_mode IN ('casual', 'competitive')),
  word_mode TEXT NOT NULL CHECK (word_mode IN ('daily', 'random')),
  daily_number INTEGER,  -- NULL for random games
  is_solo BOOLEAN DEFAULT false,
  player_count INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-player results per game
CREATE TABLE wordle_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES wordle_games(id) ON DELETE CASCADE,
  player_email TEXT NOT NULL,
  player_name TEXT NOT NULL,
  guesses INTEGER NOT NULL,
  solve_time_ms INTEGER,
  won BOOLEAN NOT NULL,
  score INTEGER DEFAULT 0,
  finish_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregate player statistics (upserted on each game)
CREATE TABLE wordle_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_email TEXT UNIQUE NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  -- Guess distribution (for chart)
  guesses_1 INTEGER DEFAULT 0,
  guesses_2 INTEGER DEFAULT 0,
  guesses_3 INTEGER DEFAULT 0,
  guesses_4 INTEGER DEFAULT 0,
  guesses_5 INTEGER DEFAULT 0,
  guesses_6 INTEGER DEFAULT 0,
  -- Time stats
  fastest_solve_ms INTEGER,
  avg_solve_time_ms INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wordle_games_daily ON wordle_games(daily_number) WHERE daily_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wordle_games_created ON wordle_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wordle_results_game ON wordle_results(game_id);
CREATE INDEX IF NOT EXISTS idx_wordle_results_player ON wordle_results(player_email);
CREATE INDEX IF NOT EXISTS idx_wordle_results_created ON wordle_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wordle_stats_player ON wordle_stats(player_email);

-- Row Level Security
ALTER TABLE wordle_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordle_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordle_stats ENABLE ROW LEVEL SECURITY;

-- Policies: Public read for leaderboards, server writes via service key
CREATE POLICY "wordle_games_public_read" ON wordle_games FOR SELECT USING (true);
CREATE POLICY "wordle_results_public_read" ON wordle_results FOR SELECT USING (true);
CREATE POLICY "wordle_stats_public_read" ON wordle_stats FOR SELECT USING (true);

COMMENT ON TABLE wordle_games IS 'Game session metadata';
COMMENT ON TABLE wordle_results IS 'Per-player results for each game';
COMMENT ON TABLE wordle_stats IS 'Aggregate player statistics, upserted after each game';
