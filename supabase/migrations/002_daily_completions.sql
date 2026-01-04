-- Daily Challenge Completions
-- Tracks one attempt per user per daily challenge

CREATE TABLE IF NOT EXISTS daily_challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_email TEXT NOT NULL,
  daily_number INTEGER NOT NULL,
  word TEXT NOT NULL,
  guesses TEXT[] NOT NULL,
  guess_count INTEGER NOT NULL,
  won BOOLEAN NOT NULL,
  solve_time_ms INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_email, daily_number)
);

-- Row Level Security
ALTER TABLE daily_challenge_completions ENABLE ROW LEVEL SECURITY;

-- Anyone can read (for leaderboards)
DROP POLICY IF EXISTS "Public read" ON daily_challenge_completions;
CREATE POLICY "Public read" ON daily_challenge_completions
  FOR SELECT USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_daily_completions_email
  ON daily_challenge_completions(player_email);
CREATE INDEX IF NOT EXISTS idx_daily_completions_daily
  ON daily_challenge_completions(daily_number);
CREATE INDEX IF NOT EXISTS idx_daily_completions_daily_won
  ON daily_challenge_completions(daily_number, won);
