/**
 * Wordle WebSocket Module
 *
 * WEB-ONLY: This module is NOT portable to iOS.
 * iOS equivalent: URLSessionWebSocketTask or Starscream library.
 *
 * This module handles:
 * - WebSocket connection management
 * - Automatic reconnection
 * - Message serialization/deserialization
 *
 * The message PROTOCOL is shared with iOS - same message types and payloads.
 * Only the transport layer differs.
 *
 * iOS Protocol Reference:
 * - connect(url, handlers) → URLSessionWebSocketTask.resume()
 * - send(message)          → task.send(.string(json))
 * - disconnect()           → task.cancel()
 * - onMessage callback     → task.receive { result in ... }
 */

import { state } from '../state/game-state.js';

// =============================================================================
// Module State
// =============================================================================

/** @type {WebSocket|null} */
let socket = null;

/** @type {number|null} */
let reconnectTimer = null;

/** @type {Function|null} Stored reconnect function */
let reconnectFn = null;

/** @type {number} Reconnect delay in ms */
const RECONNECT_DELAY_MS = 3000;

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Build WebSocket URL from current location.
 *
 * iOS: Use explicit URL from config/environment.
 *
 * @param {string} [path='/wordle'] - WebSocket endpoint path
 * @returns {string} Full WebSocket URL (wss:// or ws://)
 */
export function buildUrl(path = '/wordle') {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

/**
 * Connect to WebSocket server.
 *
 * iOS equivalent:
 * ```swift
 * let task = URLSession.shared.webSocketTask(with: url)
 * task.resume()
 * receiveNextMessage(task, handlers)
 * ```
 *
 * @param {string} url - WebSocket URL
 * @param {Object} handlers - Event handlers
 * @param {Function} [handlers.onOpen] - Called when connection opens
 * @param {Function} [handlers.onClose] - Called when connection closes
 * @param {Function} [handlers.onError] - Called on error
 * @param {Function} [handlers.onMessage] - Called with parsed message object
 */
export function connect(url, handlers = {}) {
  const { onOpen, onClose, onError, onMessage } = handlers;

  // Cancel any pending reconnect
  cancelReconnect();

  // Create new connection
  socket = new WebSocket(url);

  socket.onopen = () => {
    state.isReconnecting = false;
    if (onOpen) onOpen();
  };

  socket.onclose = () => {
    socket = null;
    if (onClose) onClose();
  };

  socket.onerror = (err) => {
    if (onError) onError(err);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (onMessage) onMessage(msg);
    } catch (e) {
      console.error('[WebSocket] Parse error:', e);
    }
  };
}

/**
 * Send a message through the WebSocket.
 *
 * iOS equivalent:
 * ```swift
 * let data = try JSONEncoder().encode(message)
 * try await task.send(.string(String(data: data, encoding: .utf8)!))
 * ```
 *
 * @param {Object} message - Message object to send
 * @returns {boolean} True if message was sent, false if not connected
 */
export function send(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return true;
  }
  return false;
}

/**
 * Disconnect from WebSocket server.
 *
 * iOS equivalent:
 * ```swift
 * task.cancel(with: .normalClosure, reason: nil)
 * ```
 */
export function disconnect() {
  cancelReconnect();
  if (socket) {
    socket.close();
    socket = null;
  }
}

/**
 * Check if WebSocket is currently connected.
 *
 * iOS equivalent:
 * ```swift
 * task.state == .running
 * ```
 *
 * @returns {boolean} True if connected and ready
 */
export function isConnected() {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}

/**
 * Get current connection state.
 *
 * @returns {'connecting'|'open'|'closing'|'closed'|'disconnected'}
 */
export function getState() {
  if (!socket) return 'disconnected';
  switch (socket.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting';
    case WebSocket.OPEN:
      return 'open';
    case WebSocket.CLOSING:
      return 'closing';
    case WebSocket.CLOSED:
      return 'closed';
    default:
      return 'disconnected';
  }
}

// =============================================================================
// Reconnection Logic
// =============================================================================

/**
 * Schedule automatic reconnection.
 *
 * iOS equivalent: Use Combine or async/await retry logic.
 *
 * @param {Function} connectFn - Function to call for reconnection
 * @param {number} [delay=RECONNECT_DELAY_MS] - Delay before reconnecting
 */
export function scheduleReconnect(connectFn, delay = RECONNECT_DELAY_MS) {
  cancelReconnect();
  state.isReconnecting = true;
  reconnectFn = connectFn;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (reconnectFn) reconnectFn();
  }, delay);
}

/**
 * Cancel pending reconnection.
 */
export function cancelReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectFn = null;
}

/**
 * Check if reconnection is pending.
 *
 * @returns {boolean} True if reconnection is scheduled
 */
export function isReconnecting() {
  return reconnectTimer !== null || state.isReconnecting;
}

// =============================================================================
// Message Protocol Types (Shared with iOS)
// =============================================================================

/**
 * Message types sent TO server.
 *
 * iOS: enum ClientMessageType: String, Codable { ... }
 */
export const ClientMessageTypes = {
  // Room Management
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  MARK_READY: 'markReady',
  START_GAME: 'startGame',

  // Gameplay
  GUESS: 'guess',
  PLAY_AGAIN: 'playAgain',

  // Sabotage Mode
  SUBMIT_WORD: 'submitWord',

  // Settings
  SET_GAME_MODE: 'setGameMode',
  SET_WORD_MODE: 'setWordMode',
  SET_HARD_MODE: 'setHardMode',
  SET_ROOM_VISIBILITY: 'setRoomVisibility',

  // Reconnection
  REJOIN: 'rejoin',

  // Lobby
  SUBSCRIBE_LOBBY: 'subscribeLobby',
  UNSUBSCRIBE_LOBBY: 'unsubscribeLobby',
};

/**
 * Message types received FROM server.
 *
 * iOS: enum ServerMessageType: String, Codable { ... }
 */
export const ServerMessageTypes = {
  // Room Events
  ROOM_CREATED: 'roomCreated',
  ROOM_JOINED: 'roomJoined',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  ROOM_CLOSED: 'roomClosed',
  BECAME_CREATOR: 'becameCreator',
  LEFT_ROOM: 'leftRoom',

  // Settings Changes
  GAME_MODE_CHANGED: 'gameModeChanged',
  WORD_MODE_CHANGED: 'wordModeChanged',
  HARD_MODE_CHANGED: 'hardModeChanged',
  ROOM_VISIBILITY_CHANGED: 'roomVisibilityChanged',

  // Ready State
  PLAYER_READY_CHANGED: 'playerReadyChanged',
  ALL_PLAYERS_READY_STATUS: 'allPlayersReadyStatus',

  // Game Flow
  COUNTDOWN: 'countdown',
  GAME_STARTED: 'gameStarted',
  TIMER_SYNC: 'timerSync',
  GUESS_RESULT: 'guessResult',
  OPPONENT_GUESS: 'opponentGuess',
  GAME_ENDED: 'gameEnded',
  RETURNED_TO_LOBBY: 'returnedToLobby',
  HARD_MODE_VIOLATION: 'hardModeViolation',

  // Reconnection
  REJOIN_WAITING: 'rejoinWaiting',
  REJOIN_GAME: 'rejoinGame',
  REJOIN_RESULTS: 'rejoinResults',
  REJOIN_SELECTING: 'rejoinSelecting',
  REJOIN_FAILED: 'rejoinFailed',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  PLAYER_RECONNECTED: 'playerReconnected',
  REPLACED_BY_NEW_CONNECTION: 'replacedByNewConnection',

  // Lobby
  PUBLIC_ROOMS_LIST: 'publicRoomsList',

  // Sabotage Mode
  SELECTION_PHASE_STARTED: 'selectionPhaseStarted',
  WORD_VALIDATION: 'wordValidation',
  WORD_SUBMITTED: 'wordSubmitted',
  SELECTION_PROGRESS: 'selectionProgress',
  ALL_WORDS_SUBMITTED: 'allWordsSubmitted',
  SELECTION_TIMEOUT: 'selectionTimeout',

  // Errors
  ERROR: 'error',
};
