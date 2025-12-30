/**
 * Pause Scene
 *
 * Shows game controls, quick links to tools, character selection, and resume option.
 * Triggered by ESC key.
 */

import { GAME_CONFIG, COLORS, TOOLS, CHARACTERS, getSelectedCharacter, setSelectedCharacter } from '../config.js';
import { isMuted, toggleMute } from '../systems/audio.js';
import { getPauseLayout, getCharSelectLayout } from '../systems/ui-layout.js';

export function pauseScene() {
  // Get responsive layout
  const layout = getPauseLayout();
  const S = layout.scale;

  let isSelectingCharacter = false;
  let selectedCharIndex = CHARACTERS.findIndex(c => c.id === getSelectedCharacter().id);

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
    rect(width() - layout.margin * 2, height() - layout.margin * 2),
    pos(layout.margin, layout.margin),
    color(0, 0, 0),
    outline(3, rgb(...COLORS.gold)),
    fixed(),
  ]);

  // Title
  add([
    text('PAUSED', { size: 36 * S }),
    pos(width() / 2, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Decorative lines around title
  add([
    rect(100 * S, 3),
    pos(width() / 2 - 150 * S, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);
  add([
    rect(100 * S, 3),
    pos(width() / 2 + 150 * S, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // === LEFT COLUMN: Controls ===
  add([
    text('Controls', { size: 18 * S }),
    pos(layout.leftCol.x + 20 * S, layout.contentStartY),
    color(...COLORS.gold),
    fixed(),
  ]);

  const controls = [
    ['Arrows / WASD', 'Move'],
    ['Enter', 'Interact'],
    ['Space', 'Throw'],
    ['M', 'Sound'],
    ['C', 'Character'],
    ['ESC', 'Resume'],
  ];

  controls.forEach(([key, action], i) => {
    add([
      text(key, { size: 12 * S }),
      pos(layout.leftCol.x + 30 * S, layout.contentStartY + 30 * S + i * 24 * S),
      color(...COLORS.white),
      fixed(),
    ]);
    add([
      text('- ' + action, { size: 12 * S }),
      pos(layout.leftCol.x + 160 * S, layout.contentStartY + 30 * S + i * 24 * S),
      color(150, 150, 150),
      fixed(),
    ]);
  });

  // Quick Links section
  add([
    text('Links (press #)', { size: 15 * S }),
    pos(layout.leftCol.x + 20 * S, layout.linksY),
    color(...COLORS.gold),
    fixed(),
  ]);

  const liveTools = TOOLS.filter(t => t.live);
  liveTools.forEach((tool, i) => {
    const linkText = add([
      text(`${i + 1}. ${tool.name}`, { size: 12 * S }),
      pos(layout.leftCol.x + 30 * S, layout.linksY + 25 * S + i * 22 * S),
      color(...COLORS.white),
      area(),  // Makes text clickable
      fixed(),
      'tool-link',
    ]);

    // Click handler
    linkText.onClick(() => {
      if (tool.url) {
        window.open(tool.url, '_blank');
      }
    });

    // Hover effect
    linkText.onHover(() => {
      linkText.color = rgb(...COLORS.gold);
    });
    linkText.onHoverEnd(() => {
      linkText.color = rgb(...COLORS.white);
    });
  });

  // === RIGHT COLUMN: Character ===
  add([
    text('Character', { size: 18 * S }),
    pos(layout.rightCol.x + 10 * S, layout.contentStartY),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Character preview background - fits within right column
  const previewBoxW = layout.rightCol.width - 20 * S;
  const previewBoxH = 130 * S;
  add([
    rect(previewBoxW, previewBoxH),
    pos(layout.rightCol.x + 10 * S, layout.contentStartY + 30 * S),
    color(20, 20, 20),
    outline(2, rgb(...COLORS.gold)),
    fixed(),
  ]);

  // Character sprite preview (animated) - left side of preview box
  const currentChar = getSelectedCharacter();
  const charPreview = add([
    sprite(currentChar.id, { anim: 'idle-down' }),
    pos(layout.rightCol.x + 10 * S + previewBoxW * 0.25, layout.contentStartY + 30 * S + previewBoxH * 0.45),
    anchor('center'),
    scale(Math.min(1.6 * S, previewBoxW / 90)),
    fixed(),
    'char-preview',
  ]);

  // Character name - right side of preview box
  const charNameText = add([
    text(currentChar.name, { size: 14 * S }),
    pos(layout.rightCol.x + 10 * S + previewBoxW * 0.65, layout.contentStartY + 30 * S + previewBoxH * 0.4),
    anchor('center'),
    color(...COLORS.white),
    fixed(),
    'char-name',
  ]);

  // Character role
  const charRoleText = add([
    text(currentChar.role, { size: 11 * S }),
    pos(layout.rightCol.x + 10 * S + previewBoxW * 0.65, layout.contentStartY + 30 * S + previewBoxH * 0.6),
    anchor('center'),
    color(150, 150, 150),
    fixed(),
    'char-role',
  ]);

  // Change button - centered below preview
  const changeBtn = add([
    rect(100 * S, 32 * S),
    pos(layout.rightCol.center, layout.contentStartY + 30 * S + previewBoxH + 20 * S),
    anchor('center'),
    color(40, 40, 40),
    outline(2, rgb(...COLORS.gold)),
    area(),
    fixed(),
    'change-btn',
  ]);

  add([
    text('Change', { size: 13 * S }),
    pos(layout.rightCol.center, layout.contentStartY + 30 * S + previewBoxH + 20 * S),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // === BOTTOM BUTTONS (below border, in black area) ===
  const btnY = height() - 19;

  // Resume button
  const resumeBtn = add([
    rect(130 * S, 32 * S),
    pos(width() / 2 - 75 * S, btnY),
    anchor('center'),
    color(...COLORS.gold),
    area(),
    fixed(),
    'resume-btn',
  ]);

  add([
    text('RESUME', { size: 15 * S }),
    pos(width() / 2 - 75 * S, btnY),
    anchor('center'),
    color(...COLORS.dark),
    fixed(),
  ]);

  // Sound toggle button
  const soundBtn = add([
    rect(110 * S, 32 * S),
    pos(width() / 2 + 75 * S, btnY),
    anchor('center'),
    color(40, 40, 40),
    outline(2, rgb(...COLORS.gold)),
    area(),
    fixed(),
    'sound-btn',
  ]);

  const soundText = add([
    text(isMuted() ? 'Sound: OFF' : 'Sound: ON', { size: 13 * S }),
    pos(width() / 2 + 75 * S, btnY),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
    'sound-text',
  ]);

  // === CHARACTER SELECTION MODAL ===
  const modalObjects = [];

  function showCharacterSelect() {
    isSelectingCharacter = true;
    const charLayout = getCharSelectLayout();

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
      text('SELECT CHARACTER', { size: 24 * charLayout.scale }),
      pos(width() / 2, 70 * charLayout.scale),
      anchor('center'),
      color(...COLORS.gold),
      fixed(),
      z(101),
    ]));

    // Character grid using calculated layout
    CHARACTERS.forEach((char, i) => {
      const col = i % charLayout.numCols;
      const row = Math.floor(i / charLayout.numCols);
      const x = charLayout.gridStartX + col * (charLayout.cardW + charLayout.gap);
      const y = charLayout.gridStartY + row * (charLayout.cardH + charLayout.gap);

      // Card background
      const isSelected = i === selectedCharIndex;
      const card = add([
        rect(charLayout.cardW, charLayout.cardH),
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

      // Character sprite - scaled to fit card
      const charSprite = add([
        sprite(char.id, { anim: 'idle-down' }),
        pos(x + charLayout.cardW / 2, y + charLayout.cardH * 0.4),
        anchor('center'),
        scale(charLayout.spriteScale),
        fixed(),
        z(102),
        'char-sprite',
      ]);
      modalObjects.push(charSprite);

      // Character name
      modalObjects.push(add([
        text(char.name, { size: charLayout.nameSize }),
        pos(x + charLayout.cardW / 2, y + charLayout.cardH * 0.75),
        anchor('center'),
        color(...COLORS.white),
        fixed(),
        z(102),
      ]));

      // Character role
      modalObjects.push(add([
        text(char.role, { size: charLayout.roleSize }),
        pos(x + charLayout.cardW / 2, y + charLayout.cardH * 0.9),
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
      rect(115 * charLayout.scale, 40 * charLayout.scale),
      pos(width() / 2 - 70 * charLayout.scale, charLayout.buttonY),
      anchor('center'),
      color(...COLORS.gold),
      area(),
      fixed(),
      z(101),
      'confirm-btn',
    ]);
    modalObjects.push(confirmBtn);

    modalObjects.push(add([
      text('Confirm', { size: 14 * charLayout.scale }),
      pos(width() / 2 - 70 * charLayout.scale, charLayout.buttonY),
      anchor('center'),
      color(...COLORS.dark),
      fixed(),
      z(102),
    ]));

    // Cancel button
    const cancelBtn = add([
      rect(95 * charLayout.scale, 40 * charLayout.scale),
      pos(width() / 2 + 70 * charLayout.scale, charLayout.buttonY),
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
      text('Cancel', { size: 14 * charLayout.scale }),
      pos(width() / 2 + 70 * charLayout.scale, charLayout.buttonY),
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

  // Enter also resumes (common expectation)
  onKeyPress('enter', () => {
    if (isSelectingCharacter) {
      // Confirm selection
      const char = CHARACTERS[selectedCharIndex];
      setSelectedCharacter(char);
      hideCharacterSelect();
      updateMainPreview(char);
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
