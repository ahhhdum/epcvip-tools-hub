/**
 * Decoration Entities
 *
 * Trees, flowers, and ground drawing.
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
  const pathColor = rgb(...COLORS.path);
  const pathDarkColor = rgb(200, 160, 80);

  // Horizontal paths
  add([
    rect(18 * TILE, 2 * TILE),
    pos(TILE, 7 * TILE),
    color(pathColor),
    z(1),
  ]);

  add([
    rect(18 * TILE, 2 * TILE),
    pos(TILE, 14 * TILE),
    color(pathColor),
    z(1),
  ]);

  // Vertical center path
  add([
    rect(2 * TILE, 9 * TILE),
    pos(9 * TILE, 7 * TILE),
    color(pathColor),
    z(1),
  ]);

  // Path texture
  for (let x = 1; x < 19; x++) {
    for (const y of [7, 8, 14, 15]) {
      if ((x + y) % 3 === 0) {
        add([
          rect(4, 4),
          pos(x * TILE + 9, y * TILE + 9),
          color(pathDarkColor),
          z(2),
        ]);
      }
    }
  }
}

export function createTree(tileX, tileY) {
  const x = tileX * TILE;
  const y = tileY * TILE;

  const tree = add([
    rect(TILE, TILE),
    pos(x, y),
    area(),
    body({ isStatic: true }),
    opacity(0),  // Make base rect invisible
    z(4),
    'tree',
    { phase: tileX * 7 + tileY * 13 },
  ]);

  tree.onDraw = function() {
    const t = time();
    const rustle = Math.sin(t * 2 + this.phase) * 1.5;
    const rustleScale = 1 + Math.sin(t * 1.5 + this.phase) * 0.05;

    // Trunk
    drawRect({
      pos: vec2(8, 12),
      width: 8,
      height: 12,
      color: rgb(90, 61, 26),
    });

    // Foliage layers
    drawCircle({
      pos: vec2(12 + rustle * 0.5, 10),
      radius: 12 * rustleScale,
      color: rgb(26, 90, 26),
    });

    drawCircle({
      pos: vec2(10 + rustle, 7),
      radius: 8 * rustleScale,
      color: rgb(45, 122, 45),
    });

    drawCircle({
      pos: vec2(14 + rustle * 0.7, 6),
      radius: 6 * rustleScale,
      color: rgb(61, 154, 61),
    });
  };

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
  const phase = Math.random() * Math.PI * 2;

  const flower = add([
    rect(1, 1),
    pos(x, y),
    z(2),
    { phase, flowerColor: flowerColors[colorIdx] },
  ]);

  flower.onDraw = function() {
    const t = time();
    const sway = Math.sin(t * 1.25 + this.phase) * 2;

    // Stem
    drawLine({
      p1: vec2(0, 6),
      p2: vec2(sway, 0),
      width: 2,
      color: rgb(45, 90, 29),
    });

    // Flower head
    drawCircle({
      pos: vec2(sway, 0),
      radius: 4,
      color: rgb(...this.flowerColor),
    });

    // Center
    drawCircle({
      pos: vec2(sway, 0),
      radius: 2,
      color: rgb(255, 241, 118),
    });
  };

  return flower;
}
