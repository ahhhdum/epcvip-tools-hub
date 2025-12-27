# Multiplayer Implementation Plan

## Overview
Add LAN multiplayer support for 2-4 players using Colyseus (official KaPlay integration).

## Requirements
- **Players**: 2-4 concurrent
- **Interactions**: See each other, compete for fritelles, throw at each other
- **Deployment**: Auto-start on office desktop (always-on server)
- **Network**: LAN only (same office IP)

---

## Technology Stack

### Server
- **Colyseus** - Real-time multiplayer framework
- **Node.js** - Runtime
- **@colyseus/schema** - Binary state synchronization

### Client
- **KaPlay** - Already in use
- **colyseus.js** - Browser client SDK

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Player 1      │     │   Player 2      │     │   Player N      │
│   (Browser)     │     │   (Browser)     │     │   (Browser)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │ WebSocket
                                 ▼
                    ┌────────────────────────┐
                    │   Colyseus Server      │
                    │   (Office Desktop)     │
                    │                        │
                    │  ┌──────────────────┐  │
                    │  │   Game Room      │  │
                    │  │  - Player states │  │
                    │  │  - Fritelle sync │  │
                    │  │  - Collision     │  │
                    │  └──────────────────┘  │
                    └────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Server Setup

#### 1.1 Project Structure
```
server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Server entry point
│   ├── rooms/
│   │   └── GameRoom.ts   # Main game room
│   └── schema/
│       ├── Player.ts     # Player state schema
│       ├── Fritelle.ts   # Fritelle state schema
│       └── GameState.ts  # Root state
```

#### 1.2 State Schema
```typescript
// schema/Player.ts
import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("string") direction: string = "down";
  @type("string") name: string;
  @type("number") color: number; // Player color index
  @type("number") fritelleCount: number = 0;
}

// schema/Fritelle.ts
export class Fritelle extends Schema {
  @type("string") id: string;
  @type("number") x: number;
  @type("number") y: number;
  @type("boolean") isGolden: boolean = false;
}

// schema/GameState.ts
import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player";
import { Fritelle } from "./Fritelle";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Fritelle }) fritelles = new MapSchema<Fritelle>();
}
```

#### 1.3 Game Room
```typescript
// rooms/GameRoom.ts
import { Room, Client } from "colyseus";
import { GameState, Player, Fritelle } from "../schema";

export class GameRoom extends Room<GameState> {
  maxClients = 4;

  onCreate() {
    this.setState(new GameState());
    this.spawnInitialFritelles();

    // Handle player movement
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.direction = data.direction;
      }
    });

    // Handle fritelle collection
    this.onMessage("collect", (client, data) => {
      const fritelle = this.state.fritelles.get(data.id);
      if (fritelle) {
        const player = this.state.players.get(client.sessionId);
        player.fritelleCount += fritelle.isGolden ? 15 : 1;
        this.state.fritelles.delete(data.id);

        // Broadcast collection event
        this.broadcast("collected", {
          playerId: client.sessionId,
          fritelleId: data.id,
          isGolden: fritelle.isGolden
        });

        // Respawn after delay
        this.clock.setTimeout(() => this.spawnFritelle(), 3000 + Math.random() * 5000);
      }
    });

    // Handle thrown fritelles
    this.onMessage("throw", (client, data) => {
      this.broadcast("thrown", {
        playerId: client.sessionId,
        x: data.x,
        y: data.y,
        dx: data.dx,
        dy: data.dy
      });
    });

    // Handle hit by thrown fritelle
    this.onMessage("hit", (client, data) => {
      const hitPlayer = this.state.players.get(data.targetId);
      if (hitPlayer && hitPlayer.fritelleCount > 0) {
        hitPlayer.fritelleCount--;
        this.broadcast("playerHit", {
          playerId: data.targetId,
          throwerId: client.sessionId
        });
      }
    });
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.name || `Player ${this.clients.length}`;
    player.x = 400 + Math.random() * 100;
    player.y = 400 + Math.random() * 100;
    player.color = this.clients.length - 1;

    this.state.players.set(client.sessionId, player);

    this.broadcast("playerJoined", {
      id: client.sessionId,
      name: player.name
    });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.broadcast("playerLeft", { id: client.sessionId });
  }

  spawnInitialFritelles() {
    for (let i = 0; i < 8; i++) {
      this.spawnFritelle();
    }
  }

  spawnFritelle() {
    const id = `fritelle_${Date.now()}_${Math.random()}`;
    const fritelle = new Fritelle();
    fritelle.id = id;
    fritelle.x = 64 + Math.random() * (1024 - 128);
    fritelle.y = 64 + Math.random() * (768 - 128);
    fritelle.isGolden = Math.random() < 0.04;
    this.state.fritelles.set(id, fritelle);
  }
}
```

### Phase 2: Client Integration

#### 2.1 Add Colyseus Client
```bash
# Add to index.html or bundle
<script src="https://unpkg.com/colyseus.js@^0.15.0/dist/colyseus.js"></script>
```

#### 2.2 New File: `js/systems/multiplayer.js`
```javascript
/**
 * Multiplayer System
 * Handles Colyseus connection and state sync
 */

let client = null;
let room = null;
let localPlayerId = null;
let otherPlayers = new Map(); // sessionId -> KaPlay entity

// Server address (office desktop)
const SERVER_URL = "ws://192.168.1.XXX:2567"; // Replace with actual IP

export async function connectToServer(playerName) {
  client = new Colyseus.Client(SERVER_URL);

  try {
    room = await client.joinOrCreate("game", { name: playerName });
    localPlayerId = room.sessionId;

    setupStateHandlers();
    return true;
  } catch (e) {
    console.error("Connection failed:", e);
    return false;
  }
}

function setupStateHandlers() {
  // Handle other players joining/leaving
  room.state.players.onAdd((player, sessionId) => {
    if (sessionId === localPlayerId) return;
    spawnOtherPlayer(sessionId, player);
  });

  room.state.players.onRemove((player, sessionId) => {
    removeOtherPlayer(sessionId);
  });

  // Handle fritelle state sync
  room.state.fritelles.onAdd((fritelle, id) => {
    spawnNetworkedFritelle(id, fritelle);
  });

  room.state.fritelles.onRemove((fritelle, id) => {
    destroyNetworkedFritelle(id);
  });

  // Handle thrown fritelles from other players
  room.onMessage("thrown", (data) => {
    if (data.playerId !== localPlayerId) {
      createThrownFritelleVisual(data);
    }
  });

  // Handle player hit feedback
  room.onMessage("playerHit", (data) => {
    showHitEffect(data.playerId);
  });
}

// Send local player position (call from player update loop)
export function sendPosition(x, y, direction) {
  if (room) {
    room.send("move", { x, y, direction });
  }
}

// Notify server of collection
export function sendCollect(fritelleId) {
  if (room) {
    room.send("collect", { id: fritelleId });
  }
}

// Notify server of throw
export function sendThrow(x, y, dx, dy) {
  if (room) {
    room.send("throw", { x, y, dx, dy });
  }
}

// Check if connected
export function isConnected() {
  return room !== null;
}

export function getRoom() {
  return room;
}

export function getLocalPlayerId() {
  return localPlayerId;
}
```

#### 2.3 Modify `js/entities/player.js`
```javascript
// Add to existing player entity
import { sendPosition, isConnected } from '../systems/multiplayer.js';

// In player onUpdate, throttle position updates
let lastSendTime = 0;
player.onUpdate(() => {
  // Existing movement code...

  // Send position to server every 50ms (20 updates/sec)
  if (isConnected() && time() - lastSendTime > 0.05) {
    sendPosition(player.pos.x, player.pos.y, player.direction);
    lastSendTime = time();
  }
});
```

#### 2.4 Other Player Rendering
```javascript
// In multiplayer.js - spawn other players
const PLAYER_COLORS = [
  [255, 100, 100], // Red
  [100, 100, 255], // Blue
  [100, 255, 100], // Green
  [255, 255, 100], // Yellow
];

function spawnOtherPlayer(sessionId, playerState) {
  const otherPlayer = add([
    sprite("character"),
    pos(playerState.x, playerState.y),
    anchor("center"),
    z(10),
    color(...PLAYER_COLORS[playerState.color % 4]),
    opacity(0.9),
    "other-player",
    {
      sessionId: sessionId,
      targetX: playerState.x,
      targetY: playerState.y,
    }
  ]);

  // Add name label
  const nameLabel = add([
    text(playerState.name, { size: 10 }),
    pos(playerState.x, playerState.y - 24),
    anchor("center"),
    color(255, 255, 255),
    z(11),
    "player-name",
    { parentId: sessionId }
  ]);

  otherPlayers.set(sessionId, { entity: otherPlayer, label: nameLabel });

  // Smooth interpolation on state changes
  playerState.onChange(() => {
    const data = otherPlayers.get(sessionId);
    if (data) {
      data.entity.targetX = playerState.x;
      data.entity.targetY = playerState.y;
    }
  });

  // Update loop for smooth movement
  otherPlayer.onUpdate(() => {
    otherPlayer.pos.x = lerp(otherPlayer.pos.x, otherPlayer.targetX, 0.3);
    otherPlayer.pos.y = lerp(otherPlayer.pos.y, otherPlayer.targetY, 0.3);
    nameLabel.pos = vec2(otherPlayer.pos.x, otherPlayer.pos.y - 24);
  });
}
```

### Phase 3: Server Deployment

#### 3.1 Server Package Setup
```json
// server/package.json
{
  "name": "epcvip-tools-hub-server",
  "version": "1.0.0",
  "scripts": {
    "start": "ts-node src/index.ts",
    "build": "tsc",
    "serve": "node dist/index.js"
  },
  "dependencies": {
    "colyseus": "^0.15.0",
    "@colyseus/schema": "^2.0.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@types/express": "^4.17.0"
  }
}
```

#### 3.2 Server Entry Point
```typescript
// server/src/index.ts
import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import { GameRoom } from "./rooms/GameRoom";

const app = express();
const port = Number(process.env.PORT) || 2567;

const server = createServer(app);
const gameServer = new Server({ server });

gameServer.define("game", GameRoom);

server.listen(port, "0.0.0.0", () => {
  console.log(`Game server running on ws://0.0.0.0:${port}`);
});
```

#### 3.3 Windows Auto-Start Service
Create `start-server.bat`:
```batch
@echo off
cd /d "C:\path\to\epcvip-tools-hub\server"
npm run serve
```

Use Task Scheduler:
1. Open Task Scheduler
2. Create Basic Task → "EPCVIP Tools Hub Server"
3. Trigger: "When the computer starts"
4. Action: Start a program → `start-server.bat`
5. Check "Run whether user is logged on or not"

Alternative: Use PM2 for Node process management:
```bash
npm install -g pm2
pm2 start dist/index.js --name "tools-hub"
pm2 startup  # Generates startup script
pm2 save
```

---

## Testing Plan

### Local Testing
1. Run server locally: `npm start`
2. Open two browser tabs to localhost
3. Verify players see each other
4. Test fritelle collection sync
5. Test throwing interactions

### LAN Testing
1. Deploy server to office desktop
2. Update `SERVER_URL` to desktop IP
3. Connect from multiple workstations
4. Verify latency is acceptable (<50ms on LAN)

---

## Fallback: Single-Player Mode

If server unavailable:
```javascript
// In multiplayer.js
export async function connectToServer(playerName) {
  // ... connection code ...

  } catch (e) {
    console.warn("Server unavailable, running in single-player mode");
    return false;  // Game continues without multiplayer
  }
}

// In overworld.js
const connected = await connectToServer(playerName);
if (!connected) {
  showDialog("Playing offline - multiplayer unavailable");
}
```

---

## File Changes Summary

### New Files
- `server/` - Entire server directory
- `js/systems/multiplayer.js` - Client networking

### Modified Files
- `index.html` - Add Colyseus client script
- `js/entities/player.js` - Send position updates
- `js/entities/collectible.js` - Use server-authoritative fritelles
- `js/scenes/overworld.js` - Initialize multiplayer on scene load
- `js/scenes/loading.js` - Optional name input

---

## Milestones

1. **M1**: Server runs, single client connects
2. **M2**: Two clients see each other move
3. **M3**: Fritelle collection synced
4. **M4**: Throwing interactions work
5. **M5**: Auto-start on office desktop
6. **M6**: Polish (names, colors, hit effects)

---

## Questions Resolved
- Players: 2-4 ✓
- Interactions: Full (see, compete, throw) ✓
- Hosting: Office desktop with auto-start ✓

## Estimated Complexity
- Server: ~200 lines TypeScript
- Client changes: ~150 lines JavaScript
- Total new code: ~350 lines
