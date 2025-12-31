/**
 * Asset Library
 *
 * Predefined assets for the map editor AND game runtime.
 * Each asset has dimensions, tile footprint, collision shapes, and sprite mapping.
 *
 * Used by:
 * - Map editor: Visual placement, preview rendering
 * - Game runtime: Sprite loading, collision creation
 */

// Collision shape presets (normalized 0-1 coordinates, scaled at runtime)
// These define how the player collides with buildings
export const COLLISION_PRESETS = {
  // Small house (96x128): Triangle roof + rectangular body
  house1: [
    { type: 'polygon', points: [[0.5, 0], [0.05, 0.35], [0.95, 0.35]] },
    { type: 'rect', x: 0.10, y: 0.35, w: 0.80, h: 0.50 },
  ],
  // Medium/large house (144x128): Simple inset rectangle
  house2: [
    { type: 'rect', x: 0.08, y: 0.25, w: 0.84, h: 0.55 },
  ],
  // Inn (240x192): Large building, similar proportions
  inn: [
    { type: 'rect', x: 0.05, y: 0.20, w: 0.90, h: 0.65 },
  ],
  // Barn (128x144): Tall building with gambrel roof
  barn: [
    { type: 'rect', x: 0.08, y: 0.30, w: 0.84, h: 0.55 },
  ],
  // Blacksmith (160x128): Wide building
  blacksmith: [
    { type: 'rect', x: 0.06, y: 0.25, w: 0.88, h: 0.60 },
  ],
  // Greenhouse (96x128): Similar to small house
  greenhouse: [
    { type: 'rect', x: 0.08, y: 0.30, w: 0.84, h: 0.55 },
  ],
  // Windmill (128x112): Circular base
  windmill: [
    { type: 'rect', x: 0.15, y: 0.40, w: 0.70, h: 0.50 },
  ],
};

export const ASSET_LIBRARY = {
  buildings: [
    // Houses
    {
      id: 'House_1_Stone_Base_Red',
      name: 'Stone House (Small)',
      file: '../assets/sprites/buildings/House_1_Stone_Base_Red.png',
      width: 96,
      height: 128,
      tileWidth: 6,
      tileHeight: 8,
      category: 'houses',
      spriteName: 'building-house-1-stone-red',
      collisionShapes: COLLISION_PRESETS.house1,
    },
    {
      id: 'House_1_Limestone_Base_Red',
      name: 'Limestone House (Small)',
      file: '../assets/sprites/buildings/House_1_Limestone_Base_Red.png',
      width: 96,
      height: 128,
      tileWidth: 6,
      tileHeight: 8,
      category: 'houses',
      spriteName: 'building-house-1-limestone-red',
      collisionShapes: COLLISION_PRESETS.house1,
    },
    {
      id: 'House_2_Stone_Base_Blue',
      name: 'Stone House (Medium)',
      file: '../assets/sprites/buildings/House_2_Stone_Base_Blue.png',
      width: 144,
      height: 128,
      tileWidth: 9,
      tileHeight: 8,
      category: 'houses',
      spriteName: 'building-house-2-stone-blue',
      collisionShapes: COLLISION_PRESETS.house2,
    },
    {
      id: 'House_3_Stone_Base_Black',
      name: 'Stone House (Large)',
      file: '../assets/sprites/buildings/House_3_Stone_Base_Black.png',
      width: 144,
      height: 128,
      tileWidth: 9,
      tileHeight: 8,
      category: 'houses',
      spriteName: 'building-house-3-stone-black',
      collisionShapes: COLLISION_PRESETS.house2,
    },

    // Inns
    {
      id: 'Inn_Red',
      name: 'Inn (Red)',
      file: '../assets/sprites/buildings/Inn_Red.png',
      width: 240,
      height: 192,
      tileWidth: 15,
      tileHeight: 12,
      category: 'commercial',
      spriteName: 'building-inn-red',
      collisionShapes: COLLISION_PRESETS.inn,
    },
    {
      id: 'Inn_Blue',
      name: 'Inn (Blue)',
      file: '../assets/sprites/buildings/Inn_Blue.png',
      width: 240,
      height: 192,
      tileWidth: 15,
      tileHeight: 12,
      category: 'commercial',
      spriteName: 'building-inn-blue',
      collisionShapes: COLLISION_PRESETS.inn,
    },
    {
      id: 'Inn_Black',
      name: 'Inn (Black)',
      file: '../assets/sprites/buildings/Inn_Black.png',
      width: 240,
      height: 192,
      tileWidth: 15,
      tileHeight: 12,
      category: 'commercial',
      spriteName: 'building-inn-black',
      collisionShapes: COLLISION_PRESETS.inn,
    },

    // Barns
    {
      id: 'Barn_Base_Red',
      name: 'Barn (Red Base)',
      file: '../assets/sprites/buildings/Barn_Base_Red.png',
      width: 128,
      height: 144,
      tileWidth: 8,
      tileHeight: 9,
      category: 'farm',
      spriteName: 'building-barn-red',
      collisionShapes: COLLISION_PRESETS.barn,
    },
    {
      id: 'Barn_Base_Blue',
      name: 'Barn (Blue Base)',
      file: '../assets/sprites/buildings/Barn_Base_Blue.png',
      width: 128,
      height: 144,
      tileWidth: 8,
      tileHeight: 9,
      category: 'farm',
      spriteName: 'building-barn-blue',
      collisionShapes: COLLISION_PRESETS.barn,
    },
    {
      id: 'Barn_Green_Red',
      name: 'Barn (Green/Red)',
      file: '../assets/sprites/buildings/Barn_Green_Red.png',
      width: 128,
      height: 144,
      tileWidth: 8,
      tileHeight: 9,
      category: 'farm',
      spriteName: 'building-barn-green-red',
      collisionShapes: COLLISION_PRESETS.barn,
    },

    // Specialty
    {
      id: 'Blacksmith_House_Red',
      name: 'Blacksmith (Red)',
      file: '../assets/sprites/buildings/Blacksmith_House_Red.png',
      width: 160,
      height: 128,
      tileWidth: 10,
      tileHeight: 8,
      category: 'commercial',
      spriteName: 'building-blacksmith-red',
      collisionShapes: COLLISION_PRESETS.blacksmith,
    },
    {
      id: 'Blacksmith_House_Blue',
      name: 'Blacksmith (Blue)',
      file: '../assets/sprites/buildings/Blacksmith_House_Blue.png',
      width: 160,
      height: 128,
      tileWidth: 10,
      tileHeight: 8,
      category: 'commercial',
      spriteName: 'building-blacksmith-blue',
      collisionShapes: COLLISION_PRESETS.blacksmith,
    },
    // Greenhouses - sprite sheets with 4 pieces each
    {
      id: 'GreenHouse_Green',
      name: 'Greenhouse (Green)',
      file: '../assets/sprites/buildings/GreenHouse_Green.png',
      width: 384,
      height: 128,
      category: 'farm',
      spriteName: 'building-greenhouse-green',
      collisionShapes: COLLISION_PRESETS.greenhouse,
      pieces: [
        { id: 'full', name: 'Full', col: 0, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'glass', name: 'Glass Only', col: 1, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'floor', name: 'Floor', col: 2, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'frame', name: 'Frame', col: 3, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
      ],
    },
    {
      id: 'GreenHouse_Wood',
      name: 'Greenhouse (Wood)',
      file: '../assets/sprites/buildings/GreenHouse_Wood.png',
      width: 384,
      height: 128,
      category: 'farm',
      spriteName: 'building-greenhouse-wood',
      collisionShapes: COLLISION_PRESETS.greenhouse,
      pieces: [
        { id: 'full', name: 'Full', col: 0, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'glass', name: 'Glass Only', col: 1, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'floor', name: 'Floor', col: 2, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'frame', name: 'Frame', col: 3, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
      ],
    },
    {
      id: 'GreenHouse_Metal',
      name: 'Greenhouse (Metal)',
      file: '../assets/sprites/buildings/GreenHouse_Metal.png',
      width: 384,
      height: 128,
      category: 'farm',
      spriteName: 'building-greenhouse-metal',
      collisionShapes: COLLISION_PRESETS.greenhouse,
      pieces: [
        { id: 'full', name: 'Full', col: 0, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'glass', name: 'Glass Only', col: 1, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'floor', name: 'Floor', col: 2, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
        { id: 'frame', name: 'Frame', col: 3, width: 96, height: 128, tileWidth: 6, tileHeight: 8 },
      ],
    },
    {
      id: 'Windmill',
      name: 'Windmill',
      file: '../assets/sprites/buildings/Windmill.png',
      width: 128,
      height: 112,
      category: 'farm',
      spriteName: 'building-windmill',
      collisionShapes: COLLISION_PRESETS.windmill,
      pieces: [
        { id: 'building', name: 'Windmill Building', col: 0, width: 64, height: 112, tileWidth: 4, tileHeight: 7 },
        { id: 'blades', name: 'Windmill Blades', col: 1, width: 64, height: 112, tileWidth: 4, tileHeight: 7 },
      ],
    },
  ],

  // Decorations - outdoor props and scenery
  decorations: [
    {
      id: 'Well',
      name: 'Well',
      file: '../assets/sprites/decorations/Well.png',
      width: 32,
      height: 48,
      tileWidth: 2,
      tileHeight: 3,
      category: 'props',
      spriteName: 'decoration-well',
      collisionShapes: [{ type: 'rect', x: 0.1, y: 0.4, w: 0.8, h: 0.5 }],
    },
    {
      id: 'Fountain',
      name: 'Fountain',
      file: '../assets/sprites/decorations/Fountain.png',
      width: 32,
      height: 80,
      tileWidth: 2,
      tileHeight: 5,
      category: 'props',
      spriteName: 'decoration-fountain',
      collisionShapes: [{ type: 'rect', x: 0.1, y: 0.5, w: 0.8, h: 0.4 }],
    },
    {
      id: 'Benches',
      name: 'Benches',
      file: '../assets/sprites/decorations/Benches.png',
      width: 64,
      height: 32,
      category: 'props',
      spriteName: 'decoration-benches',
      collisionShapes: [{ type: 'rect', x: 0.1, y: 0.3, w: 0.8, h: 0.6 }],
      pieces: [
        { id: 'bench_wood', name: 'Wooden Bench', col: 0, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
        { id: 'bench_stone', name: 'Stone Bench', col: 1, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
      ],
    },
    {
      id: 'Barrels',
      name: 'Barrels',
      file: '../assets/sprites/decorations/barrels.png',
      width: 96,
      height: 64,
      category: 'props',
      spriteName: 'decoration-barrels',
      collisionShapes: [{ type: 'rect', x: 0.1, y: 0.3, w: 0.8, h: 0.6 }],
      pieces: [
        { id: 'barrel_single', name: 'Single Barrel', col: 0, width: 16, height: 32, tileWidth: 1, tileHeight: 2 },
        { id: 'barrel_double', name: 'Double Barrel', col: 1, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
        { id: 'barrel_triple', name: 'Triple Barrel', col: 2, width: 48, height: 32, tileWidth: 3, tileHeight: 2 },
      ],
    },
    {
      id: 'Hay_Bales',
      name: 'Hay Bales',
      file: '../assets/sprites/decorations/Hay_Bales.png',
      width: 48,
      height: 16,
      category: 'props',
      spriteName: 'decoration-hay',
      collisionShapes: [{ type: 'rect', x: 0.1, y: 0.2, w: 0.8, h: 0.7 }],
      pieces: [
        { id: 'hay_single', name: 'Single Hay', col: 0, width: 16, height: 16, tileWidth: 1, tileHeight: 1 },
        { id: 'hay_double', name: 'Double Hay', col: 1, width: 16, height: 16, tileWidth: 1, tileHeight: 1 },
        { id: 'hay_triple', name: 'Stacked Hay', col: 2, width: 16, height: 16, tileWidth: 1, tileHeight: 1 },
      ],
    },
    {
      id: 'Scarecrows',
      name: 'Scarecrows',
      file: '../assets/sprites/decorations/Scarecrows.png',
      width: 160,
      height: 32,
      category: 'props',
      spriteName: 'decoration-scarecrows',
      collisionShapes: [{ type: 'rect', x: 0.2, y: 0.5, w: 0.6, h: 0.4 }],
      pieces: [
        { id: 'scarecrow_1', name: 'Scarecrow 1', col: 0, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
        { id: 'scarecrow_2', name: 'Scarecrow 2', col: 1, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
        { id: 'scarecrow_3', name: 'Scarecrow 3', col: 2, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
        { id: 'scarecrow_4', name: 'Scarecrow 4', col: 3, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
        { id: 'scarecrow_5', name: 'Scarecrow 5', col: 4, width: 32, height: 32, tileWidth: 2, tileHeight: 2 },
      ],
    },
  ],

  // Trees - various sizes and types
  trees: [
    {
      id: 'Big_Oak_Tree',
      name: 'Big Oak Tree',
      file: '../assets/sprites/trees/Big_Oak_Tree.png',
      width: 192,
      height: 80,
      category: 'trees',
      spriteName: 'tree-big-oak',
      collisionShapes: [{ type: 'rect', x: 0.35, y: 0.7, w: 0.3, h: 0.25 }],
      pieces: [
        { id: 'oak_big_1', name: 'Big Oak 1', col: 0, width: 96, height: 80, tileWidth: 6, tileHeight: 5 },
        { id: 'oak_big_2', name: 'Big Oak 2', col: 1, width: 96, height: 80, tileWidth: 6, tileHeight: 5 },
      ],
    },
    {
      id: 'Medium_Oak_Tree',
      name: 'Medium Oak Tree',
      file: '../assets/sprites/trees/Medium_Oak_Tree.png',
      width: 96,
      height: 48,
      category: 'trees',
      spriteName: 'tree-medium-oak',
      collisionShapes: [{ type: 'rect', x: 0.35, y: 0.6, w: 0.3, h: 0.3 }],
      pieces: [
        { id: 'oak_med_1', name: 'Medium Oak 1', col: 0, width: 32, height: 48, tileWidth: 2, tileHeight: 3 },
        { id: 'oak_med_2', name: 'Medium Oak 2', col: 1, width: 32, height: 48, tileWidth: 2, tileHeight: 3 },
        { id: 'oak_med_3', name: 'Medium Oak 3', col: 2, width: 32, height: 48, tileWidth: 2, tileHeight: 3 },
      ],
    },
    {
      id: 'Small_Oak_Tree',
      name: 'Small Oak Tree',
      file: '../assets/sprites/trees/Small_Oak_Tree.png',
      width: 96,
      height: 64,
      category: 'trees',
      spriteName: 'tree-small-oak',
      collisionShapes: [{ type: 'rect', x: 0.3, y: 0.6, w: 0.4, h: 0.3 }],
      pieces: [
        { id: 'oak_small_1', name: 'Small Oak 1', col: 0, width: 32, height: 64, tileWidth: 2, tileHeight: 4 },
        { id: 'oak_small_2', name: 'Small Oak 2', col: 1, width: 32, height: 64, tileWidth: 2, tileHeight: 4 },
        { id: 'oak_small_3', name: 'Small Oak 3', col: 2, width: 32, height: 64, tileWidth: 2, tileHeight: 4 },
      ],
    },
    {
      id: 'Big_Fruit_Tree',
      name: 'Big Fruit Tree',
      file: '../assets/sprites/trees/Big_Fruit_Tree.png',
      width: 96,
      height: 64,
      category: 'trees',
      spriteName: 'tree-big-fruit',
      collisionShapes: [{ type: 'rect', x: 0.35, y: 0.65, w: 0.3, h: 0.3 }],
      pieces: [
        { id: 'fruit_1', name: 'Apple Tree', col: 0, width: 48, height: 64, tileWidth: 3, tileHeight: 4 },
        { id: 'fruit_2', name: 'Orange Tree', col: 1, width: 48, height: 64, tileWidth: 3, tileHeight: 4 },
      ],
    },
    {
      id: 'Small_Spruce_Tree',
      name: 'Small Spruce Tree',
      file: '../assets/sprites/trees/Small_Spruce_Tree.png',
      width: 96,
      height: 64,
      category: 'trees',
      spriteName: 'tree-small-spruce',
      collisionShapes: [{ type: 'rect', x: 0.35, y: 0.7, w: 0.3, h: 0.25 }],
      pieces: [
        { id: 'spruce_1', name: 'Spruce 1', col: 0, width: 32, height: 64, tileWidth: 2, tileHeight: 4 },
        { id: 'spruce_2', name: 'Spruce 2', col: 1, width: 32, height: 64, tileWidth: 2, tileHeight: 4 },
        { id: 'spruce_3', name: 'Spruce 3', col: 2, width: 32, height: 64, tileWidth: 2, tileHeight: 4 },
      ],
    },
  ],

  // NPCs (for future use)
  npcs: [],

  // Items (for future use)
  items: [],

  // Spawn points and triggers (editor-only icons)
  meta: [
    {
      id: 'spawn_player',
      name: 'Player Spawn',
      icon: 'S',
      color: '#00ff00',
      tileWidth: 1,
      tileHeight: 1,
      category: 'spawns',
    },
    {
      id: 'trigger_zone',
      name: 'Trigger Zone',
      icon: 'T',
      color: '#ff00ff',
      tileWidth: 1,
      tileHeight: 1,
      category: 'triggers',
    },
  ],
};

// Category labels for UI
export const CATEGORIES = {
  buildings: {
    houses: 'Houses',
    commercial: 'Commercial',
    farm: 'Farm Buildings',
  },
  decorations: {
    props: 'Props & Scenery',
  },
  trees: {
    trees: 'Trees',
  },
  npcs: {
    villagers: 'Villagers',
    merchants: 'Merchants',
  },
  meta: {
    spawns: 'Spawn Points',
    triggers: 'Triggers',
  },
};

// Get all assets of a specific type
export function getAssetsByType(type) {
  return ASSET_LIBRARY[type] || [];
}

// Get asset by ID
export function getAssetById(type, id) {
  const assets = ASSET_LIBRARY[type] || [];
  return assets.find(a => a.id === id);
}

// Get assets by category
export function getAssetsByCategory(type, category) {
  const assets = ASSET_LIBRARY[type] || [];
  return assets.filter(a => a.category === category);
}

// Get unique categories for a type
export function getCategoriesForType(type) {
  const assets = ASSET_LIBRARY[type] || [];
  const cats = [...new Set(assets.map(a => a.category))];
  return cats.map(c => ({
    id: c,
    label: CATEGORIES[type]?.[c] || c,
  }));
}
