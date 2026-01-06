import { Page, BrowserContext, expect } from '@playwright/test';

/**
 * Page Object Model for a Wordle Battle player.
 *
 * Encapsulates common player actions for cleaner test code.
 * Each PlayerPage operates on its own isolated browser context.
 */
export class PlayerPage {
  readonly page: Page;
  readonly context: BrowserContext;
  readonly name: string;

  constructor(page: Page, context: BrowserContext, name: string) {
    this.page = page;
    this.context = context;
    this.name = name;
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================

  async goto() {
    await this.page.goto(`/wordle/?playerName=${this.name}&fresh=true`);
    await this.page.waitForSelector('[data-testid="lobby"]');
  }

  async gotoWithAutoJoin(roomCode: string) {
    await this.page.goto(
      `/wordle/?playerName=${this.name}&fresh=true&autoJoin=${roomCode}`
    );
    await this.page.waitForSelector('[data-testid="room-code"]');
  }

  // ==========================================================================
  // Room Creation
  // ==========================================================================

  async openFriendsSheet() {
    await this.page.click('text=Play With Friends');
    await this.page.waitForSelector('[data-testid="create-room"]');
  }

  async createRoom(options: {
    wordMode?: 'daily' | 'random' | 'sabotage';
    gameMode?: 'casual' | 'competitive';
    isPublic?: boolean;
  } = {}) {
    await this.openFriendsSheet();
    await this.page.click('[data-testid="create-room"]');

    // Wait for config modal
    await this.page.waitForSelector('text=Word Selection');

    // Set word mode
    if (options.wordMode) {
      await this.page.click(`button[data-mode="${options.wordMode}"]`);
    }

    // Set game mode
    if (options.gameMode) {
      await this.page.click(`button[data-mode="${options.gameMode}"]`);
    }

    // Set visibility
    if (options.isPublic === false) {
      await this.page.click('button[data-visibility="private"]');
    }

    // Create the room
    await this.page.click('button:has-text("Create Room"):not([data-testid])');
    await this.page.waitForSelector('[data-testid="room-code"]');

    return this.getRoomCode();
  }

  // ==========================================================================
  // Room Joining
  // ==========================================================================

  async joinRoom(code: string) {
    await this.openFriendsSheet();
    await this.page.fill('[data-testid="room-code-input"]', code);
    await this.page.click('[data-testid="join-room"]');
    await this.page.waitForSelector('[data-testid="room-code"]');
  }

  // ==========================================================================
  // Waiting Room Actions
  // ==========================================================================

  async markReady() {
    await this.page.click('[data-testid="ready-button"]');
    // Wait for button state to change
    await this.page.waitForSelector(
      '[data-testid="ready-button"]:has-text("Waiting")'
    );
  }

  async startGame() {
    await this.page.waitForSelector(
      '[data-testid="start-game"]:not(.disabled)'
    );
    await this.page.click('[data-testid="start-game"]');
  }

  async leaveRoom() {
    await this.page.click('#leaveRoom');
    await this.page.waitForSelector('[data-testid="lobby"]');
  }

  // ==========================================================================
  // Selection Phase (Sabotage Mode)
  // ==========================================================================

  async waitForSelectionPhase() {
    await this.page.waitForSelector('[data-testid="selection-phase"]');
  }

  async typeSelectionWord(word: string) {
    for (const letter of word.toUpperCase()) {
      await this.page.click(`#selectionKeyboard button[data-key="${letter}"]`);
    }
  }

  async submitSelectionWord() {
    await this.page.click('#submitWordBtn');
    // Wait for status to update
    await this.page.waitForSelector('.selection-status:has-text("Submitted")');
  }

  async pickWord(word: string) {
    await this.typeSelectionWord(word);
    await this.submitSelectionWord();
  }

  // ==========================================================================
  // Game Phase
  // ==========================================================================

  async waitForGamePhase() {
    await this.page.waitForSelector('#game:not(.hidden)');
  }

  async typeGuess(word: string) {
    for (const letter of word.toUpperCase()) {
      await this.page.click(`#keyboard button[data-key="${letter}"]`);
    }
  }

  async submitGuess() {
    await this.page.click('#keyboard button[data-key="ENTER"]');
  }

  async guess(word: string) {
    await this.typeGuess(word);
    await this.submitGuess();
    // Wait for the guess to register (row animation)
    await this.page.waitForTimeout(300);
  }

  async clearGuess() {
    for (let i = 0; i < 5; i++) {
      await this.page.click('#keyboard button[data-key="BACKSPACE"]');
    }
  }

  // ==========================================================================
  // Results Phase
  // ==========================================================================

  async waitForResults() {
    await this.page.waitForSelector('#results:not(.hidden)');
  }

  async getRevealedWord() {
    return this.page.textContent('#revealedWord');
  }

  async playAgain() {
    await this.page.click('#playAgain');
  }

  async backToLobby() {
    await this.page.click('#backToLobby');
    await this.page.waitForSelector('[data-testid="lobby"]');
  }

  // ==========================================================================
  // State Inspection
  // ==========================================================================

  async getRoomCode() {
    const code = await this.page.textContent('[data-testid="room-code"]');
    return code?.trim() ?? '';
  }

  async getPlayers() {
    const players = await this.page.$$eval('#players li', (items) =>
      items.map((item) => ({
        name: item.querySelector('.player-name')?.textContent?.trim(),
        isReady: item.classList.contains('ready'),
        isHost: item.querySelector('.host-badge') !== null,
      }))
    );
    return players;
  }

  async getGamePhase() {
    const views = [
      { selector: '[data-testid="lobby"]:not(.hidden)', phase: 'lobby' },
      { selector: '#roomConfig:not(.hidden)', phase: 'config' },
      { selector: '#waiting:not(.hidden)', phase: 'waiting' },
      {
        selector: '[data-testid="selection-phase"]:not(.hidden)',
        phase: 'selecting',
      },
      { selector: '#game:not(.hidden)', phase: 'playing' },
      { selector: '#results:not(.hidden)', phase: 'results' },
    ];

    for (const { selector, phase } of views) {
      const visible = await this.page.isVisible(selector);
      if (visible) return phase;
    }
    return 'unknown';
  }

  async getTimer() {
    return this.page.textContent('#gameTimer');
  }

  async getMessage() {
    return this.page.textContent('#message');
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  async close() {
    await this.context.close();
  }
}
