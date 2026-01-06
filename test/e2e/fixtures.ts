import { test as base, Browser } from '@playwright/test';
import { PlayerPage } from './helpers/PlayerPage';

/**
 * Custom Playwright fixtures for multiplayer Wordle testing.
 *
 * Key insight: Each player gets their own browser context (isolated session).
 * This prevents the session conflict where tabs kick each other off.
 */

type MultiplayerFixtures = {
  /** Creates an isolated player context */
  createPlayerContext: (name: string) => Promise<PlayerPage>;

  /** Pre-configured two-player setup (Host and Guest in lobby) */
  twoPlayers: { host: PlayerPage; guest: PlayerPage };

  /** Two players ready in a sabotage room (selection phase) */
  sabotageGame: { host: PlayerPage; guest: PlayerPage; roomCode: string };

  /** Two players in an active random word game */
  randomGame: { host: PlayerPage; guest: PlayerPage; roomCode: string };
};

/**
 * Extended test with multiplayer fixtures.
 */
export const test = base.extend<MultiplayerFixtures>({
  // Factory fixture: creates isolated player contexts on demand
  createPlayerContext: async ({ browser }, use) => {
    const players: PlayerPage[] = [];

    const factory = async (name: string) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const player = new PlayerPage(page, context, name);
      await player.goto();
      players.push(player);
      return player;
    };

    await use(factory);

    // Cleanup all created players
    for (const player of players) {
      await player.close();
    }
  },

  // Two players in lobby (not yet in a room)
  twoPlayers: async ({ browser }, use) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    const host = new PlayerPage(hostPage, hostCtx, 'Host');
    const guest = new PlayerPage(guestPage, guestCtx, 'Guest');

    await host.goto();
    await guest.goto();

    await use({ host, guest });

    await host.close();
    await guest.close();
  },

  // Two players in sabotage selection phase
  sabotageGame: async ({ browser }, use) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    const host = new PlayerPage(hostPage, hostCtx, 'Host');
    const guest = new PlayerPage(guestPage, guestCtx, 'Guest');

    await host.goto();

    // Host creates sabotage room
    const roomCode = await host.createRoom({ wordMode: 'sabotage' });

    // Guest joins
    await guest.goto();
    await guest.joinRoom(roomCode);

    // Both ready
    await host.markReady();
    await guest.markReady();

    // Host starts
    await host.startGame();

    // Wait for selection phase
    await host.waitForSelectionPhase();
    await guest.waitForSelectionPhase();

    await use({ host, guest, roomCode });

    await host.close();
    await guest.close();
  },

  // Two players in active game (random word mode)
  randomGame: async ({ browser }, use) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    const host = new PlayerPage(hostPage, hostCtx, 'Host');
    const guest = new PlayerPage(guestPage, guestCtx, 'Guest');

    await host.goto();

    // Host creates random word room
    const roomCode = await host.createRoom({ wordMode: 'random' });

    // Guest joins
    await guest.goto();
    await guest.joinRoom(roomCode);

    // Both ready
    await host.markReady();
    await guest.markReady();

    // Host starts
    await host.startGame();

    // Wait for game phase
    await host.waitForGamePhase();
    await guest.waitForGamePhase();

    await use({ host, guest, roomCode });

    await host.close();
    await guest.close();
  },
});

export { expect } from '@playwright/test';
