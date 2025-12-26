/**
 * Pause Scene
 *
 * Shows game controls, quick links to tools, and resume option.
 * Triggered by ESC or B button.
 */

import { GAME_CONFIG, COLORS, TOOLS } from '../config.js';

export function pauseScene() {
  // Semi-transparent dark overlay
  add([
    rect(width(), height()),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0.85),
    fixed(),
  ]);

  // Decorative border
  add([
    rect(width() - 40, height() - 40),
    pos(20, 20),
    color(0, 0, 0),
    outline(3, rgb(...COLORS.gold)),
    fixed(),
  ]);

  // Title
  add([
    text('PAUSED', { size: 28 }),
    pos(width() / 2, 55),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Decorative lines around title
  add([
    rect(80, 2),
    pos(width() / 2 - 120, 55),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);
  add([
    rect(80, 2),
    pos(width() / 2 + 120, 55),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Controls section
  add([
    text('Controls', { size: 16 }),
    pos(60, 100),
    color(...COLORS.gold),
    fixed(),
  ]);

  const controls = [
    ['Arrow Keys / WASD', 'Move'],
    ['Enter / A', 'Interact with buildings'],
    ['ESC / B', 'Pause / Resume'],
    ['Click building', 'Quick open tool'],
  ];

  controls.forEach(([key, action], i) => {
    add([
      text(key, { size: 11 }),
      pos(70, 125 + i * 22),
      color(...COLORS.white),
      fixed(),
    ]);
    add([
      text('- ' + action, { size: 11 }),
      pos(220, 125 + i * 22),
      color(180, 180, 180),
      fixed(),
    ]);
  });

  // Resume button
  const resumeBtn = add([
    rect(140, 35),
    pos(width() / 2, 230),
    anchor('center'),
    color(...COLORS.gold),
    area(),
    fixed(),
    'resume-btn',
  ]);

  add([
    text('RESUME', { size: 16 }),
    pos(width() / 2, 230),
    anchor('center'),
    color(...COLORS.dark),
    fixed(),
  ]);

  // Quick Links section
  add([
    text('Quick Links (press number)', { size: 14 }),
    pos(60, 280),
    color(...COLORS.gold),
    fixed(),
  ]);

  const liveTools = TOOLS.filter(t => t.live);
  liveTools.forEach((tool, i) => {
    add([
      text(`${i + 1}.`, { size: 12 }),
      pos(70, 305 + i * 24),
      color(...COLORS.gold),
      fixed(),
    ]);
    add([
      text(tool.name, { size: 12 }),
      pos(95, 305 + i * 24),
      color(...COLORS.white),
      fixed(),
    ]);
  });

  // Footer hint
  add([
    text('Press ESC or B to resume', { size: 10 }),
    pos(width() / 2, height() - 45),
    anchor('center'),
    color(120, 120, 120),
    fixed(),
  ]);

  // Resume handlers
  onKeyPress('escape', () => go('overworld'));
  onKeyPress('b', () => go('overworld'));
  resumeBtn.onClick(() => go('overworld'));

  // Number keys for quick links
  liveTools.forEach((tool, i) => {
    onKeyPress(`${i + 1}`, () => {
      if (tool.url) {
        window.open(tool.url, '_blank');
      }
    });
  });
}
