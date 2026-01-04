-- Migration 004: Create wordle_guesses table for granular guess tracking
-- Enables: per-guess timing, letter result analysis, starting word analytics

CREATE TABLE IF NOT EXISTS wordle_guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES wordle_games(id) ON DELETE CASCADE,
  player_email TEXT NOT NULL,
  guess_number INTEGER NOT NULL CHECK (guess_number BETWEEN 1 AND 6),
  guess_word TEXT NOT NULL CHECK (length(guess_word) = 5),
  -- Timing
  elapsed_ms INTEGER NOT NULL,           -- Time since game start
  time_since_last_ms INTEGER,            -- Time since previous guess (NULL for first)
  -- Results (JSONB for flexibility)
  letter_results JSONB NOT NULL,         -- ['correct','present','absent','absent','correct']
  correct_count INTEGER NOT NULL,        -- Green letters (0-5)
  present_count INTEGER NOT NULL,        -- Yellow letters (0-5)
  -- Metadata
  is_winning_guess BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each player can only have one guess per guess_number per game
  UNIQUE(game_id, player_email, guess_number)
);

-- Indexes for common queries
-- Primary lookup: get all guesses for a game/player
CREATE INDEX IF NOT EXISTS idx_guesses_game_player ON wordle_guesses(game_id, player_email);

-- Player history: recent guesses for a player
CREATE INDEX IF NOT EXISTS idx_guesses_player_time ON wordle_guesses(player_email, created_at DESC);

-- Starting word analytics: find first guesses by player
CREATE INDEX IF NOT EXISTS idx_guesses_first ON wordle_guesses(player_email, guess_word) WHERE guess_number = 1;

-- Row Level Security
ALTER TABLE wordle_guesses ENABLE ROW LEVEL SECURITY;

-- Public read for analytics, server writes via service key
CREATE POLICY "wordle_guesses_public_read" ON wordle_guesses FOR SELECT USING (true);

COMMENT ON TABLE wordle_guesses IS 'Individual guesses with timing and letter results for analytics';
COMMENT ON COLUMN wordle_guesses.letter_results IS 'Array of results per letter: correct, present, or absent';
COMMENT ON COLUMN wordle_guesses.elapsed_ms IS 'Milliseconds since game start when guess was made';
COMMENT ON COLUMN wordle_guesses.time_since_last_ms IS 'Milliseconds since previous guess (NULL for first guess)';
