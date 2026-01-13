# EPCVIP Tools Hub

A retro-style game hub for EPCVIP innovation tools, featuring an overworld exploration game.

**Live:** https://epcvip.vip

**Note:** Wordle Battle has been extracted to its own repo and is now at [fwaptile.com](https://fwaptile.com).

## Features

### Overworld Game
Retro RPG-style hub world built with KaPlay (Kaboom.js fork).

- **Character Movement** - 8-direction walk/idle animations
- **Multiplayer** - See other players in real-time
- **Collectibles** - Fritelle items with golden variants
- **Tool Links** - Interactive buildings linking to external tools

### Embedded Tools
Reverse-proxied tools accessible from a single domain:

- `/ping-tree` - Ping Tree Compare (proxied)

Custom domain tools (shared Supabase auth):
- athena.epcvip.vip - Athena Usage Monitor
- compare.epcvip.vip - Ping Tree Compare
- reports.epcvip.vip - Reports Dashboard
- fwaptile.com - Wordle Battle

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, TypeScript, Express, ws (WebSocket) |
| Database | PostgreSQL via Supabase |
| Frontend - Game | Vanilla JS, KaPlay 3001 |
| Auth | JWT-based SSO + Supabase Auth |
| Deployment | Railway |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/ahhhdum/epcvip-tools-hub.git
cd epcvip-tools-hub

# Install root dependencies (lint, format, husky)
npm install

# Install server dependencies
cd server && npm install
```

### Environment Setup

Create `server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
PORT=2567
```

### Database Setup

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Apply all migrations
npx supabase db push
```

### Running Locally

```bash
# Development (with ts-node)
cd server && npm start

# Production build
npm run build
cd server && npm run serve
```

Server runs on http://localhost:2567

- Game: http://localhost:2567/
- Health: http://localhost:2567/health

## Database Schema

| Table | Description |
|-------|-------------|
| `players` | User profiles (display name, character selection) |

Migrations are in `supabase/migrations/`.

## Project Structure

```
epcvip-tools-hub/
├── server/                 # Node.js backend
│   ├── src/
│   │   └── index.ts       # Express + WebSocket server
│   └── public/            # Static files (built)
├── js/                    # KaPlay game frontend
├── tools/                 # Map editor, embedded tools
├── supabase/              # Database migrations
├── CLAUDE.md              # AI assistant context
├── STANDARDS.md           # Code standards
└── BACKLOG.md             # Feature roadmap
```

## API Endpoints

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/config` | GET | Client configuration (Supabase URL) |
| `/api/sso/sign-token` | POST | Sign SSO token for cross-app auth |

### WebSocket Messages

**Client → Server:**
- `move` - Update player position
- `collect` - Collect a fritelle
- `throw` - Throw a fritelle
- `setName` - Update display name
- `setAppearance` - Update character

**Server → Client:**
- `init` - Initial state (players, fritelles)
- `playerJoined` - New player connected
- `playerMoved` - Player position update
- `playerLeft` - Player disconnected
- `fritelleCollected` - Item collected
- `fritelleSpawned` - New item spawned

## Development

### Code Quality

```bash
npm run lint        # ESLint check
npm run lint:fix    # Auto-fix issues
npm run format      # Prettier formatting
cd server && npm test  # Jest tests
```

Pre-commit hooks run automatically via Husky + lint-staged.

### Adding Features

1. Add to `BACKLOG.md`
2. Create design doc in `docs/` if complex
3. Follow patterns in `STANDARDS.md`
4. Write tests for new server code
5. Run quality checks before committing

## Deployment

Deployed to Railway with automatic deploys on push to `main`.

Build command: `npm run build`
Start command: `cd server && npm run serve`

## Documentation

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI assistant context (project overview) |
| `STANDARDS.md` | Code standards and patterns |
| `BACKLOG.md` | Feature roadmap and priorities |
| `TECH_DEBT.md` | Technical debt tracking |
| `docs/` | Feature design documents |

## License

Private - EPCVIP Internal Use
