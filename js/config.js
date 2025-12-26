/**
 * EPCVIP Tools Hub - Configuration
 *
 * Add new tools by adding to the TOOLS array.
 * Buildings auto-generate from this config.
 */

export const GAME_CONFIG = {
  width: 480,
  height: 432,
  tileSize: 24,
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
    position: { x: 1, y: 2 },
    color: [72, 168, 104],
    live: true,
  },
  {
    id: 'athena',
    name: 'Athena Monitor',
    description: 'Monitor AWS Athena query usage, costs, and performance.',
    url: 'https://athena-usage-monitor-production.up.railway.app',
    position: { x: 7, y: 2 },
    color: [88, 120, 168],
    live: true,
  },
  {
    id: 'validator',
    name: 'Datalake Validator',
    description: 'Validate SQL queries against the datalake schema.',
    url: 'https://streamlit-validator-production.up.railway.app',
    position: { x: 13, y: 2 },
    color: [240, 192, 0],
    live: true,
  },
  {
    id: 'tool4',
    name: 'Campaign Analyzer',
    description: 'Analyze campaign performance across channels.',
    url: null,
    position: { x: 2, y: 9 },
    color: [128, 128, 128],
    live: false,
  },
  {
    id: 'tool5',
    name: 'Fraud Dashboard',
    description: 'Monitor and analyze fraud patterns.',
    url: null,
    position: { x: 13, y: 9 },
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

// Decoration positions (trees)
export const TREES = [
  { x: 0, y: 7 },
  { x: 19, y: 7 },
  { x: 0, y: 14 },
  { x: 19, y: 14 },
  { x: 8, y: 9 },
  { x: 11, y: 9 },
  { x: 8, y: 12 },
  { x: 11, y: 12 },
];
