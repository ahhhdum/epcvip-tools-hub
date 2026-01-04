# EPCVIP Tools Hub

A retro-style game hub for EPCVIP innovation tools, featuring multiplayer Wordle Battle and an overworld exploration game.

**Live:** https://epcvip-tools-hub-production.up.railway.app

## Features

### Wordle Battle
Multiplayer word guessing game with competitive and casual modes.

- **Daily Challenges** - One attempt per day, solo or with friends
- **Historical Dailies** - Play past daily puzzles you missed
- **Multiplayer Rooms** - 2-6 players, real-time opponent progress
- **Granular Analytics** - Per-guess timing, letter results, guess distribution
- **Stats Tracking** - Win streaks, solve times, games played

### Overworld Game
Retro RPG-style hub world built with KaPlay (Kaboom.js fork).

- **Character Movement** - 8-direction walk/idle animations
- **Multiplayer** - See other players in real-time
- **Collectibles** - Fritelle items with golden variants
- **Tool Links** - Interactive buildings linking to external tools

### Embedded Tools
Reverse-proxied tools accessible from a single domain:

- `/ping-tree` - Ping Tree Compare
- `/athena` - Athena Usage Monitor
- `/validator` - Streamlit Validator

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, TypeScript, Express, ws (WebSocket) |
| Database | PostgreSQL via Supabase |
| Frontend - Game | Vanilla JS, KaPlay 3001 |
| Frontend - Wordle | Vanilla JS, CSS, ES Modules |
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
- Wordle: http://localhost:2567/wordle/
- Health: http://localhost:2567/health

## Database Schema

| Table | Description |
|-------|-------------|
| `players` | User profiles (display name, character selection) |
| `wordle_games` | Game sessions with metadata |
| `wordle_results` | Per-player outcomes for each game |
| `wordle_stats` | Aggregate stats (wins, streaks, guess distribution) |
| `wordle_guesses` | Individual guesses with timing and results |
| `daily_challenge_completions` | One record per user per daily |
| `achievements` | Achievement definitions |
| `player_achievements` | Earned achievements |

Migrations are in `supabase/migrations/`.

## Project Structure

```
epcvip-tools-hub/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── index.ts       # Express + WebSocket server
│   │   ├── rooms/         # Game room management
│   │   ├── services/      # Business logic (database, validation)
│   │   ├── constants/     # Configuration constants
│   │   └── utils/         # Helpers (daily word, room codes)
│   └── public/            # Static files (built)
├── js/                    # KaPlay game frontend
├── wordle/                # Wordle Battle frontend
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
| `/api/wordle/stats/:email` | GET | Player statistics |
| `/api/wordle/daily-completion/:email/:num` | GET | Check daily completion |
| `/api/wordle/historical-dailies/:email` | GET | Recent dailies with status |

### WebSocket Messages

**Client → Server:**
- `createRoom` - Create new game room
- `joinRoom` - Join existing room
- `setReady` - Toggle ready status
- `startGame` - Begin countdown
- `guess` - Submit a word guess

**Server → Client:**
- `roomCreated` - Room creation confirmed
- `gameStarted` - Game begun, word length sent
- `guessResult` - Validation result for guesser
- `opponentGuess` - Progress update (colors only)
- `timerSync` - Periodic time updates
- `gameEnded` - Final results

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
