/**
 * EPCVIP Tools Hub - Multiplayer Server
 *
 * Simple WebSocket server with JSON messages.
 * Serves as gateway/proxy for all tools under single domain.
 */

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

// SSO Configuration
const SSO_SHARED_SECRET = process.env.SSO_SHARED_SECRET || '';
const SSO_TOKEN_EXPIRY = 300; // 5 minutes

// Cookie domain for SSO (shared across subdomains)
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '.epcvip.vip';
const ENVIRONMENT = process.env.ENVIRONMENT || 'production';

/**
 * Get cookie domain for SSO. Returns undefined for localhost/development.
 */
function getCookieDomain(): string | undefined {
  const env = ENVIRONMENT.toLowerCase();
  if (env === 'development' || env === 'dev' || env === 'local') {
    return undefined; // Don't set domain for localhost
  }
  return COOKIE_DOMAIN;
}

// Supabase Configuration (epcvip-auth - shared for Tools Hub and Wordle)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yuithqxycicgokkgmpzg.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
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

// Proxy targets - only ping-tree remains (athena/validator use direct custom domain links)
const PING_TREE_TARGET = process.env.PING_TREE_URL || 'https://compare.epcvip.vip';

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

// Mount proxy BEFORE static files (order matters!)
// Note: athena and validator proxies removed - using direct custom domain links now
app.use('/ping-tree', pingTreeProxy);

// Parse JSON bodies for API routes
app.use(express.json());

// Parse cookies for auth
app.use(cookieParser());

// ============================================================
// Shared Assets CDN (CORS-enabled for all EPCVIP apps)
// ============================================================

const sharedPath = path.join(__dirname, '../public/shared');

// CORS for shared assets - allow all epcvip.vip subdomains + localhost for dev
app.use(
  '/shared',
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-side, curl, etc.)
      if (!origin) return callback(null, true);
      // Allow epcvip.vip and all subdomains
      if (/^https?:\/\/([^.]+\.)?epcvip\.vip$/.test(origin)) return callback(null, true);
      // Allow localhost for development
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      callback(null, true); // Allow all origins for public assets
    },
    methods: ['GET'],
  })
);

// Serve shared assets with long cache + immutable headers
app.use(
  '/shared',
  express.static(sharedPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);

// ============================================================
// Login Page (served with injected Supabase config)
// ============================================================

// Read login template once at startup
const loginTemplatePath = path.join(__dirname, '../public/login.html');
let loginTemplate = '';
try {
  loginTemplate = fs.readFileSync(loginTemplatePath, 'utf-8');
} catch (e) {
  console.warn('[Auth] login.html not found, will check again on request');
}

app.get('/login', (req, res) => {
  // Re-read template if not loaded (for development)
  if (!loginTemplate) {
    try {
      loginTemplate = fs.readFileSync(loginTemplatePath, 'utf-8');
    } catch (e) {
      return res.status(500).send('Login page not found');
    }
  }

  // Inject Supabase config
  const html = loginTemplate
    .replace('{{SUPABASE_URL}}', SUPABASE_URL)
    .replace('{{SUPABASE_ANON_KEY}}', SUPABASE_ANON_KEY);

  res.type('html').send(html);
});

// Logout endpoint - clears cookie and redirects to login (SSO-aware)
app.get('/logout', (req, res) => {
  const cookieDomain = getCookieDomain();
  if (cookieDomain) {
    res.clearCookie('sb-access-token', { path: '/', domain: cookieDomain });
  } else {
    res.clearCookie('sb-access-token', { path: '/' });
  }
  res.redirect('/login?logout=1');
});

// ============================================================
// OAuth Callback Handler
// ============================================================

const APP_ID = 'tools-hub'; // Must match epcvip_apps table
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'epcvip.com';

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.log('[Auth] OAuth error:', error);
    return res.redirect('/login?error=oauth_failed');
  }

  if (!code) {
    console.log('[Auth] OAuth callback missing code');
    return res.redirect('/login?error=oauth_failed');
  }

  try {
    // Exchange code for session via Supabase API
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=authorization_code`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      console.error('[Auth] Token exchange failed:', response.status);
      return res.redirect('/login?error=oauth_failed');
    }

    const tokenData = (await response.json()) as {
      access_token?: string;
      user?: { email?: string };
    };
    const accessToken = tokenData.access_token;
    const user = tokenData.user || {};
    const email = user.email || '';

    if (!accessToken) {
      console.error('[Auth] No access token in response');
      return res.redirect('/login?error=oauth_failed');
    }

    // Validate email domain
    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`)) {
      console.log(`[Auth] Domain not allowed: ${email}`);
      // Sign out the user
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return res.redirect('/login?error=domain_not_allowed');
    }

    // Check RBAC access
    const rbacResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/epcvip_app_roles?app_id=eq.${APP_ID}&user_email=eq.${email.toLowerCase()}&select=role`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (rbacResponse.ok) {
      const roles = (await rbacResponse.json()) as Array<{ role: string }>;
      if (!roles || roles.length === 0) {
        console.log(`[Auth] No RBAC role for: ${email}`);
        // Sign out the user
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return res.redirect('/access-denied');
      }
      console.log(`[Auth] RBAC access granted for ${email}: ${roles[0].role}`);
    }

    // Set cookie and redirect (SSO-aware)
    const cookieOptions: {
      path: string;
      httpOnly: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      secure: boolean;
      maxAge: number;
      domain?: string;
    } = {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    };
    const cookieDomain = getCookieDomain();
    if (cookieDomain) {
      cookieOptions.domain = cookieDomain;
    }
    res.cookie('sb-access-token', accessToken, cookieOptions);

    console.log(`[Auth] OAuth login successful: ${email}`);

    // SSO: Redirect to returnUrl if available (validated to prevent open redirect)
    const returnUrl = req.query.returnUrl as string | undefined;
    const isValidReturnUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//');
    return res.redirect(isValidReturnUrl ? returnUrl : '/');
  } catch (err) {
    console.error('[Auth] OAuth callback error:', err);
    return res.redirect('/login?error=oauth_failed');
  }
});

// Access Denied Page
const accessDeniedTemplatePath = path.join(__dirname, '../public/access-denied.html');
let accessDeniedTemplate = '';
try {
  accessDeniedTemplate = fs.readFileSync(accessDeniedTemplatePath, 'utf-8');
} catch (e) {
  // Will fall back to inline HTML
}

app.get('/access-denied', (req, res) => {
  if (accessDeniedTemplate) {
    const html = accessDeniedTemplate
      .replace('{{SUPABASE_URL}}', SUPABASE_URL)
      .replace('{{SUPABASE_ANON_KEY}}', SUPABASE_ANON_KEY);
    return res.type('html').send(html);
  }

  // Fallback inline HTML
  res.type('html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Access Denied - EPCVIP Tools Hub</title>
      <style>
        body { background: #1a1a1a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { text-align: center; }
        h1 { margin-bottom: 16px; }
        p { color: #a0a0a0; margin-bottom: 24px; }
        a { color: #ffd700; text-decoration: none; padding: 12px 24px; border: 1px solid #404040; border-radius: 8px; display: inline-block; }
        a:hover { background: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Access Denied</h1>
        <p>You don't have permission to access this application.<br>Contact an administrator to request access.</p>
        <a href="/login">Return to login</a>
      </div>
    </body>
    </html>
  `);
});

// ============================================================
// Public Config Endpoint (for client-side Supabase initialization)
// ============================================================

app.get('/api/config', (req, res) => {
  res.json({
    supabase: {
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
    },
  });
});

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

// ============================================================

// Health check - public (before auth middleware)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    players: players.size,
    proxies: {
      pingTree: PING_TREE_TARGET,
    },
  });
});

// ============================================================
// Auth Middleware - Protect app routes
// ============================================================

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/logout',
  '/health',
  '/api/config',
  '/api/sso',
  '/auth/callback',
  '/access-denied',
  '/shared',
];

app.use((req, res, next) => {
  // Skip auth for public paths
  if (PUBLIC_PATHS.some((p) => req.path.startsWith(p))) {
    return next();
  }

  // Skip auth for static assets (js, css, images, fonts)
  if (/\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i.test(req.path)) {
    return next();
  }

  // Check for auth cookie
  const token = req.cookies['sb-access-token'];
  if (!token) {
    // SSO: Capture current URL for return after login
    const returnUrl =
      req.path + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    if (returnUrl && returnUrl !== '/' && returnUrl !== '/login') {
      return res.redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
    return res.redirect('/login');
  }

  // Verify JWT signature and expiry
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('[Auth] SUPABASE_JWT_SECRET not configured');
    return res.redirect('/login');
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    // Invalid or expired token
    res.clearCookie('sb-access-token');
    return res.redirect('/login');
  }
});

// Serve static files from public directory (copied during build)
const staticPath = path.join(__dirname, '../public');
app.use(express.static(staticPath));

// Catch-all for SPA - serve index.html for unmatched routes (after auth check)
app.get('*', (req, res, next) => {
  // Don't catch API routes or static files
  if (req.path.startsWith('/api') || req.path.startsWith('/ping-tree')) {
    return next();
  }
  res.sendFile(path.join(staticPath, 'index.html'));
});

const server = createServer(app);

// WebSocket server for game
const wss = new WebSocketServer({ server });

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

// Initialize game
spawnInitialFritelles();

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  EPCVIP Tools Hub - Multiplayer Server                 ║
╠════════════════════════════════════════════════════════╣
║  Game WS:    ws://0.0.0.0:${port}/                        ║
║  Health:     http://0.0.0.0:${port}/health               ║
║  Protocol:   Native WebSocket + JSON                   ║
╚════════════════════════════════════════════════════════╝
  `);
});
