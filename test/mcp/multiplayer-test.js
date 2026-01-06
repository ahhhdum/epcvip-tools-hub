/**
 * MCP Helper Script for Multiplayer Wordle Testing
 *
 * Usage with Claude Code's browser_run_code:
 *
 * 1. Copy the function you need
 * 2. Paste into browser_run_code tool
 * 3. Execute to set up test scenario
 *
 * Key insights:
 * - browser.newContext() creates isolated sessions (like incognito)
 *   This solves the session conflict problem where multiple tabs kick each other off.
 * - The bottom sheet auto-closes after joining a room (fixed in wordle.js)
 * - Use ?fresh=true&playerName=X for clean test sessions
 *
 * See wordle/TESTING.md for full documentation.
 */

// =============================================================================
// HELPER: Create isolated player context
// =============================================================================

/**
 * Creates an isolated player with their own browser context.
 * Each player has separate sessionStorage/localStorage.
 *
 * @param {Browser} browser - Playwright browser instance
 * @param {string} name - Player display name
 * @param {string} baseUrl - Base URL (default: http://localhost:2567)
 * @returns {Object} { page, context, name }
 */
async function createPlayer(browser, name, baseUrl = 'http://localhost:2567') {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/wordle/?playerName=${name}&fresh=true`);
  await page.waitForSelector('[data-testid="lobby"]');
  return { page, context, name };
}

/**
 * Ensures the bottom sheet is closed (defensive helper).
 * The sheet should auto-close after joining, but this handles edge cases.
 */
async function ensureSheetClosed(page) {
  const closeBtn = await page.$('#closeFriendsSheet');
  if (closeBtn && (await closeBtn.isVisible())) {
    await closeBtn.click();
    await page.waitForTimeout(300); // Animation delay
  }
}

// =============================================================================
// SCENARIO: Two-Player Sabotage Game
// =============================================================================

/**
 * Sets up a complete two-player sabotage game ready for word selection.
 *
 * Copy-paste this into browser_run_code:
 *
 * async (page) => {
 *   const browser = page.context().browser();
 *   // ... paste function body ...
 * }
 */
async function createTwoPlayerSabotageGame(page) {
  const browser = page.context().browser();
  const baseUrl = page.url().split('/wordle')[0];

  // Create isolated contexts for each player
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();

  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  // Navigate with test params
  await host.goto(`${baseUrl}/wordle/?playerName=Host&fresh=true`);
  await guest.goto(`${baseUrl}/wordle/?playerName=Guest&fresh=true`);

  // Wait for lobby
  await host.waitForSelector('[data-testid="lobby"]');
  await guest.waitForSelector('[data-testid="lobby"]');

  // Host creates sabotage room
  await host.click('text=Play With Friends');
  await host.waitForSelector('[data-testid="create-room"]');
  await host.click('[data-testid="create-room"]');

  // Select Sabotage mode in room config
  await host.waitForSelector('text=Word Selection');
  await host.click('button[data-mode="sabotage"]');
  await host.click('button:has-text("Create Room"):not([data-testid])');

  // Wait for waiting room and get room code
  await host.waitForSelector('[data-testid="room-code"]');
  const roomCode = await host.textContent('[data-testid="room-code"]');

  // Guest joins the room
  await guest.click('text=Play With Friends');
  await guest.waitForSelector('[data-testid="room-code-input"]');
  await guest.fill('[data-testid="room-code-input"]', roomCode.trim());
  await guest.click('[data-testid="join-room"]');

  // Wait for both to be in waiting room
  await guest.waitForSelector('[data-testid="room-code"]');

  // Both mark ready
  await host.click('[data-testid="ready-button"]');
  await guest.click('[data-testid="ready-button"]');

  // Wait for buttons to update
  await host.waitForSelector('[data-testid="start-game"]:not(.disabled)');

  // Host starts game
  await host.click('[data-testid="start-game"]');

  // Wait for selection phase
  await host.waitForSelector('[data-testid="selection-phase"]');
  await guest.waitForSelector('[data-testid="selection-phase"]');

  return {
    host,
    guest,
    roomCode: roomCode.trim(),
    hostCtx,
    guestCtx,
    cleanup: async () => {
      await hostCtx.close();
      await guestCtx.close();
    },
  };
}

// =============================================================================
// SCENARIO: Two-Player Random Word Game
// =============================================================================

async function createTwoPlayerRandomGame(page) {
  const browser = page.context().browser();
  const baseUrl = page.url().split('/wordle')[0];

  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();

  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await host.goto(`${baseUrl}/wordle/?playerName=Host&fresh=true`);
  await guest.goto(`${baseUrl}/wordle/?playerName=Guest&fresh=true`);

  await host.waitForSelector('[data-testid="lobby"]');
  await guest.waitForSelector('[data-testid="lobby"]');

  // Host creates room with random word mode
  await host.click('text=Play With Friends');
  await host.waitForSelector('[data-testid="create-room"]');
  await host.click('[data-testid="create-room"]');

  await host.waitForSelector('text=Word Selection');
  await host.click('button[data-mode="random"]');
  await host.click('button:has-text("Create Room"):not([data-testid])');

  await host.waitForSelector('[data-testid="room-code"]');
  const roomCode = await host.textContent('[data-testid="room-code"]');

  // Guest joins
  await guest.click('text=Play With Friends');
  await guest.waitForSelector('[data-testid="room-code-input"]');
  await guest.fill('[data-testid="room-code-input"]', roomCode.trim());
  await guest.click('[data-testid="join-room"]');

  await guest.waitForSelector('[data-testid="room-code"]');

  // Both ready
  await host.click('[data-testid="ready-button"]');
  await guest.click('[data-testid="ready-button"]');

  await host.waitForSelector('[data-testid="start-game"]:not(.disabled)');
  await host.click('[data-testid="start-game"]');

  // Wait for game view (skip selection phase for random mode)
  await host.waitForSelector('#game:not(.hidden)');
  await guest.waitForSelector('#game:not(.hidden)');

  return {
    host,
    guest,
    roomCode: roomCode.trim(),
    hostCtx,
    guestCtx,
    cleanup: async () => {
      await hostCtx.close();
      await guestCtx.close();
    },
  };
}

// =============================================================================
// QUICK TEST: Type a word in selection phase
// =============================================================================

async function typeSelectionWord(page, word) {
  for (const letter of word.toUpperCase()) {
    await page.click(`#selectionKeyboard button[data-key="${letter}"]`);
  }
}

async function submitSelectionWord(page) {
  await page.click('#submitWordBtn');
}

// =============================================================================
// QUICK TEST: Type and submit a guess
// =============================================================================

async function typeGuess(page, word) {
  for (const letter of word.toUpperCase()) {
    await page.click(`#keyboard button[data-key="${letter}"]`);
  }
}

async function submitGuess(page) {
  await page.click('#keyboard button[data-key="ENTER"]');
}

// =============================================================================
// EXPORT for use in test files
// =============================================================================

module.exports = {
  createPlayer,
  ensureSheetClosed,
  createTwoPlayerSabotageGame,
  createTwoPlayerRandomGame,
  typeSelectionWord,
  submitSelectionWord,
  typeGuess,
  submitGuess,
};

// =============================================================================
// COPY-PASTE BLOCK FOR browser_run_code
// =============================================================================

/*
 * Copy this entire block into browser_run_code to run a quick sabotage test:
 *
 * async (page) => {
 *   const browser = page.context().browser();
 *   const baseUrl = 'http://localhost:2567';
 *
 *   // Create isolated contexts
 *   const hostCtx = await browser.newContext();
 *   const guestCtx = await browser.newContext();
 *   const host = await hostCtx.newPage();
 *   const guest = await guestCtx.newPage();
 *
 *   // Navigate with test params
 *   await host.goto(`${baseUrl}/wordle/?playerName=Host&fresh=true`);
 *   await guest.goto(`${baseUrl}/wordle/?playerName=Guest&fresh=true`);
 *   await host.waitForSelector('[data-testid="lobby"]');
 *   await guest.waitForSelector('[data-testid="lobby"]');
 *
 *   // Host creates sabotage room
 *   await host.click('text=Play With Friends');
 *   await host.click('[data-testid="create-room"]');
 *   await host.click('button[data-mode="sabotage"]');
 *   await host.click('button:has-text("Create Room"):not([data-testid])');
 *
 *   // Get room code
 *   await host.waitForSelector('[data-testid="room-code"]');
 *   const roomCode = await host.textContent('[data-testid="room-code"]');
 *
 *   // Guest joins
 *   await guest.click('text=Play With Friends');
 *   await guest.fill('[data-testid="room-code-input"]', roomCode.trim());
 *   await guest.click('[data-testid="join-room"]');
 *   await guest.waitForSelector('[data-testid="room-code"]');
 *
 *   // Both ready
 *   await host.click('[data-testid="ready-button"]');
 *   await guest.click('[data-testid="ready-button"]');
 *
 *   // Start game
 *   await host.waitForSelector('[data-testid="start-game"]:not(.disabled)');
 *   await host.click('[data-testid="start-game"]');
 *
 *   // Wait for selection phase
 *   await host.waitForSelector('[data-testid="selection-phase"]');
 *   await guest.waitForSelector('[data-testid="selection-phase"]');
 *
 *   return { success: true, roomCode: roomCode.trim() };
 * }
 */
