/**
 * Pause Scene
 *
 * Shows game controls, quick links to tools, and resume option.
 * Triggered by ESC key.
 */

import { GAME_CONFIG, COLORS, TOOLS } from '../config.js';
import { isMuted, toggleMute } from '../systems/audio.js';

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
    pos(60, 95),
    color(...COLORS.gold),
    fixed(),
  ]);

  const controls = [
    ['Arrow Keys / WASD', 'Move'],
    ['Enter / A', 'Interact'],
    ['Space / B', 'Throw'],
    ['M', 'Toggle sound'],
    ['T', 'Sprite Test (dev)'],
    ['ESC', 'Resume'],
  ];

  controls.forEach(([key, action], i) => {
    add([
      text(key, { size: 10 }),
      pos(70, 118 + i * 20),
      color(...COLORS.white),
      fixed(),
    ]);
    add([
      text('- ' + action, { size: 10 }),
      pos(195, 118 + i * 20),
      color(180, 180, 180),
      fixed(),
    ]);
  });

  // Quick Links section
  add([
    text('Quick Links (press number)', { size: 14 }),
    pos(60, 230),
    color(...COLORS.gold),
    fixed(),
  ]);

  const liveTools = TOOLS.filter(t => t.live);
  liveTools.forEach((tool, i) => {
    add([
      text(`${i + 1}.`, { size: 11 }),
      pos(70, 255 + i * 22),
      color(...COLORS.gold),
      fixed(),
    ]);
    add([
      text(tool.name, { size: 11 }),
      pos(95, 255 + i * 22),
      color(...COLORS.white),
      fixed(),
    ]);
  });

  // Bottom buttons - Resume and Sound side by side
  const btnY = height() - 70;

  // Resume button
  const resumeBtn = add([
    rect(110, 32),
    pos(width() / 2 - 60, btnY),
    anchor('center'),
    color(...COLORS.gold),
    area(),
    fixed(),
    'resume-btn',
  ]);

  add([
    text('RESUME', { size: 14 }),
    pos(width() / 2 - 60, btnY),
    anchor('center'),
    color(...COLORS.dark),
    fixed(),
  ]);

  // Sound toggle button
  const soundBtn = add([
    rect(90, 32),
    pos(width() / 2 + 60, btnY),
    anchor('center'),
    color(40, 40, 40),
    outline(2, rgb(...COLORS.gold)),
    area(),
    fixed(),
    'sound-btn',
  ]);

  const soundText = add([
    text(isMuted() ? 'Sound: OFF' : 'Sound: ON', { size: 11 }),
    pos(width() / 2 + 60, btnY),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
    'sound-text',
  ]);

  soundBtn.onClick(() => {
    const nowMuted = toggleMute();
    soundText.text = nowMuted ? 'Sound: OFF' : 'Sound: ON';
  });

  // M key to toggle mute
  onKeyPress('m', () => {
    const nowMuted = toggleMute();
    soundText.text = nowMuted ? 'Sound: OFF' : 'Sound: ON';
  });

  // Resume handlers
  onKeyPress('escape', () => go('overworld'));
  resumeBtn.onClick(() => go('overworld'));

  // Sprite test (dev mode)
  onKeyPress('t', () => go('sprite-test'));

  // Number keys for quick links
  liveTools.forEach((tool, i) => {
    onKeyPress(`${i + 1}`, () => {
      if (tool.url) {
        window.open(tool.url, '_blank');
      }
    });
  });
}
