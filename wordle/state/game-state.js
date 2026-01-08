/**
 * Wordle Game State
 * Centralized state management for the Wordle client.
 *
 * Key design decisions:
 * - allPlayersReady is a COMPUTED GETTER, not stored (fixes race condition)
 * - Reset methods ensure complete state cleanup
 * - Designed for iOS portability (state shape can translate to Swift)
 */

class GameState {
  constructor() {
    // ==========================================================================
    // Connection State
    // ==========================================================================
    this.socket = null;
    this.playerId = null;
    this.roomCode = null;
    this.isReconnecting = false;

    // ==========================================================================
    // Room State
    // ==========================================================================
    this.isCreator = false;
    this.isReady = false;
    this.gameMode = 'casual'; // 'casual' | 'competitive'
    this.wordMode = 'daily'; // 'daily' | 'random' | 'sabotage'
    this.hardMode = false; // Hard Mode: must use revealed hints
    this.dailyNumber = null;
    this.isRoomPublic = true;
    this.isSolo = false; // Solo practice mode (no stats, skip waiting room)
    this.playersInRoom = []; // Array of { id, name, isCreator, isReady, connectionState }

    // Pending room config (before room creation)
    this.pendingConfig = {
      gameMode: 'casual',
      wordMode: 'daily',
      isPublic: true,
      hardMode: false,
    };

    // ==========================================================================
    // Game State
    // ==========================================================================
    this.gamePhase = 'lobby'; // 'lobby' | 'waiting' | 'selecting' | 'playing' | 'results'
    this.currentGuess = '';
    this.guesses = [];
    this.guessResults = [];
    this.opponents = new Map(); // Map<playerId, { name, guessResults, isFinished, won }>
    this.targetWord = null; // Server-provided word (never displayed to user)
    this.gameTimer = 0; // Current game time in ms
    this.playerTimes = {}; // Per-player timing: { [playerId]: { elapsed, finishTime, finished } }

    // Dictionary validation state
    this.lastRejectedWord = null;
    this.rejectionCount = 0;

    // ==========================================================================
    // Sabotage Mode Selection Phase
    // ==========================================================================
    this.selectionWord = ''; // Word being typed in selection phase
    this.selectionSubmitted = false; // Whether player has submitted their word
    this.selectionDeadline = null; // Server deadline timestamp
    this.selectionTimerId = null; // Interval for countdown display
    this.wordAssignments = null; // Array from server: [{ targetId, targetName, word, pickerId, pickerName }]

    // ==========================================================================
    // Auth State
    // ==========================================================================
    this.authUser = null; // { email, name, userId } or null
    this.supabase = null;
    this.supabaseConfig = null;

    // ==========================================================================
    // Daily Challenge State
    // ==========================================================================
    this.todaysDailyNumber = null;
    this.todayCompleted = false;
    this.todayCompletionData = null; // Full completion data for word reveal

    // Historical dailies
    this.historicalDailiesData = null; // Cached API response
    this.selectedHistoricalDaily = null; // { daily_number, date }

    // Pending actions
    this.pendingDailyAction = null; // { type: 'solo' | 'friends', dailyNumber }
    this.pendingResumeGuesses = null; // { guesses: [], guessResults: [] }

    // ==========================================================================
    // Lobby State
    // ==========================================================================
    this.publicRooms = [];
    this.isSubscribedToLobby = false;
  }

  // ============================================================================
  // COMPUTED PROPERTIES (fixes race conditions)
  // ============================================================================

  /**
   * CRITICAL: allPlayersReady is DERIVED from playersInRoom
   * This fixes the race condition where server message and local state could desync.
   * Now it's always computed from the source of truth.
   */
  get allPlayersReady() {
    return this.playersInRoom.length > 0 && this.playersInRoom.every((p) => p.isReady);
  }

  /**
   * Check if currently in a room
   */
  get isInRoom() {
    return !!this.roomCode;
  }

  /**
   * Check if game is active
   */
  get isPlaying() {
    return this.gamePhase === 'playing';
  }

  /**
   * Check if player can submit a guess
   */
  get canGuess() {
    return this.isPlaying && this.guesses.length < 6;
  }

  /**
   * Get current row index (0-5)
   */
  get currentRowIndex() {
    return this.guesses.length;
  }

  // ============================================================================
  // RESET METHODS (ensure complete state cleanup)
  // ============================================================================

  /**
   * Reset all room-related state when leaving a room.
   * CRITICAL: Always clears opponents Map to prevent ghost opponents bug.
   */
  resetRoom() {
    this.roomCode = null;
    this.playerId = null;
    this.isCreator = false;
    this.isReady = false;
    this.gameMode = 'casual';
    this.wordMode = 'daily';
    this.dailyNumber = null;
    this.isRoomPublic = true;
    this.isSolo = false;
    this.playersInRoom = [];
    this.gamePhase = 'lobby';

    // Reset game state too
    this.resetGame();
  }

  /**
   * Reset game state for new game (within same room).
   */
  resetGame() {
    this.currentGuess = '';
    this.guesses = [];
    this.guessResults = [];
    this.opponents.clear(); // CRITICAL: Prevents ghost opponents
    this.targetWord = null;
    this.gameTimer = 0;
    this.playerTimes = {};
    this.lastRejectedWord = null;
    this.rejectionCount = 0;

    // Reset selection phase state
    this.selectionWord = '';
    this.selectionSubmitted = false;
    this.selectionDeadline = null;
    if (this.selectionTimerId) {
      clearInterval(this.selectionTimerId);
      this.selectionTimerId = null;
    }
    this.wordAssignments = null;
  }

  /**
   * Reset validation state (e.g., when user changes their guess)
   */
  resetValidation() {
    this.lastRejectedWord = null;
    this.rejectionCount = 0;
  }

  /**
   * Reset daily challenge state
   */
  resetDailyState() {
    this.pendingDailyAction = null;
    this.pendingResumeGuesses = null;
    this.selectedHistoricalDaily = null;
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Set room identity (called on room create/join)
   */
  setRoomIdentity(roomCode, playerId, isCreator) {
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.isCreator = isCreator;
  }

  /**
   * Set room configuration
   */
  setRoomConfig(gameMode, wordMode, dailyNumber, isPublic) {
    this.gameMode = gameMode;
    this.wordMode = wordMode;
    this.dailyNumber = dailyNumber;
    this.isRoomPublic = isPublic;
  }

  /**
   * Add a guess result
   */
  addGuessResult(word, result) {
    this.guesses.push(word);
    this.guessResults.push(result);
    this.currentGuess = '';
  }

  /**
   * Update opponent state
   */
  updateOpponent(playerId, data) {
    const existing = this.opponents.get(playerId) || {};
    this.opponents.set(playerId, { ...existing, ...data });
  }

  /**
   * Update player ready status in playersInRoom
   */
  setPlayerReady(playerId, isReady) {
    const player = this.playersInRoom.find((p) => p.id === playerId);
    if (player) {
      player.isReady = isReady;
    }
    // Note: allPlayersReady getter will recompute automatically
  }

  /**
   * Get current player from playersInRoom
   */
  getCurrentPlayer() {
    return this.playersInRoom.find((p) => p.id === this.playerId);
  }
}

// Export singleton instance
export const state = new GameState();

// Export class for testing
export { GameState };
