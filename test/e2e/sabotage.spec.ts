import { test, expect } from './fixtures';

/**
 * E2E tests for Sabotage Mode.
 *
 * Tests cover:
 * - Room creation with sabotage mode
 * - Word selection phase
 * - Word assignments (picking for opponents)
 * - Full game flow with sabotage words
 */

test.describe('Sabotage Mode', () => {
  test('two players can create and join a sabotage room', async ({
    twoPlayers,
  }) => {
    const { host, guest } = twoPlayers;

    // Host creates sabotage room
    const roomCode = await host.createRoom({ wordMode: 'sabotage' });
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Guest joins
    await guest.joinRoom(roomCode);

    // Verify both see the room
    const hostCode = await host.getRoomCode();
    const guestCode = await guest.getRoomCode();
    expect(hostCode).toBe(roomCode);
    expect(guestCode).toBe(roomCode);

    // Verify player list shows both
    const players = await host.getPlayers();
    expect(players).toHaveLength(2);
  });

  test('selection phase appears after game starts', async ({ sabotageGame }) => {
    const { host, guest } = sabotageGame;

    // Both should be in selection phase
    const hostPhase = await host.getGamePhase();
    const guestPhase = await guest.getGamePhase();

    expect(hostPhase).toBe('selecting');
    expect(guestPhase).toBe('selecting');
  });

  test('players can type and submit words in selection phase', async ({
    sabotageGame,
  }) => {
    const { host, guest } = sabotageGame;

    // Host picks a word for guest
    await host.pickWord('GRAPE');

    // Guest picks a word for host
    await guest.pickWord('CRANE');

    // Both submitted - should transition to game phase
    await host.waitForGamePhase();
    await guest.waitForGamePhase();

    // Verify both are now playing
    const hostPhase = await host.getGamePhase();
    const guestPhase = await guest.getGamePhase();

    expect(hostPhase).toBe('playing');
    expect(guestPhase).toBe('playing');
  });

  test('complete sabotage game flow', async ({ sabotageGame }) => {
    const { host, guest } = sabotageGame;

    // Each picks a word for the other
    // Host picks GRAPE for Guest to solve
    await host.pickWord('GRAPE');
    // Guest picks CRANE for Host to solve
    await guest.pickWord('CRANE');

    // Wait for game phase
    await host.waitForGamePhase();
    await guest.waitForGamePhase();

    // Host solves their word (CRANE)
    await host.guess('CRANE');

    // Guest solves their word (GRAPE)
    await guest.guess('GRAPE');

    // Both should see results
    await host.waitForResults();
    await guest.waitForResults();

    // Verify words are revealed correctly
    // Host's revealed word should be CRANE (what Guest picked for them)
    const hostRevealed = await host.getRevealedWord();
    expect(hostRevealed).toBe('CRANE');

    // Guest's revealed word should be GRAPE (what Host picked for them)
    const guestRevealed = await guest.getRevealedWord();
    expect(guestRevealed).toBe('GRAPE');
  });
});

test.describe('Random Mode', () => {
  test('two players can play a random word game', async ({ randomGame }) => {
    const { host, guest } = randomGame;

    // Both should be in playing phase
    const hostPhase = await host.getGamePhase();
    const guestPhase = await guest.getGamePhase();

    expect(hostPhase).toBe('playing');
    expect(guestPhase).toBe('playing');

    // Timer should be running
    const hostTimer = await host.getTimer();
    expect(hostTimer).not.toBe('0:00');
  });
});

test.describe('URL Parameters', () => {
  test('fresh=true clears session data', async ({ createPlayerContext }) => {
    const player = await createPlayerContext('FreshPlayer');

    // Should be in lobby (no room remembered)
    const phase = await player.getGamePhase();
    expect(phase).toBe('lobby');
  });

  test('playerName parameter sets display name', async ({
    createPlayerContext,
  }) => {
    const player = await createPlayerContext('CustomName');
    await player.createRoom({ wordMode: 'random' });

    const players = await player.getPlayers();
    const self = players.find((p) => p.name === 'CustomName');
    expect(self).toBeDefined();
  });
});
