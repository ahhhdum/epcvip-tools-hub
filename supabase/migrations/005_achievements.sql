-- Migration 005: Create achievements tables
-- Schema foundation for achievement system - logic implementation deferred

-- Achievement definitions (seeded, rarely changes)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'speed', 'daily', 'collector')),
  icon TEXT,                             -- Emoji or icon name
  threshold INTEGER,                     -- e.g., 100 for "100 games played"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player earned achievements
CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_email TEXT NOT NULL,
  achievement_code TEXT REFERENCES achievements(code) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_email, achievement_code)
);

-- Progress tracking for incremental achievements
CREATE TABLE IF NOT EXISTS player_achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_email TEXT NOT NULL,
  achievement_code TEXT NOT NULL,
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_email, achievement_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_email);
CREATE INDEX IF NOT EXISTS idx_player_achievements_code ON player_achievements(achievement_code);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_player ON player_achievement_progress(player_email);

-- Row Level Security
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievement_progress ENABLE ROW LEVEL SECURITY;

-- Public read for all, server writes via service key
CREATE POLICY "achievements_public_read" ON achievements FOR SELECT USING (true);
CREATE POLICY "player_achievements_public_read" ON player_achievements FOR SELECT USING (true);
CREATE POLICY "achievement_progress_public_read" ON player_achievement_progress FOR SELECT USING (true);

-- Seed initial achievements
-- These can be expanded later as new achievements are designed
INSERT INTO achievements (code, name, description, category, icon, threshold) VALUES
  -- Milestone achievements
  ('first_win', 'First Victory', 'Win your first game', 'milestone', '🏆', 1),
  ('veteran', 'Veteran', 'Play 100 games', 'milestone', '⭐', 100),
  ('grandmaster', 'Grandmaster', 'Play 1000 games', 'milestone', '👑', 1000),

  -- Streak achievements
  ('hot_streak_3', 'Hot Streak', 'Win 3 games in a row', 'streak', '🔥', 3),
  ('on_fire_7', 'On Fire', 'Win 7 games in a row', 'streak', '🔥', 7),
  ('unstoppable_30', 'Unstoppable', 'Win 30 games in a row', 'streak', '💪', 30),

  -- Speed achievements
  ('speed_demon', 'Speed Demon', 'Solve in under 30 seconds', 'speed', '⚡', 30000),
  ('lucky_guess', 'Lucky Guess', 'Win on first guess', 'speed', '🍀', 1),

  -- Daily challenge achievements
  ('daily_devotee', 'Daily Devotee', 'Complete 30 daily challenges', 'daily', '📅', 30),
  ('week_warrior', 'Week Warrior', '7-day daily challenge streak', 'daily', '🗓️', 7),
  ('monthly_master', 'Monthly Master', '30-day daily challenge streak', 'daily', '📆', 30)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE achievements IS 'Achievement definitions with thresholds and metadata';
COMMENT ON TABLE player_achievements IS 'Earned achievements per player';
COMMENT ON TABLE player_achievement_progress IS 'Progress tracking for incremental achievements';
