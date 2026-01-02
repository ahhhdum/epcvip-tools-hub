# Auth & Persistence Plan

## Overview

Add optional authentication and data persistence to EPCVIP Tools Hub.

**Key Decisions:**
- **Auth provider**: Supabase (existing `epcvip-auth` project)
- **Auth methods**: Email/password (open signup for anyone)
- **Login required**: No - guest mode available, login optional for persistence
- **Database**: Supabase Postgres

---

## Database Schema

### Tables

```sql
-- Player profiles (extends Supabase auth.users)
CREATE TABLE players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  character_id TEXT DEFAULT 'Farmer_Bob',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wordle game results
CREATE TABLE wordle_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  word TEXT NOT NULL,
  game_mode TEXT NOT NULL, -- 'casual' | 'competitive'
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player results per game
CREATE TABLE wordle_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES wordle_games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  guesses INTEGER NOT NULL,
  solve_time_ms INTEGER, -- NULL if didn't solve
  won BOOLEAN NOT NULL,
  score INTEGER DEFAULT 0,
  finish_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Head-to-head stats (materialized for fast queries)
CREATE TABLE wordle_head_to_head (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES players(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  PRIMARY KEY (player_id, opponent_id)
);

-- Player aggregate stats (materialized for fast queries)
CREATE TABLE wordle_player_stats (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_guesses INTEGER DEFAULT 0,
  total_solve_time_ms BIGINT DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Future: Achievements
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT
);

CREATE TABLE player_achievements (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (player_id, achievement_id)
);
```

### Row Level Security (RLS)

```sql
-- Players can read all profiles, update only their own
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON players FOR SELECT USING (true);
CREATE POLICY "Self update" ON players FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Self insert" ON players FOR INSERT WITH CHECK (auth.uid() = id);

-- Game results are public read, server inserts
ALTER TABLE wordle_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON wordle_games FOR SELECT USING (true);

ALTER TABLE wordle_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON wordle_results FOR SELECT USING (true);

-- Stats are public read
ALTER TABLE wordle_player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON wordle_player_stats FOR SELECT USING (true);

ALTER TABLE wordle_head_to_head ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON wordle_head_to_head FOR SELECT USING (true);
```

---

## User Flows

### Guest Flow (No Account)
```
1. Open game → Enter display name
2. Play Wordle → Stats shown but NOT saved
3. Prompt: "Create account to save your stats!"
4. Can dismiss and continue as guest
```

### Login Flow
```
1. Open game → Click "Login" (or prompt after guest play)
2. Supabase auth UI (email/password)
3. On success:
   - Create/update player profile
   - Load saved character selection
   - Load stats
4. JWT stored in localStorage
5. WebSocket sends JWT for authenticated actions
```

### Logout Flow
```
1. Click "Logout" in pause menu
2. Clear JWT from localStorage
3. Revert to guest mode
4. Stats still visible but no longer tracked
```

---

## Implementation Phases

### Phase 1: Auth Foundation
**Goal**: Login/logout working, player profiles created

| Task | Effort | Priority |
|------|--------|----------|
| Add Supabase JS SDK to frontend | Low | P0 |
| Create login/signup UI in game | Medium | P0 |
| Create `players` table in Supabase | Low | P0 |
| Profile creation on first login | Low | P0 |
| Character selection persistence | Low | P0 |
| Logout in pause menu | Low | P0 |

**Files to create/modify:**
- `js/systems/auth.js` - Supabase client, login/logout functions
- `js/scenes/login.js` - Login UI scene
- `js/scenes/loading.js` - Check auth state on load
- `js/scenes/pause.js` - Add logout button

### Phase 2: Basic Stats Tracking
**Goal**: Record game results, show personal stats

| Task | Effort | Priority |
|------|--------|----------|
| Create game/results tables in Supabase | Low | P0 |
| Server: Save game results on game end | Medium | P0 |
| Server: Use service key for DB writes | Low | P0 |
| Create `wordle_player_stats` table | Low | P0 |
| Trigger to update stats on result insert | Medium | P1 |
| Stats display in Wordle lobby | Medium | P1 |

**Files to create/modify:**
- `server/src/services/supabase.ts` - Supabase client for server
- `server/src/rooms/wordle-room.ts` - Save results on game end
- `wordle/wordle.js` - Fetch and display stats

### Phase 3: Head-to-Head & Leaderboards
**Goal**: Track matchups, show global leaderboard

| Task | Effort | Priority |
|------|--------|----------|
| Create head-to-head table | Low | P1 |
| Update h2h on game result | Medium | P1 |
| H2H display in lobby | Medium | P2 |
| Global leaderboard view | Medium | P2 |
| Filter by time period (week/month/all) | Low | P2 |

### Phase 4: Achievements (Future)
**Goal**: Unlock achievements, display badges

| Task | Effort | Priority |
|------|--------|----------|
| Define achievement list | Low | P3 |
| Create achievements tables | Low | P3 |
| Check achievements on game end | Medium | P3 |
| Achievement toast notifications | Medium | P3 |
| Achievement display on profile | Low | P3 |

---

## Technical Details

### Frontend Auth (Supabase JS SDK)

```javascript
// js/systems/auth.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yuithqxycicgokkgmpzg.supabase.co',
  'SUPABASE_ANON_KEY' // Public key, safe for frontend
);

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // Create player profile
  await supabase.from('players').insert({
    id: data.user.id,
    display_name: displayName,
  });

  return data.user;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function getUser() {
  return supabase.auth.getUser();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
```

### Server Auth (Service Key for DB Writes)

```typescript
// server/src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key for server-side writes
);

export async function saveGameResult(game: WordleGame, results: PlayerResult[]) {
  // Insert game
  const { data: gameData } = await supabase
    .from('wordle_games')
    .insert({
      room_code: game.roomCode,
      word: game.word,
      game_mode: game.mode,
      started_at: game.startedAt,
      ended_at: new Date(),
    })
    .select()
    .single();

  // Insert player results
  await supabase.from('wordle_results').insert(
    results.map((r, i) => ({
      game_id: gameData.id,
      player_id: r.playerId, // NULL for guests
      guesses: r.guesses,
      solve_time_ms: r.solveTime,
      won: r.won,
      score: r.score,
      finish_position: i + 1,
    }))
  );
}
```

### WebSocket Auth

```typescript
// Client sends JWT with messages
socket.send(JSON.stringify({
  type: 'createRoom',
  playerName: 'Alice',
  token: supabase.auth.session()?.access_token // Optional
}));

// Server verifies if present
import { createClient } from '@supabase/supabase-js';

async function verifyToken(token: string): Promise<string | null> {
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id || null;
}
```

---

## Environment Variables

```bash
# Add to Railway / .env
SUPABASE_URL=https://yuithqxycicgokkgmpzg.supabase.co
SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>  # Server only, never expose
```

---

## Migration Path

### From Current State
1. **No breaking changes** - guests continue to work
2. **Gradual adoption** - users can create accounts when ready
3. **Stats backfill** - not possible for games before auth, that's OK

### Data Model Evolution
- Schema designed for future features (achievements, cosmetics)
- Aggregate tables for fast queries (no expensive JOINs)
- RLS for security without complex backend logic

---

## Priority Summary

| Phase | Features | Priority |
|-------|----------|----------|
| 1 | Login/logout, player profiles, character persistence | **P0 - Do First** |
| 2 | Game result tracking, personal stats display | **P0 - Do First** |
| 3 | Head-to-head stats, leaderboards | P1 - Soon After |
| 4 | Achievements | P3 - Future |

---

## Open Questions

1. **Display name uniqueness?** - Probably not needed, use email for identity
2. **Account deletion?** - Cascade deletes handle this, but add UI later
3. **Stats for guests?** - Show session stats, don't persist
4. **Migrate localStorage data?** - On first login, could import existing character choice
