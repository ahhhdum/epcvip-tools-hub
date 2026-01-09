# EPCVIP Tools Hub - Feature Backlog

## Priority & Effort Legend

| Priority | Meaning | SLA |
|----------|---------|-----|
| **P0** | Critical bug / blocker | This sprint |
| **P1** | High value, should do soon | Next 2 sprints |
| **P2** | Nice to have | When time permits |
| **P3** | Icebox / future idea | No timeline |

| Effort | Time Estimate |
|--------|---------------|
| **XS** | < 1 hour |
| **S** | 1-2 hours |
| **M** | 3-4 hours |
| **L** | 5-8 hours |
| **XL** | > 1 day |

---

## Current Sprint

| ID | Priority | Effort | Description | Status |
|----|----------|--------|-------------|--------|
| GAME-001 | P1 | S | Hard Mode - Must use revealed hints | **DONE** |
| GAME-002 | P1 | S | Rematch button + daily completion UX | **DONE** |
| UX-004 | P2 | S | Win celebration confetti | Pending |

---

## Prioritized Backlog

### P1 - High Priority

| ID | Effort | Description | Files |
|----|--------|-------------|-------|
| **GAME-001** | S | **Hard Mode** - Must use revealed hints in subsequent guesses | `wordle.js`, `wordle-room.ts` |
| **GAME-002** | S | **Rematch button** - Quick "Play Again" with same players | `wordle.js`, `wordle-room.ts` |
| **GAME-003** | M | **Custom letter count** - 4-7 letter word modes (Marathon) | `wordle-room.ts`, `word-list.ts` |
| **BUG-005** | M | localStorage resume exploit - track attempts server-side | `wordle-database.ts`, `wordle-room.ts` |

### P1 - Word Intelligence (see `docs/plans/WORD_INTELLIGENCE_ROADMAP.md`)

| ID | Effort | Description | Files |
|----|--------|-------------|-------|
| ~~**TWL-002**~~ | ~~S~~ | ~~**Expand Sabotage word pool** - 2,000+ words including FUGUE, MAUVE, etc.~~ | **DONE** |
| **SUX-004** | S | **Sabotage validation feedback** - Clear error messages when word rejected | `wordle-game-controller.ts`, `wordle.js` |
| ~~**WDI-001**~~ | ~~L~~ | ~~**Word metadata table** - Frequency scores, tiers, categories~~ | **DONE** |
| **TWL-001** | L | **Seed word tiers** - Categorize words by Google n-gram frequency | `scripts/`, `migrations/` |

### P2 - Medium Priority

| ID | Effort | Description | Files |
|----|--------|-------------|-------|
| **GAME-004** | S | **Give Up button** - Forfeit current game, reveal word, count as loss | `wordle.js`, `wordle-room.ts` |
| **GAME-005** | M | **Replay Mode** - Post-game view showing all players' guess paths step-by-step | `wordle.js`, `wordle.css`, `wordle-room.ts` |
| **ROOM-001** | S | **Kick Player** - Host can remove players from waiting room | `wordle.js`, `wordle-room.ts` |
| **ROOM-002** | S | **Toggle Visibility** - Host can change room public/private after creation | `wordle.js`, `wordle-room.ts` |
| **ROOM-003** | M | **Host Settings Panel** - Host can change word mode, game mode, hard mode in waiting room | `wordle.js`, `wordle-room.ts` |
| **BUG-006** | S | **Public Rooms Lobby** - Fix broken public room list in "Play With Friends" sheet | `wordle.js`, `index.html` |
| **UX-004** | S | **Win celebration** - Confetti animation on victory | `wordle.js`, `wordle.css` |
| **UX-005** | M | **Help/Info system** - How to play, game modes explained, tooltips | `index.html`, `wordle.css` |
| **UX-006** | XS | **Mode explanations** - Explain Competitive vs Casual in UI (Competitive: timer, winner by speed; Casual: no pressure) | `index.html` |
| **UX-007** | M | **Opponent board redesign** - Current boards too big/distracting. Use left+right sides of main board to show more opponents simultaneously. Revisit mobile & desktop layouts. | `wordle.css`, `wordle.js` |
| **SOUND-001** | M | **Sound effects** - Keyboard clicks, win/lose sounds, countdown | `wordle.js`, `assets/` |
| **FEAT-001** | L | **Spectate mode** + emoji reactions for watchers | `wordle-room.ts`, `wordle.js` |
| **SHARE-001** | S | Share results - emoji grid to clipboard | `wordle.js` |
| **TEAM-001** | L | **Team modes** - 2v2, 3v3 cooperative play | `wordle-room.ts`, `wordle.js` |
| **ACH-001** | L | Achievement trigger logic + notifications | `wordle-room.ts`, `wordle.js` |

### P3 - Low Priority / Icebox

| ID | Effort | Description |
|----|--------|-------------|
| **POWER-001** | XL | **Powerups** - Reveal letter, extra guess, ink blot, keyboard scramble |
| **POWER-002** | XL | **Offensive abilities** - Fog of War, Ghost Letters, Vowel Tax |
| **POWER-003** | L | **Chaos Mode** - Maximum powerup disruption |
| **SOCIAL-001** | L | **Friend list** - Add friends, see online status, invite to games |
| **THEME-001** | S | **Custom room themes** - Color schemes per room |
| **LEADER-001** | M | Daily leaderboard - fastest solvers |
| **STATS-003** | M | Starting word analytics |
| **STATS-004** | M | Matchup history UI |
| **PSK-001** | M | **Player ratings table** - Glicko-2 rating, deviation, volatility |
| **PSK-002** | L | **Rating calculator** - Glicko-2 algorithm for word games |
| **SUX-001** | M | **Sabotage word recommendations** - Suggest 5 words based on target's skill |
| **SUX-002** | S | **Difficulty preview** - Show how hard a word is for target |
| **VWL-001** | L | **Variable word length** - 4-7 letter word support |
| **WDI-003** | S | **Player word history** - Track seen words for de-duplication |
| **CODE-001** | M | Split wordle.js into modules (incremental, as-needed) |
| **CODE-002** | S | Split wordle.css into partials (defer unless adding bundler) |

---

## iOS Native App (Future)

**Estimated Total Effort**: 2-4 weeks | **Tech**: SwiftUI + Supabase Swift SDK

Server stays the same. iOS replaces web client only. See `docs/plans/` for full scoping.

| ID | Effort | Description | Web Equivalent |
|----|--------|-------------|----------------|
| **MOBILE-001** | M | **Foundation** - Xcode project, Supabase SDK, AppState (@Observable), navigation | `game-state.js` |
| **MOBILE-002** | M | **WebSocket Client** - URLSessionWebSocketTask, Codable messages, reconnection | `websocket.js` |
| **MOBILE-003** | L | **Game Board UI** - 6x5 grid, tile animations, custom keyboard, theming | `wordle.js` (game) |
| **MOBILE-004** | L | **Multiplayer** - Waiting room, opponent boards, real-time sync, player list | `wordle.js` (room) |
| **MOBILE-005** | M | **Authentication** - Supabase auth, Sign in with Apple, session, guest mode | `wordle.js` (auth) |
| **MOBILE-006** | M | **Polish & Ship** - Haptics, share sheet, App Store assets, TestFlight | N/A |

**Portable code (translate to Swift)**:
- ✅ `state/game-state.js` → `@Observable` AppState
- ✅ `utils/wordle-utils.js` → Pure Swift functions
- ✅ `modules/game-logic.js` → Pure Swift functions
- ✅ `modules/websocket.js` → Protocol reference (extracted 2026-01-08)

---

## Completed

### Wordle Battle (2026-01)
- [x] **Stats Dashboard MVP** - 6-stat grid + guess distribution chart
- [x] **Sabotage Mode** - Pick words for opponent to guess
- [x] **URL-based room sharing** - `/wordle/room/ABC123` links
- [x] **Testing infrastructure** - URL params, data-testid, Playwright fixtures
- [x] **Play With Friends modal** - Improved desktop visibility with blur/shadow
- [x] **UX-001** - Clearer logged-out state indicator
- [x] **UX-003** - Password reset in Settings page
- [x] **BUG-004** - Race condition fix for daily rooms
- [x] **Leave/cancel mid-game** - Exit mechanics during play
- [x] **Reconnection architecture** - Phases 0-3 complete

### Overworld Game
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

### Completed - Room Management Fixes (2026-01-04)

- [x] **BUG-001: Prevent duplicate players during grace period**
  - Fixed: `joinRoom()` now checks if player email already exists in room
  - Redirects to `handleRejoin()` instead of creating new player entry
  - Prevents inflated player counts when rejoining own room

- [x] **BUG-002: Force room close on last player leave**
  - Fixed: Added `forceCloseRoom()` method
  - When last connected player leaves voluntarily, room closes immediately
  - Clears all grace period timers for remaining disconnected players

- [x] **FEAT-002: Visual indicator for completed dailies in lobby**
  - Room cards show green border and reduced opacity for completed dailies
  - "✓ Completed" button (disabled) instead of "Join"
  - Prevents confusion when clicking rooms you can't join

- [x] **Room UI Improvements (Card-Based Layout)**
  - Added card wrappers for Settings, Players, and Actions sections
  - Unified button sizes (mode-btn, vis-btn: 12px 16px padding)
  - Moved Leave Room into actions card next to Start Game
  - Full-width Ready button with consistent styling

- [x] **Pre-Creation Configuration Flow**
  - New roomConfigView shown before room is created on server
  - User configures mode, word selection, and visibility before creating
  - Settings sent with createRoom message (no post-creation config needed)
  - Server accepts gameMode/wordMode/isPublic in createRoom handler

### Pending - Room Management (Sprint 2)

- [x] **BUG-003: Host "Close Room" functionality**
  - Host can close room with other players in it
  - Notifies all players: "Host closed the room"
  - Immediately terminates room regardless of player count
  - Confirmation prompt when other players present

- [ ] **FEAT-001: Spectate mode for completed daily users**
  - Users who completed today's daily can click "Watch" on public daily rooms
  - Read-only view: see boards, no keyboard input
  - Badge in room showing "Spectating"
  - Count spectators separately from players
  - Files: `wordle-room.ts`, `wordle.js`, `index.html`, `wordle.css`

### Pending - Anti-Cheat (Sprint 3)

- [ ] **FEAT-003: Daily attempt tracking (Score Doesn't Count)**
  - Track `daily_attempts` in database with start time and room code
  - If user joins room where attempt already exists, mark as "resumed"
  - Resumed attempts don't count toward stats/leaderboards
  - User informed: "Resumed attempt - won't affect stats"
  - Files: migrations, `wordle-database.ts`, `wordle-room.ts`, `wordle.js`

- [ ] **BUG-004: Race condition - Multiple daily rooms per user**
  - Between async check and room creation, user can create duplicate attempts
  - Fix: Server-side lock or database constraint on `(email, daily_number)`
  - Files: `wordle-room.ts`, `wordle-database.ts`

- [ ] **BUG-005: localStorage resume exploit**
  - Users can clear localStorage to retry dailies
  - Fix: Track daily attempt start server-side in database
  - On room creation, check if attempt exists and send guesses from server
  - Files: `wordle-database.ts`, `wordle-room.ts`, `wordle.js`

### Pending - UX Improvements

- [ ] **UX-001: Clearer logged-out state indicator**
  - Current: Only "Sign in to save your progress" text at bottom (too subtle)
  - Desired: More obvious visual difference between logged-in and logged-out states
  - Ideas: Different header style, prominent login banner, grayed out features
  - Files: `wordle.js`, `wordle.css`, `index.html`

- [ ] **UX-002: Custom email templates**
  - Current: Default Supabase emails from `noreply@mail.app.supabase.io`
  - Desired: Branded emails with EPCVIP styling
  - Requires: Supabase Pro plan OR custom SMTP (SendGrid, Mailgun)
  - Templates needed: Welcome/signup confirmation, Password reset
  - Location: Supabase Dashboard → Authentication → Email Templates

- [ ] **UX-003: Add password reset to Settings page**
  - Add "Change Password" button/link in Settings view
  - Opens password update form (reuse existing updatePasswordForm)
  - Only visible when logged in
  - Files: `wordle/index.html`, `wordle/wordle.js`

### Edge Cases to Handle

- [ ] **EDGE-001: Rapid guess submission (bot detection)** - Reject guesses with `timeSinceLastMs < 500`
- [ ] **EDGE-003: Browser back button during game** - Add `beforeunload` handler, send `leaveRoom`
- [ ] **EDGE-004: Network disconnect during guess submission** - Client retries, server deduplicates

### Completed - Security & UX Blockers (2025-01-04)

- [x] **Server-Side Word Validation (Security)** - ✅ ALREADY SECURE
  - Code analysis confirmed: word is NOT sent in `gameStarted` message
  - Server validates guesses via `validateGuess()` and returns results
  - Word only sent in `gameEnded` and `rejoinResults` (post-completion)
  - No changes needed - architecture was already correct

- [x] **Leave/Cancel Game During Play (UX)**
  - Added "Leave" button to game view header
  - Server handles `leaveRoom` message properly
  - For daily challenges: progress saved to localStorage for resumption
  - Leave confirmation modal shows when leaving daily with guesses
  - Other players notified via `playerLeft` broadcast

- [x] **Daily Challenge Confirmation Modal (UX)**
  - Added confirmation step before starting daily challenge
  - Shows "Ready for Daily #XXX?" with warning about one-shot attempt
  - User must explicitly confirm before game starts
  - Cancel returns to mode selection

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

**Phase 0: Architectural Foundation** ✅ COMPLETE
- [x] **Separate player identity from connection** - Player state survives disconnect
  - `connectionState: 'connected' | 'disconnected'` in wordle-room-types.ts
  - `disconnectedAt` timestamp for grace period tracking
  - `reconnectTimer` for delayed removal
- [x] **Grace period instead of immediate removal** - Don't delete players on disconnect
  - Waiting room: 120s grace period
  - Active game: 60s grace period
  - Results: 300s grace period
- [x] **Broadcast disconnect/reconnect events** - UI feedback for other players
  - `playerDisconnected` with grace period countdown
  - `playerReconnected` when they return

**Phase 1: Client-Side Reconnection** ✅ COMPLETE
- [x] **Client session storage** - Store roomCode + playerId in sessionStorage
- [x] **Rejoin message handler** - Server accepts `rejoin` and restores player
- [x] **Reconnecting UI** - Overlay while attempting to reconnect
- [x] **Handle rejoin failures** - "Room not found" / "Player removed" messages

**Phase 2: URL-Based Room Sharing** ✅ COMPLETE
- [x] **Room code in URL** - `/wordle/room/ABC123` format
- [x] **Auto-join from URL** - Parse URL on load, join room automatically
- [x] **Browser history integration** - Back button returns to lobby
- [x] **Server route for room URLs** - Serve index.html for `/wordle/room/*`
- [x] **Copy Link button** - One-click shareable link copying

**Phase 3: In-Game Reconnection** ✅ COMPLETE
- [x] **Send game state on rejoin** - Guesses, timer, opponent progress
- [x] **Restore grid and keyboard** - Rebuild UI from saved state
- [x] **Handle game-ended-while-away** - Show results if game finished
- [x] **Timer synchronization** - Correct for time passed during disconnect

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

### Latest Audit (2026-01-08)

**Summary:**
- 0 critical issues (qs vulnerability fixed)
- 5 warnings (file complexity, console.logs, innerHTML, outdated deps)
- 12 checks passed (ESLint, TypeScript, security, tests)

**File Complexity Concerns:**
| File | Lines | Status |
|------|-------|--------|
| `wordle/wordle.js` | 5,045 | ⚠️ Needs splitting |
| `wordle/wordle.css` | 4,099 | ⚠️ Needs splitting |
| `server/src/index.ts` | 826 | Acceptable |
| Server room modules | 600-800 each | ✅ Well-split |

**Other Findings:**
- 46 console.log statements in server code (should use structured logging)
- 22 innerHTML usages (need XSS audit)
- eslint-config-prettier outdated (9.1.2 → 10.1.8)

### Immediate Remediation Tasks

- [x] **Fix npm vulnerability** - `qs` package updated via `npm audit fix`
- [x] **ESLint clean** - 0 errors, 0 warnings
- [x] **Add root test script** - `npm test` now works at project root
- [ ] **SEC-002** - Audit innerHTML usages for XSS vulnerabilities

### High Priority - File Splitting

- [~] **CODE-001: Split wordle.js (5,045 lines → modular structure)** - IN PROGRESS
  - [x] `wordle/utils/wordle-utils.js` (89 lines) - Pure utility functions with tests
  - [x] `wordle/utils/wordle-storage.js` (146 lines) - Session/progress storage with tests
  - [x] `wordle/state/game-state.js` - Centralized state management with tests
  - [x] `wordle/modules/game-logic.js` - Game calculation logic with tests
  - [ ] `wordle/modules/auth.js` - Authentication (~400 lines)
  - [ ] `wordle/modules/daily.js` - Daily challenge logic (~500 lines)
  - [ ] `wordle/modules/room.js` - Room management (~600 lines)
  - [ ] `wordle/modules/game.js` - Game board/input (~800 lines)
  - [ ] `wordle/modules/ui.js` - Views, modals (~600 lines)
  - [ ] `wordle/modules/websocket.js` - Connection handling (~400 lines)

- [x] **Split wordle-room.ts (→ 5 focused modules)**
  - `wordle-room.ts` (756 lines) - Coordinator, room CRUD, message dispatch
  - `wordle-game-controller.ts` (789 lines) - Game lifecycle
  - `wordle-player-handler.ts` (614 lines) - Player lifecycle, reconnection
  - `wordle-lobby-manager.ts` (98 lines) - Public room listing
  - `wordle-room-types.ts` (139 lines) - Shared types and interfaces

- [ ] **CODE-002: Split wordle.css (4,099 lines → partials)**
  - `wordle/css/variables.css` - Colors, spacing
  - `wordle/css/base.css` - Reset, typography
  - `wordle/css/layout.css` - Views, containers
  - `wordle/css/components.css` - Cards, buttons, modals
  - `wordle/css/game.css` - Grid, keyboard, boards

### Medium Priority - Code Quality

- [ ] **CODE-003: Structured logging** - Replace 46 console.logs with pino/winston
- [ ] **DEPS-001: Update dependencies** - eslint-config-prettier (9.1.2 → 10.1.8)

### Medium Priority - Testing

- [ ] **TEST-001** - Add WebSocket handler unit tests
- [ ] **TEST-002** - Add auth flow tests
- [ ] **TEST-003** - Add daily challenge E2E test
- [ ] **TEST-004** - Add database integration tests

### Long-term Scalability

- [ ] **ARCH-001** - Extract shared game-logic module (client+server)
- [ ] **ARCH-002** - Add TypeScript to client code
- [ ] **PERF-001** - Implement WebSocket message batching
- [ ] **OBS-001** - Add structured logging + log aggregation

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
