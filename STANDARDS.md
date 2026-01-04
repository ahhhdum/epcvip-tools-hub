# EPCVIP Tools Hub - Code Standards

> Last updated: 2026-01-03 | Review quarterly

## Quick Reference

| Category | Key Rule | Threshold |
|----------|----------|-----------|
| Functions | Keep short | <50 lines (warn at 30+) |
| Nesting | Avoid deep | <3 levels |
| Parameters | Limit count | <5 params (warn at 3+) |
| Types | No `any` | Use `unknown` instead |
| Errors | Always handle | No empty catch blocks |
| Console | Dev only | Remove before commit |
| RLS | Required | All user-facing tables |
| Tests | New features | Required for new code |

---

## 1. TypeScript Standards (Backend)

### Configuration

The project uses strict TypeScript. All these flags are enabled in `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Patterns

**DO: Use interfaces for objects**
```typescript
interface WordlePlayer {
  id: string;
  name: string;
  email: string | null;
  socket: WebSocket;
}
```

**DO: Use `unknown` for uncertain types**
```typescript
function parseMessage(data: unknown): GameMessage {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid message');
  }
  // Validate and narrow type
}
```

**DON'T: Use `any`**
```typescript
// BAD
function handleMessage(data: any) { ... }

// GOOD
function handleMessage(data: unknown) { ... }
```

**DON'T: Use type assertions to bypass safety**
```typescript
// BAD - Bypasses type checking
const user = response as User;

// GOOD - Validate first
if (isUser(response)) {
  const user = response;
}
```

### Function Design

**Length**: Functions should be <50 lines. If longer, split into smaller functions.

**Parameters**: Max 5 parameters. If more needed, use an options object:

```typescript
// BAD
function createRoom(socket, name, email, mode, word, solo) { ... }

// GOOD
interface CreateRoomOptions {
  socket: WebSocket;
  playerName: string;
  playerEmail?: string;
  gameMode?: GameMode;
  dailyNumber?: number;
  solo?: boolean;
}
function createRoom(options: CreateRoomOptions) { ... }
```

### Error Handling

**Always handle errors explicitly**:
```typescript
// BAD - Silent failure
try {
  await db.from('table').insert(data);
} catch (e) {}

// GOOD - Log and handle
try {
  await db.from('table').insert(data);
} catch (e) {
  console.error('[DB] Insert failed:', e);
  // Decide: throw, return error, or continue with fallback
}
```

**Use error prefixes in logs**:
```typescript
console.log('[Wordle] Room created');      // Feature prefix
console.error('[DB] Query failed:', err);   // System prefix
console.warn('[Auth] Token expired');       // Warning level
```

### Async/Await

**Always await database operations**:
```typescript
// BAD - Fire and forget
saveGameResults(room, results);

// GOOD - Await or explicit fire-and-forget with catch
await saveGameResults(room, results);
// OR
saveGameResults(room, results).catch(err => console.error('[DB] Save failed:', err));
```

---

## 2. JavaScript Standards (Frontend)

### Module Pattern

Use ES modules with explicit imports:

```javascript
// js/scenes/overworld.js
import { GAME_CONFIG } from '../config.js';
import { createPlayer } from '../entities/player.js';

export function createOverworldScene() { ... }
```

### KaPlay Conventions

**Scene registration in main.js**:
```javascript
scene('overworld', () => createOverworldScene());
scene('pause', () => createPauseScene());
go('loading');
```

**Entity creation pattern**:
```javascript
export function createPlayer(k, spawnPos) {
  return k.add([
    k.sprite('player'),
    k.pos(spawnPos),
    k.area(),
    k.body(),
    'player',  // Tag for queries
  ]);
}
```

### State Management

**Use module-level state for game systems**:
```javascript
// js/systems/multiplayer.js
let socket = null;
let playerId = null;
let roomCode = null;

export function connect() { ... }
export function disconnect() { ... }
export function getState() { return { socket, playerId, roomCode }; }
```

**Reset state on scene transitions**:
```javascript
scene('overworld', () => {
  // Reset scene-specific state
  currentDialogId = null;
  interactableBuilding = null;
  // ...
});
```

---

## 3. WebSocket Standards

### Message Protocol

All messages are JSON with a `type` field:

```typescript
interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

// Examples:
{ type: 'createRoom', playerName: 'Alice', playerEmail: 'alice@example.com' }
{ type: 'roomCreated', roomCode: 'ABC123', playerId: 'wp1_123456' }
{ type: 'error', message: 'Room not found' }
```

### Connection Lifecycle

**Server MUST clean up on disconnect**:
```typescript
handleDisconnect(socket: WebSocket): void {
  const playerId = this.socketToPlayer.get(socket);
  if (!playerId) return;

  const roomCode = this.playerToRoom.get(playerId);
  // Clean up ALL maps
  this.socketToPlayer.delete(socket);
  this.playerToRoom.delete(playerId);
  // Clean up room...
}
```

**Server MUST clear intervals on room destruction**:
```typescript
if (room.countdownTimer) {
  clearInterval(room.countdownTimer);
  room.countdownTimer = null;
}
if (room.timerInterval) {
  clearInterval(room.timerInterval);
  room.timerInterval = null;
}
```

### Message Routing

**Use switch statement for message types**:
```typescript
handleMessage(socket: WebSocket, data: string): void {
  const msg = JSON.parse(data);

  switch (msg.type) {
    case 'createRoom':
      this.createRoom(socket, msg.playerName, msg.playerEmail);
      break;
    case 'joinRoom':
      this.joinRoom(socket, msg.roomCode, msg.playerName);
      break;
    // ... all message types
    default:
      console.log(`[WS] Unknown message type: ${msg.type}`);
  }
}
```

### Broadcasting

**Helper functions for sending**:
```typescript
private send(socket: WebSocket, msg: object): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

private broadcastToRoom(roomCode: string, msg: object, excludeId?: string): void {
  const room = this.rooms.get(roomCode);
  if (!room) return;

  for (const player of room.players.values()) {
    if (player.id !== excludeId && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(JSON.stringify(msg));
    }
  }
}
```

---

## 4. Supabase/Database Standards

### Row-Level Security (RLS)

**REQUIRED for all user-facing tables**:
```sql
-- Enable RLS
ALTER TABLE wordle_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own stats
CREATE POLICY "Users can view own stats"
  ON wordle_stats FOR SELECT
  USING (player_email = auth.jwt()->>'email');

-- Policy: Users can only update their own stats
CREATE POLICY "Users can update own stats"
  ON wordle_stats FOR UPDATE
  USING (player_email = auth.jwt()->>'email');
```

### Service Key Security

**NEVER expose in client code**:
```typescript
// server/src/index.ts - OK
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// client/wordle.js - NEVER
const serviceKey = 'secret'; // NEVER DO THIS
```

**Server-side only for admin operations**:
```typescript
function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabase && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}
```

### Query Patterns

**Always use parameterized queries**:
```typescript
// GOOD - Parameterized
const { data } = await supabase
  .from('wordle_stats')
  .select('*')
  .eq('player_email', email)
  .single();

// BAD - String interpolation (SQL injection risk)
const { data } = await supabase.rpc('raw_query', {
  query: `SELECT * FROM wordle_stats WHERE email = '${email}'`
});
```

**Handle errors consistently**:
```typescript
const { data, error } = await supabase.from('table').select('*');

if (error) {
  console.error('[DB] Query failed:', error);
  return null;  // Or throw, depending on context
}

return data;
```

### Migration Workflow

1. Use Supabase CLI for schema changes
2. Store migrations in version control
3. Never make manual schema changes in production
4. Test migrations locally first

---

## 5. API Standards

### Endpoint Naming

**Use RESTful conventions**:
```
GET    /api/wordle/stats/:email       # Get player stats
POST   /api/wordle/sso-validate       # Validate SSO token
GET    /api/wordle/daily-number       # Get current daily number
GET    /api/wordle/daily-completion/:email/:dailyNumber  # Check completion
```

### Request Validation

**Validate required parameters**:
```typescript
app.get('/api/wordle/stats/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // Continue with valid email...
});
```

### Response Format

**Success response**:
```json
{
  "data": { ... },
  "meta": { "count": 10 }
}
```

**Error response**:
```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

### Error Responses

| Status | Use Case |
|--------|----------|
| 200 | Success |
| 400 | Invalid request (bad params) |
| 401 | Not authenticated |
| 403 | Forbidden (authenticated but not authorized) |
| 404 | Resource not found |
| 500 | Server error |

---

## 6. Testing Standards (Gradual Adoption)

### Current State

The project currently has no tests. We are adopting testing gradually:

1. **Required**: Tests for all NEW features
2. **Encouraged**: Tests for bug fixes (prevent regression)
3. **Optional**: Tests for existing code (add opportunistically)

### Test Infrastructure

**Backend (server/)**: Jest + ts-jest
```bash
npm install --save-dev jest ts-jest @types/jest
```

**Test file naming**:
```
server/src/utils/daily-word.ts       # Source
server/src/utils/daily-word.test.ts  # Test
```

### Test Patterns

**Unit test example**:
```typescript
// daily-word.test.ts
import { getDailyNumber, getDailyWord } from './daily-word';

describe('getDailyNumber', () => {
  it('returns 1 for epoch date', () => {
    expect(getDailyNumber(new Date('2024-01-01'))).toBe(1);
  });

  it('increments by 1 each day', () => {
    expect(getDailyNumber(new Date('2024-01-02'))).toBe(2);
  });
});
```

**Async test example**:
```typescript
describe('fetchPlayerStats', () => {
  it('returns null for non-existent player', async () => {
    const stats = await fetchPlayerStats('nobody@example.com');
    expect(stats).toBeNull();
  });
});
```

### Mocking Supabase

```typescript
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      }))
    }))
  }))
}));
```

---

## 7. Documentation Standards

### JSDoc Requirements

**Required for exported functions**:
```typescript
/**
 * Get the daily word for a given date
 * @param date - The date to get the word for (defaults to today)
 * @returns The 5-letter word for that day
 */
export function getDailyWord(date: Date = new Date()): string {
  // ...
}
```

**Not required for internal functions** (unless complex logic).

### README Sections

Every project README should include:
1. Project purpose (1-2 sentences)
2. Quick start instructions
3. Project structure overview
4. Key commands
5. Deployment info

### BACKLOG Management

**Format**:
```markdown
## Backlog

### High Priority
- [ ] Feature A - Brief description

### Medium Priority
- [ ] Feature B - Brief description

### Completed
- [x] Feature C - Completed date
```

**Rules**:
- Move completed items to Completed section
- Keep high priority list to <10 items
- Add dates to completed items

---

## 8. Anti-Patterns to Avoid

### 1. Kitchen-Sink Parameters
```typescript
// BAD - Too many parameters
function createGame(mode, word, time, players, solo, daily, num, email, name) { ... }

// GOOD - Options object
function createGame(options: GameOptions) { ... }
```

### 2. Silent Error Swallowing
```typescript
// BAD - Errors disappear
try { await db.insert(data); } catch (e) {}

// GOOD - At minimum, log
try { await db.insert(data); } catch (e) { console.error('[DB]', e); }
```

### 3. God Functions
```typescript
// BAD - 1000+ line function doing everything
handleMessage(socket, data) {
  // 1000 lines of code...
}

// GOOD - Delegate to focused functions
handleMessage(socket, data) {
  switch (msg.type) {
    case 'createRoom': return this.handleCreateRoom(socket, msg);
    case 'joinRoom': return this.handleJoinRoom(socket, msg);
  }
}
```

### 4. Memory Leaks in WebSocket
```typescript
// BAD - Never cleaned up
this.intervals.set(roomId, setInterval(...));

// GOOD - Always clean up
if (this.intervals.has(roomId)) {
  clearInterval(this.intervals.get(roomId));
  this.intervals.delete(roomId);
}
```

### 5. Console.log in Production
```typescript
// BAD - Debug logs committed
console.log('DEBUG: value =', value);
console.log('got here');

// GOOD - Structured logging
console.log('[Wordle] Room created:', roomCode);
```

### 6. Premature Abstraction
```typescript
// BAD - AbstractRoomManagerFactoryBuilder for one game
class AbstractRoomManagerFactoryBuilder { ... }

// GOOD - Simple class when you only have one game
class WordleRoomManager { ... }
```

### 7. Fire-and-Forget Database Calls
```typescript
// BAD - No error handling
this.saveResults(room, results);

// GOOD - Handle or explicitly ignore
this.saveResults(room, results).catch(e => console.error('[DB] Save failed:', e));
```

### 8. String Type Unions Without Validation
```typescript
// BAD - Trusting client input
const mode = msg.mode as GameMode;

// GOOD - Validate input
const validModes = ['casual', 'competitive'];
if (!validModes.includes(msg.mode)) {
  return this.send(socket, { type: 'error', message: 'Invalid mode' });
}
```

---

## Enforcement

### Automated (Pre-commit)

- ESLint for code quality
- Prettier for formatting
- TypeScript compiler for type safety

### Manual (Code Review)

- Function length check
- RLS policy review for DB changes
- Test coverage for new features

### Periodic (/audit command)

- Full codebase scan
- Dependency audit
- Documentation completeness

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-03 | Initial version | Claude Code |
