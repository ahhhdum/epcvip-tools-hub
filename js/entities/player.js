/**
 * Player Entity
 *
 * Handles player movement, collision, and interaction.
 * Uses simple colored rectangles until sprites are loaded.
 */

import { GAME_CONFIG, COLORS } from '../config.js';
import { virtualInput, setInteractCallback, setThrowCallback } from '../systems/input.js';
import { updateCamera } from '../systems/camera.js';
import { throwFritelle } from './collectible.js';

export function createPlayer(startPos) {
  const TILE = GAME_CONFIG.tileSize;
  const speed = GAME_CONFIG.playerSpeed;

  // Player container (for collision)
  const player = add([
    rect(TILE - 8, TILE - 4),
    pos(startPos.x, startPos.y),
    area(),
    body(),
    anchor('center'),
    opacity(0),
    z(10),
    'player',
    {
      direction: 'down',
      isMoving: false,

      startMoving(dir) {
        this.direction = dir;
        this.isMoving = true;
      },

      stopMoving() {
        this.isMoving = false;
      },

      interact() {
        const buildings = get('building');
        const nearby = buildings.find(b => {
          const dist = this.pos.dist(b.pos.add(vec2(b.buildingWidth / 2, b.buildingHeight)));
          return dist < 60;
        });

        if (nearby) {
          nearby.interact();
        }
      },
    },
  ]);

  // Visual parts (children follow parent)
  // Shadow (flat oval approximation using rect)
  const shadow = add([
    rect(18, 6),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0.3),
    z(9),
    anchor('center'),
    'player-visual',
  ]);

  // Body (gold jacket)
  const body_part = add([
    rect(12, 12),
    pos(0, 0),
    color(...COLORS.gold),
    z(10),
    'player-visual',
  ]);

  // Body stripe
  const stripe = add([
    rect(4, 8),
    pos(0, 0),
    color(10, 10, 10),
    z(11),
    'player-visual',
  ]);

  // Head
  const head = add([
    rect(16, 10),
    pos(0, 0),
    color(248, 216, 120),
    z(10),
    'player-visual',
  ]);

  // Hair
  const hair = add([
    rect(16, 4),
    pos(0, 0),
    color(42, 42, 42),
    z(11),
    'player-visual',
  ]);

  // Cap
  const cap = add([
    rect(20, 5),
    pos(0, 0),
    color(10, 10, 10),
    z(12),
    'player-visual',
  ]);

  const capStripe = add([
    rect(8, 3),
    pos(0, 0),
    color(...COLORS.gold),
    z(13),
    'player-visual',
  ]);

  // Legs
  const legL = add([
    rect(5, 6),
    pos(0, 0),
    color(26, 26, 26),
    z(9),
    'player-visual',
  ]);

  const legR = add([
    rect(5, 6),
    pos(0, 0),
    color(26, 26, 26),
    z(9),
    'player-visual',
  ]);

  // Update visual positions
  player.onUpdate(() => {
    const px = player.pos.x;
    const py = player.pos.y;

    shadow.pos = vec2(px, py + 10);
    body_part.pos = vec2(px - 6, py - 3);
    stripe.pos = vec2(px - 2, py - 1);
    head.pos = vec2(px - 8, py - 12);
    hair.pos = vec2(px - 8, py - 12);
    cap.pos = vec2(px - 10, py - 14);
    capStripe.pos = vec2(px - 4, py - 12);
    legL.pos = vec2(px - 6, py + 6);
    legR.pos = vec2(px + 1, py + 6);
  });

  // Keyboard controls
  onKeyDown('left', () => {
    player.direction = 'left';
    player.move(-speed, 0);
  });

  onKeyDown('right', () => {
    player.direction = 'right';
    player.move(speed, 0);
  });

  onKeyDown('up', () => {
    player.direction = 'up';
    player.move(0, -speed);
  });

  onKeyDown('down', () => {
    player.direction = 'down';
    player.move(0, speed);
  });

  // WASD support
  onKeyDown('a', () => { player.direction = 'left'; player.move(-speed, 0); });
  onKeyDown('d', () => { player.direction = 'right'; player.move(speed, 0); });
  onKeyDown('w', () => { player.direction = 'up'; player.move(0, -speed); });
  onKeyDown('s', () => { player.direction = 'down'; player.move(0, speed); });

  // Interaction (Enter or A button only - Space is for throwing)
  onKeyPress('enter', () => player.interact());

  // Pause menu
  onKeyPress('escape', () => go('pause'));

  // Register virtual A button for interaction
  setInteractCallback(() => player.interact());

  // Helper to get throw direction based on current key states (supports diagonal)
  function getThrowDirection() {
    let dx = 0, dy = 0;

    // Check all movement keys
    if (isKeyDown('left') || isKeyDown('a') || virtualInput.left) dx -= 1;
    if (isKeyDown('right') || isKeyDown('d') || virtualInput.right) dx += 1;
    if (isKeyDown('up') || isKeyDown('w') || virtualInput.up) dy -= 1;
    if (isKeyDown('down') || isKeyDown('s') || virtualInput.down) dy += 1;

    // If moving, return normalized vec2 for diagonal support
    if (dx !== 0 || dy !== 0) {
      return vec2(dx, dy).unit();
    }

    // Fallback to last facing direction (string)
    return player.direction;
  }

  // Register virtual B button for throwing fritelles
  setThrowCallback(() => throwFritelle(player.pos, getThrowDirection()));

  // Keyboard B or Space for throwing
  onKeyPress('b', () => throwFritelle(player.pos, getThrowDirection()));
  onKeyPress('space', () => throwFritelle(player.pos, getThrowDirection()));

  // Virtual D-pad input (from on-screen buttons)
  player.onUpdate(() => {
    if (virtualInput.left) {
      player.direction = 'left';
      player.move(-speed, 0);
    }
    if (virtualInput.right) {
      player.direction = 'right';
      player.move(speed, 0);
    }
    if (virtualInput.up) {
      player.direction = 'up';
      player.move(0, -speed);
    }
    if (virtualInput.down) {
      player.direction = 'down';
      player.move(0, speed);
    }
  });

  // Keep player in bounds (use world dimensions, not viewport)
  player.onUpdate(() => {
    const worldW = GAME_CONFIG.worldWidth;
    const worldH = GAME_CONFIG.worldHeight;
    player.pos.x = clamp(player.pos.x, TILE, worldW - TILE);
    player.pos.y = clamp(player.pos.y, TILE * 2, worldH - TILE);

    // Update camera to follow player
    updateCamera(player.pos);
  });

  return player;
}
