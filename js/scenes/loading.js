/**
 * Loading Scene
 *
 * Shows a loading screen with progress bar while assets load,
 * then transitions to overworld.
 */

import { GAME_CONFIG, COLORS } from '../config.js';
import { loadSounds } from '../systems/audio.js';

export function loadingScene() {
  // Load sound effects
  loadSounds();
  // Background
  add([
    rect(width(), height()),
    pos(0, 0),
    color(...COLORS.grass),
  ]);

  // Title with decorations
  add([
    text('INNOVATION LAB', { size: 24 }),
    pos(width() / 2, 100),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  // Decorative stars
  add([
    text('*', { size: 20 }),
    pos(width() / 2 - 110, 100),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  add([
    text('*', { size: 20 }),
    pos(width() / 2 + 110, 100),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  // Progress bar background
  add([
    rect(300, 24),
    pos(90, 200),
    color(26, 26, 26),
    outline(2, rgb(...COLORS.gold)),
  ]);

  // Progress bar fill (starts at 0 width)
  const barFill = add([
    rect(1, 20),
    pos(92, 202),
    color(...COLORS.gold),
  ]);

  // Percentage text
  const percentText = add([
    text('0%', { size: 16 }),
    pos(width() / 2, 240),
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
    text(messages[0], { size: 12 }),
    pos(width() / 2, 290),
    anchor('center'),
    color(...COLORS.white),
  ]);

  // Animated progress
  let progress = 0;

  onUpdate(() => {
    progress += dt() * 50; // Takes ~2 seconds to complete

    if (progress >= 100) {
      go('overworld');
      return;
    }

    // Update progress bar width (296 = 300 - 4 for padding)
    barFill.width = Math.max(1, (progress / 100) * 296);

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
