/**
 * EPCVIP Tools Hub - Main Entry Point
 *
 * Uses KaPlay (the maintained fork of Kaboom.js)
 */

import kaplay from 'https://unpkg.com/kaplay@3001/dist/kaplay.mjs';
import { GAME_CONFIG, COLORS } from './config.js';
import { loadingScene } from './scenes/loading.js';
import { overworldScene } from './scenes/overworld.js';
import { initInput } from './systems/input.js';

// Initialize KaPlay
const k = kaplay({
  canvas: document.getElementById('gameCanvas'),
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  crisp: true,
  pixelDensity: 1,
  background: COLORS.grass,
  debug: false,
  global: true, // Makes kaplay functions global
});

// Register scenes
scene('loading', loadingScene);
scene('overworld', overworldScene);

// Initialize virtual button inputs (D-pad, A, B)
initInput();

// Start with loading scene
go('loading');
