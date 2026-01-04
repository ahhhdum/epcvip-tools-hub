/**
 * Sprite Test Scene
 *
 * Visual reference for sprite sheet frames.
 * Shows all 78 frames (6 cols × 13 rows) with frame numbers.
 * Use arrow keys to scroll, ESC to return to game.
 */

import { COLORS } from '../config.js';

export function spriteTestScene() {
  const COLS = 6;
  const ROWS = 13;
  const FRAME_SIZE = 64;
  const PADDING = 8;
  const CELL_SIZE = FRAME_SIZE + PADDING;

  // Calculate total grid size
  const _gridWidth = COLS * CELL_SIZE; // Reserved for horizontal scroll
  const gridHeight = ROWS * CELL_SIZE;

  // Scroll offset for viewing all frames
  let scrollY = 0;
  const maxScrollY = Math.max(0, gridHeight - height() + 100);

  // Dark background
  add([rect(width(), height()), pos(0, 0), color(20, 20, 30), fixed()]);

  // Title
  add([
    text('SPRITE FRAME REFERENCE', { size: 20 }),
    pos(width() / 2, 20),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Instructions
  add([
    text('Arrow keys to scroll | ESC to return | Click frame to copy number', { size: 10 }),
    pos(width() / 2, 45),
    anchor('center'),
    color(180, 180, 180),
    fixed(),
  ]);

  // Row labels on the side
  const rowLabels = [
    'Row 0: idle-???',
    'Row 1: idle-UP (back)',
    'Row 2: idle-???',
    'Row 3: idle-???',
    'Row 4: walk-???',
    'Row 5: walk-UP (back)',
    'Row 6: walk-??? (4 frames)',
    'Row 7: TOOLS?',
    'Row 8: TOOLS?',
    'Row 9: TOOLS?',
    'Row 10: TOOLS?',
    'Row 11: TOOLS?',
    'Row 12: TOOLS?',
  ];

  // Container for scrollable content
  const container = add([pos(60, 70)]);

  // Create frame displays
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const frameNum = row * COLS + col;
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;

      // Frame background
      container.add([
        rect(FRAME_SIZE + 4, FRAME_SIZE + 4),
        pos(x - 2, y - 2),
        color(40, 40, 50),
        outline(1, rgb(60, 60, 70)),
        'frame-bg',
        { frameNum },
      ]);

      // The sprite frame itself
      container.add([
        sprite('player', { frame: frameNum }),
        pos(x, y),
        'frame-sprite',
        { frameNum },
      ]);

      // Frame number label
      container.add([
        text(String(frameNum), { size: 10 }),
        pos(x + FRAME_SIZE / 2, y + FRAME_SIZE + 2),
        anchor('top'),
        color(200, 200, 200),
        'frame-label',
      ]);
    }

    // Row label
    container.add([
      text(rowLabels[row] || `Row ${row}`, { size: 9 }),
      pos(COLS * CELL_SIZE + 10, row * CELL_SIZE + FRAME_SIZE / 2),
      anchor('left'),
      color(150, 150, 150),
    ]);
  }

  // Scroll controls
  onKeyDown('up', () => {
    scrollY = Math.max(0, scrollY - 10);
  });

  onKeyDown('down', () => {
    scrollY = Math.min(maxScrollY, scrollY + 10);
  });

  onKeyDown('pageup', () => {
    scrollY = Math.max(0, scrollY - 100);
  });

  onKeyDown('pagedown', () => {
    scrollY = Math.min(maxScrollY, scrollY + 100);
  });

  // Update scroll position
  onUpdate(() => {
    container.pos.y = 70 - scrollY;
  });

  // Mouse wheel scroll
  onScroll((delta) => {
    scrollY = clamp(scrollY + delta.y * 20, 0, maxScrollY);
  });

  // Click to highlight/select frame
  let selectedFrame = null;
  const selectionBox = add([
    rect(FRAME_SIZE + 8, FRAME_SIZE + 8),
    pos(-100, -100),
    color(0, 0, 0),
    opacity(0),
    outline(3, rgb(...COLORS.gold)),
    fixed(),
    'selection',
  ]);

  onClick('frame-bg', (obj) => {
    selectedFrame = obj.frameNum;
    // Show selection indicator
    const worldPos = obj.pos.add(container.pos);
    selectionBox.pos = vec2(worldPos.x - 4, worldPos.y - 4 + 70);
    selectionBox.opacity = 1;

    // Log to console for reference
    debug.log(`Frame ${selectedFrame} selected`);
  });

  // Selected frame info display
  const infoText = add([
    text('Click a frame to select', { size: 12 }),
    pos(width() / 2, height() - 30),
    anchor('center'),
    color(...COLORS.white),
    fixed(),
  ]);

  onUpdate(() => {
    if (selectedFrame !== null) {
      const row = Math.floor(selectedFrame / COLS);
      const col = selectedFrame % COLS;
      infoText.text = `Selected: Frame ${selectedFrame} (Row ${row}, Col ${col})`;
    }
  });

  // Return to game
  onKeyPress('escape', () => go('overworld'));

  // Quick row jump (number keys)
  for (let i = 0; i <= 9; i++) {
    onKeyPress(String(i), () => {
      scrollY = clamp(i * CELL_SIZE * 1.3, 0, maxScrollY);
    });
  }
}
