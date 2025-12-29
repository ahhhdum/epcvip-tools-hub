/**
 * EPCVIP Tools Hub - Multiplayer Server
 *
 * Simple WebSocket server with JSON messages.
 * Serves as gateway/proxy for all tools under single domain.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { Socket } from 'net';
import express from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = Number(process.env.PORT) || 2567;

// Proxy targets - use public URLs (move to same Railway project for internal networking)
const PING_TREE_TARGET = process.env.PING_TREE_URL || 'https://ping-tree-compare-production.up.railway.app';
const ATHENA_TARGET = process.env.ATHENA_URL || 'https://epcvip-athena-usage-monitor.up.railway.app';

// Proxy configuration for ping-tree (FastAPI)
const pingTreeProxy = createProxyMiddleware({
  target: PING_TREE_TARGET,
  changeOrigin: true,
  pathRewrite: { '^/ping-tree': '' },
  on: {
    error: (err, req, res) => {
      console.error('Ping Tree proxy error:', (err as Error).message);
      if (res && 'status' in res) {
        (res as express.Response).status(502).json({ error: 'Ping Tree service unavailable' });
      }
    },
  },
});

// Proxy configuration for athena (Streamlit) - needs WebSocket support
// Note: Streamlit with baseUrlPath expects /athena prefix, but Express strips it
// So we need to ADD /athena back via pathRewrite
const athenaProxy = createProxyMiddleware({
  target: ATHENA_TARGET,
  changeOrigin: true,
  pathRewrite: { '^/': '/athena/' },  // Restore /athena prefix that Express stripped
  ws: true,
  on: {
    error: (err, req, res) => {
      console.error('Athena proxy error:', (err as Error).message);
      if (res && 'status' in res) {
        (res as express.Response).status(502).json({ error: 'Athena service unavailable' });
      }
    },
  },
});

// Mount proxies BEFORE static files (order matters!)
app.use('/ping-tree', pingTreeProxy);
app.use('/athena', athenaProxy);

// Serve static files from public directory (copied during build)
const staticPath = path.join(__dirname, '../public');
app.use(express.static(staticPath));

// Health check - enhanced with proxy status
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    players: players.size,
    proxies: {
      pingTree: PING_TREE_TARGET,
      athena: ATHENA_TARGET,
    },
  });
});

const server = createServer(app);

// WebSocket server for game - noServer mode for manual upgrade handling
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrades manually to route between game and proxied services
server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';

  if (url.startsWith('/athena')) {
    // Streamlit WebSocket - proxy to athena service
    athenaProxy.upgrade(req, socket as Socket, head);
  } else {
    // Game WebSocket - handle locally
    wss.handleUpgrade(req, socket as Socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  }
});

// Game constants
const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 864;
const TILE_SIZE = 24;
const GOLDEN_CHANCE = 0.04;

// Game state
interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: string;
  colorIndex: number;
  fritelleCount: number;
}

interface Fritelle {
  id: string;
  x: number;
  y: number;
  isGolden: boolean;
}

const players = new Map<string, Player>();
const fritelles = new Map<string, Fritelle>();
const sockets = new Map<string, WebSocket>();

let playerCounter = 0;
let fritelleCounter = 0;

// Generate unique ID
function generateId(): string {
  return `p${++playerCounter}_${Date.now().toString(36)}`;
}

// Broadcast to all connected clients
function broadcast(msg: object, excludeId?: string) {
  const data = JSON.stringify(msg);
  sockets.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

// Send to specific client
function send(playerId: string, msg: object) {
  const ws = sockets.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// Spawn initial fritelles
function spawnInitialFritelles() {
  for (let i = 0; i < 8; i++) {
    spawnFritelle();
  }
}

// Spawn a single fritelle
function spawnFritelle(): Fritelle {
  const id = `f${++fritelleCounter}`;
  const margin = TILE_SIZE * 2;

  const fritelle: Fritelle = {
    id,
    x: margin + Math.random() * (WORLD_WIDTH - margin * 2),
    y: margin + Math.random() * (WORLD_HEIGHT - margin * 2),
    isGolden: Math.random() < GOLDEN_CHANCE,
  };

  fritelles.set(id, fritelle);
  return fritelle;
}

// Handle new connection
wss.on('connection', (ws) => {
  const playerId = generateId();

  // Create player
  const player: Player = {
    id: playerId,
    name: `Player ${players.size + 1}`,
    x: 400 + Math.random() * 100,
    y: 400 + Math.random() * 100,
    direction: 'down',
    colorIndex: players.size % 4,
    fritelleCount: 0,
  };

  players.set(playerId, player);
  sockets.set(playerId, ws);

  console.log(`${playerId} connected (${players.size} players)`);

  // Send init message with current state
  send(playerId, {
    type: 'init',
    playerId,
    player,
    players: Array.from(players.values()).filter(p => p.id !== playerId),
    fritelles: Array.from(fritelles.values()),
  });

  // Broadcast new player to others
  broadcast({ type: 'playerJoined', player }, playerId);

  // Handle messages
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'move': {
          const p = players.get(playerId);
          if (p) {
            p.x = msg.x;
            p.y = msg.y;
            p.direction = msg.direction || p.direction;
            broadcast({ type: 'playerMoved', playerId, x: msg.x, y: msg.y, direction: p.direction }, playerId);
          }
          break;
        }

        case 'collect': {
          const fritelle = fritelles.get(msg.fritelleId);
          if (fritelle) {
            const p = players.get(playerId);
            if (p) {
              p.fritelleCount += fritelle.isGolden ? 15 : 1;
            }

            fritelles.delete(msg.fritelleId);

            // Broadcast collection
            broadcast({
              type: 'fritelleCollected',
              playerId,
              fritelleId: msg.fritelleId,
              isGolden: fritelle.isGolden,
              x: fritelle.x,
              y: fritelle.y,
            });

            // Respawn after delay
            setTimeout(() => {
              const newFritelle = spawnFritelle();
              broadcast({ type: 'fritelleSpawned', fritelle: newFritelle });
            }, 3000 + Math.random() * 5000);
          }
          break;
        }

        case 'throw': {
          const p = players.get(playerId);
          if (p && p.fritelleCount > 0) {
            p.fritelleCount--;
            broadcast({
              type: 'fritelleThrown',
              playerId,
              x: msg.x,
              y: msg.y,
              dx: msg.dx,
              dy: msg.dy,
            });
          }
          break;
        }

        case 'hit': {
          const target = players.get(msg.targetId);
          if (target && target.fritelleCount > 0) {
            target.fritelleCount--;
            broadcast({
              type: 'playerHit',
              targetId: msg.targetId,
              throwerId: playerId,
            });
          }
          break;
        }

        case 'setName': {
          const p = players.get(playerId);
          if (p) {
            p.name = msg.name;
            broadcast({ type: 'playerRenamed', playerId, name: msg.name });
          }
          break;
        }
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`${playerId} disconnected`);
    players.delete(playerId);
    sockets.delete(playerId);
    broadcast({ type: 'playerLeft', playerId });
  });

  ws.on('error', (err) => {
    console.error(`Socket error for ${playerId}:`, err);
  });
});

// Initialize game
spawnInitialFritelles();

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  EPCVIP Tools Hub - Multiplayer Server                 ║
╠════════════════════════════════════════════════════════╣
║  WebSocket:  ws://0.0.0.0:${port}                        ║
║  Health:     http://0.0.0.0:${port}/health               ║
║  Protocol:   Native WebSocket + JSON                   ║
╚════════════════════════════════════════════════════════╝
  `);
});
