# EPCVIP Tools Hub

A retro-style game interface for EPCVIP innovation tools, featuring multiplayer Wordle Battle.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | TypeScript, Express, ws (WebSocket), Supabase |
| Frontend - Game | Vanilla JS, KaPlay 3001 (Kaboom.js fork) |
| Frontend - Wordle | Vanilla JS, CSS, ES Modules |
| Database | PostgreSQL via Supabase |
| Deployment | Railway (reverse proxy routing) |
| Auth | JWT-based SSO + Supabase Auth |

## Critical Warnings

1. **RLS Required** - All new Supabase tables MUST have Row-Level Security policies
2. **WebSocket Cleanup** - Always clean up Maps/Sets and intervals on disconnect
3. **Service Key** - NEVER expose `SUPABASE_SERVICE_KEY` to client code
4. **Parameterized Queries** - Never use string interpolation in Supabase queries
5. **Console Logs** - Remove debug console.logs before committing

## Project Structure

```
epcvip-tools-hub/
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── index.ts          # Express + WebSocket server, API routes
│   │   ├── rooms/
│   │   │   └── wordle-room.ts # Wordle game logic, room management
│   │   └── utils/
│   │       ├── daily-word.ts  # Daily word system (epoch: 2024-01-01)
│   │       ├── room-codes.ts  # 6-char room code generator
│   │       └── word-list.ts   # 666 common 5-letter words
│   └── public/               # Static files (copied during build)
│
├── js/                        # KaPlay game frontend
│   ├── main.js               # Entry point, scene registration
│   ├── config.js             # Game settings, tool links
│   ├── scenes/               # Loading, overworld, pause screens
│   ├── entities/             # Player, buildings, collectibles
│   └── systems/              # Input, camera, audio, multiplayer
│
├── wordle/                    # Wordle Battle frontend
│   ├── index.html            # Game UI, auth modal, views
│   ├── wordle.css            # Styles
│   ├── wordle.js             # Game logic, WebSocket client
│   └── valid-guesses.js      # 12K valid 5-letter words
│
├── tools/                     # Embedded tool iframes
├── assets/                    # Sprites (Cute_Fantasy pack)
├── STANDARDS.md              # Code standards (READ THIS)
└── BACKLOG.md                # Feature backlog
```

## Key Commands

```bash
# Development
npm run dev              # Start server with hot reload
npm run build           # Compile TypeScript + copy static

# Quality
npm run lint            # ESLint check
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Prettier formatting
/audit                  # Comprehensive quality audit
/review-recent          # Review recent changes

# Server
cd server && npm start  # Start production server
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `wordle_stats` | Aggregate player stats (games, wins, streaks) |
| `wordle_games` | Game records (room, word, mode, timestamps) |
| `wordle_results` | Per-player results per game |
| `daily_challenge_completions` | Daily challenge tracking |
| `players` | Player profiles (from auth) |

## Code Patterns

### WebSocket Message Format
```typescript
// All messages have type + payload
{ type: 'createRoom', playerName: 'Alice', playerEmail: 'alice@ex.com' }
{ type: 'error', message: 'Room not found' }
```

### Room Management Pattern
```typescript
class WordleRoomManager {
  private rooms: Map<string, WordleRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private socketToPlayer: Map<WebSocket, string> = new Map();

  // Always clean up ALL maps on disconnect
  handleDisconnect(socket: WebSocket): void {
    const playerId = this.socketToPlayer.get(socket);
    // Delete from all maps...
  }
}
```

### API Response Pattern
```typescript
// Success
res.json({ data: result, meta: { count: 1 } });

// Error
res.status(400).json({ error: 'Invalid email', code: 'BAD_REQUEST' });
```

## Wordle Battle Features

- **Solo Daily Challenge** - One attempt per day per user
- **Historical Dailies** - Play missed past dailies
- **Multiplayer Rooms** - 2-6 players, casual or competitive
- **Real-time Progress** - See opponent boards (colors only)
- **Stats Tracking** - Games, wins, streaks, solve times

## Development Workflow

1. **New Feature**: Add to BACKLOG.md, create plan in docs/
2. **Implementation**: Follow STANDARDS.md, write tests for new code
3. **Review**: Run `/review-recent` before committing
4. **Commit**: Pre-commit hook runs lint + format
5. **Deploy**: Push to main triggers Railway deploy

## Deployment (Railway)

Reverse proxy routes in `server/src/index.ts`:
- `/` → Tools Hub game
- `/ping-tree` → Ping Tree Compare (external)
- `/athena` → Athena Usage Monitor (external)
- `/validator` → Streamlit Validator (external)

## Documentation

| Doc | Purpose |
|-----|---------|
| `STANDARDS.md` | Comprehensive code standards |
| `BACKLOG.md` | Feature backlog and priorities |
| `docs/WORDLE_BATTLE_PLAN.md` | Wordle feature design |
| `docs/MULTIPLAYER_PLAN.md` | Multiplayer architecture |
| `docs/AUTH_AND_PERSISTENCE_PLAN.md` | Auth design |
| `ASSETS.md` | Sprite pack documentation |

## Quick Reference

- **Daily word epoch**: January 1, 2024
- **Room codes**: 6 uppercase letters (A-Z, excludes confusing chars)
- **Max players per room**: 6
- **Max guesses per game**: 6
- **Word length**: 5 letters

---

*See STANDARDS.md for detailed coding standards, anti-patterns, and testing guidelines.*
