# WebSocket Reconnection Architecture

## Executive Summary

This document outlines a phased approach to implementing robust WebSocket reconnection for Wordle Battle. The architecture prioritizes high-impact improvements that solve real user pain points while maintaining a clean foundation for future enhancements.

**Primary Pain Point:** Leaving the page to share a room code (e.g., via WhatsApp) causes the host to disconnect, potentially ending the room before friends can join.

---

## Current State Analysis

### How It Works Today

```
Browser closes/refreshes
        │
        ▼
WebSocket 'close' event fires
        │
        ▼
handleDisconnect() executes IMMEDIATELY:
        │
        ├── room.players.delete(playerId)      ← Player GONE
        ├── playerToRoom.delete(playerId)      ← Mapping GONE
        ├── socketToPlayer.delete(socket)      ← Socket GONE
        │
        ├── If room.players.size === 0
        │       └── rooms.delete(roomCode)     ← Room DELETED
        │
        └── broadcastToRoom('playerLeft')      ← Others notified
```

### Current Data Structures

```typescript
// Server state (all in-memory, ephemeral)
class WordleRoomManager {
  rooms: Map<string, WordleRoom>           // roomCode → room state
  socketToPlayer: Map<WebSocket, string>   // socket → playerId
  playerToRoom: Map<string, string>        // playerId → roomCode
}

// Player identity is tied to WebSocket connection
// New connection = new playerId = no memory of previous session
```

### Problems with Current Approach

| Scenario | User Experience |
|----------|-----------------|
| Host leaves to share code | Room may die, can't rejoin |
| Accidental refresh | Kicked from room, rejoin as stranger |
| Network blip (1 second) | Immediately removed from game |
| Mobile: switch to WhatsApp | Connection may drop, lose game |
| Close wrong browser tab | Game gone forever |

---

## Architecture Principles

### 1. Separate Identity from Connection

**Current:** `playerId` is generated when WebSocket connects. Connection dies = identity dies.

**Better:** Separate concepts:
- `playerId` = Stable player identity (survives disconnection)
- `connectionId` = Current WebSocket connection (ephemeral)

```typescript
interface WordlePlayer {
  id: string;                    // Stable player ID
  name: string;
  email: string | null;
  isCreator: boolean;

  // Connection state (NEW)
  socket: WebSocket | null;      // null when disconnected
  connectionState: 'connected' | 'disconnected';
  disconnectedAt: number | null; // Timestamp for grace period
  reconnectTimer: NodeJS.Timeout | null;

  // Game state
  guesses: string[];
  guessResults: LetterResult[][];
  isFinished: boolean;
  // ... etc
}
```

### 2. Grace Period, Not Immediate Death

Instead of deleting players immediately, give them time to return:

```
Disconnect detected
        │
        ▼
Mark player as disconnected
Set disconnectedAt = now
        │
        ▼
Start reconnectTimer (30-120s depending on game state)
        │
        ▼
Broadcast 'playerDisconnected' (not 'playerLeft')
        │
        ├── Timer expires without reconnect
        │       └── NOW remove player permanently
        │
        └── Player reconnects within grace period
                └── Cancel timer, restore connection
```

### 3. Room Exists Independently of Connections

Rooms should not require anyone to be connected:

```typescript
// A room can exist with all players disconnected (temporarily)
// Room deletion happens when:
// - All players have exceeded their grace periods
// - Game ends and all players leave
// - Room times out (e.g., 10 minutes with no activity)
```

### 4. Client-Side State Persistence

Store reconnection info client-side:

```javascript
// On joining a room
sessionStorage.setItem('wordle_session', JSON.stringify({
  roomCode: 'ABC123',
  playerId: 'player_xyz',
  joinedAt: Date.now()
}));

// On page load
const session = JSON.parse(sessionStorage.getItem('wordle_session'));
if (session && Date.now() - session.joinedAt < GRACE_PERIOD) {
  attemptReconnect(session.roomCode, session.playerId);
}
```

---

## Player State Machine

```
                    ┌──────────────────┐
                    │   NOT IN ROOM    │
                    └────────┬─────────┘
                             │ joinRoom / createRoom
                             ▼
                    ┌──────────────────┐
         ┌─────────│    CONNECTED     │◄─────────┐
         │         └────────┬─────────┘          │
         │                  │                    │
         │  WebSocket       │ WebSocket          │ Reconnect
         │  close           │ close              │ within
         │  (during game)   │ (in waiting)       │ grace period
         │                  │                    │
         │                  ▼                    │
         │         ┌──────────────────┐          │
         │         │   DISCONNECTED   │──────────┘
         │         └────────┬─────────┘
         │                  │
         │                  │ Grace period expires
         │                  ▼
         │         ┌──────────────────┐
         └────────►│     REMOVED      │
                   └──────────────────┘
```

---

## Room State Machine with Reconnection

```
                    ┌──────────────────┐
                    │     WAITING      │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   All players          Host starts          Room timeout
   leave/timeout        game                 (no activity)
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐      ┌──────────────┐        ┌─────────┐
   │ DELETED │      │   COUNTDOWN  │        │ DELETED │
   └─────────┘      └──────┬───────┘        └─────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │     PLAYING      │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   All players          Winner found         All guesses
   disconnected         or time limit        exhausted
   (grace period)            │                    │
        │                    └────────┬───────────┘
        │                             │
        │                             ▼
        │                    ┌──────────────────┐
        │                    │     RESULTS      │
        │                    └────────┬─────────┘
        │                             │
        │         ┌───────────────────┼───────────────────┐
        │         │                   │                   │
        │         ▼                   ▼                   ▼
        │    Players leave       Play Again          Results timeout
        │    one by one          (back to waiting)   (no one reconnects)
        │         │                   │                   │
        └─────────┴───────────────────┴───────────────────┘
                                      │
                                      ▼
                               ┌──────────────────┐
                               │     DELETED      │
                               └──────────────────┘
```

---

## Grace Periods by Context

| Context | Grace Period | Rationale |
|---------|--------------|-----------|
| Waiting room | 120 seconds | Low urgency, host might be sharing code |
| Countdown | 10 seconds | Quick, but give network blips a chance |
| Active game | 60 seconds | Balance: don't hold up game too long |
| Results view | 300 seconds | No rush, let them see results |
| Solo game | 30 seconds | Only affects them |

---

## Edge Cases and Handling

### Edge Case 1: Host Disconnects in Waiting Room

**Scenario:** Host leaves to text room code to friend.

**Current behavior:** Host transferred to next player. If host was alone, room dies.

**New behavior:**
```
Host disconnects
        │
        ▼
room.hostDisconnected = true
Start 120s grace timer
        │
        ├── Other players see: "Host disconnected. Waiting for reconnect..."
        │   (They can still join, ready up, etc.)
        │
        ├── Host reconnects within 120s
        │       └── Resume as host, broadcast 'hostReconnected'
        │
        └── Grace period expires
                └── Promote new host (existing behavior)
```

### Edge Case 2: Disconnect During Countdown

**Scenario:** Network blip right as game is starting.

**Options considered:**
1. ❌ Pause countdown (bad UX for others who are waiting)
2. ❌ Cancel countdown (frustrating for everyone)
3. ✅ Continue countdown, allow rejoin into running game

**New behavior:**
```
Player disconnects during countdown
        │
        ▼
Continue countdown normally
Start reconnect grace timer
        │
        ├── Player reconnects before countdown ends
        │       └── They're back in countdown, will start game
        │
        ├── Countdown ends, game starts
        │       └── Player marked as disconnected in-game
        │           Start in-game grace timer
        │
        └── Player reconnects after game started
                └── Send current game state, resume playing
```

### Edge Case 3: Disconnect During Active Game

**Scenario:** Accidental refresh, network drop, or switching apps.

**New behavior:**
```
Player disconnects during game
        │
        ▼
player.connectionState = 'disconnected'
player.disconnectedAt = Date.now()
        │
        ├── Their timer CONTINUES (fair to other players)
        │
        ├── Other players see: "[Name] disconnected" on their opponent board
        │
        ├── Player reconnects within 60s
        │       ├── Send full game state:
        │       │   - Their guesses so far
        │       │   - Current timer value
        │       │   - Opponent progress
        │       └── Resume playing
        │
        └── Grace period expires
                ├── Mark as "gave up" (lost)
                ├── Remove from active players
                └── If only 1 player left, end game
```

### Edge Case 4: Game Ends While Disconnected

**Scenario:** Player is disconnected when game ends (winner found or time up).

**New behavior:**
```
Game ends while player disconnected
        │
        ▼
Store results in room.finalResults
Room enters 'results' state
        │
        ├── Player reconnects
        │       ├── Check room.gameState === 'results'
        │       └── Send 'rejoinResults' with final results
        │
        └── Results timeout (5 min) with no reconnect
                └── Clean up room
```

### Edge Case 5: Duplicate Tabs / Multiple Connections

**Scenario:** User opens game in two tabs, or refreshes while old connection is still alive.

**Strategy:** New connection replaces old connection.

```
New connection with same playerId
        │
        ▼
Check if player already has active socket
        │
        ├── Yes: Close old socket, use new one
        │        (Old tab will see "Connected elsewhere")
        │
        └── No: Normal connection
```

### Edge Case 6: Room Deleted While Disconnected

**Scenario:** Player tries to rejoin but room was deleted (timeout, game ended, etc.)

**New behavior:**
```
Player sends 'rejoin' message
        │
        ▼
Server checks: does room exist?
        │
        ├── No: Send 'rejoinFailed' with reason
        │       └── Client shows message, returns to lobby
        │
        └── Yes: Continue with rejoin flow
```

### Edge Case 7: Daily Challenge While Disconnected

**Scenario:** Player disconnects from daily challenge, someone else finishes, their completion was saved.

**New behavior:**
```
Player reconnects to daily challenge room
        │
        ▼
Server checks: was this daily already completed by this email?
        │
        ├── Yes: Send completion data, show 'dailyCompleted' view
        │
        └── No: Send game state, resume playing
```

### Edge Case 8: Reconnect as Different User

**Scenario:** User was guest, reconnects after logging in (different identity).

**Strategy:** Treat as new player, not reconnection.

```
Reconnect attempt with different email
        │
        ▼
playerId stored doesn't match current auth
        │
        └── Reject rejoin, treat as new player
            (They can still join the room normally)
```

### Edge Case 9: Server Restart

**Scenario:** Server restarts (deployment, crash), all WebSocket connections drop.

**Current:** All rooms and games lost.

**Future enhancement (Phase 4):**
```
Persist room state to database
        │
        ├── On server start: reload active rooms from DB
        │
        └── Players reconnect: resume where they left off
```

---

## Implementation Phases

### Phase 0: Architectural Foundation
**Priority: CRITICAL | Effort: Medium | Impact: Enables all future work**

Changes that don't alter user-visible behavior but set up the foundation:

#### Server Changes

```typescript
// wordle-room.ts - New player interface
interface WordlePlayer {
  id: string;
  name: string;
  email: string | null;
  isCreator: boolean;

  // NEW: Connection state
  socket: WebSocket | null;
  connectionState: 'connected' | 'disconnected';
  disconnectedAt: number | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;

  // Existing game state
  guesses: string[];
  guessResults: LetterResult[][];
  isFinished: boolean;
  won: boolean;
  finishTime: number | null;
  isReady: boolean;
  lastGuessTime: number | null;
}

// New helper functions
function isPlayerConnected(player: WordlePlayer): boolean {
  return player.connectionState === 'connected' && player.socket !== null;
}

function getConnectedPlayers(room: WordleRoom): WordlePlayer[] {
  return Array.from(room.players.values()).filter(isPlayerConnected);
}

function getAllPlayers(room: WordleRoom): WordlePlayer[] {
  return Array.from(room.players.values());
}
```

#### Refactor handleDisconnect

```typescript
handleDisconnect(socket: WebSocket): void {
  const playerId = this.socketToPlayer.get(socket);
  if (!playerId) return;

  const roomCode = this.playerToRoom.get(playerId);
  if (!roomCode) return;

  const room = this.rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // NEW: Mark as disconnected instead of removing
  player.socket = null;
  player.connectionState = 'disconnected';
  player.disconnectedAt = Date.now();

  // Clean up socket mapping
  this.socketToPlayer.delete(socket);

  // Determine grace period based on game state
  const gracePeriod = this.getGracePeriod(room);

  // Start reconnect timer
  player.reconnectTimer = setTimeout(() => {
    this.removePlayerPermanently(roomCode, playerId);
  }, gracePeriod);

  console.log(`[Wordle] Player ${playerId} disconnected from ${roomCode}, grace period: ${gracePeriod}ms`);

  // Notify others
  this.broadcastToRoom(roomCode, {
    type: 'playerDisconnected',
    playerId,
    playerName: player.name,
    gracePeriodSeconds: gracePeriod / 1000
  });

  // Check if game should handle this specially
  this.handleDisconnectInGame(room, player);
}

private getGracePeriod(room: WordleRoom): number {
  switch (room.gameState) {
    case 'waiting': return 120000;  // 2 minutes
    case 'countdown': return 10000; // 10 seconds
    case 'playing': return 60000;   // 1 minute
    case 'results': return 300000;  // 5 minutes
    default: return 60000;
  }
}

private removePlayerPermanently(roomCode: string, playerId: string): void {
  const room = this.rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // Clear any pending timer
  if (player.reconnectTimer) {
    clearTimeout(player.reconnectTimer);
  }

  // Now actually remove
  room.players.delete(playerId);
  this.playerToRoom.delete(playerId);

  console.log(`[Wordle] Player ${playerId} permanently removed from ${roomCode}`);

  // Existing logic: room cleanup, host transfer, etc.
  this.handlePlayerRemoval(room, roomCode, playerId, player);
}
```

#### Files Changed
- `server/src/rooms/wordle-room.ts` - Player interface, disconnect handling
- `server/src/services/wordle-types.ts` (new) - Shared types

---

### Phase 1: Waiting Room Reconnection
**Priority: HIGH | Effort: Medium | Impact: Solves the primary pain point**

Enable reconnecting to waiting rooms.

#### Server: Add Rejoin Handler

```typescript
// New message type
case 'rejoin':
  this.handleRejoin(socket, msg.roomCode, msg.playerId);
  break;

handleRejoin(socket: WebSocket, roomCode: string, playerId: string): void {
  const room = this.rooms.get(roomCode);

  // Room doesn't exist
  if (!room) {
    this.send(socket, {
      type: 'rejoinFailed',
      reason: 'roomNotFound',
      message: 'Room no longer exists'
    });
    return;
  }

  const player = room.players.get(playerId);

  // Player not in room (was removed or never joined)
  if (!player) {
    this.send(socket, {
      type: 'rejoinFailed',
      reason: 'playerNotFound',
      message: 'You are no longer in this room'
    });
    return;
  }

  // Player is already connected (duplicate tab?)
  if (player.connectionState === 'connected' && player.socket) {
    // Close old connection
    this.send(player.socket, { type: 'replacedByNewConnection' });
    player.socket.close();
  }

  // Cancel removal timer
  if (player.reconnectTimer) {
    clearTimeout(player.reconnectTimer);
    player.reconnectTimer = null;
  }

  // Reconnect!
  player.socket = socket;
  player.connectionState = 'connected';
  player.disconnectedAt = null;
  this.socketToPlayer.set(socket, playerId);

  console.log(`[Wordle] Player ${playerId} reconnected to ${roomCode}`);

  // Send appropriate state based on game state
  this.sendReconnectionState(socket, room, player);

  // Notify others
  this.broadcastToRoom(roomCode, {
    type: 'playerReconnected',
    playerId,
    playerName: player.name
  }, playerId); // Exclude the reconnecting player
}

private sendReconnectionState(socket: WebSocket, room: WordleRoom, player: WordlePlayer): void {
  switch (room.gameState) {
    case 'waiting':
      this.send(socket, {
        type: 'rejoinWaiting',
        roomCode: room.code,
        playerId: player.id,
        isCreator: player.isCreator,
        gameMode: room.gameMode,
        wordMode: room.wordMode,
        dailyNumber: room.dailyNumber,
        players: this.getPlayersArray(room),
        isReady: player.isReady
      });
      break;

    case 'playing':
      // Phase 3 implementation
      break;

    case 'results':
      // Phase 3 implementation
      break;
  }
}
```

#### Client: Session Storage and Rejoin

```javascript
// Constants
const RECONNECT_GRACE_MS = 120000; // 2 minutes

// Save session on room join
function saveSession(roomCode, playerId) {
  sessionStorage.setItem('wordle_session', JSON.stringify({
    roomCode,
    playerId,
    joinedAt: Date.now()
  }));
}

// Clear session on intentional leave
function clearSession() {
  sessionStorage.removeItem('wordle_session');
}

// Check for reconnection on page load
async function checkReconnection() {
  const sessionData = sessionStorage.getItem('wordle_session');
  if (!sessionData) return false;

  try {
    const session = JSON.parse(sessionData);
    const age = Date.now() - session.joinedAt;

    // Session too old
    if (age > RECONNECT_GRACE_MS) {
      clearSession();
      return false;
    }

    // Show reconnecting UI
    showReconnectingOverlay();

    // Wait for socket to be ready
    await waitForSocket();

    // Attempt rejoin
    send({
      type: 'rejoin',
      roomCode: session.roomCode,
      playerId: session.playerId
    });

    return true;
  } catch (e) {
    console.error('[Wordle] Reconnection check failed:', e);
    clearSession();
    return false;
  }
}

// Handle rejoin responses
function handleRejoinWaiting(msg) {
  hideReconnectingOverlay();

  // Restore state
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  isCreator = msg.isCreator;
  gameMode = msg.gameMode;
  wordMode = msg.wordMode;
  isReady = msg.isReady;
  playersInRoom = msg.players;

  // Show waiting room
  showView('waiting');
  updateWaitingRoomUI();

  showInfoToast('Reconnected!');
}

function handleRejoinFailed(msg) {
  hideReconnectingOverlay();
  clearSession();
  showError(msg.message);
  showView('lobby');
}
```

#### UI: Reconnecting Overlay

```html
<!-- Add to index.html -->
<div id="reconnectingOverlay" class="reconnecting-overlay hidden">
  <div class="reconnecting-content">
    <div class="spinner"></div>
    <p>Reconnecting...</p>
  </div>
</div>
```

#### Files Changed
- `server/src/rooms/wordle-room.ts` - Rejoin handler
- `wordle/wordle.js` - Session storage, reconnect logic
- `wordle/index.html` - Reconnecting overlay
- `wordle/wordle.css` - Overlay styles

---

### Phase 2: URL-Based Room Sharing
**Priority: HIGH | Effort: Low | Impact: Much easier room sharing**

Add room code to URL for easy sharing.

#### URL Structure

```
/wordle/                    → Lobby
/wordle/room/ABC123         → Join room ABC123
/wordle/room/ABC123/waiting → In waiting room (optional distinction)
```

#### Client: URL Routing

```javascript
// On page load
function handleInitialRoute() {
  const path = window.location.pathname;
  const match = path.match(/\/wordle\/room\/([A-Z0-9]+)/i);

  if (match) {
    const roomCode = match[1].toUpperCase();
    // Auto-join this room after auth check
    pendingRoomJoin = roomCode;
  }
}

// After WebSocket connects and auth is resolved
function handlePendingRoomJoin() {
  if (pendingRoomJoin) {
    const code = pendingRoomJoin;
    pendingRoomJoin = null;

    // Try to rejoin first (in case we were in this room)
    const session = getSession();
    if (session && session.roomCode === code) {
      send({ type: 'rejoin', roomCode: code, playerId: session.playerId });
    } else {
      // Join as new player
      const name = getPlayerName();
      send({ type: 'joinRoom', roomCode: code, playerName: name, playerEmail: authUser?.email });
    }
  }
}

// Update URL on room join
function handleRoomCreated(msg) {
  // ... existing code ...

  // Update URL
  history.pushState({ view: 'waiting', roomCode: msg.roomCode }, '', `/wordle/room/${msg.roomCode}`);
}

function handleRoomJoined(msg) {
  // ... existing code ...

  // Update URL
  history.pushState({ view: 'waiting', roomCode: msg.roomCode }, '', `/wordle/room/${msg.roomCode}`);
}

// Handle back button
window.addEventListener('popstate', (e) => {
  if (!e.state || e.state.view === 'lobby') {
    // User pressed back from waiting room
    if (roomCode) {
      send({ type: 'leaveRoom' });
    }
    showView('lobby');
  }
});

// On leave room
function leaveRoom() {
  send({ type: 'leaveRoom' });
  clearSession();
  history.pushState({ view: 'lobby' }, '', '/wordle/');
  showView('lobby');
}
```

#### Server: Serve index.html for /wordle/room/* routes

```typescript
// index.ts - Update static file serving
app.get('/wordle/room/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/wordle/index.html'));
});
```

#### Files Changed
- `server/src/index.ts` - Route handling
- `wordle/wordle.js` - URL parsing, history API

---

### Phase 3: In-Game Reconnection
**Priority: MEDIUM | Effort: High | Impact: Full reconnection support**

Enable reconnecting to active games.

#### Server: Send Game State on Rejoin

```typescript
private sendReconnectionState(socket: WebSocket, room: WordleRoom, player: WordlePlayer): void {
  switch (room.gameState) {
    case 'waiting':
      // Phase 1 implementation
      break;

    case 'countdown':
      // Send countdown state
      this.send(socket, {
        type: 'rejoinCountdown',
        roomCode: room.code,
        playerId: player.id,
        countdownRemaining: room.countdownRemaining
      });
      break;

    case 'playing':
      this.send(socket, {
        type: 'rejoinGame',
        roomCode: room.code,
        playerId: player.id,
        wordLength: room.word.length,
        // Player's own state
        guesses: player.guesses,
        guessResults: player.guessResults,
        isFinished: player.isFinished,
        // Timer
        gameTimer: Date.now() - room.startTime,
        playerFinishTime: player.finishTime,
        // Opponents (colors only, not words)
        opponents: this.getOpponentState(room, player.id),
        // Keyboard state (derived from guessResults)
        keyboardState: this.deriveKeyboardState(player.guessResults)
      });
      break;

    case 'results':
      this.send(socket, {
        type: 'rejoinResults',
        roomCode: room.code,
        word: room.word,
        results: room.finalResults
      });
      break;
  }
}

private getOpponentState(room: WordleRoom, excludePlayerId: string): OpponentState[] {
  return Array.from(room.players.values())
    .filter(p => p.id !== excludePlayerId)
    .map(p => ({
      id: p.id,
      name: p.name,
      guessResults: p.guessResults, // Colors only
      isFinished: p.isFinished,
      won: p.won,
      connectionState: p.connectionState
    }));
}

private deriveKeyboardState(guessResults: LetterResult[][]): Record<string, string> {
  const state: Record<string, string> = {};

  for (const row of guessResults) {
    for (let i = 0; i < row.length; i++) {
      const letter = /* need to store letters or derive from guesses */;
      const result = row[i];

      // Only upgrade: absent → present → correct
      if (result === 'correct') {
        state[letter] = 'correct';
      } else if (result === 'present' && state[letter] !== 'correct') {
        state[letter] = 'present';
      } else if (result === 'absent' && !state[letter]) {
        state[letter] = 'absent';
      }
    }
  }

  return state;
}
```

#### Client: Handle Game Rejoin

```javascript
function handleRejoinGame(msg) {
  hideReconnectingOverlay();

  // Restore state
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  gameState = 'playing';
  guesses = msg.guesses;
  guessResults = msg.guessResults;

  // Initialize opponents
  opponents.clear();
  for (const opp of msg.opponents) {
    opponents.set(opp.id, {
      name: opp.name,
      guessResults: opp.guessResults,
      isFinished: opp.isFinished,
      won: opp.won,
      connectionState: opp.connectionState
    });
  }

  // Build grid with existing guesses
  showView('game');
  buildGrid();
  restoreGridState();
  restoreKeyboardState(msg.keyboardState);
  renderOpponentBoards();

  // Sync timer
  gameTimer = msg.gameTimer;
  updateTimerDisplay();

  showInfoToast('Reconnected to game!');
}

function restoreGridState() {
  for (let row = 0; row < guesses.length; row++) {
    const guess = guesses[row];
    const results = guessResults[row];
    const rowEl = elements.grid.children[row];

    for (let col = 0; col < 5; col++) {
      const tile = rowEl.children[col];
      tile.textContent = guess[col];
      tile.classList.add('filled', results[col]);
    }
  }
}

function restoreKeyboardState(keyboardState) {
  for (const [letter, state] of Object.entries(keyboardState)) {
    const key = elements.keyboard.querySelector(`button[data-key="${letter}"]`);
    if (key) {
      key.classList.add(state);
    }
  }
}
```

#### Files Changed
- `server/src/rooms/wordle-room.ts` - Game state serialization
- `wordle/wordle.js` - Game state restoration

---

### Phase 4: Advanced Features (Future)
**Priority: LOW | Effort: High | Impact: Nice-to-have**

#### 4.1 Cross-Session Persistence
Store room state in database for server restart survival.

#### 4.2 Spectator Mode
Allow reconnected players who finished to watch others.

#### 4.3 Mobile-Optimized Reconnection
Handle iOS/Android app switching gracefully with shorter timeouts.

#### 4.4 Reconnection Analytics
Track reconnection success/failure rates for optimization.

---

## Testing Matrix

### Phase 0-1 Testing

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Host leaves waiting room | 1. Create room 2. Refresh page | Reconnects as host |
| Host shares code via WhatsApp | 1. Create room 2. Copy code 3. Switch to WhatsApp 4. Return | Still in room |
| Guest leaves waiting room | 1. Join room 2. Close tab 3. Re-open | Reconnects to same room |
| Grace period expires | 1. Join room 2. Close tab 3. Wait 3 minutes | Removed from room |
| Duplicate tab | 1. Join room 2. Open same URL in new tab | Old tab shows "connected elsewhere" |
| Room deleted while away | 1. Join room 2. Close tab 3. Host ends room 4. Rejoin | Shows "room not found" |

### Phase 2 Testing

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Share room URL | 1. Create room 2. Copy URL 3. Open in new browser | Joins room directly |
| Back button from waiting | 1. Join room 2. Press back | Returns to lobby |
| Direct URL join | 1. Navigate to /wordle/room/ABCDEF | Auto-joins room ABCDEF |

### Phase 3 Testing

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Refresh during game | 1. Start game 2. Make 2 guesses 3. Refresh | Resumes with 2 guesses shown |
| Network drop during game | 1. Start game 2. Disable network 3. Re-enable | Reconnects, timer synced |
| Game ends while away | 1. Start game 2. Close tab 3. Opponent wins 4. Rejoin | Shows results |

---

## Migration Notes

### Backward Compatibility
- Existing clients will continue to work
- New reconnection messages are additive
- No database schema changes in Phase 0-2

### Rollback Plan
- Feature flag for reconnection logic
- Can disable grace period (revert to immediate removal)
- URL routing can be disabled independently

---

## Metrics to Track

| Metric | Description |
|--------|-------------|
| Disconnect rate | % of players who disconnect per game |
| Reconnection success rate | % of disconnects that successfully rejoin |
| Grace period utilization | How much of the grace period is typically used |
| Reconnection time | How long until player reconnects |
| Abandonment rate | % of disconnects that never return |

---

## Summary

| Phase | Priority | Effort | Key Deliverable |
|-------|----------|--------|-----------------|
| **Phase 0** | Critical | Medium | Foundation (connection state, grace periods) |
| **Phase 1** | High | Medium | Waiting room reconnection |
| **Phase 2** | High | Low | URL-based room sharing |
| **Phase 3** | Medium | High | In-game reconnection |
| **Phase 4** | Low | High | Cross-session, spectator mode |

**Recommended order:** Phase 0 → Phase 2 → Phase 1 → Phase 3

Rationale: Phase 2 (URL sharing) is low effort and high impact. Combined with Phase 0's grace period, it largely solves the "share room code" problem without full reconnection logic.
