/**
 * Pause Scene
 *
 * Shows game controls, quick links to tools, character selection, and resume option.
 * Triggered by ESC key.
 */

import {
  GAME_CONFIG,
  COLORS,
  TOOLS,
  CHARACTERS,
  getSelectedCharacter,
  setSelectedCharacter,
} from '../config.js';
import { isMuted, toggleMute } from '../systems/audio.js';
import { getPauseLayout, getCharSelectLayout } from '../systems/ui-layout.js';
import {
  isLoggedIn,
  getProfile,
  signOut,
  signIn,
  signUp,
  saveCharacterSelection,
} from '../systems/auth.js';

export function pauseScene() {
  // Get responsive layout
  const layout = getPauseLayout();
  const S = layout.scale;

  let isSelectingCharacter = false;
  let selectedCharIndex = CHARACTERS.findIndex((c) => c.id === getSelectedCharacter().id);

  // Semi-transparent dark overlay
  add([rect(width(), height()), pos(0, 0), color(0, 0, 0), opacity(0.85), fixed()]);

  // Decorative border
  add([
    rect(width() - layout.margin * 2, height() - layout.margin * 2),
    pos(layout.margin, layout.margin),
    color(0, 0, 0),
    outline(3, rgb(...COLORS.gold)),
    fixed(),
  ]);

  // Title - reduced size for better proportions
  add([
    text('PAUSED', { size: 28 * S }),
    pos(width() / 2, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);

  // Decorative lines around title - adjusted for smaller title
  add([
    rect(80 * S, 2),
    pos(width() / 2 - 120 * S, layout.title.y),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
  ]);
  add([
    rect(80 * S, 2),
    pos(width() / 2 + 120 * S, layout.title.y),
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

  const liveTools = TOOLS.filter((t) => t.live);
  liveTools.forEach((tool, i) => {
    const linkText = add([
      text(`${i + 1}. ${tool.name}`, { size: 12 * S }),
      pos(layout.leftCol.x + 30 * S, layout.linksY + 25 * S + i * 22 * S),
      color(...COLORS.white),
      area(), // Makes text clickable
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
    pos(
      layout.rightCol.x + 10 * S + previewBoxW * 0.25,
      layout.contentStartY + 30 * S + previewBoxH * 0.45
    ),
    anchor('center'),
    scale(Math.min(1.6 * S, previewBoxW / 90)),
    fixed(),
    'char-preview',
  ]);

  // Character name - right side of preview box
  const charNameText = add([
    text(currentChar.name, { size: 14 * S }),
    pos(
      layout.rightCol.x + 10 * S + previewBoxW * 0.65,
      layout.contentStartY + 30 * S + previewBoxH * 0.4
    ),
    anchor('center'),
    color(...COLORS.white),
    fixed(),
    'char-name',
  ]);

  // Character role
  const charRoleText = add([
    text(currentChar.role, { size: 11 * S }),
    pos(
      layout.rightCol.x + 10 * S + previewBoxW * 0.65,
      layout.contentStartY + 30 * S + previewBoxH * 0.6
    ),
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
    z(50), // Ensure button is above other elements for click detection
    'change-btn',
  ]);

  add([
    text('Change', { size: 13 * S }),
    pos(layout.rightCol.center, layout.contentStartY + 30 * S + previewBoxH + 20 * S),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
    z(51), // Text above button background
  ]);

  // === BOTTOM BUTTONS (inside gold border, above bottom margin) ===
  const btnY = layout.bottomButtons.y;

  // Resume button (left)
  const resumeBtn = add([
    rect(130 * S, 32 * S),
    pos(width() / 2 - 130 * S, btnY),
    anchor('center'),
    color(...COLORS.gold),
    area(),
    fixed(),
    'resume-btn',
  ]);

  add([
    text('RESUME', { size: 15 * S }),
    pos(width() / 2 - 130 * S, btnY),
    anchor('center'),
    color(...COLORS.dark),
    fixed(),
  ]);

  // Sound toggle button (center)
  const soundBtn = add([
    rect(100 * S, 32 * S),
    pos(width() / 2, btnY),
    anchor('center'),
    color(40, 40, 40),
    outline(2, rgb(...COLORS.gold)),
    area(),
    fixed(),
    'sound-btn',
  ]);

  const soundText = add([
    text(isMuted() ? 'Sound: OFF' : 'Sound: ON', { size: 12 * S }),
    pos(width() / 2, btnY),
    anchor('center'),
    color(...COLORS.gold),
    fixed(),
    'sound-text',
  ]);

  // Login/Logout button (right)
  const loggedIn = isLoggedIn();
  const profile = getProfile();

  const authBtn = add([
    rect(90 * S, 32 * S),
    pos(width() / 2 + 130 * S, btnY),
    anchor('center'),
    color(loggedIn ? 60 : 40, loggedIn ? 40 : 40, loggedIn ? 40 : 60),
    outline(2, rgb(loggedIn ? 150 : 100, loggedIn ? 100 : 150, loggedIn ? 100 : 200)),
    area(),
    fixed(),
    'auth-btn',
  ]);

  const authText = add([
    text(loggedIn ? 'Logout' : 'Login', { size: 12 * S }),
    pos(width() / 2 + 130 * S, btnY),
    anchor('center'),
    color(loggedIn ? 255 : 150, loggedIn ? 150 : 150, loggedIn ? 150 : 255),
    fixed(),
    'auth-text',
  ]);

  // Show username if logged in
  if (loggedIn && profile) {
    add([
      text(profile.display_name || 'Player', { size: 10 * S }),
      pos(width() / 2 + 130 * S, btnY - 22 * S),
      anchor('center'),
      color(150, 200, 150),
      fixed(),
    ]);
  }

  // === CHARACTER SELECTION MODAL ===
  const modalObjects = [];
  let modalKeyHandlers = []; // Track keyboard handlers for cleanup

  function showCharacterSelect() {
    isSelectingCharacter = true;
    const charLayout = getCharSelectLayout();

    // Modal background
    modalObjects.push(
      add([rect(width(), height()), pos(0, 0), color(0, 0, 0), opacity(0.95), fixed(), z(100)])
    );

    // Modal title
    modalObjects.push(
      add([
        text('SELECT CHARACTER', { size: 24 * charLayout.scale }),
        pos(width() / 2, 70 * charLayout.scale),
        anchor('center'),
        color(...COLORS.gold),
        fixed(),
        z(101),
      ])
    );

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
      modalObjects.push(
        add([
          text(char.name, { size: charLayout.nameSize }),
          pos(x + charLayout.cardW / 2, y + charLayout.cardH * 0.75),
          anchor('center'),
          color(...COLORS.white),
          fixed(),
          z(102),
        ])
      );

      // Character role
      modalObjects.push(
        add([
          text(char.role, { size: charLayout.roleSize }),
          pos(x + charLayout.cardW / 2, y + charLayout.cardH * 0.9),
          anchor('center'),
          color(120, 120, 120),
          fixed(),
          z(102),
        ])
      );

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

    modalObjects.push(
      add([
        text('Confirm', { size: 14 * charLayout.scale }),
        pos(width() / 2 - 70 * charLayout.scale, charLayout.buttonY),
        anchor('center'),
        color(...COLORS.dark),
        fixed(),
        z(102),
      ])
    );

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

    modalObjects.push(
      add([
        text('Cancel', { size: 14 * charLayout.scale }),
        pos(width() / 2 + 70 * charLayout.scale, charLayout.buttonY),
        anchor('center'),
        color(150, 150, 150),
        fixed(),
        z(102),
      ])
    );

    confirmBtn.onClick(() => {
      const char = CHARACTERS[selectedCharIndex];
      setSelectedCharacter(char);
      saveCharacterSelection(char.id).catch((e) => {
        console.error('[Auth] Failed to save character:', e);
      });
      hideCharacterSelect();
      updateMainPreview(char);
    });

    cancelBtn.onClick(() => {
      selectedCharIndex = CHARACTERS.findIndex((c) => c.id === getSelectedCharacter().id);
      hideCharacterSelect();
    });

    // Arrow key navigation for character selection
    const numCols = charLayout.numCols; // 4 columns

    modalKeyHandlers.push(
      onKeyPress('left', () => {
        if (selectedCharIndex > 0) {
          selectedCharIndex--;
          updateCardSelection();
        }
      })
    );

    modalKeyHandlers.push(
      onKeyPress('right', () => {
        if (selectedCharIndex < CHARACTERS.length - 1) {
          selectedCharIndex++;
          updateCardSelection();
        }
      })
    );

    modalKeyHandlers.push(
      onKeyPress('up', () => {
        const newIndex = selectedCharIndex - numCols;
        if (newIndex >= 0) {
          selectedCharIndex = newIndex;
          updateCardSelection();
        }
      })
    );

    modalKeyHandlers.push(
      onKeyPress('down', () => {
        const newIndex = selectedCharIndex + numCols;
        if (newIndex < CHARACTERS.length) {
          selectedCharIndex = newIndex;
          updateCardSelection();
        }
      })
    );
  }

  function hideCharacterSelect() {
    isSelectingCharacter = false;
    modalObjects.forEach((obj) => destroy(obj));
    modalObjects.length = 0;
    // Clean up keyboard handlers
    modalKeyHandlers.forEach((handler) => handler.cancel());
    modalKeyHandlers = [];
  }

  function updateCardSelection() {
    get('char-card').forEach((card) => {
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

  authBtn.onClick(async () => {
    if (isLoggedIn()) {
      // Logout
      await signOut();
      go('pause'); // Refresh the pause scene
    } else {
      // Show login modal
      showLoginModal();
    }
  });

  onKeyPress('m', () => {
    if (!isSelectingCharacter) {
      const nowMuted = toggleMute();
      soundText.text = nowMuted ? 'Sound: OFF' : 'Sound: ON';
    }
  });

  onKeyPress('escape', () => {
    if (isSelectingCharacter) {
      selectedCharIndex = CHARACTERS.findIndex((c) => c.id === getSelectedCharacter().id);
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
      saveCharacterSelection(char.id).catch((e) => {
        console.error('[Auth] Failed to save character:', e);
      });
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

  // === LOGIN MODAL ===
  let isLoggingIn = false;
  const loginModalObjects = [];
  let loginKeyHandler = null;

  function showLoginModal() {
    isLoggingIn = true;

    // Modal state
    let mode = 'login'; // 'login' or 'signup'
    let email = '';
    let password = '';
    let displayName = '';
    const errorMessage = '';
    let activeField = 'email';

    // Modal background
    loginModalObjects.push(
      add([rect(width(), height()), pos(0, 0), color(0, 0, 0), opacity(0.95), fixed(), z(200)])
    );

    // Modal box
    const modalW = 320 * S;
    const modalH = 280 * S;
    const modalX = width() / 2 - modalW / 2;
    const modalY = height() / 2 - modalH / 2;

    loginModalObjects.push(
      add([
        rect(modalW, modalH, { radius: 8 }),
        pos(modalX, modalY),
        color(22, 33, 62),
        outline(3, rgb(100, 150, 255)),
        fixed(),
        z(201),
      ])
    );

    // Title
    const titleText = add([
      text('Login', { size: 18 * S }),
      pos(width() / 2, modalY + 30 * S),
      anchor('center'),
      color(100, 150, 255),
      fixed(),
      z(202),
    ]);
    loginModalObjects.push(titleText);

    // Toggle link
    const toggleText = add([
      text("Don't have an account? Sign up", { size: 10 * S }),
      pos(width() / 2, modalY + 50 * S),
      anchor('center'),
      color(150, 150, 200),
      area(),
      fixed(),
      z(202),
      'auth-toggle',
    ]);
    loginModalObjects.push(toggleText);

    // Email field
    const emailLabelY = modalY + 80 * S;
    loginModalObjects.push(
      add([
        text('Email:', { size: 10 * S }),
        pos(modalX + 20 * S, emailLabelY),
        color(150, 150, 150),
        fixed(),
        z(202),
      ])
    );

    const emailInput = add([
      rect(modalW - 40 * S, 28 * S, { radius: 4 }),
      pos(modalX + 20 * S, emailLabelY + 14 * S),
      color(
        activeField === 'email' ? 25 : 15,
        activeField === 'email' ? 25 : 15,
        activeField === 'email' ? 35 : 25
      ),
      outline(
        2,
        rgb(
          activeField === 'email' ? 100 : 60,
          activeField === 'email' ? 150 : 60,
          activeField === 'email' ? 255 : 60
        )
      ),
      area(),
      fixed(),
      z(202),
      'email-input',
    ]);
    loginModalObjects.push(emailInput);

    const emailText = add([
      text(email || '', { size: 11 * S }),
      pos(modalX + 30 * S, emailLabelY + 28 * S),
      anchor('left'),
      color(255, 255, 255),
      fixed(),
      z(203),
    ]);
    loginModalObjects.push(emailText);

    // Password field
    const passLabelY = emailLabelY + 52 * S;
    loginModalObjects.push(
      add([
        text('Password:', { size: 10 * S }),
        pos(modalX + 20 * S, passLabelY),
        color(150, 150, 150),
        fixed(),
        z(202),
      ])
    );

    const passInput = add([
      rect(modalW - 40 * S, 28 * S, { radius: 4 }),
      pos(modalX + 20 * S, passLabelY + 14 * S),
      color(
        activeField === 'password' ? 25 : 15,
        activeField === 'password' ? 25 : 15,
        activeField === 'password' ? 35 : 25
      ),
      outline(
        2,
        rgb(
          activeField === 'password' ? 100 : 60,
          activeField === 'password' ? 150 : 60,
          activeField === 'password' ? 255 : 60
        )
      ),
      area(),
      fixed(),
      z(202),
      'pass-input',
    ]);
    loginModalObjects.push(passInput);

    const passText = add([
      text('', { size: 11 * S }),
      pos(modalX + 30 * S, passLabelY + 28 * S),
      anchor('left'),
      color(255, 255, 255),
      fixed(),
      z(203),
    ]);
    loginModalObjects.push(passText);

    // Display name field (only for signup)
    const nameLabelY = passLabelY + 52 * S;
    let nameLabel, nameInput, nameText;

    function updateMode() {
      titleText.text = mode === 'login' ? 'Login' : 'Sign Up';
      toggleText.text =
        mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login';

      if (mode === 'signup' && !nameLabel) {
        nameLabel = add([
          text('Display Name:', { size: 10 * S }),
          pos(modalX + 20 * S, nameLabelY),
          color(150, 150, 150),
          fixed(),
          z(202),
        ]);
        loginModalObjects.push(nameLabel);

        nameInput = add([
          rect(modalW - 40 * S, 28 * S, { radius: 4 }),
          pos(modalX + 20 * S, nameLabelY + 14 * S),
          color(15, 15, 25),
          outline(2, rgb(60, 60, 60)),
          area(),
          fixed(),
          z(202),
          'name-input',
        ]);
        loginModalObjects.push(nameInput);

        nameText = add([
          text(displayName || '', { size: 11 * S }),
          pos(modalX + 30 * S, nameLabelY + 28 * S),
          anchor('left'),
          color(255, 255, 255),
          fixed(),
          z(203),
        ]);
        loginModalObjects.push(nameText);
      } else if (mode === 'login' && nameLabel) {
        destroy(nameLabel);
        destroy(nameInput);
        destroy(nameText);
        nameLabel = null;
        nameInput = null;
        nameText = null;
      }
    }

    // Error message
    const errorText = add([
      text('', { size: 9 * S }),
      pos(width() / 2, modalY + modalH - 70 * S),
      anchor('center'),
      color(255, 100, 100),
      fixed(),
      z(202),
    ]);
    loginModalObjects.push(errorText);

    // Submit button
    const submitY = modalY + modalH - 45 * S;
    const submitBtn = add([
      rect(100 * S, 32 * S, { radius: 4 }),
      pos(width() / 2 - 60 * S, submitY),
      anchor('center'),
      color(80, 130, 200),
      outline(2, rgb(100, 150, 255)),
      area(),
      fixed(),
      z(202),
      'submit-btn',
    ]);
    loginModalObjects.push(submitBtn);

    loginModalObjects.push(
      add([
        text('Submit', { size: 12 * S }),
        pos(width() / 2 - 60 * S, submitY),
        anchor('center'),
        color(255, 255, 255),
        fixed(),
        z(203),
      ])
    );

    // Cancel button
    const cancelBtn = add([
      rect(80 * S, 32 * S, { radius: 4 }),
      pos(width() / 2 + 50 * S, submitY),
      anchor('center'),
      color(60, 40, 40),
      outline(2, rgb(150, 100, 100)),
      area(),
      fixed(),
      z(202),
      'cancel-auth-btn',
    ]);
    loginModalObjects.push(cancelBtn);

    loginModalObjects.push(
      add([
        text('Cancel', { size: 12 * S }),
        pos(width() / 2 + 50 * S, submitY),
        anchor('center'),
        color(200, 150, 150),
        fixed(),
        z(203),
      ])
    );

    // Click handlers
    onClick('auth-toggle', () => {
      mode = mode === 'login' ? 'signup' : 'login';
      errorText.text = '';
      updateMode();
    });

    onClick('email-input', () => {
      activeField = 'email';
      emailInput.outline.color = rgb(100, 150, 255);
      passInput.outline.color = rgb(60, 60, 60);
      if (nameInput) nameInput.outline.color = rgb(60, 60, 60);
    });

    onClick('pass-input', () => {
      activeField = 'password';
      emailInput.outline.color = rgb(60, 60, 60);
      passInput.outline.color = rgb(100, 150, 255);
      if (nameInput) nameInput.outline.color = rgb(60, 60, 60);
    });

    onClick('name-input', () => {
      if (mode === 'signup') {
        activeField = 'name';
        emailInput.outline.color = rgb(60, 60, 60);
        passInput.outline.color = rgb(60, 60, 60);
        if (nameInput) nameInput.outline.color = rgb(100, 150, 255);
      }
    });

    onClick('submit-btn', async () => {
      errorText.text = '';

      if (!email || !password) {
        errorText.text = 'Please fill in all fields';
        return;
      }

      try {
        if (mode === 'login') {
          await signIn(email, password);
        } else {
          if (!displayName) {
            errorText.text = 'Please enter a display name';
            return;
          }
          await signUp(email, password, displayName);
        }
        hideLoginModal();
        go('pause'); // Refresh pause scene
      } catch (e) {
        errorText.text = e.message || 'Authentication failed';
      }
    });

    onClick('cancel-auth-btn', () => {
      hideLoginModal();
    });

    // Keyboard input
    loginKeyHandler = onKeyPress((key) => {
      if (key === 'escape') {
        hideLoginModal();
        return;
      }

      if (key === 'tab') {
        // Cycle through fields
        if (mode === 'login') {
          activeField = activeField === 'email' ? 'password' : 'email';
        } else {
          const fields = ['email', 'password', 'name'];
          const idx = fields.indexOf(activeField);
          activeField = fields[(idx + 1) % fields.length];
        }
        emailInput.outline.color = rgb(
          activeField === 'email' ? 100 : 60,
          activeField === 'email' ? 150 : 60,
          activeField === 'email' ? 255 : 60
        );
        passInput.outline.color = rgb(
          activeField === 'password' ? 100 : 60,
          activeField === 'password' ? 150 : 60,
          activeField === 'password' ? 255 : 60
        );
        if (nameInput)
          nameInput.outline.color = rgb(
            activeField === 'name' ? 100 : 60,
            activeField === 'name' ? 150 : 60,
            activeField === 'name' ? 255 : 60
          );
        return;
      }

      if (key === 'backspace') {
        if (activeField === 'email') {
          email = email.slice(0, -1);
          emailText.text = email;
        } else if (activeField === 'password') {
          password = password.slice(0, -1);
          passText.text = '*'.repeat(password.length);
        } else if (activeField === 'name') {
          displayName = displayName.slice(0, -1);
          if (nameText) nameText.text = displayName;
        }
        return;
      }

      // Allow typing
      if (key.length === 1) {
        if (activeField === 'email' && email.length < 50) {
          email += key;
          emailText.text = email;
        } else if (activeField === 'password' && password.length < 30) {
          password += key;
          passText.text = '*'.repeat(password.length);
        } else if (activeField === 'name' && displayName.length < 20) {
          displayName += key;
          if (nameText) nameText.text = displayName;
        }
      }
    });
  }

  function hideLoginModal() {
    isLoggingIn = false;
    loginModalObjects.forEach((obj) => destroy(obj));
    loginModalObjects.length = 0;
    if (loginKeyHandler) {
      loginKeyHandler.cancel();
      loginKeyHandler = null;
    }
  }
}
