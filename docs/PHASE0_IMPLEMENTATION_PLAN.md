# Phase 0: Connection Resilience Foundation - Implementation Plan

## Overview

Phase 0 establishes the architectural foundation for WebSocket reconnection without changing user-visible behavior. After this phase, disconnected players have a grace period before being removed.

**Goal:** Players who disconnect (refresh, switch apps, network blip) are not immediately kicked - they have time to reconnect.

---

## Current State (Before)

```typescript
// WordlePlayer - socket is always required
interface WordlePlayer {
  id: string;
  socket: WebSocket;  // Always present, always connected
  // ...
}

// handleDisconnect - immediate removal
handleDisconnect(socket) {
  room.players.delete(playerId);      // Immediate
  this.playerToRoom.delete(playerId); // Immediate
  this.socketToPlayer.delete(socket); // Immediate
  // Player is GONE
}
```

## Target State (After)

```typescript
// WordlePlayer - socket can be null when disconnected
interface WordlePlayer {
  id: string;
  socket: WebSocket | null;                    // null when disconnected
  connectionState: 'connected' | 'disconnected';
  disconnectedAt: number | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  // ...
}

// handleDisconnect - grace period, then removal
handleDisconnect(socket) {
  player.socket = null;
  player.connectionState = 'disconnected';
  player.disconnectedAt = Date.now();

  player.reconnectTimer = setTimeout(() => {
    this.removePlayerPermanently(roomCode, playerId);
  }, gracePeriod);

  // Player is DISCONNECTED but still in room
  // They have gracePeriod ms to reconnect
}
```

---

## Implementation Steps

### Step 1: Update WordlePlayer Interface

**File:** `server/src/rooms/wordle-room.ts`

**Changes:**
```typescript
// BEFORE
interface WordlePlayer {
  id: string;
  name: string;
  email: string | null;
  socket: WebSocket;
  isCreator: boolean;
  isReady: boolean;
  guesses: string[];
  guessResults: LetterResult[][];
  isFinished: boolean;
  won: boolean;
  finishTime: number | null;
  score: number;
  lastGuessTime: number | null;
}

// AFTER
interface WordlePlayer {
  id: string;
  name: string;
  email: string | null;
  isCreator: boolean;
  isReady: boolean;

  // Connection state (NEW)
  socket: WebSocket | null;
  connectionState: 'connected' | 'disconnected';
  disconnectedAt: number | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;

  // Game state
  guesses: string[];
  guessResults: LetterResult[][];
  isFinished: boolean;
  won: boolean;
  finishTime: number | null;
  score: number;
  lastGuessTime: number | null;
}
```

**Rationale:**
- `socket: WebSocket | null` - Socket can be null when player is disconnected
- `connectionState` - Explicit state for clarity
- `disconnectedAt` - Timestamp for grace period calculation
- `reconnectTimer` - Reference to clear timeout on reconnect

### Step 2: Add Grace Period Constants

**File:** `server/src/constants/wordle-constants.ts`

**Add:**
```typescript
// Grace periods (milliseconds) before removing disconnected players
export const GRACE_PERIOD_WAITING_MS = 120000;   // 2 minutes - host sharing code
export const GRACE_PERIOD_COUNTDOWN_MS = 10000;  // 10 seconds - quick
export const GRACE_PERIOD_PLAYING_MS = 60000;    // 1 minute - balance
export const GRACE_PERIOD_RESULTS_MS = 300000;   // 5 minutes - no rush
export const GRACE_PERIOD_DEFAULT_MS = 60000;    // 1 minute fallback
```

### Step 3: Add Helper Functions

**File:** `server/src/rooms/wordle-room.ts`

**Add before class:**
```typescript
/**
 * Check if a player is currently connected
 */
function isPlayerConnected(player: WordlePlayer): boolean {
  return player.connectionState === 'connected' && player.socket !== null;
}

/**
 * Get only connected players from a room
 */
function getConnectedPlayers(room: WordleRoom): WordlePlayer[] {
  return Array.from(room.players.values()).filter(isPlayerConnected);
}

/**
 * Get all players from a room (connected or disconnected)
 */
function getAllPlayers(room: WordleRoom): WordlePlayer[] {
  return Array.from(room.players.values());
}
```

### Step 4: Update Player Creation

**File:** `server/src/rooms/wordle-room.ts`

**Modify createRoom and joinRoom:**

```typescript
// In createRoom() and joinRoom(), when creating player:
const player: WordlePlayer = {
  id: playerId,
  name: playerName || 'Player',
  email: playerEmail || null,
  isCreator: true, // or false for joinRoom
  isReady: false,

  // NEW: Connection state
  socket: socket,
  connectionState: 'connected',
  disconnectedAt: null,
  reconnectTimer: null,

  // Game state
  guesses: [],
  guessResults: [],
  isFinished: false,
  won: false,
  finishTime: null,
  score: 0,
  lastGuessTime: null,
};
```

### Step 5: Add getGracePeriod Method

**File:** `server/src/rooms/wordle-room.ts`

**Add to WordleRoomManager class:**
```typescript
/**
 * Get the appropriate grace period based on room state
 */
private getGracePeriod(room: WordleRoom): number {
  // Solo games get shorter grace period (only affects them)
  if (room.isSolo) {
    return GRACE_PERIOD_PLAYING_MS / 2; // 30 seconds
  }

  switch (room.gameState) {
    case 'waiting':
      return GRACE_PERIOD_WAITING_MS;
    case 'playing':
      return GRACE_PERIOD_PLAYING_MS;
    case 'finished':
      return GRACE_PERIOD_RESULTS_MS;
    default:
      return GRACE_PERIOD_DEFAULT_MS;
  }
}
```

### Step 6: Add removePlayerPermanently Method

**File:** `server/src/rooms/wordle-room.ts`

**Add to WordleRoomManager class:**
```typescript
/**
 * Permanently remove a player after grace period expires
 * This contains the logic that was previously in handleDisconnect
 */
private removePlayerPermanently(roomCode: string, playerId: string): void {
  const room = this.rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // Clear any pending timer (safety check)
  if (player.reconnectTimer) {
    clearTimeout(player.reconnectTimer);
    player.reconnectTimer = null;
  }

  const wasCreator = player.isCreator;
  const playerName = player.name;

  // Now actually remove
  room.players.delete(playerId);
  this.playerToRoom.delete(playerId);

  console.log(`[Wordle] Player ${playerName} (${playerId}) permanently removed from ${roomCode}`);

  // If room is empty, delete it
  if (room.players.size === 0) {
    clearCountdown(room.countdownTimer);
    room.countdownTimer = null;
    stopTimerSync(room.timerInterval);
    room.timerInterval = null;
    this.rooms.delete(roomCode);
    console.log(`[Wordle] Room ${roomCode} deleted (empty)`);
    return;
  }

  // If creator left, assign new creator
  if (wasCreator) {
    // Find a connected player to be new creator, or any player if none connected
    const connectedPlayers = getConnectedPlayers(room);
    const newCreator = connectedPlayers.length > 0
      ? connectedPlayers[0]
      : room.players.values().next().value;

    if (newCreator) {
      newCreator.isCreator = true;
      room.creatorId = newCreator.id;
      if (newCreator.socket) {
        this.send(newCreator.socket, { type: 'becameCreator' });
      }
    }
  }

  // Notify remaining CONNECTED players
  this.broadcastToRoom(roomCode, { type: 'playerLeft', playerId });

  // Check if game should end (only connected players count)
  if (room.gameState === 'playing') {
    const connectedPlayers = getConnectedPlayers(room);
    if (connectedPlayers.length <= 1) {
      this.endGame(room);
    }
  }
}
```

### Step 7: Refactor handleDisconnect

**File:** `server/src/rooms/wordle-room.ts`

**Replace existing handleDisconnect:**
```typescript
/**
 * Handle player disconnect - start grace period instead of immediate removal
 */
handleDisconnect(socket: WebSocket): void {
  const playerId = this.socketToPlayer.get(socket);
  if (!playerId) return;

  const roomCode = this.playerToRoom.get(playerId);
  if (!roomCode) return;

  const room = this.rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // If player is already disconnected, this is a duplicate close event
  if (player.connectionState === 'disconnected') {
    console.log(`[Wordle] Ignoring duplicate disconnect for ${player.name}`);
    return;
  }

  // Mark as disconnected instead of removing
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

  console.log(`[Wordle] ${player.name} disconnected from ${roomCode}, grace period: ${gracePeriod / 1000}s`);

  // Notify connected players
  this.broadcastToRoom(roomCode, {
    type: 'playerDisconnected',
    playerId,
    playerName: player.name,
    gracePeriodSeconds: gracePeriod / 1000,
  });
}
```

### Step 8: Update broadcastToRoom

**File:** `server/src/rooms/wordle-room.ts`

**Modify to check connection state:**
```typescript
/**
 * Broadcast a message to all CONNECTED players in a room
 */
private broadcastToRoom(roomCode: string, msg: object, excludeId?: string): void {
  const room = this.rooms.get(roomCode);
  if (!room) return;

  const data = JSON.stringify(msg);
  for (const player of room.players.values()) {
    // Only send to connected players with open sockets
    if (
      player.id !== excludeId &&
      player.connectionState === 'connected' &&
      player.socket &&
      player.socket.readyState === WebSocket.OPEN
    ) {
      player.socket.send(data);
    }
  }
}
```

### Step 9: Update Timer Sync

**File:** `server/src/rooms/wordle-room.ts`

The timer sync already uses a snapshot pattern, but we should ensure it only includes connected players in the broadcast. The current implementation should work, but verify the `getPlayers` callback filters correctly.

### Step 10: Update Game End Logic

**File:** `server/src/rooms/wordle-room.ts`

**In endGame(), ensure disconnected players are handled:**
```typescript
// In endGame(), when checking if game should end:
// Use all players for results, not just connected ones
const playerSnapshot = Array.from(room.players.values());

// But for checking "all finished", only count connected players
// who haven't finished yet (disconnected players are effectively "done")
```

---

## Testing Plan

### Unit Tests (if using Jest)

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Player disconnects in waiting room | Disconnect socket | Player marked disconnected, timer started |
| Grace period expires | Wait for timer | Player removed, room notified |
| Room empty after removal | Last player's timer expires | Room deleted |
| Creator disconnects | Creator disconnects | Creator role transferred after grace period |

### Manual Testing Scenarios

#### Scenario 1: Host Shares Code (Primary Use Case)
1. Create room (you are host)
2. Note the room code
3. Close the browser tab
4. Wait 30 seconds
5. Open new tab, go to `/wordle/`
6. **Expected (Phase 0):** Room still exists if within 120s
7. **Verify:** Check server logs show "disconnected, grace period: 120s"

#### Scenario 2: Refresh During Waiting
1. Create room
2. Have friend join
3. Refresh your page
4. **Expected:** You're gone, friend sees "Host disconnected"
5. **After 120s:** Friend becomes host

#### Scenario 3: Disconnect During Game
1. Start a game with 2 players
2. Player 2 closes tab
3. **Expected:** Player 2 shows as disconnected, game continues
4. **After 60s:** Player 2 removed, game ends (only 1 player)

#### Scenario 4: Solo Game Disconnect
1. Start solo daily challenge
2. Make 2 guesses
3. Close tab
4. **Expected:** 30s grace period (shorter for solo)

#### Scenario 5: Duplicate Disconnect Events
1. Rapidly close/reopen connections
2. **Expected:** No duplicate timers, no errors

#### Scenario 6: All Players Disconnect
1. Create room with 2 players
2. Both players close tabs within 1 second
3. **Expected:** Room persists for grace period, then deleted

### Server Log Verification

After each test, verify server logs show:
```
[Wordle] {name} disconnected from {roomCode}, grace period: {N}s
[Wordle] Player {name} ({id}) permanently removed from {roomCode}
[Wordle] Room {roomCode} deleted (empty)
```

---

## Edge Cases to Handle

| Edge Case | Handling |
|-----------|----------|
| Duplicate close events | Check `connectionState`, ignore if already disconnected |
| Timer already cleared | Check `reconnectTimer` before clearing |
| Room deleted while timer pending | Check room exists in `removePlayerPermanently` |
| Player not in room | Early return with null checks |
| Socket already closed | Check `readyState` before sending |

---

## Rollback Plan

If issues are found:

1. **Quick fix:** Reduce grace periods to very short values (1000ms)
2. **Full rollback:** Revert to immediate removal in `handleDisconnect`

The changes are isolated to `handleDisconnect` and the new helper methods.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `server/src/rooms/wordle-room.ts` | Player interface, handleDisconnect, new methods |
| `server/src/constants/wordle-constants.ts` | Grace period constants |

---

## Success Criteria

1. [ ] Server compiles without errors
2. [ ] Disconnect shows "grace period: Ns" in logs
3. [ ] Player is not immediately removed
4. [ ] Timer fires after grace period
5. [ ] Player is removed after timer fires
6. [ ] Room is deleted when empty (after all timers)
7. [ ] Creator transfer happens after grace period
8. [ ] Connected players receive `playerDisconnected` event
9. [ ] Connected players receive `playerLeft` event after timer
10. [ ] No duplicate timers on rapid disconnect/reconnect

---

## Implementation Order

1. Add constants
2. Update interface
3. Add helper functions
4. Update player creation (createRoom, joinRoom)
5. Add getGracePeriod
6. Add removePlayerPermanently
7. Refactor handleDisconnect
8. Update broadcastToRoom
9. Test manually
10. Verify logs
