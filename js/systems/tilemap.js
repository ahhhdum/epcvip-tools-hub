/**
 * Tilemap System
 *
 * Renders tile-based terrain from JSON map data.
 * Uses Cute Fantasy tileset (16x16 tiles).
 */

import { GAME_CONFIG } from '../config.js';

// Tile size in the tileset
const TILE_SIZE = 16;

// Scale factor for rendering (to match game world scale)
const TILE_SCALE = 1.5; // 16 * 1.5 = 24px (matches GAME_CONFIG.tileSize)

// Z-levels for each layer
const LAYER_Z = {
  ground: -1,
  paths: 0,
  decorations: 1,
};

// Default tileset sprite name
const DEFAULT_TILESET = 'tileset-grass';

/**
 * Render a tilemap from map data
 *
 * @param {Object} mapData - Map data with layers and tile indices
 * @param {string} tileset - Sprite name for the tileset (optional)
 * @returns {Object} - Map of layer names to arrays of tile entities
 */
export function renderTileMap(mapData, tileset = DEFAULT_TILESET) {
  const tileEntities = {
    ground: [],
    paths: [],
    decorations: [],
  };

  const { width, height } = mapData;
  // Support both 'layers' and 'tileLayers' (map editor uses tileLayers)
  const layers = mapData.layers || mapData.tileLayers;
  // Tileset names array from map data (e.g., ["Grass_Plain", "Grass_Tiles_4"])
  const tilesets = mapData.tilesets || [];

  if (!layers) {
    console.warn('No layers found in map data');
    return tileEntities;
  }

  // Render each layer
  for (const [layerName, tiles] of Object.entries(layers)) {
    const zLevel = LAYER_Z[layerName] ?? 0;

    for (let y = 0; y < height && y < tiles.length; y++) {
      const row = tiles[y];
      for (let x = 0; x < width && x < row.length; x++) {
        const rawTileIndex = row[x];

        // Handle [tilesetIndex, tileIndex] array format from map editor
        let tilesetName = tileset;
        let tileIndex;
        if (Array.isArray(rawTileIndex)) {
          const tilesetIdx = rawTileIndex[0];
          tileIndex = rawTileIndex[1];
          // Look up tileset name from map's tilesets array, fallback to numbered
          const tsName = tilesets[tilesetIdx];
          tilesetName = tsName ? `tileset-${tsName}` : `tileset-${tilesetIdx}`;
        } else {
          tileIndex = rawTileIndex;
        }

        // Skip negative tiles (truly empty)
        // For ground layer, 0 is valid (plain grass); for other layers, 0 means empty
        if (tileIndex < 0) continue;
        if (layerName !== 'ground' && tileIndex === 0) continue;

        // Create tile entity
        const tile = add([
          sprite(tilesetName, { frame: tileIndex }),
          pos(x * TILE_SIZE * TILE_SCALE, y * TILE_SIZE * TILE_SCALE),
          scale(TILE_SCALE),
          z(zLevel),
          'tile',
          `tile-${layerName}`,
        ]);

        tileEntities[layerName].push(tile);
      }
    }
  }

  return tileEntities;
}

/**
 * Clear all tile entities
 *
 * @param {Object} tileEntities - Map of layer names to tile entities
 */
export function clearTileMap(tileEntities) {
  for (const entities of Object.values(tileEntities)) {
    for (const entity of entities) {
      if (entity.exists()) {
        destroy(entity);
      }
    }
  }
}

/**
 * Create a simple grass-only map (for fallback/testing)
 *
 * @param {number} width - Map width in tiles
 * @param {number} height - Map height in tiles
 * @returns {Object} - Map data structure
 */
export function createEmptyMap(width, height) {
  const groundLayer = [];
  const pathsLayer = [];
  const decorationsLayer = [];

  // Fill ground with random grass tiles (tiles 0-3 are grass variants)
  for (let y = 0; y < height; y++) {
    groundLayer[y] = [];
    pathsLayer[y] = [];
    decorationsLayer[y] = [];

    for (let x = 0; x < width; x++) {
      // Random grass tile (1-4, using 1-indexed for non-empty)
      // Tile 0 in our system means "empty", so we use 1-4 for grass
      groundLayer[y][x] = 1 + Math.floor(Math.random() * 4);
      pathsLayer[y][x] = 0;
      decorationsLayer[y][x] = 0;
    }
  }

  return {
    name: 'Generated',
    width,
    height,
    tileSize: TILE_SIZE,
    tileset: 'Grass_Tiles_1',
    layers: {
      ground: groundLayer,
      paths: pathsLayer,
      decorations: decorationsLayer,
    },
    buildings: [],
  };
}

/**
 * Load map data from a JSON file
 *
 * @param {string} path - Path to the JSON file
 * @returns {Promise<Object>} - Map data
 */
export async function loadMapData(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load map: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading map:', error);
    // Return fallback empty map
    const cols = Math.ceil(GAME_CONFIG.worldWidth / (TILE_SIZE * TILE_SCALE));
    const rows = Math.ceil(GAME_CONFIG.worldHeight / (TILE_SIZE * TILE_SCALE));
    return createEmptyMap(cols, rows);
  }
}
