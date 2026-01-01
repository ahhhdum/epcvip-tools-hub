/**
 * EPCVIP Tools Hub - Main Entry Point
 *
 * Uses KaPlay (the maintained fork of Kaboom.js)
 */

import kaplay from 'https://unpkg.com/kaplay@3001/dist/kaplay.mjs';
import { GAME_CONFIG, COLORS } from './config.js';
import { loadingScene } from './scenes/loading.js';
import { overworldScene } from './scenes/overworld.js';
import { pauseScene } from './scenes/pause.js';
import { spriteTestScene } from './scenes/sprite-test.js';
import { initInput } from './systems/input.js';

// Initialize KaPlay
const k = kaplay({
  canvas: document.getElementById('gameCanvas'),
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  stretch: false, // 1:1 size - CSS matches internal resolution
  letterbox: false,
  crisp: true,
  pixelDensity: 1,
  background: COLORS.grass,
  debug: true, // Press F1 to toggle hitbox visualization
  global: true, // Makes kaplay functions global
});

// Register scenes
scene('loading', loadingScene);
scene('overworld', overworldScene);
scene('pause', pauseScene);
scene('sprite-test', spriteTestScene);

// Initialize virtual button inputs (D-pad, A, B)
initInput();

// Start with loading scene
go('loading');
