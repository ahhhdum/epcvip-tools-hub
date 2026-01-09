-- Migration 006: Create words table for word metadata and eligibility
-- This is the foundation for the Word Intelligence system.
-- See: docs/plans/WORD_INTELLIGENCE_ROADMAP.md

-- Drop existing table if it exists (dev only - remove for production)
DROP TABLE IF EXISTS words CASCADE;

-- Main words table
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  length INTEGER NOT NULL DEFAULT 5 CHECK (length BETWEEN 4 AND 7),

  -- Tier classification (see docs/plans/WORD_CURATION_CRITERIA.md)
  -- common: everyday words, grade school vocabulary
  -- challenging: SAT/GRE level, educated adults recognize
  -- expert: specialist vocabulary, crossword enthusiast level
  -- obscure: too obscure for gameplay, blocked
  tier TEXT NOT NULL DEFAULT 'challenging' CHECK (tier IN ('common', 'challenging', 'expert', 'obscure')),

  -- Eligibility flags
  is_valid_guess BOOLEAN NOT NULL DEFAULT true,      -- Can be typed as a guess
  is_answer_eligible BOOLEAN NOT NULL DEFAULT true,  -- Can be a target word (Daily/Random)
  is_sabotage_eligible BOOLEAN NOT NULL DEFAULT true, -- Can be picked in Sabotage mode

  -- Frequency data (populated later from n-gram corpus)
  frequency_score DECIMAL(12, 10),  -- Normalized 0-1, higher = more common
  frequency_rank INTEGER,           -- Rank among all words (1 = most common)

  -- Categorization (for future themed games, filtering)
  categories TEXT[] DEFAULT '{}',   -- ['music', 'food', 'science', etc.]

  -- Letter analysis (for difficulty calculation, player weakness matching)
  letter_pattern TEXT,              -- 'CVCCV' consonant/vowel pattern
  has_double_letters BOOLEAN DEFAULT false,
  has_uncommon_letters BOOLEAN DEFAULT false,  -- Contains Q, X, Z, J
  unique_letters INTEGER,           -- Count of distinct letters (1-5)

  -- Computed difficulty (updated from analytics)
  computed_difficulty DECIMAL(5, 2), -- 0-100 scale, derived from solve rates

  -- Audit fields
  reviewed_by TEXT,                 -- Who approved this word
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,                -- Why this tier was assigned

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_words_tier ON words(tier);
CREATE INDEX idx_words_length ON words(length);
CREATE INDEX idx_words_sabotage ON words(is_sabotage_eligible) WHERE is_sabotage_eligible = true;
CREATE INDEX idx_words_answer ON words(is_answer_eligible) WHERE is_answer_eligible = true;
CREATE INDEX idx_words_frequency ON words(frequency_rank) WHERE frequency_rank IS NOT NULL;

-- Row Level Security
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Public read (word lists are not secret)
CREATE POLICY "words_public_read" ON words FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE words IS 'Word metadata for Wordle Battle - tiers, eligibility, frequency, categories';
COMMENT ON COLUMN words.tier IS 'Difficulty tier: common (everyday), challenging (SAT-level), expert (specialist), obscure (blocked)';
COMMENT ON COLUMN words.is_sabotage_eligible IS 'Can this word be selected in Sabotage mode';
COMMENT ON COLUMN words.frequency_score IS 'Normalized frequency from Google n-gram corpus (0-1, higher = more common)';
COMMENT ON COLUMN words.computed_difficulty IS 'Difficulty derived from actual solve rates (0-100)';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_words_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER words_updated_at
  BEFORE UPDATE ON words
  FOR EACH ROW
  EXECUTE FUNCTION update_words_updated_at();
