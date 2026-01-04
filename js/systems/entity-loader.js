/**
 * Entity Loader
 *
 * Converts map JSON entities into game objects (buildings, decorations, trees).
 * Single source of truth: map editor → game runtime.
 *
 * This bridges the map editor output with the game's building system,
 * using the shared asset library for sprite and collision data.
 */

import { getAssetById, ASSET_LIBRARY } from '../../tools/js/asset-library.js';
import { createBuilding } from '../entities/building.js';

// Entity types that are rendered as interactive buildings (reserved for type filtering)
const _BUILDING_TYPES = ['building', 'buildings'];

// Entity types that are decorative (reserved for type filtering)
const _DECORATION_TYPES = ['decorations', 'trees'];

/**
 * Get asset from any entity type
 */
function getAnyAssetById(assetId) {
  return (
    getAssetById('buildings', assetId) ||
    getAssetById('decorations', assetId) ||
    getAssetById('trees', assetId)
  );
}

/**
 * Load all entities from map data and create game objects
 *
 * @param {Object} mapData - Map data loaded from JSON
 * @returns {Array} - Array of created building/decoration entities
 */
export function loadEntities(mapData) {
  const entities = mapData.entities || [];

  return entities
    .map((entity) => {
      const gameEntity = createEntityFromMapData(entity);
      if (!gameEntity) {
        console.warn(`Failed to create entity: ${entity.id} (type: ${entity.type})`);
      }
      return gameEntity;
    })
    .filter(Boolean); // Remove nulls from failed creations
}

/**
 * Create a game entity from map data
 * Routes to appropriate creator based on entity type
 *
 * @param {Object} entity - Entity from map JSON
 * @returns {Object|null} - Kaplay entity or null on failure
 */
function createEntityFromMapData(entity) {
  // Look up asset definition from any type
  const asset = getAnyAssetById(entity.assetId);
  if (!asset) {
    console.warn(`Unknown asset ID: ${entity.assetId}`);
    return null;
  }

  // All entity types currently use createBuilding
  // This creates a sprite with collision and optional interaction
  return createBuildingFromAsset(entity, asset);
}

/**
 * Convert a map entity to a game building/decoration
 *
 * @param {Object} entity - Entity from map JSON
 * @param {Object} asset - Asset definition from library
 * @returns {Object|null} - Kaplay building entity or null on failure
 */
function createBuildingFromAsset(entity, asset) {
  if (!asset) {
    return null;
  }

  // Determine dimensions (handle sprite sheet pieces)
  let width = asset.width;
  let height = asset.height;
  let pieceData = null;

  if (entity.pieceId && asset.pieces) {
    const piece = asset.pieces.find((p) => p.id === entity.pieceId);
    if (piece) {
      width = piece.width;
      height = piece.height;
      pieceData = piece;
    }
  }

  // Build tool-compatible object for createBuilding()
  // This maintains compatibility with existing building.js
  const tool = {
    id: entity.id,
    name: entity.properties?.name || asset.name,
    description: entity.properties?.description || '',
    url: entity.properties?.url || null,
    position: { x: entity.x, y: entity.y },
    color: entity.properties?.color || [128, 128, 128],
    sprite: asset.spriteName,
    spriteWidth: width,
    spriteHeight: height,
    collisionShapes: asset.collisionShapes || [{ type: 'rect', x: 0, y: 0, w: 1, h: 1 }],
    live: entity.properties?.interactive ?? true,

    // Extended properties for sprite sheet support
    pieceId: entity.pieceId || null,
    pieceData: pieceData,
    assetId: entity.assetId,
    fullAsset: asset, // Pass full asset for piece rendering
  };

  return createBuilding(tool);
}

/**
 * Get all unique sprites that need to be loaded for a map
 * Used by loading.js to dynamically load required sprites
 *
 * @param {Object} mapData - Map data loaded from JSON
 * @returns {Array} - Array of { spriteName, file, pieces? } objects
 */
export function getRequiredSprites(mapData) {
  const entities = mapData.entities || [];
  const spriteMap = new Map();

  for (const entity of entities) {
    if (entity.type !== 'building') continue;

    const asset = getAssetById('buildings', entity.assetId);
    if (!asset || !asset.spriteName) continue;

    // Only add each sprite once
    if (!spriteMap.has(asset.spriteName)) {
      spriteMap.set(asset.spriteName, {
        spriteName: asset.spriteName,
        file: asset.file,
        pieces: asset.pieces || null,
        width: asset.width,
        height: asset.height,
      });
    }
  }

  return Array.from(spriteMap.values());
}

/**
 * Load all entity sprites from the asset library
 * Includes buildings, decorations, and trees
 *
 * @returns {Array} - Array of { spriteName, file, pieces? } objects
 */
export function getAllBuildingSprites() {
  const spriteMap = new Map();

  // Load all entity types
  const entityTypes = ['buildings', 'decorations', 'trees'];

  for (const type of entityTypes) {
    const assets = ASSET_LIBRARY[type] || [];
    for (const asset of assets) {
      if (!asset.spriteName) continue;

      if (!spriteMap.has(asset.spriteName)) {
        spriteMap.set(asset.spriteName, {
          spriteName: asset.spriteName,
          file: asset.file,
          pieces: asset.pieces || null,
          width: asset.width,
          height: asset.height,
        });
      }
    }
  }

  return Array.from(spriteMap.values());
}
