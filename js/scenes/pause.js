/**
 * Pause Scene
 *
 * Shows game controls, quick links to tools, character selection, and resume option.
 * Triggered by ESC key.
 */

import { GAME_CONFIG, COLORS, TOOLS, CHARACTERS, getSelectedCharacter, setSelectedCharacter } from '../config.js';
import { isMuted, toggleMute } from '../systems/audio.js';

export function pauseScene() {
  let isSelectingCharacter = false;
  let selectedCharIndex = CHARACTERS.findIndex(c => c.id === getSelectedCharacter().id);
  let animFrame = 0;

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
    pos(width() / 2, 50),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Decorative lines around title
  add([
    rect(80, 2),
    pos(width() / 2 - 120, 50),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);
  add([
    rect(80, 2),
    pos(width() / 2 + 120, 50),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // === LEFT COLUMN: Controls ===
  add([
    text('Controls', { size: 14 }),
    pos(50, 85),
    color(...COLORS.gold),
    fixed(),
  ]);

  const controls = [
    ['Arrows / WASD', 'Move'],
    ['Enter', 'Interact'],
    ['Space', 'Throw'],
    ['M', 'Sound'],
    ['ESC', 'Resume'],
  ];

  controls.forEach(([key, action], i) => {
    add([
      text(key, { size: 9 }),
      pos(55, 105 + i * 18),
      color(...COLORS.white),
      fixed(),
    ]);
    add([
      text('- ' + action, { size: 9 }),
      pos(155, 105 + i * 18),
      color(150, 150, 150),
      fixed(),
    ]);
  });

  // Quick Links section
  add([
    text('Links (press #)', { size: 12 }),
    pos(50, 200),
    color(...COLORS.gold),
    fixed(),
  ]);

  const liveTools = TOOLS.filter(t => t.live);
  liveTools.forEach((tool, i) => {
    add([
      text(`${i + 1}. ${tool.name}`, { size: 9 }),
      pos(55, 220 + i * 16),
      color(...COLORS.white),
      fixed(),
    ]);
  });

  // === RIGHT COLUMN: Character ===
  add([
    text('Character', { size: 14 }),
    pos(300, 85),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Character preview background
  add([
    rect(140, 100),
    pos(300, 105),
    color(20, 20, 20),
    outline(2, rgb(...COLORS.gold)),
    fixed(),
  ]);

  // Character sprite preview (animated)
  const currentChar = getSelectedCharacter();
  const charPreview = add([
    sprite(currentChar.id, { anim: 'idle-down' }),
    pos(340, 135),
    anchor('center'),
    scale(1.2),
    fixed(),
    'char-preview',
  ]);

  // Character name
  const charNameText = add([
    text(currentChar.name, { size: 11 }),
    pos(370, 175),
    anchor('center'),
    color(...COLORS.white),
    fixed(),
    'char-name',
  ]);

  // Character role
  const charRoleText = add([
    text(currentChar.role, { size: 9 }),
    pos(370, 190),
    anchor('center'),
    color(150, 150, 150),
    fixed(),
    'char-role',
  ]);

  // Change button
  const changeBtn = add([
    rect(80, 24),
    pos(370, 220),
    anchor('center'),
    color(40, 40, 40),
    outline(2, rgb(...COLORS.gold)),
    area(),
    fixed(),
    'change-btn',
  ]);

  add([
    text('Change', { size: 10 }),
    pos(370, 220),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // === BOTTOM BUTTONS ===
  const btnY = height() - 55;

  // Resume button
  const resumeBtn = add([
    rect(100, 28),
    pos(width() / 2 - 55, btnY),
    anchor('center'),
    color(...COLORS.gold),
    area(),
    fixed(),
    'resume-btn',
  ]);

  add([
    text('RESUME', { size: 12 }),
    pos(width() / 2 - 55, btnY),
    anchor('center'),
    color(...COLORS.dark),
    fixed(),
  ]);

  // Sound toggle button
  const soundBtn = add([
    rect(80, 28),
    pos(width() / 2 + 55, btnY),
    anchor('center'),
    color(40, 40, 40),
    outline(2, rgb(...COLORS.gold)),
    area(),
    fixed(),
    'sound-btn',
  ]);

  const soundText = add([
    text(isMuted() ? 'Sound: OFF' : 'Sound: ON', { size: 10 }),
    pos(width() / 2 + 55, btnY),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
    'sound-text',
  ]);

  // === CHARACTER SELECTION MODAL ===
  const modalObjects = [];

  function showCharacterSelect() {
    isSelectingCharacter = true;

    // Modal background
    modalObjects.push(add([
      rect(width(), height()),
      pos(0, 0),
      color(0, 0, 0),
      opacity(0.95),
      fixed(),
      z(100),
    ]));

    // Modal title
    modalObjects.push(add([
      text('SELECT CHARACTER', { size: 18 }),
      pos(width() / 2, 50),
      anchor('center'),
      color(...COLORS.gold),
      fixed(),
      z(101),
    ]));

    // Character grid (4x2)
    const gridStartX = 60;
    const gridStartY = 90;
    const cardW = 90;
    const cardH = 110;
    const gap = 10;

    CHARACTERS.forEach((char, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = gridStartX + col * (cardW + gap);
      const y = gridStartY + row * (cardH + gap);

      // Card background
      const isSelected = i === selectedCharIndex;
      const card = add([
        rect(cardW, cardH),
        pos(x, y),
        color(isSelected ? 40 : 20, isSelected ? 35 : 20, isSelected ? 20 : 20),
        outline(2, isSelected ? rgb(...COLORS.gold) : rgb(60, 60, 60)),
        area(),
        fixed(),
        z(101),
        { charIndex: i },
        'char-card',
      ]);
      modalObjects.push(card);

      // Character sprite
      const charSprite = add([
        sprite(char.id, { anim: 'idle-down' }),
        pos(x + cardW / 2, y + 40),
        anchor('center'),
        scale(0.9),
        fixed(),
        z(102),
        'char-sprite',
      ]);
      modalObjects.push(charSprite);

      // Character name
      modalObjects.push(add([
        text(char.name, { size: 8 }),
        pos(x + cardW / 2, y + 80),
        anchor('center'),
        color(...COLORS.white),
        fixed(),
        z(102),
      ]));

      // Character role
      modalObjects.push(add([
        text(char.role, { size: 7 }),
        pos(x + cardW / 2, y + 93),
        anchor('center'),
        color(120, 120, 120),
        fixed(),
        z(102),
      ]));

      // Click handler
      card.onClick(() => {
        selectedCharIndex = i;
        updateCardSelection();
      });
    });

    // Confirm button
    const confirmBtn = add([
      rect(90, 30),
      pos(width() / 2 - 55, height() - 50),
      anchor('center'),
      color(...COLORS.gold),
      area(),
      fixed(),
      z(101),
      'confirm-btn',
    ]);
    modalObjects.push(confirmBtn);

    modalObjects.push(add([
      text('Confirm', { size: 11 }),
      pos(width() / 2 - 55, height() - 50),
      anchor('center'),
      color(...COLORS.dark),
      fixed(),
      z(102),
    ]));

    // Cancel button
    const cancelBtn = add([
      rect(70, 30),
      pos(width() / 2 + 50, height() - 50),
      anchor('center'),
      color(40, 40, 40),
      outline(2, rgb(100, 100, 100)),
      area(),
      fixed(),
      z(101),
      'cancel-btn',
    ]);
    modalObjects.push(cancelBtn);

    modalObjects.push(add([
      text('Cancel', { size: 11 }),
      pos(width() / 2 + 50, height() - 50),
      anchor('center'),
      color(150, 150, 150),
      fixed(),
      z(102),
    ]));

    confirmBtn.onClick(() => {
      const char = CHARACTERS[selectedCharIndex];
      setSelectedCharacter(char);
      hideCharacterSelect();
      updateMainPreview(char);
    });

    cancelBtn.onClick(() => {
      selectedCharIndex = CHARACTERS.findIndex(c => c.id === getSelectedCharacter().id);
      hideCharacterSelect();
    });
  }

  function hideCharacterSelect() {
    isSelectingCharacter = false;
    modalObjects.forEach(obj => destroy(obj));
    modalObjects.length = 0;
  }

  function updateCardSelection() {
    get('char-card').forEach(card => {
      const isSelected = card.charIndex === selectedCharIndex;
      card.color = isSelected ? rgb(40, 35, 20) : rgb(20, 20, 20);
      card.outline.color = isSelected ? rgb(...COLORS.gold) : rgb(60, 60, 60);
    });
  }

  function updateMainPreview(char) {
    charPreview.use(sprite(char.id, { anim: 'idle-down' }));
    charNameText.text = char.name;
    charRoleText.text = char.role;
  }

  // === EVENT HANDLERS ===
  changeBtn.onClick(() => {
    if (!isSelectingCharacter) showCharacterSelect();
  });

  soundBtn.onClick(() => {
    const nowMuted = toggleMute();
    soundText.text = nowMuted ? 'Sound: OFF' : 'Sound: ON';
  });

  onKeyPress('m', () => {
    if (!isSelectingCharacter) {
      const nowMuted = toggleMute();
      soundText.text = nowMuted ? 'Sound: OFF' : 'Sound: ON';
    }
  });

  onKeyPress('escape', () => {
    if (isSelectingCharacter) {
      selectedCharIndex = CHARACTERS.findIndex(c => c.id === getSelectedCharacter().id);
      hideCharacterSelect();
    } else {
      go('overworld');
    }
  });

  resumeBtn.onClick(() => {
    if (!isSelectingCharacter) go('overworld');
  });

  // Sprite test (dev mode)
  onKeyPress('t', () => {
    if (!isSelectingCharacter) go('sprite-test');
  });

  // Number keys for quick links
  liveTools.forEach((tool, i) => {
    onKeyPress(`${i + 1}`, () => {
      if (!isSelectingCharacter && tool.url) {
        window.open(tool.url, '_blank');
      }
    });
  });

  // C key to open character select
  onKeyPress('c', () => {
    if (!isSelectingCharacter) showCharacterSelect();
  });
}
