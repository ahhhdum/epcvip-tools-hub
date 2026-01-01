/**
 * Multiplayer System
 *
 * Uses native WebSocket + JSON for simple, reliable multiplayer.
 * Falls back gracefully to single-player if server unavailable.
 */

import { COLORS, getSelectedCharacter } from '../config.js';
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
    case 'init': {
      localPlayerId = msg.playerId;
      connected = true;
      console.log('Connected as', msg.player.name, '- id:', localPlayerId);

      // Send our character selection to server
      const selectedChar = getSelectedCharacter();
      socket.send(
        JSON.stringify({
          type: 'setAppearance',
          appearance: { characterId: selectedChar.id },
        })
      );

      // Spawn existing players
      msg.players.forEach((p) => spawnOtherPlayer(p));

      // Note: We don't spawn server fritelles here - let local system handle it
      // This keeps single-player and multiplayer consistent

      if (initResolve) initResolve(true);
      break;
    }

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

    case 'playerRenamed': {
      const renamedData = otherPlayers.get(msg.playerId);
      if (renamedData && renamedData.label) {
        renamedData.label.text = msg.name;
      }
      break;
    }

    case 'playerAppearanceChanged': {
      const appearanceData = otherPlayers.get(msg.playerId);
      if (appearanceData && appearanceData.sprite) {
        appearanceData.appearance = msg.appearance;
        // Update sprite to new character
        const charId = msg.appearance.characterId || 'Farmer_Bob';
        const dir = appearanceData.direction || 'down';
        // Handle left direction (use right sprite + flipX)
        const animDir = dir === 'left' ? 'right' : dir;
        appearanceData.sprite.use(sprite(charId, { anim: `idle-${animDir}` }));
        appearanceData.sprite.flipX = dir === 'left';
      }
      break;
    }
  }
}

/**
 * Spawn another player with their character sprite
 */
function spawnOtherPlayer(playerData) {
  if (playerData.id === localPlayerId) return;
  if (otherPlayers.has(playerData.id)) return;

  // Get character ID from appearance (fallback to Farmer_Bob)
  const charId = playerData.appearance?.characterId || 'Farmer_Bob';
  const direction = playerData.direction || 'down';

  // Handle left direction (use right sprite + flipX)
  const animDir = direction === 'left' ? 'right' : direction;
  const shouldFlip = direction === 'left';

  // Create character sprite (same as local player)
  const playerSprite = add([
    sprite(charId, { anim: `idle-${animDir}` }),
    pos(playerData.x, playerData.y),
    anchor('center'),
    scale(2.4), // Larger for 4K visibility
    z(10),
    'other-player',
  ]);

  // Apply flipX for left direction
  if (shouldFlip) playerSprite.flipX = true;

  // Hitbox for collision detection (invisible) - scaled up for larger player
  const hitbox = add([
    rect(26, 32),
    pos(playerData.x - 13, playerData.y - 16),
    area(),
    opacity(0),
    z(10),
    'other-player-hitbox',
    { playerId: playerData.id },
  ]);

  // Name label above sprite - positioned for larger player
  const label = add([
    text(playerData.name, { size: 12 }),
    pos(playerData.x, playerData.y - 75),
    anchor('center'),
    color(255, 255, 255),
    z(15),
    'player-label',
  ]);

  const data = {
    sprite: playerSprite,
    hitbox,
    label,
    targetX: playerData.x,
    targetY: playerData.y,
    direction: direction,
    appearance: playerData.appearance || { characterId: 'Farmer_Bob' },
    isMoving: false,
  };

  otherPlayers.set(playerData.id, data);

  // Smooth interpolation for movement
  onUpdate(() => {
    const d = otherPlayers.get(playerData.id);
    if (!d || !d.sprite.exists()) return;

    const currentX = d.sprite.pos.x;
    const currentY = d.sprite.pos.y;

    const newX = lerp(currentX, d.targetX, 0.2);
    const newY = lerp(currentY, d.targetY, 0.2);

    // Check if actually moving (for animation)
    const moving = Math.abs(newX - d.targetX) > 0.5 || Math.abs(newY - d.targetY) > 0.5;

    d.sprite.pos = vec2(newX, newY);
    d.hitbox.pos = vec2(newX - 13, newY - 16);
    d.label.pos = vec2(newX, newY - 75);

    // Update animation if movement state changed
    if (moving !== d.isMoving) {
      d.isMoving = moving;
      // Handle left direction (use right sprite + flipX)
      let animName;
      if (d.direction === 'left') {
        animName = moving ? 'walk-right' : 'idle-right';
      } else {
        animName = moving ? `walk-${d.direction}` : `idle-${d.direction}`;
      }
      d.sprite.play(animName);
    }
  });
}

/**
 * Update other player position and direction
 */
function updateOtherPlayer(playerId, x, y, direction) {
  const data = otherPlayers.get(playerId);
  if (data) {
    data.targetX = x;
    data.targetY = y;

    // Update direction and animation if changed
    if (direction && direction !== data.direction) {
      data.direction = direction;
      // Handle left direction (use right sprite + flipX)
      if (direction === 'left') {
        data.sprite.flipX = true;
        const animName = data.isMoving ? 'walk-right' : 'idle-right';
        data.sprite.play(animName);
      } else {
        data.sprite.flipX = false;
        const animName = data.isMoving ? `walk-${direction}` : `idle-${direction}`;
        data.sprite.play(animName);
      }
    }
  }
}

/**
 * Remove other player
 */
function removeOtherPlayer(playerId) {
  const data = otherPlayers.get(playerId);
  if (data) {
    if (data.sprite?.exists()) destroy(data.sprite);
    if (data.hitbox?.exists()) destroy(data.hitbox);
    if (data.label?.exists()) destroy(data.label);
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
  if (data && data.sprite?.exists()) {
    // Flash red effect using opacity pulse
    const origOpacity = data.sprite.opacity ?? 1;
    data.sprite.opacity = 0.5;
    wait(0.1, () => {
      if (data.sprite?.exists()) {
        data.sprite.opacity = origOpacity;
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
