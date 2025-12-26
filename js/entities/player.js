/**
 * Player Entity
 *
 * Handles player movement, collision, and interaction.
 * Uses simple colored rectangles until sprites are loaded.
 */

import { GAME_CONFIG, COLORS } from '../config.js';

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
  // Shadow
  const shadow = add([
    ellipse(9, 4),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0.4),
    z(9),
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
