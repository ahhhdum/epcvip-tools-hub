import { test, expect } from './fixtures';

/**
 * Visual Regression Tests
 *
 * Captures baseline screenshots and compares against them on subsequent runs.
 * Uses Playwright's built-in visual comparison with toHaveScreenshot().
 *
 * To update baselines:
 *   npx playwright test visual.spec.ts --update-snapshots
 *
 * To run visual tests only:
 *   npx playwright test visual.spec.ts
 *
 * Baselines are stored in test/e2e/visual.spec.ts-snapshots/
 */

test.describe('Visual Regression', () => {
  test.describe('Lobby Views', () => {
    test('lobby - initial state', async ({ createPlayerContext }) => {
      const player = await createPlayerContext('Visual');

      // Wait for lobby to fully load
      await player.page.waitForSelector('[data-testid="daily-challenge-btn"]');

      await expect(player.page).toHaveScreenshot('lobby-initial.png', {
        fullPage: true,
      });
    });

    test('lobby - play with friends modal', async ({ createPlayerContext }) => {
      const player = await createPlayerContext('Visual');

      // Open the Play With Friends modal
      await player.page.click('[data-testid="play-with-friends-btn"]');
      await player.page.waitForSelector('#friendsModal:not(.hidden)');

      await expect(player.page).toHaveScreenshot('lobby-friends-modal.png');
    });

    test('lobby - past dailies modal', async ({ createPlayerContext }) => {
      const player = await createPlayerContext('Visual');

      // Open Past Dailies modal
      await player.page.click('[data-testid="past-dailies-btn"]');
      await player.page.waitForSelector('#pastDailiesModal:not(.hidden)');

      await expect(player.page).toHaveScreenshot('lobby-past-dailies.png');
    });
  });

  test.describe('Waiting Room', () => {
    test('waiting room - host view with settings', async ({ twoPlayers }) => {
      const { host } = twoPlayers;

      await host.createRoom({ wordMode: 'random' });

      // Host sees the settings panel
      await host.page.waitForSelector('.room-settings');

      await expect(host.page).toHaveScreenshot('waiting-room-host.png', {
        fullPage: true,
      });
    });

    test('waiting room - guest view', async ({ twoPlayers }) => {
      const { host, guest } = twoPlayers;

      const roomCode = await host.createRoom({ wordMode: 'random' });
      await guest.joinRoom(roomCode);

      // Guest sees limited view
      await guest.page.waitForSelector('.player-list');

      await expect(guest.page).toHaveScreenshot('waiting-room-guest.png', {
        fullPage: true,
      });
    });

    test('waiting room - both players ready', async ({ twoPlayers }) => {
      const { host, guest } = twoPlayers;

      const roomCode = await host.createRoom({ wordMode: 'random' });
      await guest.joinRoom(roomCode);

      await host.markReady();
      await guest.markReady();

      // Show host view with both ready
      await host.page.waitForSelector('.player-ready');

      await expect(host.page).toHaveScreenshot('waiting-room-all-ready.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Game Board', () => {
    test('game board - initial empty state', async ({ randomGame }) => {
      const { host } = randomGame;

      // Game board visible with empty grid
      await host.page.waitForSelector('#game:not(.hidden)');

      await expect(host.page).toHaveScreenshot('game-board-initial.png', {
        fullPage: true,
      });
    });

    test('game board - after one guess', async ({ randomGame }) => {
      const { host } = randomGame;

      // Type a guess and submit
      await host.typeGuess('CRANE');
      await host.submitGuess();

      // Wait for guess to be evaluated
      await host.page.waitForSelector('.guess-row[data-row="0"] .letter.absent, .guess-row[data-row="0"] .letter.present, .guess-row[data-row="0"] .letter.correct');

      await expect(host.page).toHaveScreenshot('game-board-one-guess.png', {
        fullPage: true,
        // More tolerance here due to letter color variations
        maxDiffPixels: 500,
      });
    });

    test('selection phase - sabotage mode', async ({ sabotageGame }) => {
      const { host } = sabotageGame;

      // In selection phase
      await host.page.waitForSelector('#wordSelection:not(.hidden)');

      await expect(host.page).toHaveScreenshot('selection-phase.png', {
        fullPage: true,
      });
    });
  });

  test.describe('Keyboard', () => {
    test('keyboard - initial state', async ({ randomGame }) => {
      const { host } = randomGame;

      // Focus on keyboard area
      const keyboard = host.page.locator('#keyboard');
      await keyboard.waitFor({ state: 'visible' });

      await expect(keyboard).toHaveScreenshot('keyboard-initial.png');
    });

    test('keyboard - after guesses', async ({ randomGame }) => {
      const { host } = randomGame;

      // Make a guess to color the keyboard
      await host.typeGuess('CRANE');
      await host.submitGuess();

      // Wait for keyboard to update
      await host.page.waitForTimeout(500);

      const keyboard = host.page.locator('#keyboard');
      await expect(keyboard).toHaveScreenshot('keyboard-after-guess.png', {
        maxDiffPixels: 300, // Colors vary based on word
      });
    });
  });

  test.describe('Mobile Responsive', () => {
    // Note: Uses 'mobile' project from playwright.config.ts
    test('lobby - mobile viewport', async ({ createPlayerContext }) => {
      const player = await createPlayerContext('Mobile');

      await expect(player.page).toHaveScreenshot('mobile-lobby.png', {
        fullPage: true,
      });
    });
  });
});
