/**
 * EPCVIP Tools Hub - Configuration
 *
 * Add new tools by adding to the TOOLS array.
 * Buildings auto-generate from this config.
 */

export const GAME_CONFIG = {
  // Viewport dimensions (visible area)
  width: 480,
  height: 432,
  tileSize: 24,

  // World dimensions (scrollable area)
  worldWidth: 960,   // 40 tiles wide
  worldHeight: 864,  // 36 tiles tall

  playerSpeed: 120,
  dialogHeight: 70,
};

export const COLORS = {
  grass: [88, 160, 40],
  grassDark: [64, 128, 32],
  path: [216, 176, 96],
  gold: [240, 192, 0],
  dark: [26, 26, 26],
  white: [255, 255, 255],
};

export const TOOLS = [
  {
    id: 'ping-tree',
    name: 'Ping Tree Compare',
    description: 'Compare ping tree configurations to identify campaign differences.',
    url: 'https://ping-tree-compare-production.up.railway.app',
    position: { x: 3, y: 3 },
    color: [72, 168, 104],
    live: true,
  },
  {
    id: 'athena',
    name: 'Athena Monitor',
    description: 'Monitor AWS Athena query usage, costs, and performance.',
    url: 'https://athena-usage-monitor-production.up.railway.app',
    position: { x: 17, y: 3 },
    color: [88, 120, 168],
    live: true,
  },
  {
    id: 'validator',
    name: 'Datalake Validator',
    description: 'Validate SQL queries against the datalake schema.',
    url: 'https://streamlit-validator-production.up.railway.app',
    position: { x: 31, y: 3 },
    color: [240, 192, 0],
    live: true,
  },
  {
    id: 'tool4',
    name: 'Campaign Analyzer',
    description: 'Analyze campaign performance across channels.',
    url: null,
    position: { x: 7, y: 17 },
    color: [128, 128, 128],
    live: false,
  },
  {
    id: 'tool5',
    name: 'Fraud Dashboard',
    description: 'Monitor and analyze fraud patterns.',
    url: null,
    position: { x: 25, y: 17 },
    color: [128, 128, 128],
    live: false,
  },
];

// Future: NPC definitions
export const NPCS = [
  // {
  //   id: 'guide',
  //   name: 'Lab Guide',
  //   sprite: 'npc-guide',
  //   position: { x: 10, y: 10 },
  //   dialog: [
  //     'Welcome to the Innovation Lab!',
  //     'Walk up to a building and press ENTER to open a tool.',
  //     'New tools are added regularly. Check back often!'
  //   ]
  // }
];

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
