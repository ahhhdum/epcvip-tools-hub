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

**Live at:** https://epcvip-tools-hub-production.up.railway.app

---

## Priority 1: Quick Wins

### Player Name Input
- Add name entry on game start
- Send `setName` message to server (handler already exists)
- Display above player character
- Persist in localStorage

---

## Priority 2: Major Features

### Wordle Room
A collaborative/competitive Wordle experience for the team.

**Concept:**
- All players join a shared Wordle room
- Everyone plays the same word simultaneously
- Don't show what letters others have used
- Show real-time progress:
  - How many guesses each player has made
  - How many correct letters (green) they have
  - Completion time when they finish
- Leaderboard at end showing solve times

**Implementation:**
- New scene: `wordle.js`
- Server-side word selection (same for all players)
- WebSocket messages: `wordleGuess`, `wordleProgress`, `wordleComplete`
- Daily word rotation (optional)

### Character Customization
Let players personalize their character appearance.

**Options:**
- Color palette selection (skin, outfit, accessories)
- Choose on first join or from pause menu
- Could evolve into a "store" with unlockables

**Implementation Approaches:**
1. **localStorage only** - Simple, no backend, resets if cleared
2. **Server-persisted** - Requires identity (see SSO below)
3. **Hybrid** - localStorage + optional sync when logged in

**Visual:**
- Color tinting or palette swaps (simplest)
- Separate sprite sheets per color (more work, better control)
- Accessory layers (hats, items) drawn on top

---

## Consideration: Persistence & SSO

**The Problem:**
Many features benefit from persistence (customization, stats, achievements), but requiring per-game login is friction. SSO across all tools hub apps would be ideal.

**Options:**
1. **No persistence** - localStorage only, resets on clear
2. **Game-only login** - Simple auth just for this game
3. **Tools Hub SSO** - Single sign-on across all tools (ideal but more work)
4. **EPCVIP SSO integration** - If company has existing SSO

**Recommendation:**
Start with localStorage for name/colors. Add SSO later when there's enough value to justify it. Keep the data model ready for server sync.

---

## Priority 3: Multiplayer Optimizations

### Latency Improvements
- [ ] Client-side prediction - move locally, reconcile with server
- [ ] Delta updates - send position changes, not absolute positions
- [ ] Tick rate batching - batch updates to 20-30 Hz instead of every frame
- [ ] Compression - msgpack instead of JSON (optional)

### Reliability
- [ ] Reconnection handling - auto-reconnect on disconnect
- [ ] Connection quality indicator - show ping/latency
- [ ] Graceful degradation - continue in single-player if server dies

### Scalability
- [ ] Rooms/lobbies - multiple game instances
- [ ] Player limits per room
- [ ] Matchmaking - auto-join available rooms

---

## Future Ideas (Icebox)

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

---

---

## Priority 0: Code Quality Audit

### Overview
The codebase has grown significantly. Before adding major features, conduct a comprehensive code audit to identify technical debt, improve maintainability, and establish patterns for future development.

**Scope:** ~15,000 lines across 40+ files, with `map-editor.html` (3,144 lines) being the largest single file.

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
