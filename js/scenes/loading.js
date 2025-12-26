/**
 * Loading Scene
 *
 * Shows a loading screen while assets load, then transitions to overworld.
 */

import { GAME_CONFIG, COLORS } from '../config.js';

export function loadingScene() {
  // Loading text
  add([
    text('INNOVATION LAB', { size: 24 }),
    pos(width() / 2, height() / 2 - 40),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  add([
    text('Loading...', { size: 16 }),
    pos(width() / 2, height() / 2 + 20),
    anchor('center'),
    color(...COLORS.white),
  ]);

  // Animated dots
  const dots = add([
    text('', { size: 16 }),
    pos(width() / 2 + 50, height() / 2 + 20),
    anchor('center'),
    color(...COLORS.white),
  ]);

  let dotCount = 0;
  loop(0.3, () => {
    dotCount = (dotCount + 1) % 4;
    dots.text = '.'.repeat(dotCount);
  });

  // Transition to overworld after a brief delay
  // (In the future, this is where we'd load sprites)
  wait(1.0, () => {
    go('overworld');
  });
}
