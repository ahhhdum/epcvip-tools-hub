/**
 * Decoration Entities
 *
 * Trees, flowers, and ground drawing.
 * Supports both procedural (simple shapes) and tilemap-based rendering.
 */

import { GAME_CONFIG, COLORS } from '../config.js';
import { renderTileMap, loadMapData } from '../systems/tilemap.js';

const TILE = GAME_CONFIG.tileSize;
// Use world dimensions for map size (not viewport)
const MAP_W = Math.floor(GAME_CONFIG.worldWidth / TILE);
const MAP_H = Math.floor(GAME_CONFIG.worldHeight / TILE);

// Set to true to use tilemap-based terrain (requires tileset assets)
const USE_TILEMAP = true;

// Store tile entities for potential cleanup
let _currentTileEntities = null; // Reserved for future tile cleanup functionality

/**
 * Draw ground - uses tilemap if available, falls back to procedural
 */
export async function drawGround() {
  if (USE_TILEMAP) {
    try {
      const mapData = await loadMapData('maps/village.json');
      _currentTileEntities = renderTileMap(mapData);
      return;
    } catch (error) {
      console.warn('Tilemap failed, falling back to procedural:', error);
    }
  }

  // Fallback: procedural ground
  drawProceduralGround();
}

/**
 * Draw procedural ground (original implementation)
 */
function drawProceduralGround() {
  // Base grass layer covering entire world
  add([
    rect(GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight),
    pos(0, 0),
    color(...COLORS.grass),
    z(-1),
  ]);

  // Grass texture pattern (for entire world)
  for (let x = 0; x < MAP_W; x++) {
    for (let y = 0; y < MAP_H; y++) {
      if ((x + y) % 2 === 0) {
        add([rect(3, 3), pos(x * TILE + 6, y * TILE + 6), color(...COLORS.grassDark), z(0)]);
        add([rect(3, 3), pos(x * TILE + 15, y * TILE + 15), color(...COLORS.grassDark), z(0)]);
      }
    }
  }

  // Paths
  drawPath();
}

function drawPath() {
  const pathColor = COLORS.path;
  const pathDarkColor = [200, 160, 80];

  // Main horizontal path at y=10 (spans most of the width)
  add([rect((MAP_W - 4) * TILE, 2 * TILE), pos(2 * TILE, 10 * TILE), color(...pathColor), z(1)]);

  // Second horizontal path at y=24 (spans most of the width)
  add([rect((MAP_W - 4) * TILE, 2 * TILE), pos(2 * TILE, 24 * TILE), color(...pathColor), z(1)]);

  // Vertical path connecting the two horizontal paths
  add([rect(2 * TILE, 16 * TILE), pos(19 * TILE, 10 * TILE), color(...pathColor), z(1)]);

  // Additional vertical paths
  add([rect(2 * TILE, 16 * TILE), pos(10 * TILE, 10 * TILE), color(...pathColor), z(1)]);

  add([rect(2 * TILE, 16 * TILE), pos(28 * TILE, 10 * TILE), color(...pathColor), z(1)]);

  // Path texture for horizontal paths
  for (let x = 2; x < MAP_W - 2; x++) {
    for (const y of [10, 11, 24, 25]) {
      if ((x + y) % 3 === 0) {
        add([rect(4, 4), pos(x * TILE + 9, y * TILE + 9), color(...pathDarkColor), z(2)]);
      }
    }
  }

  // Path texture for vertical paths
  for (const x of [10, 11, 19, 20, 28, 29]) {
    for (let y = 10; y < 26; y++) {
      if ((x + y) % 3 === 0) {
        add([rect(4, 4), pos(x * TILE + 9, y * TILE + 9), color(...pathDarkColor), z(2)]);
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
  add([rect(8, 12), pos(x + 8, y + 12), color(90, 61, 26), z(4)]);

  // Foliage (multiple circles as layered rects for simplicity)
  add([circle(12), pos(x + 12, y + 10), color(26, 90, 26), z(5)]);

  add([circle(8), pos(x + 10, y + 7), color(45, 122, 45), z(6)]);

  add([circle(6), pos(x + 14, y + 6), color(61, 154, 61), z(7)]);

  return tree;
}

export function createFlower(tileX, tileY) {
  const flowerColors = [
    [255, 107, 107], // red
    [255, 217, 61], // yellow
    [107, 203, 119], // green
    [77, 150, 255], // blue
    [255, 133, 161], // pink
  ];

  const x = tileX * TILE + 8 + Math.random() * 8;
  const y = tileY * TILE + 8 + Math.random() * 8;
  const colorIdx = Math.floor(Math.random() * flowerColors.length);

  // Stem
  add([rect(2, 6), pos(x - 1, y), color(45, 90, 29), z(2)]);

  // Flower head
  add([circle(4), pos(x, y), color(...flowerColors[colorIdx]), z(3)]);

  // Center
  add([circle(2), pos(x, y), color(255, 241, 118), z(4)]);
}
