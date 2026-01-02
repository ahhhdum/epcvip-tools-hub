-- Players table (extends Supabase auth.users)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yuithqxycicgokkgmpzg/sql/new

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  character_id TEXT DEFAULT 'Farmer_Bob',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Anyone can read player profiles
CREATE POLICY "Public read" ON players
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Self update" ON players
  FOR UPDATE USING (auth.uid() = id);

-- Users can only insert their own profile
CREATE POLICY "Self insert" ON players
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_display_name ON players(display_name);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
