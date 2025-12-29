/**
 * Player Entity
 *
 * Handles player movement, collision, and interaction.
 * Now uses sprite sheet for rendering with walk animations.
 */

import { GAME_CONFIG, COLORS } from '../config.js';
import { virtualInput, setInteractCallback, setThrowCallback } from '../systems/input.js';
import { updateCamera } from '../systems/camera.js';
import { throwFritelle } from './collectible.js';
import { sendPosition, isMultiplayerConnected } from '../systems/multiplayer.js';

export function createPlayer(startPos) {
  const TILE = GAME_CONFIG.tileSize;
  const speed = GAME_CONFIG.playerSpeed;

  // Player with sprite (64x64 frames, scaled to fit better in 24px tile world)
  const player = add([
    sprite('player', { anim: 'idle-down' }),
    pos(startPos.x, startPos.y),
    area({ shape: new Rect(vec2(20, 40), 24, 20) }), // Collision box at feet
    body(),
    anchor('center'),
    scale(0.5), // Scale down 64px sprite to ~32px to fit better
    z(10),
    'player',
    {
      direction: 'down',
      isMoving: false,
      lastDirection: 'down',

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

  // Track movement state for animation
  let wasMoving = false;

  // Update animation based on direction and movement
  player.onUpdate(() => {
    const isCurrentlyMoving =
      isKeyDown('left') || isKeyDown('right') || isKeyDown('up') || isKeyDown('down') ||
      isKeyDown('a') || isKeyDown('d') || isKeyDown('w') || isKeyDown('s') ||
      virtualInput.left || virtualInput.right || virtualInput.up || virtualInput.down;

    // Only change animation when state changes
    if (isCurrentlyMoving !== wasMoving || player.direction !== player.lastDirection) {
      const animName = isCurrentlyMoving
        ? `walk-${player.direction}`
        : `idle-${player.direction}`;

      if (player.curAnim() !== animName) {
        player.play(animName);
      }

      player.lastDirection = player.direction;
      wasMoving = isCurrentlyMoving;
    }
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

  // Multiplayer: Send position updates (throttled to 20 times/sec)
  let lastNetworkUpdate = 0;
  player.onUpdate(() => {
    if (isMultiplayerConnected() && time() - lastNetworkUpdate > 0.05) {
      sendPosition(player.pos.x, player.pos.y, player.direction);
      lastNetworkUpdate = time();
    }
  });

  return player;
}
