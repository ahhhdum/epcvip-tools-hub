import { test, expect } from './fixtures';
import { PlayerPage } from './helpers/PlayerPage';

/**
 * Stakeholder Demo Tests
 *
 * Run with: npx playwright test test/e2e/demo.spec.ts --headed --project=chromium
 *
 * These tests are designed to be visually impressive when run in headed mode,
 * showing real browser windows interacting with the multiplayer Wordle game.
 */

test.describe('Stakeholder Demo', () => {
  test('Demo 1: Two players join the same room', async ({ twoPlayers }) => {
    const { host, guest } = twoPlayers;

    // Host creates a room
    const roomCode = await host.createRoom({ wordMode: 'random' });
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Guest joins with the room code
    await guest.joinRoom(roomCode);

    // Verify both players see the same room
    const hostCode = await host.getRoomCode();
    const guestCode = await guest.getRoomCode();
    expect(hostCode).toBe(roomCode);
    expect(guestCode).toBe(roomCode);

    // Verify player list shows both players
    // Note: Your own name shows as "Name (You)"
    const players = await host.getPlayers();
    expect(players).toHaveLength(2);
    const names = players.map((p) => p.name);
    expect(names.some((n) => n?.includes('Host'))).toBe(true);
    expect(names.some((n) => n?.includes('Guest'))).toBe(true);
  });

  test('Demo 2: Sabotage mode - players pick words for each other', async ({
    twoPlayers,
  }) => {
    const { host, guest } = twoPlayers;

    // Host creates a sabotage room
    const roomCode = await host.createRoom({ wordMode: 'sabotage' });
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Guest joins
    await guest.joinRoom(roomCode);

    // Both mark ready
    await host.markReady();
    await guest.markReady();

    // Host starts the game
    await host.startGame();

    // Both should enter selection phase
    await host.waitForSelectionPhase();
    await guest.waitForSelectionPhase();

    // Verify both are in selecting phase
    const hostPhase = await host.getGamePhase();
    const guestPhase = await guest.getGamePhase();

    expect(hostPhase).toBe('selecting');
    expect(guestPhase).toBe('selecting');
  });

  test('Demo 3: Share room via URL - instant auto-join', async ({ browser }) => {
    // Host creates a room
    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    const host = new PlayerPage(hostPage, hostCtx, 'Host');

    await host.goto();
    const roomCode = await host.createRoom({ wordMode: 'random' });

    // Guest joins via URL with autoJoin parameter (no manual code entry!)
    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    const guest = new PlayerPage(guestPage, guestCtx, 'Guest');

    await guest.gotoWithAutoJoin(roomCode);

    // Verify guest auto-joined the correct room
    const guestRoomCode = await guest.getRoomCode();
    expect(guestRoomCode).toBe(roomCode);

    // Verify both see each other in the room
    const players = await host.getPlayers();
    expect(players).toHaveLength(2);

    // Cleanup
    await host.close();
    await guest.close();
  });
});
