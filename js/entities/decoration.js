/**
 * Decoration Entities
 *
 * Trees, flowers, and ground drawing.
 * Uses simple colored shapes until sprites are loaded.
 */

import { GAME_CONFIG, COLORS } from '../config.js';

const TILE = GAME_CONFIG.tileSize;
const MAP_W = Math.floor(GAME_CONFIG.width / TILE);
const MAP_H = Math.floor(GAME_CONFIG.height / TILE);

export function drawGround() {
  // Base grass layer
  add([
    rect(width(), height()),
    pos(0, 0),
    color(...COLORS.grass),
    z(0),
  ]);

  // Grass texture pattern
  for (let x = 0; x < MAP_W; x++) {
    for (let y = 0; y < MAP_H; y++) {
      if ((x + y) % 2 === 0) {
        add([
          rect(3, 3),
          pos(x * TILE + 6, y * TILE + 6),
          color(...COLORS.grassDark),
          z(1),
        ]);
        add([
          rect(3, 3),
          pos(x * TILE + 15, y * TILE + 15),
          color(...COLORS.grassDark),
          z(1),
        ]);
      }
    }
  }

  // Paths
  drawPath();
}

function drawPath() {
  const pathColor = COLORS.path;
  const pathDarkColor = [200, 160, 80];

  // Horizontal paths
  add([
    rect(18 * TILE, 2 * TILE),
    pos(TILE, 7 * TILE),
    color(...pathColor),
    z(1),
  ]);

  add([
    rect(18 * TILE, 2 * TILE),
    pos(TILE, 14 * TILE),
    color(...pathColor),
    z(1),
  ]);

  // Vertical center path
  add([
    rect(2 * TILE, 9 * TILE),
    pos(9 * TILE, 7 * TILE),
    color(...pathColor),
    z(1),
  ]);

  // Path texture
  for (let x = 1; x < 19; x++) {
    for (const y of [7, 8, 14, 15]) {
      if ((x + y) % 3 === 0) {
        add([
          rect(4, 4),
          pos(x * TILE + 9, y * TILE + 9),
          color(...pathDarkColor),
          z(2),
        ]);
      }
    }
  }
}

export function createTree(tileX, tileY) {
  const x = tileX * TILE;
  const y = tileY * TILE;

  // Collision box (invisible)
  const tree = add([
    rect(TILE, TILE),
    pos(x, y),
    area(),
    body({ isStatic: true }),
    opacity(0),
    z(4),
    'tree',
  ]);

  // Trunk
  add([
    rect(8, 12),
    pos(x + 8, y + 12),
    color(90, 61, 26),
    z(4),
  ]);

  // Foliage (multiple circles as layered rects for simplicity)
  add([
    circle(12),
    pos(x + 12, y + 10),
    color(26, 90, 26),
    z(5),
  ]);

  add([
    circle(8),
    pos(x + 10, y + 7),
    color(45, 122, 45),
    z(6),
  ]);

  add([
    circle(6),
    pos(x + 14, y + 6),
    color(61, 154, 61),
    z(7),
  ]);

  return tree;
}

export function createFlower(tileX, tileY) {
  const flowerColors = [
    [255, 107, 107],  // red
    [255, 217, 61],   // yellow
    [107, 203, 119],  // green
    [77, 150, 255],   // blue
    [255, 133, 161],  // pink
  ];

  const x = tileX * TILE + 8 + Math.random() * 8;
  const y = tileY * TILE + 8 + Math.random() * 8;
  const colorIdx = Math.floor(Math.random() * flowerColors.length);

  // Stem
  add([
    rect(2, 6),
    pos(x - 1, y),
    color(45, 90, 29),
    z(2),
  ]);

  // Flower head
  add([
    circle(4),
    pos(x, y),
    color(...flowerColors[colorIdx]),
    z(3),
  ]);

  // Center
  add([
    circle(2),
    pos(x, y),
    color(255, 241, 118),
    z(4),
  ]);
}
