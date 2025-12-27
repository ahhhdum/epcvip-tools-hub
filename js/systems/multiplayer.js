/**
 * Multiplayer System
 *
 * Uses native WebSocket + JSON for simple, reliable multiplayer.
 * Falls back gracefully to single-player if server unavailable.
 */

import { COLORS } from '../config.js';
import { playSound } from './audio.js';

// Connection state
let socket = null;
let localPlayerId = null;
let connected = false;

// Other player entities
const otherPlayers = new Map(); // id -> { parts, label, targetX, targetY }

// Server-synced fritelles
const networkedFritelles = new Map(); // id -> { entity, halo }

// Server URL
const SERVER_URL = window.MULTIPLAYER_SERVER || 'ws://localhost:2567';

// Player colors
const PLAYER_COLORS = [
  [255, 100, 100], // Red
  [100, 100, 255], // Blue
  [100, 255, 100], // Green
  [255, 255, 100], // Yellow
];

/**
 * Connect to multiplayer server
 */
export function connectToServer(playerName = 'Player') {
  return new Promise((resolve) => {
    try {
      console.log('Connecting to:', SERVER_URL);
      socket = new WebSocket(SERVER_URL);

      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg, resolve);
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };

      socket.onerror = (err) => {
        console.warn('WebSocket error:', err);
        resolve(false);
      };

      socket.onclose = () => {
        console.log('WebSocket closed');
        connected = false;
        // Clean up other players
        otherPlayers.forEach((data, id) => removeOtherPlayer(id));
      };

      // Timeout for connection
      setTimeout(() => {
        if (!connected) {
          console.log('Connection timeout, running in single-player mode');
          resolve(false);
        }
      }, 3000);

    } catch (e) {
      console.error('Connection error:', e);
      resolve(false);
    }
  });
}

/**
 * Handle incoming messages
 */
function handleMessage(msg, initResolve) {
  switch (msg.type) {
    case 'init':
      localPlayerId = msg.playerId;
      connected = true;
      console.log('Connected as', msg.player.name, '- id:', localPlayerId);

      // Spawn existing players
      msg.players.forEach(p => spawnOtherPlayer(p));

      // Note: We don't spawn server fritelles here - let local system handle it
      // This keeps single-player and multiplayer consistent

      if (initResolve) initResolve(true);
      break;

    case 'playerJoined':
      console.log('Player joined:', msg.player.name);
      spawnOtherPlayer(msg.player);
      break;

    case 'playerLeft':
      console.log('Player left:', msg.playerId);
      removeOtherPlayer(msg.playerId);
      break;

    case 'playerMoved':
      if (msg.playerId !== localPlayerId) {
        updateOtherPlayer(msg.playerId, msg.x, msg.y, msg.direction);
      }
      break;

    case 'fritelleCollected':
      if (msg.playerId !== localPlayerId) {
        // Show sparkle effect for other player's collection
        createSparkleEffect(msg.x, msg.y, msg.isGolden);
        playSound(msg.isGolden ? 'powerup' : 'pickup', { volume: 0.2 });
      }
      break;

    case 'fritelleThrown':
      if (msg.playerId !== localPlayerId) {
        createThrownFritelleVisual(msg);
      }
      break;

    case 'playerHit':
      showHitEffect(msg.targetId, msg.throwerId);
      break;

    case 'playerRenamed':
      const data = otherPlayers.get(msg.playerId);
      if (data && data.label) {
        data.label.text = msg.name;
      }
      break;
  }
}

/**
 * Spawn another player
 */
function spawnOtherPlayer(playerData) {
  if (playerData.id === localPlayerId) return;
  if (otherPlayers.has(playerData.id)) return;

  const colorIdx = playerData.colorIndex % PLAYER_COLORS.length;
  const pColor = PLAYER_COLORS[colorIdx];

  // Create body parts
  const shadow = add([
    rect(18, 6),
    pos(playerData.x, playerData.y + 10),
    color(0, 0, 0),
    opacity(0.3),
    z(9),
    anchor('center'),
    'other-player-part',
  ]);

  const body = add([
    rect(12, 12),
    pos(playerData.x - 6, playerData.y - 3),
    color(...pColor),
    z(10),
    'other-player-part',
  ]);

  const head = add([
    rect(16, 10),
    pos(playerData.x - 8, playerData.y - 12),
    color(248, 216, 120),
    z(10),
    'other-player-part',
  ]);

  const cap = add([
    rect(20, 5),
    pos(playerData.x - 10, playerData.y - 14),
    color(...pColor),
    z(12),
    'other-player-part',
  ]);

  // Hitbox for collision detection (invisible)
  const hitbox = add([
    rect(20, 24),
    pos(playerData.x - 10, playerData.y - 12),
    area(),
    opacity(0),
    z(10),
    'other-player-hitbox',
    { playerId: playerData.id },
  ]);

  // Name label
  const label = add([
    text(playerData.name, { size: 10 }),
    pos(playerData.x, playerData.y - 28),
    anchor('center'),
    color(255, 255, 255),
    z(15),
    'player-label',
  ]);

  const data = {
    parts: { shadow, body, head, cap },
    hitbox,
    label,
    targetX: playerData.x,
    targetY: playerData.y,
  };

  otherPlayers.set(playerData.id, data);

  // Smooth interpolation
  onUpdate(() => {
    const d = otherPlayers.get(playerData.id);
    if (!d) return;

    const { parts, hitbox: hb, label: lbl, targetX, targetY } = d;
    if (!parts.shadow.exists()) return;

    const currentX = parts.shadow.pos.x;
    const currentY = parts.shadow.pos.y - 10;

    const newX = lerp(currentX, targetX, 0.2);
    const newY = lerp(currentY, targetY, 0.2);

    parts.shadow.pos = vec2(newX, newY + 10);
    parts.body.pos = vec2(newX - 6, newY - 3);
    parts.head.pos = vec2(newX - 8, newY - 12);
    parts.cap.pos = vec2(newX - 10, newY - 14);
    hb.pos = vec2(newX - 10, newY - 12);
    lbl.pos = vec2(newX, newY - 28);
  });
}

/**
 * Update other player position
 */
function updateOtherPlayer(playerId, x, y, direction) {
  const data = otherPlayers.get(playerId);
  if (data) {
    data.targetX = x;
    data.targetY = y;
  }
}

/**
 * Remove other player
 */
function removeOtherPlayer(playerId) {
  const data = otherPlayers.get(playerId);
  if (data) {
    Object.values(data.parts).forEach(p => {
      if (p.exists()) destroy(p);
    });
    if (data.hitbox?.exists()) destroy(data.hitbox);
    if (data.label.exists()) destroy(data.label);
    otherPlayers.delete(playerId);
  }
}

/**
 * Create sparkle effect
 */
function createSparkleEffect(x, y, isGolden) {
  const sparkleCount = isGolden ? 15 : 5;
  const sparkleColor = isGolden ? [255, 200, 50] : [255, 220, 100];
  const sparkleSize = isGolden ? 5 : 3;

  for (let i = 0; i < sparkleCount; i++) {
    add([
      rect(sparkleSize, sparkleSize),
      pos(x + rand(-12, 12), y + rand(-12, 12)),
      color(...sparkleColor),
      opacity(1),
      z(15),
      lifespan(isGolden ? 0.5 : 0.3, { fade: 0.2 }),
      move(rand(0, 360), rand(20, 60)),
    ]);
  }
}

/**
 * Create thrown fritelle visual from another player
 */
function createThrownFritelleVisual(data) {
  const dirVec = vec2(data.dx, data.dy);

  add([
    sprite('fritelle'),
    pos(data.x, data.y),
    move(dirVec, 200),
    opacity(0.8),
    lifespan(1.5, { fade: 0.3 }),
    z(15),
    'thrown-fritelle-remote',
  ]);
}

/**
 * Show hit effect
 */
function showHitEffect(targetId, throwerId) {
  const data = otherPlayers.get(targetId);
  if (data && data.parts.body.exists()) {
    const origColor = data.parts.body.color;
    data.parts.body.color = rgb(255, 50, 50);
    wait(0.2, () => {
      if (data.parts.body.exists()) {
        data.parts.body.color = origColor;
      }
    });
  }

  // If local player was hit
  if (targetId === localPlayerId) {
    add([
      rect(width(), height()),
      pos(0, 0),
      color(255, 0, 0),
      opacity(0.3),
      fixed(),
      z(100),
      lifespan(0.2, { fade: 0.1 }),
    ]);
  }
}

// --- Public API ---

/**
 * Send position to server
 */
export function sendPosition(x, y, direction) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'move', x, y, direction }));
  }
}

/**
 * Send collection event
 */
export function sendCollect(fritelleId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'collect', fritelleId }));
  }
}

/**
 * Send throw event
 */
export function sendThrow(x, y, dx, dy) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'throw', x, y, dx, dy }));
  }
}

/**
 * Send hit event
 */
export function sendHit(targetId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'hit', targetId }));
  }
}

/**
 * Check if connected
 */
export function isMultiplayerConnected() {
  return connected;
}

/**
 * Get local player ID
 */
export function getLocalPlayerId() {
  return localPlayerId;
}

/**
 * Get player count
 */
export function getPlayerCount() {
  return otherPlayers.size + 1;
}

/**
 * For now, don't use server fritelles - let local system handle it
 * This keeps gameplay consistent in single/multiplayer
 */
export function useServerFritelles() {
  return false;
}

/**
 * Disconnect
 */
export function disconnect() {
  if (socket) {
    socket.close();
    socket = null;
    connected = false;
    localPlayerId = null;
  }
}
