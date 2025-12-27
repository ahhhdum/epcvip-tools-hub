# EPCVIP Tools Hub - Feature Backlog

## Completed
- [x] Fritelles with golden variants
- [x] Throw mechanic (diagonal support)
- [x] Context-aware dialog
- [x] Sound effects with mute toggle
- [x] Multiplayer - native WebSocket server
- [x] Player-to-player hit detection
- [x] Railway deployment

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
