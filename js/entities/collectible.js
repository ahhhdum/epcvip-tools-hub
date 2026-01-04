/**
 * Collectible Entity
 *
 * Handles fritelle collectibles that spawn randomly around the world.
 * Avoids spawning on buildings, trees, and other obstacles.
 */

import { GAME_CONFIG, TOOLS, TREES } from '../config.js';
import { playSound } from '../systems/audio.js';
import {
  sendCollect,
  sendThrow,
  sendHit,
  getLocalPlayerId,
  useServerFritelles,
  isMultiplayerConnected,
} from '../systems/multiplayer.js';

// Track collected fritelles (persists across scene transitions)
let fritelleCount = 0;

// HUD elements
let _hudIcon = null; // Reserved for future HUD icon reference
let hudText = null;

/**
 * Check if a position overlaps with any building
 * NOTE: Uses per-tool sprite dimensions from config
 */
function isOnBuilding(x, y, padding = 24) {
  const TILE = GAME_CONFIG.tileSize;
  const spriteScale = 1.2;

  for (const tool of TOOLS) {
    const bx = tool.position.x * TILE;
    const by = tool.position.y * TILE;

    // Use actual sprite dimensions from config (with fallback)
    const buildingWidth = (tool.spriteWidth || 144) * spriteScale;
    const buildingHeight = (tool.spriteHeight || 128) * spriteScale;

    // Check if point is within building bounds (with padding)
    if (
      x >= bx - padding &&
      x <= bx + buildingWidth + padding &&
      y >= by - padding &&
      y <= by + buildingHeight + padding
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a position overlaps with any tree
 */
function isOnTree(x, y, padding = 20) {
  const TILE = GAME_CONFIG.tileSize;

  for (const tree of TREES) {
    const tx = tree.x * TILE;
    const ty = tree.y * TILE;

    if (
      x >= tx - padding &&
      x <= tx + TILE + padding &&
      y >= ty - padding &&
      y <= ty + TILE * 2 + padding
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if position is near the welcome sign
 */
function isOnSign(x, y, padding = 30) {
  const TILE = GAME_CONFIG.tileSize;
  const signX = 18 * TILE;
  const signY = 13 * TILE;
  const signW = 4 * TILE;
  const signH = 2 * TILE;

  return (
    x >= signX - padding &&
    x <= signX + signW + padding &&
    y >= signY - padding &&
    y <= signY + signH + padding
  );
}

/**
 * Get a random valid spawn position
 */
function getRandomSpawnPosition() {
  const TILE = GAME_CONFIG.tileSize;
  const { worldWidth, worldHeight } = GAME_CONFIG;
  const margin = TILE * 2;

  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const x = margin + Math.random() * (worldWidth - margin * 2);
    const y = margin + Math.random() * (worldHeight - margin * 2);

    if (!isOnBuilding(x, y) && !isOnTree(x, y) && !isOnSign(x, y)) {
      return { x, y };
    }
    attempts++;
  }

  // Fallback: return a position in the bottom area (usually safe)
  return {
    x: margin + Math.random() * (worldWidth - margin * 2),
    y: worldHeight - margin * 3,
  };
}

/**
 * Create a single fritelle at a random valid position
 */
export function createFritelle() {
  // Safety cap - don't spawn if too many on screen
  const currentFritelles = get('fritelle').length;
  if (currentFritelles >= 12) return null;

  const spawnPos = getRandomSpawnPosition();

  // 4% chance for golden fritelle (worth 15x)
  const isGolden = Math.random() < 0.04;

  const fritelle = add([
    sprite('fritelle'),
    pos(spawnPos.x, spawnPos.y),
    area(),
    anchor('center'),
    z(8),
    'fritelle',
    'collectible',
    {
      isGolden: isGolden,
      value: isGolden ? 15 : 1,
    },
  ]);

  // Add pulsing yellow halo for golden fritelles
  if (isGolden) {
    const halo = add([
      circle(20),
      pos(spawnPos.x, spawnPos.y),
      color(255, 215, 0),
      opacity(0.7),
      anchor('center'),
      z(7),
      'golden-halo',
      {
        parentFritelle: fritelle,
      },
    ]);

    // Pulsing effect - follows fritelle and pulses opacity
    halo.onUpdate(() => {
      if (fritelle.exists()) {
        halo.pos = fritelle.pos;
        halo.opacity = 0.4 + Math.sin(time() * 5) * 0.35;
      } else {
        destroy(halo);
      }
    });
  }

  return fritelle;
}

/**
 * Spawn multiple fritelles
 */
export function spawnFritelles(count = 8) {
  const fritelles = [];
  for (let i = 0; i < count; i++) {
    fritelles.push(createFritelle());
  }
  return fritelles;
}

/**
 * Initialize the fritelle collection system
 */
export function initFritelleSystem(player) {
  // Load the fritelle sprite
  loadSprite('fritelle', 'assets/sprites/fritelle-v2.png');

  // Create HUD (fixed position, doesn't scroll with camera)
  _hudIcon = add([sprite('fritelle'), pos(20, 20), scale(1), fixed(), z(100)]);

  hudText = add([
    text(`x ${fritelleCount}`, { size: 14 }),
    pos(44, 20),
    color(255, 255, 255),
    fixed(),
    z(100),
  ]);

  // Add shadow/outline for better visibility
  add([
    text(`x ${fritelleCount}`, { size: 14 }),
    pos(45, 21),
    color(0, 0, 0),
    fixed(),
    z(99),
    'hud-shadow',
  ]);

  // Spawn initial fritelles (only in single-player mode)
  // In multiplayer, server spawns them via state sync
  if (!useServerFritelles()) {
    spawnFritelles(8);
  }

  // Handle collection
  player.onCollide('fritelle', (f) => {
    // In multiplayer, notify server and let it handle the state
    if (isMultiplayerConnected() && f.networkId) {
      sendCollect(f.networkId);
      // Server will remove from state, which triggers client-side destruction
      // But we still play effects locally for responsiveness
    } else {
      // Single-player: handle locally
      destroy(f);

      // Respawn a new one after a delay (single-player only)
      wait(rand(3, 8), () => {
        createFritelle();
      });
    }

    // Increment counter (golden = 15, regular = 1)
    fritelleCount += f.value || 1;
    updateHUD();

    // Play sound (different for golden)
    playSound(f.isGolden ? 'powerup' : 'pickup', { volume: 0.35 });

    // Sparkle effect (bigger for golden)
    const sparkleCount = f.isGolden ? 15 : 5;
    const sparkleColor = f.isGolden ? [255, 200, 50] : [255, 220, 100];
    const sparkleSize = f.isGolden ? 5 : 3;

    for (let i = 0; i < sparkleCount; i++) {
      add([
        rect(sparkleSize, sparkleSize),
        pos(f.pos.x + rand(-12, 12), f.pos.y + rand(-12, 12)),
        color(...sparkleColor),
        opacity(1),
        z(15),
        lifespan(f.isGolden ? 0.5 : 0.3, { fade: 0.2 }),
        move(rand(0, 360), rand(20, 60)),
      ]);
    }
  });

  // Magnet effect - at 15+ fritelles, nearby ones drift toward player
  onUpdate(() => {
    if (fritelleCount >= 15) {
      get('fritelle').forEach((f) => {
        const dist = player.pos.dist(f.pos);
        if (dist < 100 && dist > 10) {
          f.pos = f.pos.lerp(player.pos, 0.03);
        }
      });
    }
  });
}

/**
 * Update the HUD display
 */
function updateHUD() {
  if (hudText) {
    hudText.text = `x ${fritelleCount}`;
  }
  // Update shadow too
  const shadows = get('hud-shadow');
  shadows.forEach((s) => {
    s.text = `x ${fritelleCount}`;
  });
}

/**
 * Get current fritelle count
 */
export function getFritelleCount() {
  return fritelleCount;
}

/**
 * Reset fritelle count (for new game)
 */
export function resetFritelleCount() {
  fritelleCount = 0;
  updateHUD();
}

/**
 * Throw a fritelle in a direction (costs 1 fritelle)
 */
export function throwFritelle(playerPos, direction) {
  if (fritelleCount <= 0) return false;

  fritelleCount--;
  updateHUD();

  // Play throw sound
  playSound('throw', { volume: 0.3 });

  // Support both vec2 (diagonal) and string (cardinal)
  let dirVec;
  if (typeof direction === 'string') {
    dirVec =
      {
        up: vec2(0, -1),
        down: vec2(0, 1),
        left: vec2(-1, 0),
        right: vec2(1, 0),
      }[direction] || vec2(0, 1);
  } else {
    dirVec = direction; // Already a vec2
  }

  // Notify server in multiplayer mode
  if (isMultiplayerConnected()) {
    sendThrow(playerPos.x, playerPos.y, dirVec.x, dirVec.y);
  }

  // Create thrown fritelle projectile
  const thrown = add([
    sprite('fritelle'),
    pos(playerPos.x, playerPos.y),
    move(dirVec, 200),
    area(),
    opacity(1),
    lifespan(1.5, { fade: 0.3 }),
    z(15),
    'thrown-fritelle',
  ]);

  // Splat effect helper
  const createSplat = (position) => {
    for (let i = 0; i < 5; i++) {
      add([
        rect(4, 4),
        pos(position.x + rand(-8, 8), position.y + rand(-8, 8)),
        color(255, 200, 100),
        opacity(1),
        lifespan(0.3, { fade: 0.2 }),
        z(16),
      ]);
    }
  };

  // Destroy on collision with buildings or trees
  thrown.onCollide('building', () => {
    createSplat(thrown.pos);
    destroy(thrown);
  });

  thrown.onCollide('tree', () => {
    createSplat(thrown.pos);
    destroy(thrown);
  });

  // Hit other players in multiplayer
  thrown.onCollide('other-player-hitbox', (target) => {
    if (target.playerId === getLocalPlayerId()) return;
    sendHit(target.playerId);
    createSplat(thrown.pos);
    destroy(thrown);
  });

  return true;
}
