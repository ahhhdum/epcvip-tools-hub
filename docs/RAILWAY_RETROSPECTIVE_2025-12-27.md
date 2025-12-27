# EPCVIP Tools Hub - Game Backlog

---

## Railway Deployment Retrospective (2025-12-27)

### Issues We Faced

| Issue | Symptom | Root Cause | Fix |
|-------|---------|------------|-----|
| **Port mismatch** | "Application failed to respond" | Domain configured for port 3000, app listening on 8080 | Change port in Railway UI |
| **No build step** | "Cannot GET /" | TypeScript not compiled, `dist/` missing | Add build command in Railway UI |
| **Root directory isolation** | Static files 404 | `/server` root can't access parent `../` files | Deploy from `/` with cd commands |
| **npm not found** | Build fails exit 127 | Custom build command runs before Node.js setup | Use root package.json for auto-detection |
| **Missing directory** | `cp: target './public/': No such file or directory` | `cp` can't create directories | Add `mkdir -p public` |

### Why It Was Complex

1. **Monorepo structure** - Client (static) + Server (Node.js) in same repo
2. **Railway's Root Directory isolates context** - Can't access parent files with `../`
3. **Custom commands run in different phases** - Build environment ≠ deploy environment
4. **No railway.toml** - Relied on UI config instead of code-as-config

### What We Should Have Done

1. **Consulted existing docs first**: `~/repos-epcvip/templates/ai-dev-templates/docs/railway/`
2. **Used railway.toml** for config-as-code (see `railpack.node-basic.toml`)
3. **Tested build locally** before pushing
4. **Used root package.json from start** for monorepo orchestration
5. **Added health check endpoint** for faster debugging

### Recommended Pattern for Node.js + Static Monorepo

```
project-root/
├── package.json          # Orchestrates build/start
│   {
│     "scripts": {
│       "build": "cd server && npm install && npm run build",
│       "start": "cd server && npm run serve"
│     }
│   }
├── railway.toml          # Config-as-code
├── server/
│   ├── package.json
│   ├── src/index.ts      # Serves static from ../public
│   └── ...
├── index.html
├── js/
└── assets/
```

**Railway Settings:**
- Root Directory: `/` (empty)
- Build Command: (auto-detected from package.json)
- Start Command: (auto-detected from package.json)

### Reference Docs

- `~/repos-epcvip/templates/ai-dev-templates/docs/railway/RAILWAY_TROUBLESHOOTING.md`
- `~/repos-epcvip/templates/ai-dev-templates/docs/railway/RAILWAY_CONFIG_REFERENCE.md`
- `~/repos-epcvip/templates/ai-dev-templates/templates/railway/railpack.node-basic.toml`

---

## Completed
- [x] Fritelles with golden variants
- [x] Throw mechanic (diagonal support)
- [x] Context-aware dialog
- [x] Sound effects with mute toggle
- [x] Multiplayer - native WebSocket server
- [x] Player-to-player hit detection
- [x] Railway deployment (wss://epcvip-tools-hub-game-production.up.railway.app)

---

## Priority Backlog

### 1. Player Name Input
- Add name entry on game start
- Send `setName` message to server (handler already exists)
- Display above player character
- Persist in localStorage

### 2. Wordle Room
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

### 3. Multiplayer Optimizations

**Latency Improvements:**
- [ ] Client-side prediction - move locally, reconcile with server
- [ ] Delta updates - send position changes, not absolute positions
- [ ] Tick rate batching - batch updates to 20-30 Hz instead of every frame
- [ ] Compression - msgpack instead of JSON (optional)

**Reliability:**
- [ ] Reconnection handling - auto-reconnect on disconnect
- [ ] Connection quality indicator - show ping/latency
- [ ] Graceful degradation - continue in single-player if server dies

**Scalability:**
- [ ] Rooms/lobbies - multiple game instances
- [ ] Player limits per room
- [ ] Matchmaking - auto-join available rooms

---

## Future Ideas

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

## Technical Notes

### Server
- **Location:** `/home/adams/repos-epcvip/utilities/epcvip-tools-hub/server`
- **Stack:** Node.js + ws + Express
- **Deployment:** Railway (production)
- **Health:** https://epcvip-tools-hub-game-production.up.railway.app/health

### Client
- **Location:** `/home/adams/repos-epcvip/utilities/epcvip-tools-hub`
- **Stack:** KaPlay (Kaboom.js fork)
- **Server URL:** Configured in `index.html` via `window.MULTIPLAYER_SERVER`
