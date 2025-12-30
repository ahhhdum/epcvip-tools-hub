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
