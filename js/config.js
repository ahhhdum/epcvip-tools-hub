/**
 * EPCVIP Tools Hub - Configuration
 *
 * Game configuration constants and legacy building definitions.
 *
 * NOTE: Buildings are now primarily defined via the map editor.
 * Use tools/map-editor.html to place buildings, then save to maps/village.json.
 * The game loads entities from the map, falling back to TOOLS array if empty.
 */

export const GAME_CONFIG = {
  // Viewport dimensions (visible area) - increased for 4K displays
  // Maintains original 25:18 aspect ratio (900/648 = 1.389)
  width: 1200,
  height: 864,
  tileSize: 24,
  uiScale: 1.8,  // Scale factor for UI elements (increased proportionally)

  // World dimensions (scrollable area) - expanded for larger viewport
  worldWidth: 1200,   // 50 tiles wide
  worldHeight: 1080,  // 45 tiles tall

  playerSpeed: 120,
  dialogHeight: 70,

  // Fritelle collectibles
  fritelleCount: 8,        // Number of fritelles to spawn
  fritelleRespawnMin: 3,   // Min seconds before respawn
  fritelleRespawnMax: 8,   // Max seconds before respawn
};

export const COLORS = {
  grass: [88, 160, 40],
  grassDark: [64, 128, 32],
  path: [216, 176, 96],
  gold: [240, 192, 0],
  dark: [26, 26, 26],
  white: [255, 255, 255],
};

// DEPRECATED: Collision shapes have been moved to tools/js/asset-library.js
// These are kept for backward compatibility with the TOOLS array below.
// New buildings should define collision shapes in the asset library.
const COLLISION_SHAPES = {
  // house-1: 96x128 - triangle roof fits well, use compound shape
  house1: [
    { type: 'polygon', points: [[0.5, 0], [0.05, 0.35], [0.95, 0.35]] },  // Roof triangle (inset 5%)
    { type: 'rect', x: 0.10, y: 0.35, w: 0.80, h: 0.50 },                 // Body (inset 10%, shorter)
  ],
  // house-2: 144x128 - triangle doesn't fit, use simple inset rect
  house2: [
    { type: 'rect', x: 0.08, y: 0.25, w: 0.84, h: 0.55 },
  ],
  // house-3: 144x128 - same as house-2
  house3: [
    { type: 'rect', x: 0.08, y: 0.25, w: 0.84, h: 0.55 },
  ],
};

// DEPRECATED: Buildings should now be placed using the map editor and saved to maps/village.json
// The game will load entities from the map JSON if available, falling back to this array.
// To migrate: Place buildings in the map editor, set their properties (name, URL), and save.
// Once the map has entities, this array can be removed.
export const TOOLS = [
  {
    id: 'ping-tree',
    name: 'Ping Tree Compare',
    description: 'Compare ping tree configurations to identify campaign differences.',
    url: 'https://ping-tree-compare-production.up.railway.app',  // Direct link (proxy has no auth issues)
    position: { x: 3, y: 3 },
    color: [72, 168, 104],
    sprite: 'building-house-1',
    spriteWidth: 96,   // Actual sprite dimensions
    spriteHeight: 128,
    collisionShapes: COLLISION_SHAPES.house1,
    live: true,
  },
  {
    id: 'athena',
    name: 'Athena Monitor',
    description: 'Monitor AWS Athena query usage, costs, and performance.',
    url: 'https://epcvip-athena-usage-monitor.up.railway.app',  // Direct link (Streamlit auth breaks proxy)
    position: { x: 17, y: 3 },
    color: [88, 120, 168],
    sprite: 'building-house-2',
    spriteWidth: 144,
    spriteHeight: 128,
    collisionShapes: COLLISION_SHAPES.house2,
    live: true,
  },
  {
    id: 'validator',
    name: 'Datalake Validator',
    description: 'Validate SQL queries against the datalake schema.',
    url: 'https://streamlit-validator-production.up.railway.app',  // Direct link (Streamlit auth breaks proxy)
    position: { x: 31, y: 3 },
    color: [240, 192, 0],
    sprite: 'building-house-3',
    spriteWidth: 144,
    spriteHeight: 128,
    collisionShapes: COLLISION_SHAPES.house3,
    live: true,
  },
  {
    id: 'tool4',
    name: 'Campaign Analyzer',
    description: 'Analyze campaign performance across channels.',
    url: null,
    position: { x: 7, y: 17 },
    color: [128, 128, 128],
    sprite: 'building-house-1',  // Placeholder
    spriteWidth: 96,
    spriteHeight: 128,
    collisionShapes: COLLISION_SHAPES.house1,
    live: false,
  },
  {
    id: 'tool5',
    name: 'Fraud Dashboard',
    description: 'Monitor and analyze fraud patterns.',
    url: null,
    position: { x: 25, y: 17 },
    color: [128, 128, 128],
    sprite: 'building-house-2',  // Placeholder
    spriteWidth: 144,
    spriteHeight: 128,
    collisionShapes: COLLISION_SHAPES.house2,
    live: false,
  },
];

// Playable characters (all use same animation layout for first 6 rows)
export const CHARACTERS = [
  { id: 'Farmer_Bob', name: 'Farmer Bob', role: 'Farmer', cols: 6, rows: 13 },
  { id: 'Farmer_Buba', name: 'Farmer Buba', role: 'Farmer', cols: 6, rows: 13 },
  { id: 'Chef_Chloe', name: 'Chef Chloe', role: 'Chef', cols: 6, rows: 7 },
  { id: 'Bartender_Bruno', name: 'Bruno', role: 'Bartender', cols: 6, rows: 7 },
  { id: 'Bartender_Katy', name: 'Katy', role: 'Bartender', cols: 6, rows: 7 },
  { id: 'Lumberjack_Jack', name: 'Jack', role: 'Lumberjack', cols: 6, rows: 10 },
  { id: 'Miner_Mike', name: 'Miner Mike', role: 'Miner', cols: 6, rows: 10 },
  { id: 'Fisherman_Fin', name: 'Fin', role: 'Fisherman', cols: 9, rows: 13 },
];

// Get selected character from localStorage (or default)
export function getSelectedCharacter() {
  const saved = localStorage.getItem('selectedCharacter');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      const char = CHARACTERS.find(c => c.id === data.id);
      if (char) return char;
    } catch (e) {}
  }
  return CHARACTERS[0]; // Default to Farmer Bob
}

// Save selected character to localStorage
export function setSelectedCharacter(char) {
  localStorage.setItem('selectedCharacter', JSON.stringify({
    id: char.id,
    name: char.name,
    role: char.role,
  }));
}

// Future: NPC definitions
export const NPCS = [];

// Decoration positions (trees) - expanded for larger map
export const TREES = [
  // Left edge
  { x: 0, y: 10 },
  { x: 0, y: 15 },
  { x: 0, y: 20 },
  { x: 0, y: 25 },
  { x: 0, y: 30 },

  // Right edge
  { x: 39, y: 10 },
  { x: 39, y: 15 },
  { x: 39, y: 20 },
  { x: 39, y: 25 },
  { x: 39, y: 30 },

  // Top area (between buildings)
  { x: 10, y: 3 },
  { x: 24, y: 3 },

  // Center area
  { x: 15, y: 12 },
  { x: 20, y: 12 },
  { x: 25, y: 12 },

  // Bottom area
  { x: 10, y: 25 },
  { x: 15, y: 28 },
  { x: 20, y: 25 },
  { x: 25, y: 28 },
  { x: 30, y: 25 },
];

// Flower positions - expanded for larger map
export const FLOWERS = [
  // Near top buildings
  { x: 2, y: 8 },
  { x: 8, y: 8 },
  { x: 16, y: 8 },
  { x: 22, y: 8 },
  { x: 30, y: 8 },
  { x: 36, y: 8 },

  // Middle area
  { x: 5, y: 15 },
  { x: 12, y: 15 },
  { x: 28, y: 15 },
  { x: 35, y: 15 },

  // Near bottom buildings
  { x: 6, y: 22 },
  { x: 14, y: 22 },
  { x: 24, y: 22 },
  { x: 32, y: 22 },

  // Bottom area
  { x: 8, y: 30 },
  { x: 16, y: 32 },
  { x: 24, y: 30 },
  { x: 32, y: 32 },
];
