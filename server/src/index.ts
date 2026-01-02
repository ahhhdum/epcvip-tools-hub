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
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { WordleRoomManager } from './rooms/wordle-room';

// SSO Configuration
const SSO_SHARED_SECRET = process.env.SSO_SHARED_SECRET || '';
const SSO_TOKEN_EXPIRY = 300; // 5 minutes

// Supabase Configuration (epcvip-auth - shared for Tools Hub and Wordle)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Initialize Supabase service client (for server-side writes)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabaseAdmin;
}

// Track used SSO tokens to prevent replay attacks (in production, use Redis)
const usedSSOTokens = new Set<string>();

const app = express();
const port = Number(process.env.PORT) || 2567;

// Proxy targets - use public URLs (move to same Railway project for internal networking)
const PING_TREE_TARGET =
  process.env.PING_TREE_URL || 'https://ping-tree-compare-production.up.railway.app';
const ATHENA_TARGET =
  process.env.ATHENA_URL || 'https://epcvip-athena-usage-monitor.up.railway.app';
const VALIDATOR_TARGET =
  process.env.VALIDATOR_URL || 'https://streamlit-validator-production.up.railway.app';

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
const athenaProxy = createProxyMiddleware({
  target: ATHENA_TARGET,
  changeOrigin: true,
  pathRewrite: { '^/athena': '' }, // Strip /athena prefix, target serves at root
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

// Proxy configuration for validator (Streamlit)
const validatorProxy = createProxyMiddleware({
  target: VALIDATOR_TARGET,
  changeOrigin: true,
  pathRewrite: { '^/validator': '' },
  ws: true,
  on: {
    error: (err, req, res) => {
      console.error('Validator proxy error:', (err as Error).message);
      if (res && 'status' in res) {
        (res as express.Response).status(502).json({ error: 'Validator service unavailable' });
      }
    },
  },
});

// Mount proxies BEFORE static files (order matters!)
app.use('/ping-tree', pingTreeProxy);
app.use('/athena', athenaProxy);
app.use('/validator', validatorProxy);

// Parse JSON bodies for API routes
app.use(express.json());

// ============================================================
// SSO API Endpoints
// ============================================================

/**
 * Sign an SSO token for cross-app authentication
 * Called by Tools Hub when user clicks Wordle building
 */
app.post('/api/sso/sign-token', (req, res) => {
  if (!SSO_SHARED_SECRET) {
    return res.status(500).json({ error: 'SSO not configured' });
  }

  const { sub, name, aud } = req.body;

  if (!sub || !aud) {
    return res.status(400).json({ error: 'Missing required fields: sub, aud' });
  }

  const payload = {
    sub, // User email
    name: name || sub.split('@')[0],
    iss: 'epcvip-tools-hub',
    aud, // Target app (e.g., 'multiplayer-wordle')
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SSO_TOKEN_EXPIRY,
    jti: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  try {
    const token = jwt.sign(payload, SSO_SHARED_SECRET, { algorithm: 'HS256' });
    res.json({ token });
  } catch (e) {
    console.error('[SSO] Token signing error:', e);
    res.status(500).json({ error: 'Failed to sign token' });
  }
});

/**
 * Validate an SSO token for Wordle
 * Called by Wordle when user arrives with sso_token in URL
 */
app.post('/api/wordle/sso-validate', async (req, res) => {
  if (!SSO_SHARED_SECRET) {
    return res.status(500).json({ error: 'SSO not configured' });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    // Verify JWT signature and claims
    const payload = jwt.verify(token, SSO_SHARED_SECRET, {
      algorithms: ['HS256'],
      issuer: 'epcvip-tools-hub',
      audience: 'multiplayer-wordle',
    }) as {
      sub: string;
      name: string;
      jti: string;
      exp: number;
    };

    // Check single-use (prevent replay attacks)
    if (usedSSOTokens.has(payload.jti)) {
      return res.status(401).json({ error: 'Token already used' });
    }
    usedSSOTokens.add(payload.jti);

    // Cleanup old tokens after 10 minutes
    setTimeout(() => usedSSOTokens.delete(payload.jti), 10 * 60 * 1000);

    // Return user info from token (no separate user table needed)
    const user = {
      email: payload.sub,
      name: payload.name,
      authSource: 'sso',
    };

    // Generate session token for Wordle (used for stats persistence)
    const sessionToken = jwt.sign({ email: user.email, name: user.name }, SSO_SHARED_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      email: user.email,
      name: user.name,
      userId: payload.jti,
      session: { token: sessionToken },
    });
  } catch (e: any) {
    console.error('[SSO] Validation error:', e);

    if (e.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(500).json({ error: 'SSO validation failed' });
  }
});

/**
 * Get Wordle stats for a player
 */
app.get('/api/wordle/stats/:email', async (req, res) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const email = decodeURIComponent(req.params.email);

  try {
    const { data, error } = await supabase
      .from('wordle_stats')
      .select('*')
      .eq('player_email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      console.error('[Wordle] Stats fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    res.json(
      data || {
        player_email: email,
        games_played: 0,
        games_won: 0,
        total_guesses: 0,
        current_streak: 0,
        best_streak: 0,
      }
    );
  } catch (e) {
    console.error('[Wordle] Stats error:', e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================

// Serve static files from public directory (copied during build)
const staticPath = path.join(__dirname, '../public');
app.use(express.static(staticPath));

// Health check - enhanced with proxy status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    players: players.size,
    proxies: {
      pingTree: PING_TREE_TARGET,
      athena: ATHENA_TARGET,
      validator: VALIDATOR_TARGET,
    },
  });
});

const server = createServer(app);

// WebSocket server for game - noServer mode for manual upgrade handling
const wss = new WebSocketServer({ noServer: true });

// WebSocket server for Wordle Battle
const wordleWss = new WebSocketServer({ noServer: true });
const wordleManager = new WordleRoomManager();

// Handle WebSocket upgrades manually to route between game, wordle, and proxied services
server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';

  if (url.startsWith('/athena')) {
    // Streamlit WebSocket - proxy to athena service
    athenaProxy.upgrade(req, socket as Socket, head);
  } else if (url.startsWith('/wordle')) {
    // Wordle Battle WebSocket - handle locally
    wordleWss.handleUpgrade(req, socket as Socket, head, (ws) => {
      wordleWss.emit('connection', ws, req);
    });
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
interface PlayerAppearance {
  characterId: string;
}

interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: string;
  appearance: PlayerAppearance;
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

  // Create player with default appearance
  const player: Player = {
    id: playerId,
    name: `Player ${players.size + 1}`,
    x: 400 + Math.random() * 100,
    y: 400 + Math.random() * 100,
    direction: 'down',
    appearance: { characterId: 'Farmer_Bob' }, // Default character
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
    players: Array.from(players.values()).filter((p) => p.id !== playerId),
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
            broadcast(
              { type: 'playerMoved', playerId, x: msg.x, y: msg.y, direction: p.direction },
              playerId
            );
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
            setTimeout(
              () => {
                const newFritelle = spawnFritelle();
                broadcast({ type: 'fritelleSpawned', fritelle: newFritelle });
              },
              3000 + Math.random() * 5000
            );
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

        case 'setAppearance': {
          const p = players.get(playerId);
          if (p) {
            p.appearance = { ...p.appearance, ...msg.appearance };
            broadcast({ type: 'playerAppearanceChanged', playerId, appearance: p.appearance });
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

// Wordle Battle WebSocket connections
wordleWss.on('connection', (ws) => {
  console.log('[Wordle] New connection');

  ws.on('message', (data) => {
    wordleManager.handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    wordleManager.handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('[Wordle] Socket error:', err);
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
║  Game WS:    ws://0.0.0.0:${port}/                        ║
║  Wordle WS:  ws://0.0.0.0:${port}/wordle                  ║
║  Health:     http://0.0.0.0:${port}/health               ║
║  Protocol:   Native WebSocket + JSON                   ║
╚════════════════════════════════════════════════════════╝
  `);
});
