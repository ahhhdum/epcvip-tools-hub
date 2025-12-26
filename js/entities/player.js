/**
 * Player Entity
 *
 * Handles player movement, collision, and interaction.
 */

import { GAME_CONFIG, COLORS } from '../config.js';

export function createPlayer(startPos) {
  const TILE = GAME_CONFIG.tileSize;
  const speed = GAME_CONFIG.playerSpeed;

  const player = add([
    rect(TILE - 4, TILE - 4),
    pos(startPos.x, startPos.y),
    area(),
    body(),
    anchor('center'),
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
        // Find nearby interactable buildings
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

  // Draw player sprite (programmatic for now)
  player.onDraw = function() {
    // Shadow
    drawEllipse({
      pos: vec2(0, 10),
      radiusX: 10,
      radiusY: 4,
      color: rgb(0, 0, 0),
      opacity: 0.4,
    });

    // Body (gold jacket)
    drawRect({
      pos: vec2(-6, -3),
      width: 12,
      height: 12,
      color: rgb(...COLORS.gold),
    });

    // Body detail
    drawRect({
      pos: vec2(-2, -1),
      width: 4,
      height: 8,
      color: rgb(10, 10, 10),
    });

    // Head
    drawRect({
      pos: vec2(-8, -12),
      width: 16,
      height: 10,
      color: rgb(248, 216, 120),
    });

    // Hair
    drawRect({
      pos: vec2(-8, -12),
      width: 16,
      height: 4,
      color: rgb(42, 42, 42),
    });

    // Cap
    drawRect({
      pos: vec2(-10, -14),
      width: 20,
      height: 5,
      color: rgb(10, 10, 10),
    });
    drawRect({
      pos: vec2(-4, -12),
      width: 8,
      height: 3,
      color: rgb(...COLORS.gold),
    });

    // Eyes based on direction
    if (this.direction === 'down') {
      drawRect({ pos: vec2(-5, -7), width: 3, height: 3, color: rgb(24, 24, 24) });
      drawRect({ pos: vec2(2, -7), width: 3, height: 3, color: rgb(24, 24, 24) });
    } else if (this.direction === 'left') {
      drawRect({ pos: vec2(-7, -7), width: 3, height: 3, color: rgb(24, 24, 24) });
    } else if (this.direction === 'right') {
      drawRect({ pos: vec2(4, -7), width: 3, height: 3, color: rgb(24, 24, 24) });
    }

    // Legs
    drawRect({ pos: vec2(-6, 6), width: 5, height: 6, color: rgb(26, 26, 26) });
    drawRect({ pos: vec2(1, 6), width: 5, height: 6, color: rgb(26, 26, 26) });
  };

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

  // Interaction
  onKeyPress('enter', () => player.interact());
  onKeyPress('space', () => player.interact());

  // Keep player in bounds
  player.onUpdate(() => {
    player.pos.x = clamp(player.pos.x, TILE, width() - TILE);
    player.pos.y = clamp(player.pos.y, TILE * 2, height() - TILE);
  });

  return player;
}
