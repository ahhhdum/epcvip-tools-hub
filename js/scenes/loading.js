/**
 * Hub Landing Scene
 *
 * Instant hub with tool links and "Enter Overworld" button.
 * Shows name + character selection modal before entering the game.
 */

import {
  GAME_CONFIG,
  COLORS,
  CHARACTERS,
  TOOLS,
  getSelectedCharacter,
  setSelectedCharacter,
} from '../config.js';
import { loadSounds } from '../systems/audio.js';
import { getAllBuildingSprites } from '../systems/entity-loader.js';

// localStorage keys
const STORAGE_KEY_NAME = 'epcvip_playerName';
const STORAGE_KEY_CHARACTER = 'selectedCharacter';

// Standard animation config (same for all characters)
const ANIM_CONFIG = {
  'idle-down': { from: 0, to: 5, loop: true, speed: 6 },
  'idle-right': { from: 6, to: 11, loop: true, speed: 6 },
  'idle-up': { from: 12, to: 17, loop: true, speed: 6 },
  'walk-down': { from: 18, to: 23, loop: true, speed: 10 },
  'walk-right': { from: 24, to: 29, loop: true, speed: 10 },
  'walk-up': { from: 30, to: 35, loop: true, speed: 10 },
};

// Get saved player name
function getSavedName() {
  return localStorage.getItem(STORAGE_KEY_NAME) || '';
}

// Save player name
function savePlayerName(name) {
  localStorage.setItem(STORAGE_KEY_NAME, name);
}

// Generate a fun random name
function getRandomName() {
  const adjectives = ['Brave', 'Swift', 'Clever', 'Lucky', 'Bold', 'Mighty'];
  const nouns = ['Explorer', 'Wanderer', 'Adventurer', 'Pioneer', 'Seeker'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}`;
}

// Track if modal is open to disable background keyboard navigation
let modalOpen = false;

export function loadingScene() {
  // Reset modal state when scene loads
  modalOpen = false;

  // Load assets in background (non-blocking)
  loadAssets();

  const S = GAME_CONFIG.uiScale;
  const centerX = width() / 2;
  const centerY = height() / 2;

  // Background
  add([rect(width(), height()), pos(0, 0), color(...COLORS.grass)]);

  // Title
  add([
    text('* INNOVATION LAB *', { size: 32 * S }),
    pos(centerX, 60 * S),
    anchor('center'),
    color(...COLORS.gold),
  ]);

  // Subtitle
  add([
    text('Team Tools Hub', { size: 14 * S }),
    pos(centerX, 90 * S),
    anchor('center'),
    color(...COLORS.white),
    opacity(0.7),
  ]);

  // Get live tools only
  const liveTools = TOOLS.filter((t) => t.live && t.url);

  // Tool cards - 2-column grid layout
  const cardWidth = 260 * S;
  const cardHeight = 70 * S;
  const cardGap = 16 * S;
  const cols = 2;
  const gridWidth = cols * cardWidth + (cols - 1) * cardGap;
  const gridStartX = centerX - gridWidth / 2;
  const gridStartY = 130 * S;

  // Track cards for keyboard navigation
  // Items: tool cards + "Enter Overworld" button (last item)
  const cardRefs = [];
  let selectedIndex = -1; // -1 means nothing selected

  liveTools.forEach((tool, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cardX = gridStartX + col * (cardWidth + cardGap);
    const cardY = gridStartY + row * (cardHeight + cardGap);

    // Card background
    const card = add([
      rect(cardWidth, cardHeight, { radius: 4 }),
      pos(cardX, cardY),
      color(22, 33, 62),
      outline(2, rgb(...COLORS.gold)),
      area(),
      'tool-card',
      { url: tool.url, toolName: tool.name, cardIndex: i },
    ]);
    cardRefs.push({ card, url: tool.url, isButton: false });

    // Tool name
    add([
      text(tool.name, { size: 11 * S, width: cardWidth - 16 * S }),
      pos(cardX + cardWidth / 2, cardY + 16 * S),
      anchor('center'),
      color(...COLORS.gold),
    ]);

    // Tool description
    add([
      text(tool.description, { size: 7 * S, width: cardWidth - 16 * S }),
      pos(cardX + cardWidth / 2, cardY + 38 * S),
      anchor('center'),
      color(...COLORS.white),
      opacity(0.7),
    ]);

    // "Open" label
    add([
      text('[ Open ]', { size: 9 * S }),
      pos(cardX + cardWidth / 2, cardY + cardHeight - 12 * S),
      anchor('center'),
      color(...COLORS.white),
      opacity(0.5),
    ]);
  });

  // "Enter Overworld" button - positioned below the grid
  const gridRows = Math.ceil(liveTools.length / cols);
  const gridEndY = gridStartY + gridRows * (cardHeight + cardGap);
  const btnY = gridEndY + 30 * S;
  const btnWidth = 200 * S;
  const btnHeight = 45 * S;

  const enterBtn = add([
    rect(btnWidth, btnHeight, { radius: 4 }),
    pos(centerX - btnWidth / 2, btnY),
    color(...COLORS.gold),
    outline(3, rgb(255, 215, 0)),
    area(),
    'enter-btn',
  ]);
  cardRefs.push({ card: enterBtn, url: null, isButton: true });

  add([
    text('Enter Overworld', { size: 14 * S }),
    pos(centerX, btnY + btnHeight / 2),
    anchor('center'),
    color(...COLORS.dark),
  ]);

  // Update visual selection
  function updateSelection(newIndex) {
    // Deselect old
    if (selectedIndex >= 0 && selectedIndex < cardRefs.length) {
      const old = cardRefs[selectedIndex];
      if (old.isButton) {
        old.card.color = rgb(...COLORS.gold);
        old.card.outline.color = rgb(255, 215, 0);
      } else {
        old.card.color = rgb(22, 33, 62);
        old.card.outline.color = rgb(...COLORS.gold);
      }
    }
    // Select new
    selectedIndex = newIndex;
    if (selectedIndex >= 0 && selectedIndex < cardRefs.length) {
      const sel = cardRefs[selectedIndex];
      if (sel.isButton) {
        sel.card.color = rgb(255, 230, 100);
        sel.card.outline.color = rgb(255, 255, 200);
      } else {
        sel.card.color = rgb(40, 55, 90);
        sel.card.outline.color = rgb(255, 255, 200);
      }
    }
  }

  // Click handler for tool cards
  onClick('tool-card', (card) => {
    if (card.url) {
      window.open(card.url, '_blank');
    }
  });

  // Hover effect for cards
  onHover('tool-card', (card) => {
    if (card.cardIndex !== selectedIndex) {
      card.outline.color = rgb(255, 215, 0);
      card.color = rgb(26, 39, 68);
    }
  });

  onHoverEnd('tool-card', (card) => {
    if (card.cardIndex !== selectedIndex) {
      card.outline.color = rgb(...COLORS.gold);
      card.color = rgb(22, 33, 62);
    }
  });

  // Button hover
  onHover('enter-btn', () => {
    if (selectedIndex !== cardRefs.length - 1) {
      enterBtn.color = rgb(255, 215, 0);
    }
  });

  onHoverEnd('enter-btn', () => {
    if (selectedIndex !== cardRefs.length - 1) {
      enterBtn.color = rgb(...COLORS.gold);
    }
  });

  // Button click - show character selection modal
  onClick('enter-btn', () => {
    showCharacterModal();
  });

  // Keyboard navigation (disabled when modal is open)
  const totalItems = cardRefs.length;

  onKeyPress('up', () => {
    if (modalOpen) return;
    if (selectedIndex < 0) {
      updateSelection(totalItems - 1);
    } else if (selectedIndex >= cols) {
      updateSelection(selectedIndex - cols);
    }
  });

  onKeyPress('down', () => {
    if (modalOpen) return;
    if (selectedIndex < 0) {
      updateSelection(0);
    } else if (selectedIndex < totalItems - cols) {
      updateSelection(selectedIndex + cols);
    } else if (selectedIndex < totalItems - 1) {
      updateSelection(totalItems - 1); // Jump to button
    }
  });

  onKeyPress('left', () => {
    if (modalOpen) return;
    if (selectedIndex < 0) {
      updateSelection(0);
    } else if (selectedIndex > 0) {
      updateSelection(selectedIndex - 1);
    }
  });

  onKeyPress('right', () => {
    if (modalOpen) return;
    if (selectedIndex < 0) {
      updateSelection(0);
    } else if (selectedIndex < totalItems - 1) {
      updateSelection(selectedIndex + 1);
    }
  });

  // A button or Enter to activate selection (disabled when modal is open)
  const activateSelection = () => {
    if (modalOpen) return;
    if (selectedIndex < 0) {
      // Nothing selected, go to overworld
      showCharacterModal();
    } else if (cardRefs[selectedIndex].isButton) {
      showCharacterModal();
    } else if (cardRefs[selectedIndex].url) {
      window.open(cardRefs[selectedIndex].url, '_blank');
    }
  };

  onKeyPress('enter', activateSelection);
  onKeyPress('a', activateSelection);

  // Footer hint
  add([
    text('Arrows to select • A/Enter to open • Enter for Overworld', { size: 9 * S }),
    pos(centerX, height() - 30 * S),
    anchor('center'),
    color(...COLORS.white),
    opacity(0.5),
  ]);
}

// Load all game assets (non-blocking)
function loadAssets() {
  loadSounds();

  // Load character sprites
  CHARACTERS.forEach((char) => {
    loadSprite(char.id, `assets/sprites/${char.id}.png`, {
      sliceX: char.cols,
      sliceY: char.rows,
      anims: ANIM_CONFIG,
    });
  });

  // Load building sprites
  const buildingSprites = getAllBuildingSprites();
  for (const spriteInfo of buildingSprites) {
    const gamePath = spriteInfo.file.replace('../', '');
    loadSprite(spriteInfo.spriteName, gamePath);
  }

  // Load tilesets (map editor uses indices into this array)
  // Grass_Plain is a single 16x16 tile - perfect for clean grass
  loadSprite('tileset-Grass_Plain', 'assets/tiles/Grass_Plain.png', {
    sliceX: 1,
    sliceY: 1,
  });
  loadSprite('tileset-Grass_Tiles_1', 'assets/tiles/Grass_Tiles_1.png', {
    sliceX: 16,
    sliceY: 10,
  });
  loadSprite('tileset-Grass_Tiles_4', 'assets/tiles/Grass_Tiles_4.png', {
    sliceX: 16,
    sliceY: 10,
  });
  // Legacy numbered names for maps that use index-based tileset references
  loadSprite('tileset-0', 'assets/tiles/Grass_Tiles_1.png', {
    sliceX: 16,
    sliceY: 10,
  });
  loadSprite('tileset-1', 'assets/tiles/Grass_Tiles_4.png', {
    sliceX: 16,
    sliceY: 10,
  });
  // Keep legacy name for backwards compatibility
  loadSprite('tileset-grass', 'assets/tiles/Grass_Tiles_1.png', {
    sliceX: 16,
    sliceY: 10,
  });
}

// Show character + name selection modal
function showCharacterModal() {
  // Disable background keyboard navigation
  modalOpen = true;

  const S = GAME_CONFIG.uiScale;
  const centerX = width() / 2;
  const centerY = height() / 2;

  // Track modal objects for cleanup
  const modalObjects = [];

  // Current selections
  let selectedCharIndex = CHARACTERS.findIndex((c) => c.id === getSelectedCharacter().id);
  if (selectedCharIndex < 0) selectedCharIndex = 0;

  const savedName = getSavedName();
  let playerName = savedName || getRandomName();

  // Dark overlay - blocks clicks to elements underneath
  modalObjects.push(
    add([
      rect(width(), height()),
      pos(0, 0),
      color(0, 0, 0),
      opacity(0.85),
      fixed(),
      z(100),
      area(),
      'modal-overlay',
    ])
  );

  // Prevent clicks on overlay from propagating
  onClick('modal-overlay', () => {
    // Do nothing - just block the click
  });

  // Modal box
  const modalWidth = 320 * S;
  const modalHeight = 280 * S;
  const modalX = centerX - modalWidth / 2;
  const modalY = centerY - modalHeight / 2;

  modalObjects.push(
    add([
      rect(modalWidth, modalHeight, { radius: 8 }),
      pos(modalX, modalY),
      color(22, 33, 62),
      outline(3, rgb(...COLORS.gold)),
      fixed(),
      z(101),
    ])
  );

  // Title
  modalObjects.push(
    add([
      text('Choose Your Character', { size: 14 * S }),
      pos(centerX, modalY + 24 * S),
      anchor('center'),
      color(...COLORS.gold),
      fixed(),
      z(102),
    ])
  );

  // Character preview container
  const previewSize = 80 * S;
  const previewX = centerX - previewSize / 2;
  const previewY = modalY + 50 * S;

  modalObjects.push(
    add([
      rect(previewSize, previewSize, { radius: 4 }),
      pos(previewX, previewY),
      color(15, 15, 26),
      outline(2, rgb(...COLORS.gold)),
      fixed(),
      z(102),
    ])
  );

  // Character sprite (will be updated)
  let charSprite = add([
    sprite(CHARACTERS[selectedCharIndex].id, { anim: 'idle-down' }),
    pos(centerX, previewY + previewSize / 2 + 8 * S),
    anchor('center'),
    scale(2),
    fixed(),
    z(103),
  ]);
  modalObjects.push(charSprite);

  // Left arrow
  const arrowY = previewY + previewSize / 2;
  modalObjects.push(
    add([
      text('<', { size: 24 * S }),
      pos(previewX - 30 * S, arrowY),
      anchor('center'),
      color(...COLORS.gold),
      area(),
      fixed(),
      z(103),
      'arrow-left',
    ])
  );

  // Right arrow
  modalObjects.push(
    add([
      text('>', { size: 24 * S }),
      pos(previewX + previewSize + 30 * S, arrowY),
      anchor('center'),
      color(...COLORS.gold),
      area(),
      fixed(),
      z(103),
      'arrow-right',
    ])
  );

  // Character name/role display
  const charNameText = add([
    text(CHARACTERS[selectedCharIndex].name, { size: 12 * S }),
    pos(centerX, previewY + previewSize + 16 * S),
    anchor('center'),
    color(...COLORS.white),
    fixed(),
    z(102),
  ]);
  modalObjects.push(charNameText);

  const charRoleText = add([
    text(CHARACTERS[selectedCharIndex].role, { size: 10 * S }),
    pos(centerX, previewY + previewSize + 32 * S),
    anchor('center'),
    color(...COLORS.white),
    opacity(0.6),
    fixed(),
    z(102),
  ]);
  modalObjects.push(charRoleText);

  // Update character display
  function updateCharacterDisplay() {
    const char = CHARACTERS[selectedCharIndex];
    destroy(charSprite);
    charSprite = add([
      sprite(char.id, { anim: 'idle-down' }),
      pos(centerX, previewY + previewSize / 2 + 8 * S),
      anchor('center'),
      scale(2),
      fixed(),
      z(103),
    ]);
    modalObjects.push(charSprite);
    charNameText.text = char.name;
    charRoleText.text = char.role;
  }

  // Arrow click handlers
  onClick('arrow-left', () => {
    selectedCharIndex = (selectedCharIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
    updateCharacterDisplay();
  });

  onClick('arrow-right', () => {
    selectedCharIndex = (selectedCharIndex + 1) % CHARACTERS.length;
    updateCharacterDisplay();
  });

  // Name input section
  const inputY = previewY + previewSize + 60 * S;

  modalObjects.push(
    add([
      text('Your Name:', { size: 10 * S }),
      pos(centerX, inputY),
      anchor('center'),
      color(...COLORS.white),
      opacity(0.7),
      fixed(),
      z(102),
    ])
  );

  // Name display (simulated input)
  const inputWidth = 200 * S;
  const inputHeight = 32 * S;
  const inputX = centerX - inputWidth / 2;

  modalObjects.push(
    add([
      rect(inputWidth, inputHeight, { radius: 4 }),
      pos(inputX, inputY + 14 * S),
      color(15, 15, 26),
      outline(2, rgb(68, 68, 68)),
      fixed(),
      z(102),
      'name-input-bg',
    ])
  );

  const nameText = add([
    text(playerName, { size: 12 * S }),
    pos(inputX + 10 * S, inputY + 14 * S + inputHeight / 2),
    anchor('left'),
    color(...COLORS.white),
    fixed(),
    z(103),
  ]);
  modalObjects.push(nameText);

  // Blinking cursor
  let cursorVisible = true;
  const cursorTimer = loop(0.5, () => {
    cursorVisible = !cursorVisible;
    cursorText.opacity = cursorVisible ? 1 : 0;
  });

  const cursorText = add([
    text('|', { size: 12 * S }),
    pos(inputX + 10 * S + playerName.length * 8 * S, inputY + 14 * S + inputHeight / 2),
    anchor('left'),
    color(...COLORS.gold),
    fixed(),
    z(103),
  ]);
  modalObjects.push(cursorText);

  // Keyboard input for name
  const handleKey = onKeyPress((key) => {
    if (key === 'backspace') {
      playerName = playerName.slice(0, -1);
    } else if (key === 'space') {
      if (playerName.length < 16) playerName += ' ';
    } else if (key.length === 1 && playerName.length < 16) {
      // Allow letters and numbers
      if (/[a-zA-Z0-9]/.test(key)) {
        playerName += key;
      }
    }
    nameText.text = playerName;
    cursorText.pos.x = inputX + 10 * S + playerName.length * 7 * S;
  });

  // Arrow key navigation for characters
  const handleArrows = onKeyPress((key) => {
    if (key === 'left') {
      selectedCharIndex = (selectedCharIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
      updateCharacterDisplay();
    } else if (key === 'right') {
      selectedCharIndex = (selectedCharIndex + 1) % CHARACTERS.length;
      updateCharacterDisplay();
    }
  });

  // Buttons
  const btnY = inputY + inputHeight + 40 * S;
  const btnWidth = 90 * S;
  const btnHeight = 36 * S;
  const btnGap = 20 * S;

  // Skip button
  modalObjects.push(
    add([
      rect(btnWidth, btnHeight, { radius: 4 }),
      pos(centerX - btnWidth - btnGap / 2, btnY),
      color(40, 40, 60),
      outline(2, rgb(68, 68, 68)),
      area(),
      fixed(),
      z(102),
      'btn-skip',
    ])
  );

  modalObjects.push(
    add([
      text('Skip', { size: 12 * S }),
      pos(centerX - btnWidth / 2 - btnGap / 2, btnY + btnHeight / 2),
      anchor('center'),
      color(...COLORS.white),
      opacity(0.7),
      fixed(),
      z(103),
    ])
  );

  // Play button
  modalObjects.push(
    add([
      rect(btnWidth, btnHeight, { radius: 4 }),
      pos(centerX + btnGap / 2, btnY),
      color(...COLORS.gold),
      outline(2, rgb(255, 215, 0)),
      area(),
      fixed(),
      z(102),
      'btn-play',
    ])
  );

  modalObjects.push(
    add([
      text('Play', { size: 12 * S }),
      pos(centerX + btnGap / 2 + btnWidth / 2, btnY + btnHeight / 2),
      anchor('center'),
      color(...COLORS.dark),
      fixed(),
      z(103),
    ])
  );

  // Button handlers
  function enterGame(useName) {
    // Cleanup
    cursorTimer.cancel();
    handleKey.cancel();
    handleArrows.cancel();
    modalObjects.forEach((obj) => destroy(obj));

    // Save selections
    const finalName = useName && playerName.trim() ? playerName.trim() : 'Player';
    savePlayerName(finalName);
    setSelectedCharacter(CHARACTERS[selectedCharIndex]);

    // Enter the game
    go('overworld');
  }

  onClick('btn-skip', () => enterGame(false));
  onClick('btn-play', () => enterGame(true));

  // Enter key to play
  const handleEnter = onKeyPress('enter', () => {
    enterGame(true);
  });

  // Escape to close modal
  const handleEscape = onKeyPress('escape', () => {
    cursorTimer.cancel();
    handleKey.cancel();
    handleArrows.cancel();
    handleEnter.cancel();
    handleEscape.cancel();
    modalObjects.forEach((obj) => destroy(obj));
    // Re-enable background keyboard navigation
    modalOpen = false;
  });
}
