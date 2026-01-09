# Word Intelligence Roadmap

> **Vision**: Build a data-driven word game platform where difficulty adapts to players, word selection feels fresh and fair, and creative sabotage is rewarded.

**Created**: 2026-01-08
**Status**: Planning
**Owner**: TBD

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Epic 1: Word Data Infrastructure](#epic-1-word-data-infrastructure)
4. [Epic 2: Tiered Word Lists](#epic-2-tiered-word-lists)
5. [Epic 3: Player Skill System](#epic-3-player-skill-system)
6. [Epic 4: Sabotage UX Enhancements](#epic-4-sabotage-ux-enhancements)
7. [Epic 5: Variable Word Length](#epic-5-variable-word-length)
8. [Epic 6: Analytics & Intelligence](#epic-6-analytics--intelligence)
9. [Prioritized Backlog](#prioritized-backlog)
10. [Open Questions](#open-questions)
11. [Research Sources](#research-sources)

---

## Executive Summary

### The Problem
- Current word list (666 words) is too restrictive for Sabotage mode
- Players complain legitimate words like "FUGUE" aren't allowed
- No data infrastructure to track word difficulty, player skill, or optimize matchups
- Same words repeat without tracking; no freshness guarantee

### The Solution
A layered approach:
1. **Foundation**: Word metadata + analytics tables
2. **Immediate**: Expand Sabotage word pool (2,000+ words)
3. **Medium-term**: Tiered difficulty system + player ratings
4. **Long-term**: Dynamic difficulty matching + AI-powered recommendations

### Success Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Sabotage word pool | 666 | 2,500+ |
| Word repeat rate (per player/month) | Unknown | < 5% |
| Player frustration (reported obscure words) | ~weekly | < 1/month |
| Average games per session | TBD | +20% |

---

## Current State

### Database Schema (Existing)

```
wordle_games        → Game sessions (room, word, mode, timing)
wordle_results      → Per-player outcomes (guesses, time, won)
wordle_stats        → Aggregate stats (wins, streaks, distribution)
wordle_guesses      → Per-guess tracking (timing, letter results)
```

### Word Lists (Existing)

| List | Size | Location | Purpose |
|------|------|----------|---------|
| `WORD_LIST` | 666 | `server/src/utils/word-list.ts` | Answers (all modes) |
| `VALID_GUESSES` | ~15K | `wordle/valid-guesses.js` | Valid guesses |

### Gap Analysis

| Capability | Status | Gap |
|------------|--------|-----|
| Word metadata (frequency, tier) | ❌ | No schema |
| Word attempt tracking | ❌ | Not stored per-word |
| Player skill rating | ❌ | Only win/loss stats |
| De-duplication per player | ❌ | Random selection |
| Variable word length | ❌ | Hardcoded 5 letters |

---

## Epic 1: Word Data Infrastructure

> **Goal**: Build the foundational data layer for all word intelligence features.

### WDI-001: Word Metadata Table

**User Story**: As a developer, I need to store metadata about each word so that I can query words by difficulty, frequency, and category.

**Acceptance Criteria**:
- [ ] Database table `words` with columns: word, length, frequency_score, tier, category, letter_pattern
- [ ] Seeded with all words from VALID_GUESSES (~15K)
- [ ] Frequency scores from Google n-gram corpus
- [ ] Tier assignment (common/challenging/expert/obscure)
- [ ] RLS policies for public read, admin write

**Technical Details**:
```sql
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  length INTEGER NOT NULL CHECK (length BETWEEN 4 AND 7),

  -- Frequency & Difficulty
  frequency_score DECIMAL(10, 8),  -- Normalized 0-1 (1 = most common)
  difficulty_tier TEXT CHECK (difficulty_tier IN ('common', 'challenging', 'expert', 'obscure')),
  computed_difficulty DECIMAL(5, 2),  -- Calculated from solve data

  -- Categorization
  categories TEXT[],  -- ['music', 'food', 'science', etc.]
  letter_pattern TEXT,  -- 'CVCCV' for consonant/vowel pattern
  has_double_letters BOOLEAN DEFAULT false,
  has_uncommon_letters BOOLEAN DEFAULT false,  -- Q, X, Z, J

  -- Status
  is_answer_eligible BOOLEAN DEFAULT true,  -- Can be a target word
  is_sabotage_eligible BOOLEAN DEFAULT true,  -- Can be picked in sabotage
  is_active BOOLEAN DEFAULT true,  -- Soft delete

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_words_tier ON words(difficulty_tier);
CREATE INDEX idx_words_length ON words(length);
CREATE INDEX idx_words_frequency ON words(frequency_score DESC);
```

**Effort**: L (5-8 hours)
**Priority**: P1 - Foundation for everything else

**Data Source**: [Google 10,000 English Words](https://github.com/first20hours/google-10000-english) + [Peter Norvig's frequency data](https://norvig.com/ngrams/)

---

### WDI-002: Word Analytics Table

**User Story**: As a game designer, I want to track how often each word is used and its solve rate so that I can identify words that are too hard or too easy.

**Acceptance Criteria**:
- [ ] Table `word_analytics` tracking per-word statistics
- [ ] Automatically updated when games complete
- [ ] Queryable for "hardest words", "easiest words", "most used"

**Technical Details**:
```sql
CREATE TABLE word_analytics (
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,

  -- Usage stats
  times_as_target INTEGER DEFAULT 0,
  times_as_sabotage_pick INTEGER DEFAULT 0,

  -- Solve stats
  total_attempts INTEGER DEFAULT 0,
  total_solves INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,

  -- Performance metrics
  avg_guesses DECIMAL(3, 2),
  avg_solve_time_ms INTEGER,
  solve_rate DECIMAL(5, 4),  -- 0.0000 to 1.0000

  -- Guess distribution
  solves_in_1 INTEGER DEFAULT 0,
  solves_in_2 INTEGER DEFAULT 0,
  solves_in_3 INTEGER DEFAULT 0,
  solves_in_4 INTEGER DEFAULT 0,
  solves_in_5 INTEGER DEFAULT 0,
  solves_in_6 INTEGER DEFAULT 0,

  -- Freshness
  last_used_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (word_id)
);
```

**Effort**: M (3-4 hours)
**Priority**: P1

---

### WDI-003: Player Word History

**User Story**: As a player, I don't want to get the same word twice, especially for daily challenges.

**Acceptance Criteria**:
- [ ] Table `player_word_history` tracking which words each player has seen
- [ ] Query to exclude seen words when selecting new ones
- [ ] Configurable lookback period (e.g., 30 days, 90 days, forever)

**Technical Details**:
```sql
CREATE TABLE player_word_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_email TEXT NOT NULL,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  game_id UUID REFERENCES wordle_games(id) ON DELETE SET NULL,

  -- Context
  mode TEXT NOT NULL,  -- 'daily', 'random', 'sabotage_target', 'sabotage_picked'
  was_solved BOOLEAN,
  guesses_used INTEGER,

  played_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(player_email, word_id, game_id)
);

CREATE INDEX idx_player_word_history_player ON player_word_history(player_email, played_at DESC);
CREATE INDEX idx_player_word_history_word ON player_word_history(word_id);
```

**Effort**: S (1-2 hours)
**Priority**: P2

---

### WDI-004: Word Selection Service

**User Story**: As a developer, I need a centralized service to select words based on criteria (tier, length, unseen by player, etc.).

**Acceptance Criteria**:
- [ ] `WordSelectionService` class with methods:
  - `getRandomWord(options)` - with tier, length, exclude filters
  - `getSabotageWords(playerId, count)` - eligible words for sabotage picker
  - `getDailyWord(dayNumber)` - deterministic daily word
- [ ] Respects player word history
- [ ] Falls back gracefully if no matching words

**Technical Details**:
```typescript
interface WordSelectionOptions {
  length?: number;  // 4-7, default 5
  tiers?: ('common' | 'challenging' | 'expert')[];
  excludePlayerId?: string;  // Exclude words this player has seen
  excludeWords?: string[];  // Explicit exclusions
  categories?: string[];  // Optional category filter
  lookbackDays?: number;  // How far back to check history (default 90)
}

class WordSelectionService {
  async getRandomWord(options: WordSelectionOptions): Promise<Word>;
  async getSabotageEligibleWords(options: WordSelectionOptions): Promise<Word[]>;
  async getDailyWord(dayNumber: number): Promise<Word>;
  async recordWordUsage(playerId: string, wordId: string, mode: string): Promise<void>;
}
```

**Effort**: M (3-4 hours)
**Priority**: P1

---

## Epic 2: Tiered Word Lists

> **Goal**: Categorize words by difficulty/familiarity so different modes can use appropriate pools.

### TWL-001: Seed Word Tiers from Frequency Data

**User Story**: As a game designer, I want words categorized by how common they are so that I can balance difficulty.

**Acceptance Criteria**:
- [ ] Download and process Google n-gram frequency data
- [ ] Map frequency scores to tiers:
  - **Common**: Top 20% by frequency (everyday words)
  - **Challenging**: 20-50% (SAT vocabulary, educated adults know)
  - **Expert**: 50-80% (niche but real, requires broad vocabulary)
  - **Obscure**: Bottom 20% (archaic, technical, regional - NOT for answers)
- [ ] Script to update `words` table with tiers
- [ ] Manual review/override list for edge cases

**Tier Examples**:
| Tier | Examples | Sabotage Eligible? |
|------|----------|-------------------|
| Common | APPLE, HOUSE, WATER, SMILE | Yes |
| Challenging | FUGUE, MAUVE, EPOCH, GLYPH | Yes |
| Expert | KNOLL, BRINE, CAULK, FJORD | Yes (opt-in) |
| Obscure | FLUYT, COHOE, GUSLI | No |

**Effort**: L (5-8 hours)
**Priority**: P1

**Decision Needed**:
- [ ] Should "Expert" tier be opt-in for Sabotage, or included by default?
- [ ] Should players see the tier when picking sabotage words?

---

### TWL-002: Expand Sabotage Word Pool (Quick Win)

**User Story**: As a saboteur, I want more word options so I can pick interesting challenges for my opponents.

**Acceptance Criteria**:
- [ ] Sabotage mode accepts words from Common + Challenging tiers
- [ ] Minimum 2,000 words available for sabotage selection
- [ ] "FUGUE" and similar complained-about words are included
- [ ] UI shows validation feedback when word is rejected (and why)

**Technical Details**:
- Short-term: Create `SABOTAGE_WORDS` constant (~2,000 words)
- Long-term: Query `words` table for `is_sabotage_eligible = true`

**Effort**: S (1-2 hours) for constant, M (3-4 hours) for DB integration
**Priority**: P0 - Immediate pain point

---

### TWL-003: Category Tagging System

**User Story**: As a game designer, I want words tagged by category so I can create themed rounds or filter inappropriate content.

**Acceptance Criteria**:
- [ ] Categories defined: `food`, `music`, `science`, `nature`, `sports`, `slang`, `archaic`, `technical`, `profanity`
- [ ] Words can have multiple categories
- [ ] Admin tool to tag/untag words
- [ ] Sabotage can optionally filter by category

**Future Use Cases**:
- Themed daily challenges ("Music Monday")
- Safe word lists (exclude profanity for work settings)
- Category-based achievements

**Effort**: M (3-4 hours)
**Priority**: P3

---

## Epic 3: Player Skill System

> **Goal**: Implement a rating system that captures player skill and uncertainty, enabling fair matchmaking and adaptive difficulty.

### Research: Why Glicko-2?

**ELO limitations**:
- Treats all ratings as equally precise
- Doesn't account for player inactivity
- No volatility measure for consistency

**Glicko-2 advantages** ([source](https://www.glicko.net/glicko/glicko2.html)):
- **Rating Deviation (RD)**: Measures uncertainty in rating
- **Volatility (σ)**: Captures performance consistency
- RD increases during inactivity (rating becomes uncertain)
- Used by: Lichess, Chess.com, Counter-Strike 2, Guild Wars 2

**Adaptation for Word Games**:
- Not pure head-to-head (unlike chess)
- Can model word difficulty as "opponent rating"
- Adjust rating based on: solve/fail, guesses used, time taken

---

### PSK-001: Player Rating Table

**User Story**: As a competitive player, I want a skill rating that reflects my word-solving ability over time.

**Acceptance Criteria**:
- [ ] Table `player_ratings` with Glicko-2 fields
- [ ] Initial rating: 1500, RD: 350, volatility: 0.06
- [ ] Rating updates after each completed game
- [ ] RD increases if player hasn't played in 30+ days

**Technical Details**:
```sql
CREATE TABLE player_ratings (
  player_email TEXT PRIMARY KEY,

  -- Glicko-2 core values
  rating DECIMAL(8, 2) DEFAULT 1500.00,
  rating_deviation DECIMAL(6, 2) DEFAULT 350.00,
  volatility DECIMAL(6, 4) DEFAULT 0.0600,

  -- Derived/display values
  display_rating INTEGER GENERATED ALWAYS AS (ROUND(rating)) STORED,
  confidence_low INTEGER GENERATED ALWAYS AS (ROUND(rating - 2 * rating_deviation)) STORED,
  confidence_high INTEGER GENERATED ALWAYS AS (ROUND(rating + 2 * rating_deviation)) STORED,

  -- Activity tracking
  games_rated INTEGER DEFAULT 0,
  last_game_at TIMESTAMPTZ,

  -- Rating history (for graphs)
  rating_history JSONB DEFAULT '[]',  -- [{date, rating, rd}, ...]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Effort**: M (3-4 hours)
**Priority**: P2

---

### PSK-002: Glicko-2 Rating Calculator

**User Story**: As a developer, I need a service that correctly calculates Glicko-2 rating updates.

**Acceptance Criteria**:
- [ ] `GlickoService` implementing standard Glicko-2 algorithm
- [ ] Handles single-game updates (not batch rating periods)
- [ ] Word difficulty mapped to "opponent rating" (e.g., Common = 1200, Expert = 1800)
- [ ] Factors in: solve/fail, guesses used (fewer = better), time (faster = better)

**Technical Details**:
```typescript
interface GameOutcome {
  playerId: string;
  wordId: string;
  solved: boolean;
  guessesUsed: number;  // 1-6 or 7 for fail
  solveTimeMs: number;
}

interface RatingUpdate {
  oldRating: number;
  newRating: number;
  oldRD: number;
  newRD: number;
  ratingChange: number;
}

class GlickoService {
  // Word difficulty as opponent rating
  getWordRating(wordId: string): Promise<number>;

  // Calculate new rating after a game
  calculateRatingUpdate(
    player: PlayerRating,
    outcome: GameOutcome
  ): RatingUpdate;

  // Decay RD for inactive players
  applyInactivityDecay(player: PlayerRating, daysSinceLastGame: number): PlayerRating;
}
```

**References**:
- [Official Glicko-2 paper](https://www.glicko.net/glicko/glicko2.pdf)
- [Implementation guide](https://gist.github.com/gpluscb/302d6b71a8d0fe9f4350d45bc828f802)

**Effort**: L (5-8 hours)
**Priority**: P2

---

### PSK-003: Skill-Based Word Selection

**User Story**: As a returning player, I want word difficulty to match my skill level so games feel fair and engaging.

**Acceptance Criteria**:
- [ ] For Random mode: Select words near player's rating
- [ ] For Multiplayer: Select words balanced for the lobby's average rating
- [ ] Configurable variance (some games should be easy, some hard)
- [ ] Never select from "Obscure" tier regardless of rating

**Algorithm Sketch**:
```
player_rating = 1650
word_target_rating = player_rating + random(-200, +200)
select word WHERE computed_difficulty BETWEEN word_target_rating - 100 AND word_target_rating + 100
```

**Effort**: M (3-4 hours)
**Priority**: P2 (after PSK-001 and PSK-002)

---

### PSK-004: Player Pattern Analysis

**User Story**: As a game designer, I want to analyze player tendencies (favorite letters, starting words, weaknesses) to create personalized challenges.

**Acceptance Criteria**:
- [ ] Track per-player: most used starting words, letter frequency, position preferences
- [ ] Identify "weak" letters (low success when word contains Q, X, Z, etc.)
- [ ] Store in `player_analytics` table
- [ ] API to query player patterns

**Technical Details**:
```sql
CREATE TABLE player_analytics (
  player_email TEXT PRIMARY KEY,

  -- Starting word habits
  favorite_starters JSONB,  -- [{word: 'CRANE', count: 45}, ...]
  unique_starters_used INTEGER,

  -- Letter performance
  letter_success_rates JSONB,  -- {A: 0.82, B: 0.75, Q: 0.45, ...}
  weak_letters TEXT[],  -- ['Q', 'X', 'Z']
  strong_letters TEXT[],

  -- Position performance
  position_accuracy JSONB,  -- [0.65, 0.72, 0.68, 0.70, 0.75] (by position)

  -- Timing patterns
  avg_first_guess_time_ms INTEGER,
  avg_guess_time_ms INTEGER,
  fastest_solve_ms INTEGER,

  -- Computed insights
  vocabulary_breadth_score DECIMAL(5, 2),  -- Based on unique words guessed
  pattern_recognition_score DECIMAL(5, 2),  -- Based on guess efficiency

  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Effort**: L (5-8 hours)
**Priority**: P3

---

### PSK-005: Dynamic Lobby Balancing

**User Story**: As a multiplayer host, I want the word difficulty automatically balanced for my lobby so all players have a fair chance.

**Acceptance Criteria**:
- [ ] Calculate lobby "average" rating (weighted by RD/confidence)
- [ ] In Sabotage: suggest words that challenge the target based on their rating
- [ ] Show difficulty preview ("This word is [EASY/FAIR/HARD] for Alice")
- [ ] Option to let the picker override the suggestion

**Future Enhancement**: Anti-gaming measures (can't always pick "EASY" for yourself in sabotage)

**Effort**: L (5-8 hours)
**Priority**: P3

---

## Epic 4: Sabotage UX Enhancements

> **Goal**: Make Sabotage mode more engaging with recommendations, previews, and creativity rewards.

### SUX-001: Word Recommendations

**User Story**: As a saboteur, I want word suggestions so I don't have to think of words from scratch.

**Acceptance Criteria**:
- [ ] "Suggest a word" button shows 3-5 options
- [ ] Suggestions based on: target's rating, unused words, variety
- [ ] Refresh button to get new suggestions
- [ ] Picker can still type custom word

**UI Mockup**:
```
┌─────────────────────────────────────────┐
│ Pick a word for Bob to guess            │
├─────────────────────────────────────────┤
│ [FUGUE] [MAUVE] [GLYPH] [EPOCH] [BRINE] │
│              [🔄 More ideas]            │
├─────────────────────────────────────────┤
│ Or type your own:                       │
│ [ _ _ _ _ _ ]                           │
│                    [Submit]             │
└─────────────────────────────────────────┘
```

**Decision Needed**:
- [ ] Should suggestions show difficulty rating?
- [ ] Should suggestions prefer words the target hasn't seen?
- [ ] Rate limit on "More ideas" to prevent fishing for perfect word?

**Effort**: M (3-4 hours)
**Priority**: P2

---

### SUX-002: Difficulty Preview

**User Story**: As a saboteur, I want to see how hard my word choice is for the target so I can make strategic decisions.

**Acceptance Criteria**:
- [ ] Show difficulty indicator when word is entered
- [ ] Consider: word tier, target's rating, target's known weaknesses
- [ ] Visual: Stars (★★☆), color scale, or text (Easy/Fair/Hard/Evil)

**UI Element**:
```
Word: F U G U E
Difficulty for Bob: ★★★☆☆ (Challenging)
- Uncommon word tier
- Bob struggles with 'U' in position 2
```

**Effort**: S (1-2 hours) basic, M (3-4 hours) with personalization
**Priority**: P2

---

### SUX-003: Creativity Rewards

**User Story**: As a saboteur, I want recognition when I pick interesting or effective words so my creativity is rewarded.

**Acceptance Criteria**:
- [ ] Track "sabotage effectiveness" (did target fail? how many guesses?)
- [ ] Achievements for creative sabotage:
  - "Wordsmith" - Target failed on your word
  - "Merciful" - Picked an easy word, target won in 2
  - "Evil Genius" - Target used all 6 guesses
  - "Unique Pick" - First person to ever use this word in sabotage
- [ ] Post-game stats show "Words you picked" with outcomes

**Effort**: M (3-4 hours)
**Priority**: P3

---

### SUX-004: Sabotage Word Validation Feedback

**User Story**: As a saboteur, when my word is rejected I want to know why so I can pick a valid alternative.

**Acceptance Criteria**:
- [ ] Clear error messages:
  - "Not in dictionary" (invalid word)
  - "Too obscure for this mode" (valid but blocked tier)
  - "Not a 5-letter word" (wrong length)
- [ ] Suggestions for similar valid words when rejected

**Effort**: S (1-2 hours)
**Priority**: P1

---

## Epic 5: Variable Word Length

> **Goal**: Support 4-7 letter words for Marathon mode and variety.

### VWL-001: Word Length Configuration

**User Story**: As a host, I want to create games with different word lengths for variety.

**Acceptance Criteria**:
- [ ] Room config option: word length (4, 5, 6, 7)
- [ ] Default remains 5
- [ ] Grid UI adjusts to word length
- [ ] Keyboard/validation adjusts to length

**Technical Changes**:
- `wordle-room.ts`: Add `wordLength` to room config
- `word-list.ts`: Separate lists by length or query from `words` table
- `wordle.js`: Dynamic grid generation
- `wordle.css`: Responsive tile sizing

**Effort**: L (5-8 hours)
**Priority**: P2

---

### VWL-002: Multi-Length Word Lists

**User Story**: As a developer, I need word lists for 4, 6, and 7 letter words with the same quality as the 5-letter list.

**Acceptance Criteria**:
- [ ] `words` table includes 4-7 letter words
- [ ] Tier assignments for all lengths
- [ ] Valid guess lists for all lengths
- [ ] Minimum pool sizes: 4-letter: 1000, 6-letter: 2000, 7-letter: 1500

**Data Sources**:
- Extend from VALID_GUESSES methodology
- Filter Google n-gram data by length

**Effort**: L (5-8 hours)
**Priority**: P2

---

### VWL-003: Marathon Mode

**User Story**: As a player, I want a "Marathon" mode with progressively longer words for an extra challenge.

**Acceptance Criteria**:
- [ ] Game mode: "Marathon" (separate from Casual/Competitive)
- [ ] Progression: Start at 4 letters, add 1 letter each round
- [ ] Fail on any word = game over
- [ ] Track "marathon high score" (highest letter count reached)

**Effort**: L (5-8 hours)
**Priority**: P3

---

## Epic 6: Analytics & Intelligence

> **Goal**: Build analytics dashboards and intelligent systems that leverage word and player data.

### ANL-001: Word Difficulty Dashboard

**User Story**: As a game designer, I want to see which words are too hard/easy so I can tune the word list.

**Acceptance Criteria**:
- [ ] Admin dashboard showing word analytics
- [ ] Sortable by: solve rate, avg guesses, times used
- [ ] Highlight outliers (< 30% solve rate = "too hard", > 95% = "too easy")
- [ ] Bulk actions: change tier, disable word

**Effort**: M (3-4 hours)
**Priority**: P3

---

### ANL-002: Player Insights Dashboard

**User Story**: As a player, I want to see insights about my play style and areas to improve.

**Acceptance Criteria**:
- [ ] Personal analytics page
- [ ] Show: weak letters, favorite starters, improvement over time
- [ ] Recommendations: "Try varying your starting word"
- [ ] Compare to average player (anonymized)

**Effort**: M (3-4 hours)
**Priority**: P3

---

### ANL-003: Word Usage Heatmap

**User Story**: As a game designer, I want to visualize word usage patterns to ensure freshness.

**Acceptance Criteria**:
- [ ] Heatmap of word usage over time
- [ ] Identify "overused" words (> 10 uses/week)
- [ ] Identify "underused" words (never used despite being good)
- [ ] Automatic freshness weighting in selection algorithm

**Effort**: M (3-4 hours)
**Priority**: P3

---

### ANL-004: Completion Rate Triggers

**User Story**: As a system, I want to automatically adjust word difficulty ratings based on actual solve rates.

**Acceptance Criteria**:
- [ ] Scheduled job analyzes `word_analytics`
- [ ] If solve_rate < 40% after 50+ attempts → increase difficulty
- [ ] If solve_rate > 90% after 50+ attempts → decrease difficulty
- [ ] Log adjustments for audit trail

**Effort**: M (3-4 hours)
**Priority**: P3

---

## Prioritized Backlog

### P0 - Ship This Week

| ID | Epic | Description | Effort |
|----|------|-------------|--------|
| TWL-002 | Tiered Lists | Expand Sabotage word pool to 2,000+ words | S-M |
| SUX-004 | Sabotage UX | Validation feedback with clear error messages | S |

### P1 - Next 2 Weeks

| ID | Epic | Description | Effort |
|----|------|-------------|--------|
| WDI-001 | Infrastructure | Word metadata table (`words`) | L |
| WDI-002 | Infrastructure | Word analytics table | M |
| WDI-004 | Infrastructure | Word selection service | M |
| TWL-001 | Tiered Lists | Seed word tiers from frequency data | L |

### P2 - Next Month

| ID | Epic | Description | Effort |
|----|------|-------------|--------|
| WDI-003 | Infrastructure | Player word history (de-duplication) | S |
| PSK-001 | Skill System | Player ratings table (Glicko-2) | M |
| PSK-002 | Skill System | Rating calculator service | L |
| SUX-001 | Sabotage UX | Word recommendations | M |
| SUX-002 | Sabotage UX | Difficulty preview | S-M |
| VWL-001 | Variable Length | Word length configuration | L |
| VWL-002 | Variable Length | Multi-length word lists | L |

### P3 - When Time Permits

| ID | Epic | Description | Effort |
|----|------|-------------|--------|
| PSK-003 | Skill System | Skill-based word selection | M |
| PSK-004 | Skill System | Player pattern analysis | L |
| PSK-005 | Skill System | Dynamic lobby balancing | L |
| SUX-003 | Sabotage UX | Creativity rewards/achievements | M |
| TWL-003 | Tiered Lists | Category tagging system | M |
| VWL-003 | Variable Length | Marathon mode | L |
| ANL-001 | Analytics | Word difficulty dashboard | M |
| ANL-002 | Analytics | Player insights dashboard | M |
| ANL-003 | Analytics | Word usage heatmap | M |
| ANL-004 | Analytics | Completion rate auto-adjustment | M |

---

## Open Questions

### Word Selection & Difficulty

1. **Should Sabotage show word tier to the picker?**
   - Pro: Informed choice, strategic depth
   - Con: Might always pick hardest tier
   - Recommendation: Show it, but track usage patterns

2. **Should Expert tier be opt-in for Sabotage?**
   - Option A: Include Expert by default
   - Option B: Checkbox "Allow expert words"
   - Option C: Host setting at room creation

3. **How aggressive should de-duplication be?**
   - Option A: Never repeat (ever)
   - Option B: No repeats within 90 days
   - Option C: No repeats within 30 days for Daily, 7 days for Random

### Rating System

4. **How to rate performance in Sabotage mode?**
   - The picker succeeds if target fails
   - Does rating change for both players?
   - Should picking affect picker's rating at all?

5. **Should rating be visible to other players?**
   - Pro: Competitive motivation, matchmaking transparency
   - Con: Anxiety, elitism, sandbagging
   - Recommendation: Optional display, default hidden

6. **What's the rating floor/ceiling?**
   - Typical Glicko: 0-3000 with 1500 average
   - Should word game ratings have tighter bounds?

### UX & Engagement

7. **How many word suggestions in Sabotage?**
   - Too few: Not helpful
   - Too many: Overwhelming
   - Recommendation: 5 suggestions, refreshable

8. **Should custom words be allowed in Sabotage?**
   - Current: Yes, must be in word list
   - Alternative: Only pick from suggestions (more controlled)
   - Recommendation: Keep custom entry, it's more fun

9. **How to handle word length in multiplayer?**
   - All players same length (simpler)
   - Each player picks their preferred length (chaotic)
   - Recommendation: Room-level setting, same for all

---

## Research Sources

### Word Frequency Data
- [Google 10,000 English Words](https://github.com/first20hours/google-10000-english) - Frequency-ordered common words
- [Peter Norvig's N-gram Data](https://norvig.com/ngrams/) - Trillion word corpus frequencies
- [Google Books Ngram Exports](https://storage.googleapis.com/books/ngrams/books/datasetsv3.html) - Raw data

### Rating Systems
- [Glicko-2 Official Paper](https://www.glicko.net/glicko/glicko2.pdf) - Original algorithm
- [Glicko-2 Implementation Guide](https://gist.github.com/gpluscb/302d6b71a8d0fe9f4350d45bc828f802) - Practical implementation
- [ELO-MMR for Multiplayer](https://cs.stanford.edu/people/paulliu/files/www-2021-elor.pdf) - Adaptation for non-1v1
- [Cornell Analysis of SBMM](https://blogs.cornell.edu/info2040/2022/09/25/an-analysis-of-skill-based-matchmaking-and-the-elo-rating-system-in-video-games/) - Game design perspective

### Word Game Design
- [League of Gamemakers - Word Game Design](https://www.leagueofgamemakers.com/designing-a-word-game-spelling-it-out/) - Balance principles
- [NYT Wordle Word Selection](https://www.tomsguide.com/news/i-analysed-every-wordle-answer-to-look-for-patterns-heres-what-i-found) - Curation approach
- [Wordle Word Frequency Analysis](https://artofproblemsolving.com/blog/articles/the-math-of-winning-wordle) - Statistical approach

---

## Appendix: Quick Reference

### Tier Definitions

| Tier | Frequency Percentile | Example Words | Use Cases |
|------|---------------------|---------------|-----------|
| Common | Top 20% | APPLE, HOUSE, SMILE | Daily, Random |
| Challenging | 20-50% | FUGUE, MAUVE, EPOCH | Daily, Random, Sabotage |
| Expert | 50-80% | KNOLL, FJORD, CAULK | Sabotage (opt-in) |
| Obscure | Bottom 20% | FLUYT, COHOE, GUSLI | Never |

### Glicko-2 Quick Reference

| Parameter | Initial | Meaning |
|-----------|---------|---------|
| Rating (r) | 1500 | Skill estimate |
| Rating Deviation (RD) | 350 | Uncertainty (lower = more confident) |
| Volatility (σ) | 0.06 | Consistency (lower = more consistent) |

RD ranges: 350 (new) → 50 (very active) → increases with inactivity

### Database Migration Order

1. `words` (WDI-001)
2. `word_analytics` (WDI-002)
3. `player_word_history` (WDI-003)
4. `player_ratings` (PSK-001)
5. `player_analytics` (PSK-004)

---

*Last updated: 2026-01-08*
