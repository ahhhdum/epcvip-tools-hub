/**
 * Loading Scene
 *
 * Shows a loading screen with progress bar while assets load,
 * then transitions to overworld.
 */

import { GAME_CONFIG, COLORS, CHARACTERS } from '../config.js';
import { loadSounds } from '../systems/audio.js';
import { getLoadingLayout } from '../systems/ui-layout.js';

// Standard animation config (same for all characters - first 6 rows)
const ANIM_CONFIG = {
  'idle-down':  { from: 0, to: 5, loop: true, speed: 6 },
  'idle-right': { from: 6, to: 11, loop: true, speed: 6 },
  'idle-up':    { from: 12, to: 17, loop: true, speed: 6 },
  'walk-down':  { from: 18, to: 23, loop: true, speed: 10 },
  'walk-right': { from: 24, to: 29, loop: true, speed: 10 },
  'walk-up':    { from: 30, to: 35, loop: true, speed: 10 },
};

export function loadingScene() {
  // Load sound effects
  loadSounds();

  // Load all character sprites
  CHARACTERS.forEach(char => {
    loadSprite(char.id, `assets/sprites/${char.id}.png`, {
      sliceX: char.cols,
      sliceY: char.rows,
      anims: ANIM_CONFIG,
    });
  });

  // Load building sprites
  loadSprite('building-house-1', 'assets/sprites/buildings/House_1_Stone_Base_Red.png');
  loadSprite('building-house-2', 'assets/sprites/buildings/House_2_Stone_Base_Blue.png');
  loadSprite('building-house-3', 'assets/sprites/buildings/House_3_Stone_Base_Black.png');

  // Get responsive layout
  const layout = getLoadingLayout();
  const S = layout.scale;

  // Background - full viewport
  add([
    rect(width(), height()),
    pos(0, 0),
    color(...COLORS.grass),
  ]);

  // Title - centered using layout
  add([
    text('INNOVATION LAB', { size: layout.title.size }),
    pos(layout.title.x, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  // Decorative stars - relative to title
  add([
    text('*', { size: layout.starSize }),
    pos(layout.title.x - layout.starOffset, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  add([
    text('*', { size: layout.starSize }),
    pos(layout.title.x + layout.starOffset, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  // Progress bar background - centered using layout
  add([
    rect(layout.bar.width, layout.bar.height),
    pos(layout.bar.x, layout.bar.y),
    color(26, 26, 26),
    outline(2 * S, rgb(...COLORS.gold)),
  ]);

  // Progress bar fill (starts at 0 width)
  const barPadding = 2 * S;
  const barFill = add([
    rect(1, layout.bar.height - barPadding * 2),
    pos(layout.bar.x + barPadding, layout.bar.y + barPadding),
    color(...COLORS.gold),
  ]);

  // Percentage text - below bar
  const percentText = add([
    text('0%', { size: layout.percent.size }),
    pos(layout.percent.x, layout.percent.y),
    anchor('center'),
    color(...COLORS.white),
  ]);

  // Fun loading messages
  const messages = [
    "Warming up the pixels...",
    "Polishing the buildings...",
    "Watering the flowers...",
    "Training the player...",
    "Almost there...",
  ];

  const msgText = add([
    text(messages[0], { size: layout.message.size }),
    pos(layout.message.x, layout.message.y),
    anchor('center'),
    color(...COLORS.white),
  ]);

  // Animated progress
  let progress = 0;
  const fillMaxWidth = layout.bar.width - barPadding * 2;

  onUpdate(() => {
    progress += dt() * 50; // Takes ~2 seconds to complete

    if (progress >= 100) {
      go('overworld');
      return;
    }

    // Update progress bar width
    barFill.width = Math.max(1, (progress / 100) * fillMaxWidth);

    // Update percentage
    percentText.text = Math.floor(progress) + '%';

    // Update message based on progress
    const msgIndex = Math.min(
      Math.floor(progress / 20),
      messages.length - 1
    );
    msgText.text = messages[msgIndex];
  });
}
