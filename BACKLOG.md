# EPCVIP Tools Hub - Feature Backlog

## Completed
- [x] Fritelles with golden variants
- [x] Throw mechanic (diagonal support)
- [x] Context-aware dialog
- [x] Sound effects with mute toggle
- [x] Multiplayer - native WebSocket server
- [x] Player-to-player hit detection
- [x] Railway deployment
- [x] Directional character sprites (Farmer_Bob, 8-direction walk/idle)
- [x] Player name input (entry modal, localStorage, server sync, display above character)
- [x] Tilemap system with multi-tileset support
- [x] Plain grass tile for cleaner maps
- [x] Wordle Battle MVP (rooms, multiplayer, opponent visibility)
- [x] Ready-up system with countdown
- [x] Live timer display during game
- [x] Mobile compact opponent view
- [x] Dictionary validation (3-strike override)
- [x] Daily Challenge mode (auth-only, once per day)

**Live at:** https://epcvip-tools-hub-production.up.railway.app

---

## Wordle Battle Backlog

### Completed
- [x] **Solo Daily Challenge** - Allow single player to complete daily without waiting for others

### High Priority - Stats Infrastructure (Complete)
- [x] **Historical Daily Puzzles** - Play past daily challenges (solo or multiplayer)
  - Random unplayed daily button
  - Recent 7 days quick access
  - Browse all with number input
- [x] **Granular guess tracking** - Store each guess with timestamp for analytics
  - Per-guess timing (time since start, time since last guess)
  - Letter result tracking (greens, yellows, grays)
  - Guess distribution in wordle_stats (guesses_1 through guesses_6)
- [x] **Stats database tables** - wordle_games, wordle_results, wordle_stats, wordle_guesses
- [x] **Achievements database** - achievements, player_achievements, player_achievement_progress

### High Priority - Stats UI (Data Ready, Needs Frontend)
- [ ] **Personal stats dashboard** - Display existing wordle_stats data
  - Games played, win rate, current/best streak
  - Fastest solve time, average solve time
  - API: `GET /api/wordle/stats/:email` (exists)
- [ ] **Guess distribution chart** - Bar chart visualization
  - Data: wordle_stats.guesses_1 through guesses_6
  - Simple horizontal bar chart in lobby or post-game
- [ ] **Starting word analytics UI** - Show favorite openers
  - Query: `wordle_guesses WHERE guess_number = 1 GROUP BY guess_word`
  - Display: top 5 starters, success rate per starter
- [ ] **Matchup history UI** - Head-to-head records
  - Query: `wordle_results` joined on `game_id`
  - Display: win/loss record against each opponent

### Medium Priority - User-Facing Stats
- [ ] **Share results** - Copy Wordle-style emoji grid to clipboard
  - Generate from wordle_guesses letter_results
  - Format: Daily #267 🟩🟨⬛⬛⬛ etc.
- [ ] **Daily leaderboard** - Fastest solvers for today's daily
  - Query: daily_challenge_completions by daily_number, order by solve_time_ms
- [ ] **Time analytics** - Average time, fastest, slowest, trend over time
  - Data available in wordle_stats (fastest_solve_ms, avg_solve_time_ms)

### Medium Priority - Achievements (Database Ready)
Tables exist: `achievements`, `player_achievements`, `player_achievement_progress`
Initial achievements seeded. Needs: trigger logic + UI.

- [ ] **Achievement trigger logic** - Server-side checks after each game
  - Check wordle_stats for milestone thresholds
  - Insert into player_achievements when earned
- [ ] **Achievement notifications** - Toast popups when earned
- [ ] **Achievement showcase** - Display earned badges on profile/lobby
- [ ] **Achievement progress UI** - Show progress toward next achievements

### Low Priority - Advanced Analytics
- [ ] **Letter frequency analysis** - Which letters you guess most
- [ ] **Win probability model** - Predict win chance after each guess
- [ ] **Optimal play analysis** - Compare to "optimal" Wordle strategy
- [ ] **Heatmaps** - Time-of-day play patterns
- [ ] **Competitive ELO rating** - Ranked matchmaking

### Low Priority - Game Modes
- [ ] **Custom word mode** - Host enters a secret word for the room
- [ ] **Expanded solutions list** - Grow from 666 → 2,500 words for more variety
- [ ] **Marathon mode** - 6-7 letter words
- [ ] **Powerups** - Reveal a letter, extra guess, etc.

### High Priority - Connection Resilience
See `docs/RECONNECTION_ARCHITECTURE.md` for full design.

**Phase 0: Architectural Foundation** (Critical - Enables all future work)
- [ ] **Separate player identity from connection** - Player state survives disconnect
  - Add `connectionState: 'connected' | 'disconnected'` to player
  - Add `disconnectedAt` timestamp for grace period tracking
  - Add `reconnectTimer` for delayed removal
- [ ] **Grace period instead of immediate removal** - Don't delete players on disconnect
  - Waiting room: 120s grace period
  - Active game: 60s grace period
  - Results: 300s grace period
- [ ] **Broadcast disconnect/reconnect events** - UI feedback for other players
  - `playerDisconnected` with grace period countdown
  - `playerReconnected` when they return

**Phase 1: Waiting Room Reconnection** (High - Solves primary pain point)
- [ ] **Client session storage** - Store roomCode + playerId in sessionStorage
- [ ] **Rejoin message handler** - Server accepts `rejoin` and restores player
- [ ] **Reconnecting UI** - Overlay while attempting to reconnect
- [ ] **Handle rejoin failures** - "Room not found" / "Player removed" messages

**Phase 2: URL-Based Room Sharing** (High - Easy win)
- [ ] **Room code in URL** - `/wordle/room/ABC123` format
- [ ] **Auto-join from URL** - Parse URL on load, join room automatically
- [ ] **Browser history integration** - Back button returns to lobby
- [ ] **Server route for room URLs** - Serve index.html for `/wordle/room/*`

**Phase 3: In-Game Reconnection** (Medium - Full solution)
- [ ] **Send game state on rejoin** - Guesses, timer, opponent progress
- [ ] **Restore grid and keyboard** - Rebuild UI from saved state
- [ ] **Handle game-ended-while-away** - Show results if game finished
- [ ] **Timer synchronization** - Correct for time passed during disconnect

**Phase 4: Advanced (Future)**
- [ ] **Cross-session persistence** - Store room state in database
- [ ] **Server restart recovery** - Reload rooms from DB on startup
- [ ] **Spectator mode** - Watch after finishing

### Medium Priority - Navigation & UX
- [ ] **Leave/Cancel game** - Clear exit mechanics for mid-game abandonment
  - "Leave Game" button visible during play
  - Confirmation dialog to prevent accidental exits
  - Handle stats tracking (count as loss? exclude from stats?)
  - Notify other players when someone leaves

---

## Priority 1: Auth & Persistence

### Simple Login System
Basic auth for the overworld to enable data persistence.

**Purpose:**
- Persist character selection across sessions/devices
- Track Wordle stats and performance over time
- Foundation for future features (achievements, unlockables)

**Requirements:**
- Super simple - minimal friction to play
- Persist: player name, character, game stats
- Options: Supabase, simple SQLite, or JSON file storage

**Implementation Options:**
1. **Supabase** - Free tier, easy setup, built-in auth
2. **SQLite + simple API** - No external deps, self-contained
3. **JSON file per user** - Simplest, no DB needed

### Wordle Stats Tracking
Track performance metrics over time (requires auth above).

**Metrics:**
- Win rate (overall and vs specific opponents)
- Average solve time
- Average guesses per game
- Head-to-head matchup history
- Streak tracking (consecutive wins)

**Display:**
- Stats page accessible from Wordle lobby
- Personal dashboard with charts/graphs
- Leaderboard across all players

---

## Priority 2: Major Features

### Character Customization
Let players personalize their character appearance.

**Options:**
- Color palette selection (skin, outfit, accessories)
- Choose on first join or from pause menu
- Could evolve into a "store" with unlockables

**Visual:**
- Color tinting or palette swaps (simplest)
- Separate sprite sheets per color (more work, better control)
- Accessory layers (hats, items) drawn on top

---

## Priority 3: Multiplayer Optimizations (Overworld)

### Latency Improvements
- [ ] Client-side prediction - move locally, reconcile with server
- [ ] Delta updates - send position changes, not absolute positions
- [ ] Tick rate batching - batch updates to 20-30 Hz instead of every frame
- [ ] Compression - msgpack instead of JSON (optional)

### Reliability
- [ ] Connection quality indicator - show ping/latency
- [ ] Graceful degradation - continue in single-player if server dies

### Scalability
- [ ] Rooms/lobbies - multiple game instances
- [ ] Player limits per room
- [ ] Matchmaking - auto-join available rooms

Note: Wordle reconnection is tracked in "High Priority - Connection Resilience" above.

---

## Future Ideas (Icebox)

### Map Editor Improvements

**Rotate Entities**
- Rotate placed entities with mouse drag or 'R' key
- Support 90° increments or free rotation
- Visual rotation handle on selected entity

**Clone Selection**
- Select a region of tiles/entities
- Copy to clipboard/palette
- Paste elsewhere on map
- Useful for repeating patterns (fences, paths, room layouts)

**Map Management from UI**
- Load/save maps without manual file copying
- Browse/select maps from a list in the editor UI
- Create new map from template with custom name
- Delete/rename maps
- Auto-save to server or localStorage
- **Choose save location** - Pick folder for local map saves (File System Access API)
- **Map naming** - Enter custom filename when saving (not just download)

**Entity List UX Fix**
- Entity list panel should scroll independently
- Currently scrolls the whole page when list is long
- Fix: `overflow-y: auto` with fixed height on entity list container

### Hub Landing Page Visual Improvements
- Replace green grass background with something more fitting (gradient, pattern, or themed graphic)
- Current grass color feels out of place for a tools hub landing page
- Consider: dark gradient, subtle grid pattern, or stylized tech-themed background

### Improved Hitbox Management
Editor or tooling for creating pixel-perfect collision shapes.

**Current state:**
- Config-based collision shapes in `config.js` (normalized coordinates)
- Supports rectangles and polygons
- Triangle roofs work well for house-1 style buildings

**Future improvements:**
- Visual hitbox editor (in-game or external tool like PhysicsEditor/Tiled)
- More complex polygon shapes for irregular buildings
- Automatic hitbox generation from sprite alpha channel

### Dynamic Depth Sorting
Allow player to walk "behind" buildings and trees for proper 2D depth illusion.

**Current behavior:**
- Player always renders on top of buildings (z-index 10 > building z-index 4)
- Full collision blocks player from entering building area

**Desired behavior:**
- Player can walk behind buildings (when "above" them in Y-space)
- Player renders behind building roof when north of building
- Player renders in front when south of building

**Implementation approaches:**
1. **Y-based z-index** - Update player z dynamically based on Y position
2. **Per-object sorting** - Compare player Y to each object's "foot" position
3. **Layered collision** - Separate roof collision (passable) from base collision (blocking)

**Complexity:** Medium-High. Requires frame-by-frame z-index updates and careful handling of overlapping objects.

### Scotty NPC
- Fast-moving character that zips around the map
- Hard to catch, rewards bonus points
- Random movement patterns

### Timed Fritelle Mode
- Competitive race to collect the most in 60 seconds
- Countdown timer
- Final scoreboard

### Minimap
- Small overview in corner
- Show player positions
- Show fritelle locations

### Achievement Popups
- Toast notifications for milestones
- First collection, 10 collected, golden catch, etc.

### Custom Voice Sounds
- Let each team member record their own sounds
- Fritelle hit reactions, voice lines, etc.
- Could use Web Audio API for recording
- Store in localStorage or server-side per player

---

---

## Priority 0: Code Quality & Standards

### Latest Audit (2026-01-03)

See `TECH_DEBT.md` for full audit results and remediation plan.

**Summary:**
- 0 critical issues
- 6 warnings (documented in TECH_DEBT.md)
- 4 info items (backlogged)

### Immediate Remediation Tasks

- [ ] **Fix `any` type** - `server/src/index.ts:211` - Change to `unknown` (5 min)
- [ ] **ESLint warnings** - Fix 39 unused variable warnings (1-2 hours)
- [ ] **Review console.logs** - Remove debug logs, keep production logs (30 min)

### Near-Term Improvements

- [ ] **Split wordle-room.ts** - Extract timer, database, and message handlers (4-6 hours)
  - Extract `WordleTimerManager` class
  - Extract `WordleDatabaseService` for Supabase operations
  - Extract `WordleMessageHandler` for message routing
- [ ] **Set up Jest** - Add test infrastructure for server (4 hours)
- [ ] **ESLint 9 migration** - Migrate to flat config (2-3 hours)

### Quality Tools

- `/audit` - Comprehensive codebase audit
- `/review-recent` - Review recent changes before commit
- `/lint` - Run ESLint + Prettier + TypeScript checks

---

## Code Quality Audit (Legacy Reference)

### Overview
The codebase has grown significantly. Before adding major features, conduct a comprehensive code audit to identify technical debt, improve maintainability, and establish patterns for future development.

**Scope:** ~15,000 lines across 40+ files, with `map-editor.html` (3,144 lines) being the largest single file.

**Note:** Many items below are now tracked in `TECH_DEBT.md` with more detail.

### Audit Checklist

#### 1. File Organization & Structure

| Check | Status | Notes |
|-------|--------|-------|
| **Monolith files** - Files >500 lines that should be split | ⬜ | `map-editor.html` is 3144 lines |
| **Duplicate code** - `server/public/js/` mirrors `js/` | ⬜ | Sync mechanism needed or consolidate |
| **Dead code** - Unused functions, variables, imports | ⬜ | |
| **Circular dependencies** - Modules importing each other | ⬜ | |
| **Naming conventions** - Consistent file/function/variable naming | ⬜ | |
| **Folder structure** - Logical grouping (entities, systems, scenes) | ⬜ | Currently good |

#### 2. Function Quality

| Check | Status | Notes |
|-------|--------|-------|
| **Long functions** - Functions >50 lines | ⬜ | Identify and refactor |
| **Deep nesting** - >3-4 levels of indentation | ⬜ | Extract to helper functions |
| **Single responsibility** - Functions doing multiple unrelated things | ⬜ | |
| **God functions** - Functions that know too much | ⬜ | |
| **Pure vs impure** - Side effects clearly documented | ⬜ | |

#### 3. Parameter & API Design

| Check | Status | Notes |
|-------|--------|-------|
| **Kitchen sink parameters** - Functions with >5 params | ⬜ | Use options objects instead |
| **Boolean blindness** - Multiple boolean params (`fn(true, false, true)`) | ⬜ | Use named options |
| **Inconsistent return types** - Same function returning different shapes | ⬜ | |
| **Missing validation** - No input validation on public APIs | ⬜ | |
| **Unclear contracts** - What does this function promise? | ⬜ | |

#### 4. Error Handling

| Check | Status | Notes |
|-------|--------|-------|
| **Silent failures** - Empty catch blocks | ⬜ | `catch (e) {}` |
| **Blind catches** - Catching all errors without discrimination | ⬜ | `catch (e) { console.log(e) }` |
| **Missing error boundaries** - Errors propagate unexpectedly | ⬜ | |
| **Unhandled promises** - `.then()` without `.catch()` | ⬜ | |
| **User-facing errors** - Are errors shown appropriately? | ⬜ | |

#### 5. Code Hygiene

| Check | Status | Notes |
|-------|--------|-------|
| **Console statements** - Debug logs left in production code | ⬜ | |
| **TODO/FIXME** - Unresolved comments that should be tickets | ⬜ | |
| **Commented-out code** - Dead code in comments | ⬜ | Delete or restore |
| **Magic numbers/strings** - Hardcoded values without explanation | ⬜ | Extract to constants |
| **Inconsistent formatting** - Mixed tabs/spaces, line lengths | ⬜ | |
| **Copy-paste code** - Same logic duplicated | ⬜ | We added piece lookup 4 times |

#### 6. State Management

| Check | Status | Notes |
|-------|--------|-------|
| **Global state** - Excessive use of module-level variables | ⬜ | `map-editor.html` has many |
| **State mutation** - Unclear who modifies what | ⬜ | |
| **State synchronization** - Multiple sources of truth | ⬜ | |
| **localStorage hygiene** - Keys documented, cleanup on uninstall | ⬜ | |

#### 7. Performance

| Check | Status | Notes |
|-------|--------|-------|
| **Memory leaks** - Event listeners not cleaned up | ⬜ | |
| **Unnecessary re-renders** - Rendering when nothing changed | ⬜ | |
| **Large synchronous operations** - Blocking the main thread | ⬜ | |
| **Missing debounce/throttle** - Rapid event handlers | ⬜ | |
| **Asset loading** - Images loaded multiple times | ⬜ | |

#### 8. Security

| Check | Status | Notes |
|-------|--------|-------|
| **XSS vulnerabilities** - innerHTML with user input | ⬜ | |
| **Injection risks** - Dynamic code execution | ⬜ | |
| **Hardcoded secrets** - API keys, passwords in code | ⬜ | |
| **CORS/CSP** - Proper security headers | ⬜ | |

#### 9. Documentation

| Check | Status | Notes |
|-------|--------|-------|
| **Missing JSDoc** - Public functions without documentation | ⬜ | |
| **Outdated comments** - Comments that don't match code | ⬜ | |
| **README accuracy** - Does README reflect current state? | ⬜ | |
| **Architecture docs** - High-level system documentation | ⬜ | |

#### 10. Testing & Reliability

| Check | Status | Notes |
|-------|--------|-------|
| **Test coverage** - Critical paths have tests | ⬜ | Currently no tests |
| **Testable code** - Can functions be unit tested? | ⬜ | |
| **Edge cases** - Boundary conditions handled | ⬜ | |
| **Error recovery** - Graceful degradation | ⬜ | |

### Known Issues to Address

1. **`map-editor.html` is a monolith (3144 lines)**
   - Extract: Tileset Builder → `tileset-builder.js`
   - Extract: Sprite Slicer → `sprite-slicer.js`
   - Extract: Entity management → `entity-manager.js`
   - Extract: Tile painting → `tile-painter.js`
   - Keep: Core state, rendering, event coordination

2. **Repeated piece override lookup pattern**
   - Added same 10-line pattern in 4 places
   - Extract to: `getEffectivePieces(assetId)` helper

3. **Duplicate `js/` and `server/public/js/`**
   - Options: (a) Build step to copy, (b) Symlinks, (c) Single source
   - Currently manually synced → error-prone

4. **No linting or formatting**
   - Add: ESLint + Prettier
   - Add: Pre-commit hook

### Refactoring Priorities

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| 1 | Extract `getEffectivePieces()` helper | High | Low |
| 2 | Add ESLint + Prettier | High | Low |
| 3 | Split `map-editor.html` into modules | High | Medium |
| 4 | Consolidate `js/` duplication | Medium | Medium |
| 5 | Add basic test infrastructure | Medium | Medium |
| 6 | Document architecture | Medium | Low |

### Audit Process

1. **Run static analysis** - ESLint with strict rules
2. **Measure complexity** - Function length, nesting depth, cyclomatic complexity
3. **Review each file** - Use checklist above
4. **Document findings** - Create issues or inline TODOs
5. **Prioritize fixes** - Impact vs effort matrix
6. **Incremental refactoring** - Fix as you touch code

### Success Criteria

- [ ] No function >100 lines
- [ ] No nesting >4 levels
- [ ] No duplicate code blocks >10 lines
- [ ] ESLint passes with zero warnings
- [ ] All public functions have JSDoc
- [ ] Architecture documented in `/docs`
- [ ] Single source of truth for `js/` files

---

## Technical Reference

### Server
- **Location:** `./server`
- **Stack:** Node.js + ws + Express
- **Deployment:** Railway
- **Health:** https://epcvip-tools-hub-production.up.railway.app/health

### Client
- **Stack:** KaPlay (Kaboom.js fork)
- **Server URL:** Auto-detected from `window.location` in `index.html`

### Docs
- `docs/RAILWAY_RETROSPECTIVE_2025-12-27.md` - Deployment lessons learned
- `docs/MULTIPLAYER_PLAN.md` - Original multiplayer design
