# EPCVIP Tools Hub

## Planning

- **Backlog:** [backlog/_BACKLOG.md](backlog/_BACKLOG.md)

A retro-style game interface for EPCVIP innovation tools.

**Note:** Wordle Battle has been extracted to its own repo at [fwaptile-wordle](../fwaptile-wordle/) and deployed at fwaptile.com.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | TypeScript, Express, ws (WebSocket), Supabase |
| Frontend - Game | Vanilla JS, KaPlay 3001 (Kaboom.js fork) |
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
│   │   └── index.ts          # Express + WebSocket server, API routes
│   └── public/               # Static files (copied during build)
│
├── supabase/                  # Database migrations
│   └── migrations/           # SQL files
│
├── js/                        # KaPlay game frontend
│   ├── main.js               # Entry point, scene registration
│   ├── config.js             # Game settings, tool links
│   ├── scenes/               # Loading, overworld, pause screens
│   ├── entities/             # Player, buildings, collectibles
│   └── systems/              # Input, camera, audio, multiplayer
│
├── tools/                     # Embedded tool iframes
├── assets/                    # Sprites (Cute_Fantasy pack)
├── STANDARDS.md              # Code standards (READ THIS)
└── BACKLOG.md                # Feature backlog
```

## Key Commands

```bash
# Development
cd server && npm start  # Start dev server (ts-node)
npm run build           # Compile TypeScript + copy static

# Quality
npm run lint            # ESLint check
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Prettier formatting
cd server && npm test   # Run Jest tests

# Database (Supabase)
npx supabase login              # Authenticate CLI
npx supabase link --project-ref yuithqxycicgokkgmpzg
npx supabase db push            # Apply migrations to remote
npx supabase migration list     # Check migration status

# Testing
cd server && npm test                           # Unit tests
npx playwright test                             # E2E tests
npx playwright test --ui                        # Interactive debugger
```

## Testing Strategy

See `docs/TESTING_GUIDE.md` for comprehensive testing documentation.

| Layer | Type | Cost | Trigger |
|-------|------|------|---------|
| Unit tests | Jest | Free | Every commit |
| E2E tests | Playwright | Free | Every PR |
| Visual regression | Playwright snapshots | Free | Every PR |

## Database Schema

Migrations in `supabase/migrations/`. Push with `npx supabase db push`.

| Table | Purpose |
|-------|---------|
| `players` | Player profiles (display_name, character) |

## Code Patterns

### WebSocket Message Format
```typescript
// All messages have type + payload
{ type: 'move', x: 100, y: 200, direction: 'down' }
{ type: 'error', message: 'Invalid message' }
```

### API Response Pattern
```typescript
// Success
res.json({ data: result, meta: { count: 1 } });

// Error
res.status(400).json({ error: 'Invalid request', code: 'BAD_REQUEST' });
```

## Development Workflow

1. **New Feature**: Add to BACKLOG.md, create plan in docs/
2. **Implementation**: Follow STANDARDS.md, write tests for new code
3. **Review**: Run `/review-recent` before committing
4. **Commit**: Pre-commit hook runs lint + format
5. **Deploy**: Push to main triggers Railway deploy

## Deployment (Railway)

Reverse proxy routes in `server/src/index.ts`:
- `/` → Tools Hub game
- `/ping-tree` → Ping Tree Compare (proxied)

Direct links (custom domains):
- athena.epcvip.vip → Athena Usage Monitor
- compare.epcvip.vip → Ping Tree Compare
- reports.epcvip.vip → Reports Dashboard
- fwaptile.com → Wordle Battle (separate repo)

## Documentation

| Doc | Purpose |
|-----|---------|
| `STANDARDS.md` | Comprehensive code standards |
| `BACKLOG.md` | Feature backlog and priorities |
| `docs/TESTING_GUIDE.md` | Testing strategy and commands |
| `docs/MULTIPLAYER_PLAN.md` | Multiplayer architecture |
| `docs/AUTH_AND_PERSISTENCE_PLAN.md` | Auth design |
| `ASSETS.md` | Sprite pack documentation |

## Related

- [EPCVIP_SERVICES.md](../../EPCVIP_SERVICES.md) - Ecosystem architecture, shared auth

---

*See STANDARDS.md for detailed coding standards, anti-patterns, and testing guidelines.*
