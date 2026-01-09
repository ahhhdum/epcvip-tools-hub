import { test, expect } from './fixtures';

/**
 * Hard Mode E2E Tests
 *
 * Hard Mode rules:
 * 1. Green letters (correct) must stay in the same position
 * 2. Yellow letters (present) must be reused somewhere in the guess
 *
 * Note: Testing the actual violation enforcement requires knowing the target word,
 * which is random. These tests verify the toggle and room setup work correctly.
 * The validation logic is tested at the unit level in wordle-validator.ts.
 */

test.describe('Hard Mode', () => {
  test('toggle enables hard mode in room config', async ({ twoPlayers }) => {
    const { host } = twoPlayers;

    // Open room creation modal
    await host.openFriendsSheet();
    await host.page.click('[data-testid="create-room"]');
    // Wait for config view (not text - "Hard Mode" appears in multiple views)
    await host.page.waitForSelector('#roomConfig:not(.hidden)');

    // Toggle should be Off by default
    const toggleBefore = await host.page.textContent('#configHardMode');
    expect(toggleBefore).toBe('Off');

    // Click to enable
    await host.page.click('#configHardMode');

    // Toggle should now be On
    const toggleAfter = await host.page.textContent('#configHardMode');
    expect(toggleAfter).toBe('On');

    // Click again to disable
    await host.page.click('#configHardMode');
    const toggleFinal = await host.page.textContent('#configHardMode');
    expect(toggleFinal).toBe('Off');
  });

  test('hard mode room can be created and joined', async ({ twoPlayers }) => {
    const { host, guest } = twoPlayers;

    // Host creates room with hard mode
    const roomCode = await host.createRoom({
      wordMode: 'random',
      hardMode: true,
    });

    expect(roomCode).toHaveLength(6);

    // Guest joins
    await guest.joinRoom(roomCode);

    // Both should see the room
    const hostRoomCode = await host.getRoomCode();
    const guestRoomCode = await guest.getRoomCode();

    expect(hostRoomCode).toBe(roomCode);
    expect(guestRoomCode).toBe(roomCode);
  });

  test('seeded word enables deterministic testing', async ({ twoPlayers }) => {
    const { host, guest } = twoPlayers;

    // Create room with seeded word for deterministic testing
    // Target word: CRANE
    const roomCode = await host.createRoom({
      wordMode: 'random',
      testWord: 'CRANE',
    });

    await guest.joinRoom(roomCode);
    await host.markReady();
    await guest.markReady();
    await host.startGame();

    // Wait for game to start
    await host.waitForGamePhase();

    // Guess the seeded word - should win immediately
    await host.guess('CRANE');

    // Wait for win message to confirm the seeded word worked
    await host.page.waitForSelector('text=You won!');

    // The test passes - seeded word CRANE was used and we won
  });

  test('hard mode violation with seeded word', async ({ twoPlayers }) => {
    const { host, guest } = twoPlayers;

    // Create hard mode room with seeded word CRANE
    const roomCode = await host.createRoom({
      wordMode: 'random',
      hardMode: true,
      testWord: 'CRANE',
    });

    await guest.joinRoom(roomCode);
    await host.markReady();
    await guest.markReady();
    await host.startGame();
    await host.waitForGamePhase();

    // First guess: TRACE reveals R(green@2), A(green@3), E(green@5), C(yellow), T(absent)
    await host.guess('TRACE');

    // Wait for reveal animation to complete
    await host.page.waitForTimeout(1500);

    // Try invalid guess BRAKE (missing C which was yellow)
    await host.typeGuess('BRAKE');
    await host.submitGuess();

    // Should see error about missing C
    await host.waitForMessage('must contain C');
  });
});
