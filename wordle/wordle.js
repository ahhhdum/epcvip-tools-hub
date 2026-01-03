/**
 * Wordle Battle - Client
 *
 * Multiplayer Wordle game with real-time opponent visibility.
 */

import { VALID_GUESSES } from './valid-guesses.js';

// State
let socket = null;
let playerId = null;
let roomCode = null;
let isCreator = false;
let isReady = false;
let allPlayersReady = false;
let gameMode = 'casual';
let wordMode = 'daily'; // daily or random
let dailyNumber = null;
let gameState = 'lobby'; // lobby, waiting, playing, results
let currentGuess = '';
let guesses = [];
let guessResults = [];
let opponents = new Map();
let targetWord = null;
let playersInRoom = [];
let gameTimer = 0; // Current game timer in ms
let playerTimes = {}; // Per-player timer data

// Dictionary validation state
let lastRejectedWord = null;
let rejectionCount = 0;

// Auth state (SSO from Tools Hub or direct login)
let authUser = null; // { email, name, userId } if authenticated

// Supabase client (initialized after fetching config)
let supabase = null;
let supabaseConfig = null;

async function fetchSupabaseConfig() {
  if (supabaseConfig) return supabaseConfig;

  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      supabaseConfig = config.supabase;
      return supabaseConfig;
    }
  } catch (e) {
    console.warn('[Wordle Auth] Failed to fetch config:', e);
  }
  return null;
}

function getSupabase() {
  if (!supabase && supabaseConfig?.url && supabaseConfig?.anonKey) {
    supabase = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
  return supabase;
}

// DOM Elements
const views = {
  lobby: document.getElementById('lobby'),
  waiting: document.getElementById('waiting'),
  game: document.getElementById('game'),
  results: document.getElementById('results'),
};

const elements = {
  // Lobby
  playerName: document.getElementById('playerName'),
  createRoom: document.getElementById('createRoom'),
  roomCodeInput: document.getElementById('roomCodeInput'),
  joinRoom: document.getElementById('joinRoom'),

  // Waiting
  roomCode: document.getElementById('roomCode'),
  copyCode: document.getElementById('copyCode'),
  modeCasual: document.getElementById('modeCasual'),
  modeCompetitive: document.getElementById('modeCompetitive'),
  wordModeDaily: document.getElementById('wordModeDaily'),
  wordModeRandom: document.getElementById('wordModeRandom'),
  dailyNumberDisplay: document.getElementById('dailyNumber'),
  players: document.getElementById('players'),
  playerCount: document.getElementById('playerCount'),
  readyBtn: document.getElementById('readyBtn'),
  startGame: document.getElementById('startGame'),
  waitingMessage: document.getElementById('waitingMessage'),
  leaveRoom: document.getElementById('leaveRoom'),
  countdownOverlay: document.getElementById('countdownOverlay'),
  countdownNumber: document.getElementById('countdownNumber'),

  // Game
  opponentBoards: document.getElementById('opponentBoards'),
  grid: document.getElementById('grid'),
  gameTimerDisplay: document.getElementById('gameTimer'),
  message: document.getElementById('message'),
  keyboard: document.getElementById('keyboard'),

  // Results
  revealedWord: document.getElementById('revealedWord'),
  resultsList: document.getElementById('resultsList'),
  playAgain: document.getElementById('playAgain'),
  backToLobby: document.getElementById('backToLobby'),

  // Status
  connectionStatus: document.getElementById('connectionStatus'),
  errorToast: document.getElementById('errorToast'),

  // Stats
  playerStats: document.getElementById('playerStats'),
  statPlayed: document.getElementById('statPlayed'),
  statWinRate: document.getElementById('statWinRate'),
  statStreak: document.getElementById('statStreak'),
  statBestStreak: document.getElementById('statBestStreak'),

  // Auth
  authSection: document.getElementById('authSection'),
  authPrompt: document.getElementById('authPrompt'),
  authStatus: document.getElementById('authStatus'),
  userEmail: document.getElementById('userEmail'),
  loginBtn: document.getElementById('loginBtn'),
  signupBtn: document.getElementById('signupBtn'),
  playAsGuest: document.getElementById('playAsGuest'),
  logoutBtn: document.getElementById('logoutBtn'),

  // Room actions section (hidden until auth choice)
  roomActionsSection: document.getElementById('roomActionsSection'),

  // Auth Modal
  authModal: document.getElementById('authModal'),
  modalTitle: document.getElementById('modalTitle'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authDisplayName: document.getElementById('authDisplayName'),
  displayNameGroup: document.getElementById('displayNameGroup'),
  authError: document.getElementById('authError'),
  authSubmit: document.getElementById('authSubmit'),
  closeModal: document.getElementById('closeModal'),
  authToggle: document.getElementById('authToggle'),
  switchToSignup: document.getElementById('switchToSignup'),
};

// SSO Token Handling
async function checkSSOToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const ssoToken = urlParams.get('sso_token');

  if (!ssoToken) {
    return null;
  }

  // Clean up URL (remove token from address bar)
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);

  try {
    const response = await fetch('/api/wordle/sso-validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ssoToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.warn('[Wordle] SSO validation failed:', error.error);
      return null;
    }

    const result = await response.json();
    console.log('[Wordle] SSO login successful:', result.email);

    return {
      email: result.email,
      name: result.name,
      userId: result.userId,
    };
  } catch (e) {
    console.warn('[Wordle] SSO validation error:', e);
    return null;
  }
}

// Fetch player stats
async function fetchPlayerStats(email) {
  try {
    const response = await fetch(`/api/wordle/stats/${encodeURIComponent(email)}`);
    if (!response.ok) {
      console.warn('[Wordle] Stats fetch failed');
      return null;
    }
    return await response.json();
  } catch (e) {
    console.warn('[Wordle] Stats fetch error:', e);
    return null;
  }
}

// Display player stats in lobby
function displayStats(stats) {
  if (!stats || !elements.playerStats) return;

  elements.statPlayed.textContent = stats.games_played || 0;

  const winRate =
    stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
  elements.statWinRate.textContent = `${winRate}%`;

  elements.statStreak.textContent = stats.current_streak || 0;
  elements.statBestStreak.textContent = stats.best_streak || 0;

  elements.playerStats.classList.remove('hidden');
}

// Auth Functions
let isSignupMode = false;

async function login(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Auth not available');

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  return data.user;
}

async function signup(email, password, displayName) {
  const client = getSupabase();
  if (!client) throw new Error('Auth not available');

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, user_type: 'external' },
    },
  });

  if (error) throw error;

  // Create players profile
  if (data.user) {
    const { error: profileError } = await client.from('players').upsert({
      id: data.user.id,
      display_name: displayName,
      user_type: 'external',
    });

    if (profileError) {
      console.error('[Wordle Auth] Profile creation error:', profileError);
    }
  }

  return data.user;
}

async function logout() {
  const client = getSupabase();
  if (client) {
    await client.auth.signOut();
  }
  authUser = null;
  updateAuthUI();
  elements.playerStats.classList.add('hidden');
}

async function checkExistingSession() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      // Get display name from profile or metadata
      let displayName = user.user_metadata?.display_name || user.email.split('@')[0];

      // Try to get from players table
      const { data: profile } = await client.from('players').select('display_name').eq('id', user.id).single();
      if (profile?.display_name) {
        displayName = profile.display_name;
      }

      return {
        email: user.email,
        name: displayName,
        userId: user.id,
      };
    }
  } catch (e) {
    console.warn('[Wordle Auth] Session check error:', e);
  }
  return null;
}

function updateAuthUI() {
  if (!elements.authPrompt || !elements.authStatus) return;

  if (authUser) {
    // Logged in - show status, hide prompt, show room actions
    elements.authPrompt.classList.add('hidden');
    elements.authStatus.classList.remove('hidden');
    elements.userEmail.textContent = authUser.email;
    if (elements.roomActionsSection) {
      elements.roomActionsSection.classList.remove('hidden');
    }
  } else {
    // Not logged in - show prompt, hide status, hide room actions (until guest chosen)
    elements.authPrompt.classList.remove('hidden');
    elements.authStatus.classList.add('hidden');
    // Room actions stay hidden until user clicks "play as guest"
  }
}

function showAuthModal(signup = false) {
  isSignupMode = signup;

  elements.modalTitle.textContent = signup ? 'Sign Up' : 'Login';
  elements.authSubmit.textContent = signup ? 'Sign Up' : 'Login';

  if (signup) {
    elements.displayNameGroup.classList.remove('hidden');
    elements.authToggle.innerHTML = 'Already have an account? <a href="#" id="switchToLogin">Login</a>';
  } else {
    elements.displayNameGroup.classList.add('hidden');
    elements.authToggle.innerHTML = 'Don\'t have an account? <a href="#" id="switchToSignup">Sign up</a>';
  }

  // Rebind toggle link
  const toggleLink = elements.authToggle.querySelector('a');
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthModal(!isSignupMode);
  });

  elements.authError.classList.add('hidden');
  elements.authForm.reset();
  elements.authModal.classList.remove('hidden');
}

function hideAuthModal() {
  elements.authModal.classList.add('hidden');
  elements.authForm.reset();
  elements.authError.classList.add('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  const displayName = elements.authDisplayName.value.trim() || email.split('@')[0];

  elements.authError.classList.add('hidden');
  elements.authSubmit.disabled = true;
  elements.authSubmit.textContent = isSignupMode ? 'Signing up...' : 'Logging in...';

  try {
    let user;
    if (isSignupMode) {
      user = await signup(email, password, displayName);
      // Check if email confirmation is required
      if (user && !user.confirmed_at) {
        elements.authError.textContent = 'Check your email to confirm your account!';
        elements.authError.style.color = 'var(--correct)';
        elements.authError.classList.remove('hidden');
        elements.authSubmit.disabled = false;
        elements.authSubmit.textContent = 'Sign Up';
        return;
      }
    } else {
      user = await login(email, password);
    }

    if (user) {
      // Get display name
      let name = user.user_metadata?.display_name || displayName;
      const client = getSupabase();
      if (client) {
        const { data: profile } = await client.from('players').select('display_name').eq('id', user.id).single();
        if (profile?.display_name) {
          name = profile.display_name;
        }
      }

      authUser = {
        email: user.email,
        name: name,
        userId: user.id,
      };

      // Update UI
      elements.playerName.value = authUser.name;
      localStorage.setItem('wordle_playerName', authUser.name);
      updateAuthUI();
      hideAuthModal();

      // Fetch and display stats
      const stats = await fetchPlayerStats(authUser.email);
      if (stats) {
        displayStats(stats);
      }

      console.log('[Wordle Auth] Logged in as:', authUser.email);
    }
  } catch (error) {
    console.error('[Wordle Auth] Error:', error);
    elements.authError.textContent = error.message || 'Authentication failed';
    elements.authError.style.color = 'var(--danger)';
    elements.authError.classList.remove('hidden');
  }

  elements.authSubmit.disabled = false;
  elements.authSubmit.textContent = isSignupMode ? 'Sign Up' : 'Login';
}

// Initialize
async function init() {
  // Fetch Supabase config from server
  await fetchSupabaseConfig();

  // Priority 1: Check for SSO token from Tools Hub
  authUser = await checkSSOToken();

  // Priority 2: Check for existing Supabase session
  if (!authUser) {
    authUser = await checkExistingSession();
  }

  if (authUser) {
    // Authenticated user - pre-fill name and save
    elements.playerName.value = authUser.name;
    localStorage.setItem('wordle_playerName', authUser.name);
    console.log('[Wordle] Logged in as:', authUser.name);

    // Fetch and display stats
    const stats = await fetchPlayerStats(authUser.email);
    if (stats) {
      displayStats(stats);
    }
  } else {
    // Guest or returning user - load saved name
    const savedName = localStorage.getItem('wordle_playerName');
    if (savedName) {
      elements.playerName.value = savedName;
    }
  }

  // Update auth UI
  updateAuthUI();

  // Connect to WebSocket
  connect();

  // Event listeners
  setupEventListeners();

  // Build grid
  buildGrid();
}

// WebSocket Connection
function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/wordle`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('[Wordle] Connected');
    updateConnectionStatus('connected');
  };

  socket.onclose = () => {
    console.log('[Wordle] Disconnected');
    updateConnectionStatus('disconnected');

    // Try to reconnect after delay
    setTimeout(connect, 3000);
  };

  socket.onerror = (err) => {
    console.error('[Wordle] Socket error:', err);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    } catch (e) {
      console.error('[Wordle] Parse error:', e);
    }
  };
}

function send(msg) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function updateConnectionStatus(status) {
  elements.connectionStatus.className = `connection-status ${status}`;
  elements.connectionStatus.querySelector('.status-text').textContent =
    status === 'connected' ? 'Connected' : 'Disconnected';
}

// Message Handler
function handleMessage(msg) {
  console.log('[Wordle] Received:', msg.type, msg);

  switch (msg.type) {
    case 'roomCreated':
      handleRoomCreated(msg);
      break;
    case 'roomJoined':
      handleRoomJoined(msg);
      break;
    case 'playerJoined':
      handlePlayerJoined(msg);
      break;
    case 'playerLeft':
      handlePlayerLeft(msg);
      break;
    case 'becameCreator':
      handleBecameCreator();
      break;
    case 'gameModeChanged':
      handleGameModeChanged(msg);
      break;
    case 'wordModeChanged':
      handleWordModeChanged(msg);
      break;
    case 'playerReadyChanged':
      handlePlayerReadyChanged(msg);
      break;
    case 'allPlayersReadyStatus':
      handleAllPlayersReadyStatus(msg);
      break;
    case 'countdown':
      handleCountdown(msg);
      break;
    case 'gameStarted':
      handleGameStarted(msg);
      break;
    case 'timerSync':
      handleTimerSync(msg);
      break;
    case 'guessResult':
      handleGuessResult(msg);
      break;
    case 'opponentGuess':
      handleOpponentGuess(msg);
      break;
    case 'gameEnded':
      handleGameEnded(msg);
      break;
    case 'returnedToLobby':
      handleReturnedToLobby();
      break;
    case 'error':
      showError(msg.message);
      break;
  }
}

// Room Handlers
function handleRoomCreated(msg) {
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  isCreator = true;
  isReady = false;
  allPlayersReady = false;
  wordMode = 'daily';
  dailyNumber = null;

  showView('waiting');
  elements.roomCode.textContent = roomCode;
  elements.startGame.classList.remove('hidden');
  elements.waitingMessage.classList.add('hidden');

  // Enable mode buttons for creator
  elements.modeCasual.disabled = false;
  elements.modeCompetitive.disabled = false;
  if (elements.wordModeDaily) elements.wordModeDaily.disabled = false;
  if (elements.wordModeRandom) elements.wordModeRandom.disabled = false;

  playersInRoom = [{ id: playerId, name: getPlayerName(), isCreator: true, isReady: false }];
  updatePlayerList(playersInRoom);
  updateModeButtons(gameMode);
  updateWordModeButtons();
  updateReadyButton();
  updateStartButton();
}

function handleRoomJoined(msg) {
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  isCreator = msg.isCreator;
  gameMode = msg.gameMode || 'casual';
  wordMode = msg.wordMode || 'daily';
  isReady = false;
  allPlayersReady = false;

  showView('waiting');
  elements.roomCode.textContent = roomCode;

  if (isCreator) {
    elements.startGame.classList.remove('hidden');
    elements.waitingMessage.classList.add('hidden');
    elements.modeCasual.disabled = false;
    elements.modeCompetitive.disabled = false;
    if (elements.wordModeDaily) elements.wordModeDaily.disabled = false;
    if (elements.wordModeRandom) elements.wordModeRandom.disabled = false;
  } else {
    elements.startGame.classList.add('hidden');
    elements.waitingMessage.classList.remove('hidden');
    // Disable mode buttons for non-creators
    elements.modeCasual.disabled = true;
    elements.modeCompetitive.disabled = true;
    if (elements.wordModeDaily) elements.wordModeDaily.disabled = true;
    if (elements.wordModeRandom) elements.wordModeRandom.disabled = true;
  }

  // Store players with ready status
  playersInRoom = msg.players.map((p) => ({
    ...p,
    isReady: p.isReady || false,
  }));
  updatePlayerList(playersInRoom);
  updateModeButtons(gameMode);
  updateWordModeButtons();
  updateReadyButton();
  updateStartButton();
}

function handlePlayerJoined(msg) {
  // Add to players list
  const newPlayer = {
    id: msg.player.id,
    name: msg.player.name,
    isCreator: msg.player.isCreator,
    isReady: msg.player.isReady || false,
  };
  playersInRoom.push(newPlayer);
  updatePlayerList(playersInRoom, msg.player.id);

  // Show toast notification
  showInfoToast(`${msg.player.name} joined`);

  // Update start button (in case we now have enough players)
  updateStartButton();
}

function handlePlayerLeft(msg) {
  // Find player name before removing
  const leavingPlayer = playersInRoom.find((p) => p.id === msg.playerId);
  const playerName = leavingPlayer?.name || 'A player';

  // Remove from players list
  playersInRoom = playersInRoom.filter((p) => p.id !== msg.playerId);
  updatePlayerList(playersInRoom);

  // Show toast notification
  showInfoToast(`${playerName} left`);

  // Update start button
  updateStartButton();

  // Remove from opponents in game
  opponents.delete(msg.playerId);
  renderOpponentBoards();
}

function handleBecameCreator() {
  isCreator = true;
  elements.startGame.classList.remove('hidden');
  elements.waitingMessage.classList.add('hidden');
  elements.modeCasual.disabled = false;
  elements.modeCompetitive.disabled = false;

  // Check if all players ready and update start button
  allPlayersReady = playersInRoom.every((p) => p.isReady);
  updateStartButton();
}

function handleGameModeChanged(msg) {
  gameMode = msg.mode;
  updateModeButtons(gameMode);
}

function handleWordModeChanged(msg) {
  wordMode = msg.mode;
  dailyNumber = msg.dailyNumber;
  updateWordModeButtons();
}

function handlePlayerReadyChanged(msg) {
  // Update player in our list
  const player = playersInRoom.find((p) => p.id === msg.playerId);
  if (player) {
    player.isReady = msg.isReady;
    updatePlayerList(playersInRoom);
  }

  // Update our own ready state if it's us
  if (msg.playerId === playerId) {
    isReady = msg.isReady;
    updateReadyButton();
  }
}

function handleAllPlayersReadyStatus(msg) {
  allPlayersReady = msg.allReady;
  updateStartButton();
}

function handleCountdown(msg) {
  // Show countdown overlay
  if (elements.countdownOverlay) {
    elements.countdownOverlay.classList.remove('hidden');
    elements.countdownNumber.textContent = msg.count;
    elements.countdownNumber.classList.add('pulse');

    // Remove pulse animation class after animation completes
    setTimeout(() => {
      elements.countdownNumber.classList.remove('pulse');
    }, 500);
  }
}

// Timer helper
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function handleTimerSync(msg) {
  gameTimer = msg.gameTime;
  playerTimes = msg.playerTimes;

  // Update main timer display
  if (elements.gameTimerDisplay) {
    const myTime = playerTimes[playerId];
    if (myTime && myTime.finished) {
      elements.gameTimerDisplay.textContent = formatTime(myTime.finishTime);
      elements.gameTimerDisplay.classList.add('finished');
    } else {
      elements.gameTimerDisplay.textContent = formatTime(gameTimer);
      elements.gameTimerDisplay.classList.remove('finished');
    }
  }

  // Update opponent boards with times (re-render to include times)
  renderOpponentBoards();
}

// Game Handlers
function handleGameStarted(msg) {
  // Hide countdown overlay
  if (elements.countdownOverlay) {
    elements.countdownOverlay.classList.add('hidden');
  }
  gameState = 'playing';
  gameTimer = 0;
  playerTimes = {};
  currentGuess = '';
  guesses = [];
  guessResults = [];
  lastRejectedWord = null;
  rejectionCount = 0;

  // Initialize opponent boards
  opponents.clear();
  for (const player of msg.players) {
    if (player.id !== playerId) {
      opponents.set(player.id, {
        name: player.name,
        guesses: [],
        guessResults: [],
        isFinished: false,
        won: false,
      });
    }
  }

  showView('game');
  buildGrid();
  renderOpponentBoards();
  resetKeyboard();
  elements.message.textContent = '';
}

function handleGuessResult(msg) {
  guesses.push(msg.word);
  guessResults.push(msg.result);

  // Update grid with results
  const rowIndex = guesses.length - 1;
  const row = elements.grid.children[rowIndex];
  for (let i = 0; i < 5; i++) {
    const tile = row.children[i];
    tile.textContent = msg.word[i];
    tile.classList.add(msg.result[i]);
  }

  // Update keyboard
  for (let i = 0; i < 5; i++) {
    updateKeyboardKey(msg.word[i], msg.result[i]);
  }

  currentGuess = '';

  if (msg.isWin) {
    elements.message.textContent = 'You won!';
    elements.message.className = 'game-message success';
  } else if (msg.isLoss) {
    elements.message.textContent = 'Out of guesses!';
    elements.message.className = 'game-message error';
  }
}

function handleOpponentGuess(msg) {
  const opponent = opponents.get(msg.playerId);
  if (!opponent) return;

  opponent.guessResults.push(msg.colors);
  opponent.isFinished = msg.isFinished;
  opponent.won = msg.won;

  renderOpponentBoards();
}

function handleGameEnded(msg) {
  gameState = 'results';
  targetWord = msg.word;

  showView('results');
  elements.revealedWord.textContent = msg.word;

  // Build results list
  elements.resultsList.innerHTML = '';
  msg.results.forEach((result, index) => {
    const li = document.createElement('li');

    let rankClass = '';
    if (index === 0) rankClass = 'gold';
    else if (index === 1) rankClass = 'silver';
    else if (index === 2) rankClass = 'bronze';

    const timeStr = result.time ? `${(result.time / 1000).toFixed(1)}s` : '-';
    const statsStr =
      gameMode === 'competitive'
        ? `${result.guesses} guesses • ${timeStr} • ${result.score} pts`
        : `${result.guesses} guesses • ${timeStr}`;

    li.innerHTML = `
      <span class="rank ${rankClass}">${index + 1}</span>
      <div class="player-info">
        <div class="player-name">${result.name}${result.playerId === playerId ? ' (You)' : ''}</div>
        <div class="player-stats">${statsStr}</div>
      </div>
      <span class="result-badge ${result.won ? 'won' : 'lost'}">${result.won ? 'Solved' : 'Failed'}</span>
    `;
    elements.resultsList.appendChild(li);
  });
}

function handleReturnedToLobby() {
  gameState = 'waiting';
  isReady = false;
  allPlayersReady = false;

  // Reset all players' ready status
  playersInRoom = playersInRoom.map((p) => ({ ...p, isReady: false }));

  showView('waiting');
  updatePlayerList(playersInRoom);
  updateReadyButton();
  updateStartButton();
}

// UI Helpers
function showView(name) {
  for (const [key, view] of Object.entries(views)) {
    view.classList.toggle('hidden', key !== name);
  }
}

function updatePlayerList(players, highlightPlayerId = null) {
  elements.players.innerHTML = '';

  // Update player count
  if (elements.playerCount) {
    elements.playerCount.textContent = `(${players.length})`;
  }

  for (const player of players) {
    const li = document.createElement('li');
    li.id = `player-${player.id}`;

    // Add highlight animation for newly joined players
    if (highlightPlayerId && player.id === highlightPlayerId) {
      li.classList.add('player-joined');
    }

    const readyIndicator = player.isReady
      ? '<span class="ready-indicator ready">✓</span>'
      : '<span class="ready-indicator not-ready">○</span>';

    li.innerHTML = `
      ${readyIndicator}
      <span class="player-name">${player.name}${player.id === playerId ? ' (You)' : ''}</span>
      ${player.isCreator ? '<span class="host-badge">Host</span>' : ''}
    `;
    elements.players.appendChild(li);
  }
}

function updateModeButtons(mode) {
  elements.modeCasual.classList.toggle('active', mode === 'casual');
  elements.modeCompetitive.classList.toggle('active', mode === 'competitive');
}

function updateWordModeButtons() {
  if (elements.wordModeDaily) {
    elements.wordModeDaily.classList.toggle('active', wordMode === 'daily');
  }
  if (elements.wordModeRandom) {
    elements.wordModeRandom.classList.toggle('active', wordMode === 'random');
  }
  if (elements.dailyNumberDisplay) {
    if (wordMode === 'daily' && dailyNumber) {
      elements.dailyNumberDisplay.textContent = `#${dailyNumber}`;
      elements.dailyNumberDisplay.classList.remove('hidden');
    } else {
      elements.dailyNumberDisplay.classList.add('hidden');
    }
  }
}

function updateReadyButton() {
  if (!elements.readyBtn) return;

  if (isReady) {
    elements.readyBtn.textContent = 'Not Ready';
    elements.readyBtn.classList.add('ready');
  } else {
    elements.readyBtn.textContent = "I'm Ready";
    elements.readyBtn.classList.remove('ready');
  }
}

function updateStartButton() {
  if (!elements.startGame || !isCreator) return;

  if (allPlayersReady) {
    elements.startGame.disabled = false;
    elements.startGame.classList.remove('disabled');
  } else {
    elements.startGame.disabled = true;
    elements.startGame.classList.add('disabled');
  }
}

function getPlayerName() {
  return elements.playerName.value.trim() || 'Player';
}

function showError(message) {
  elements.errorToast.textContent = message;
  elements.errorToast.classList.remove('hidden', 'info');
  elements.errorToast.classList.add('error');

  setTimeout(() => {
    elements.errorToast.classList.add('hidden');
  }, 3000);
}

function showInfoToast(message) {
  elements.errorToast.textContent = message;
  elements.errorToast.classList.remove('hidden', 'error');
  elements.errorToast.classList.add('info');

  setTimeout(() => {
    elements.errorToast.classList.add('hidden');
  }, 2000);
}

// Grid
function buildGrid() {
  elements.grid.innerHTML = '';
  for (let row = 0; row < 6; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';
    for (let col = 0; col < 5; col++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      rowDiv.appendChild(tile);
    }
    elements.grid.appendChild(rowDiv);
  }
}

function updateCurrentRow() {
  const rowIndex = guesses.length;
  if (rowIndex >= 6) return;

  const row = elements.grid.children[rowIndex];
  for (let i = 0; i < 5; i++) {
    const tile = row.children[i];
    tile.textContent = currentGuess[i] || '';
    tile.classList.toggle('filled', !!currentGuess[i]);
  }
}

// Keyboard
function resetKeyboard() {
  const keys = elements.keyboard.querySelectorAll('button');
  keys.forEach((key) => {
    key.classList.remove('correct', 'present', 'absent');
  });
}

function updateKeyboardKey(letter, result) {
  const key = elements.keyboard.querySelector(`button[data-key="${letter}"]`);
  if (!key) return;

  // Only upgrade: absent -> present -> correct
  if (result === 'correct') {
    key.classList.remove('present', 'absent');
    key.classList.add('correct');
  } else if (result === 'present' && !key.classList.contains('correct')) {
    key.classList.remove('absent');
    key.classList.add('present');
  } else if (result === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
    key.classList.add('absent');
  }
}

function handleKeyPress(key) {
  if (gameState !== 'playing') return;
  if (guesses.length >= 6) return;

  if (key === 'ENTER') {
    if (currentGuess.length === 5) {
      // Dictionary validation
      if (!VALID_GUESSES.has(currentGuess)) {
        if (currentGuess === lastRejectedWord) {
          rejectionCount++;
          if (rejectionCount >= 2) {
            // Third attempt - force submit
            send({ type: 'guess', word: currentGuess, forced: true });
            lastRejectedWord = null;
            rejectionCount = 0;
            currentGuess = '';
            return;
          }
          // Second attempt - warn them
          showGameMessage("Not recognized. Enter again to force.");
        } else {
          // First attempt with this word
          lastRejectedWord = currentGuess;
          rejectionCount = 0; // Will be 1 on second attempt, 2 on third
          showGameMessage("Not in word list");
        }
        shakeCurrentRow();
        return;
      }

      // Valid word - submit normally
      send({ type: 'guess', word: currentGuess, forced: false });
      lastRejectedWord = null;
      rejectionCount = 0;
      currentGuess = '';
    }
  } else if (key === 'BACKSPACE') {
    currentGuess = currentGuess.slice(0, -1);
    // Reset rejection if changing word
    if (lastRejectedWord && currentGuess !== lastRejectedWord.slice(0, currentGuess.length)) {
      lastRejectedWord = null;
      rejectionCount = 0;
    }
    updateCurrentRow();
  } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
    currentGuess += key;
    updateCurrentRow();
  }
}

// Visual feedback for invalid words
function shakeCurrentRow() {
  const rowIndex = guesses.length;
  if (rowIndex >= 6) return;
  const row = elements.grid.children[rowIndex];
  row.classList.add('shake');
  setTimeout(() => row.classList.remove('shake'), 500);
}

function showGameMessage(text) {
  elements.message.textContent = text;
  elements.message.classList.add('visible');
  setTimeout(() => {
    elements.message.classList.remove('visible');
  }, 2000);
}

// Opponent Boards
function isMobileView() {
  return window.innerWidth <= 768;
}

// Compute best known state per position from all guesses
function computeBestKnownState(guessResults) {
  const bestState = ['', '', '', '', '']; // empty = unknown

  for (const row of guessResults) {
    if (!row) continue;
    for (let col = 0; col < 5; col++) {
      const result = row[col];
      if (result === 'correct') {
        // Green always wins
        bestState[col] = 'correct';
      } else if (result === 'present' && bestState[col] !== 'correct') {
        // Yellow only if not already green
        bestState[col] = 'present';
      }
    }
  }

  return bestState;
}

// Count filled rows (guesses made)
function countFilledRows(guessResults) {
  return guessResults.filter((row) => row && row.length > 0).length;
}

function renderOpponentBoards() {
  elements.opponentBoards.innerHTML = '';
  const isMobile = isMobileView();

  for (const [id, opponent] of opponents) {
    const board = document.createElement('div');
    board.className = isMobile ? 'opponent-board compact' : 'opponent-board';

    if (opponent.isFinished && opponent.won) {
      board.classList.add('solved');
    }

    // Get timer for this opponent
    let timerDisplay = '';
    const opponentTime = playerTimes[id];
    if (opponentTime) {
      const timeStr = formatTime(opponentTime.elapsed);
      const finishedClass = opponentTime.finished ? 'finished' : '';
      timerDisplay = `<span class="opponent-timer ${finishedClass}">${timeStr}</span>`;
    }

    if (isMobile) {
      // Compact mobile view
      const bestState = computeBestKnownState(opponent.guessResults);
      const filledRows = countFilledRows(opponent.guessResults);
      const isPlaying = !opponent.isFinished;

      // Build position cells HTML
      const positionCellsHtml = bestState
        .map((state) => `<div class="pos-cell ${state}"></div>`)
        .join('');

      // Build row progress HTML
      let rowProgressHtml = '';
      for (let i = 0; i < 6; i++) {
        let segmentClass = 'row-segment';
        if (i < filledRows) {
          segmentClass += ' filled';
        } else if (i === filledRows && isPlaying) {
          segmentClass += ' active';
        }
        rowProgressHtml += `<div class="${segmentClass}"></div>`;
      }

      // Name with checkmark if solved
      const nameHtml = opponent.won
        ? `<span class="check">✓</span>${opponent.name}`
        : opponent.name;

      board.innerHTML = `
        <div class="player-header">
          <span class="player-name">${nameHtml}</span>
          ${timerDisplay}
          <div class="position-cells">${positionCellsHtml}</div>
          <div class="row-progress">${rowProgressHtml}</div>
        </div>
      `;
    } else {
      // Desktop: full mini-grid view
      let statusBadge = '';
      if (opponent.isFinished) {
        statusBadge = `<span class="status-badge ${opponent.won ? 'won' : 'lost'}">${opponent.won ? 'Won' : 'Lost'}</span>`;
      }

      board.innerHTML = `
        <div class="player-header">
          <span class="player-name">${opponent.name}</span>
          ${timerDisplay}
          ${statusBadge}
        </div>
        <div class="mini-grid"></div>
      `;

      const miniGrid = board.querySelector('.mini-grid');

      // Render 6 rows x 5 cols
      for (let row = 0; row < 6; row++) {
        const results = opponent.guessResults[row] || [];
        for (let col = 0; col < 5; col++) {
          const tile = document.createElement('div');
          tile.className = 'mini-tile';
          if (results[col]) {
            tile.classList.add(results[col]);
          }
          miniGrid.appendChild(tile);
        }
      }
    }

    elements.opponentBoards.appendChild(board);
  }
}

// Event Listeners
function setupEventListeners() {
  // Lobby
  elements.createRoom.addEventListener('click', () => {
    const name = getPlayerName();
    localStorage.setItem('wordle_playerName', name);
    send({
      type: 'createRoom',
      playerName: name,
      playerEmail: authUser?.email || null,
    });
  });

  elements.joinRoom.addEventListener('click', () => {
    const name = getPlayerName();
    const code = elements.roomCodeInput.value.trim().toUpperCase();
    if (!code) {
      showError('Please enter a room code');
      return;
    }
    localStorage.setItem('wordle_playerName', name);
    send({
      type: 'joinRoom',
      roomCode: code,
      playerName: name,
      playerEmail: authUser?.email || null,
    });
  });

  elements.roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.joinRoom.click();
    }
  });

  // Waiting
  elements.copyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(roomCode);
    elements.copyCode.textContent = '✓';
    setTimeout(() => {
      elements.copyCode.textContent = '📋';
    }, 1500);
  });

  elements.modeCasual.addEventListener('click', () => {
    if (isCreator) {
      send({ type: 'setGameMode', mode: 'casual' });
    }
  });

  elements.modeCompetitive.addEventListener('click', () => {
    if (isCreator) {
      send({ type: 'setGameMode', mode: 'competitive' });
    }
  });

  // Word mode buttons
  if (elements.wordModeDaily) {
    elements.wordModeDaily.addEventListener('click', () => {
      if (isCreator) {
        send({ type: 'setWordMode', mode: 'daily' });
      }
    });
  }

  if (elements.wordModeRandom) {
    elements.wordModeRandom.addEventListener('click', () => {
      if (isCreator) {
        send({ type: 'setWordMode', mode: 'random' });
      }
    });
  }

  // Ready button
  if (elements.readyBtn) {
    elements.readyBtn.addEventListener('click', () => {
      send({ type: 'setReady', ready: !isReady });
    });
  }

  elements.startGame.addEventListener('click', () => {
    send({ type: 'startGame' });
  });

  elements.leaveRoom.addEventListener('click', () => {
    send({ type: 'leaveRoom' });
    showView('lobby');
    roomCode = null;
    playerId = null;
    isCreator = false;
  });

  // Game keyboard
  elements.keyboard.addEventListener('click', (e) => {
    const key = e.target.dataset.key;
    if (key) {
      handleKeyPress(key);
    }
  });

  // Physical keyboard
  document.addEventListener('keydown', (e) => {
    if (gameState !== 'playing') return;

    if (e.key === 'Enter') {
      handleKeyPress('ENTER');
    } else if (e.key === 'Backspace') {
      handleKeyPress('BACKSPACE');
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      handleKeyPress(e.key.toUpperCase());
    }
  });

  // Results
  elements.playAgain.addEventListener('click', () => {
    send({ type: 'playAgain' });
  });

  elements.backToLobby.addEventListener('click', () => {
    send({ type: 'leaveRoom' });
    showView('lobby');
    roomCode = null;
    playerId = null;
    isCreator = false;
  });

  // Auth events
  if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', () => showAuthModal(false));
  }

  if (elements.signupBtn) {
    elements.signupBtn.addEventListener('click', () => showAuthModal(true));
  }

  if (elements.playAsGuest) {
    elements.playAsGuest.addEventListener('click', (e) => {
      e.preventDefault();
      // Hide the auth section and show room actions
      if (elements.authSection) {
        elements.authSection.classList.add('hidden');
      }
      if (elements.roomActionsSection) {
        elements.roomActionsSection.classList.remove('hidden');
      }
    });
  }

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', logout);
  }

  if (elements.authForm) {
    elements.authForm.addEventListener('submit', handleAuthSubmit);
  }

  if (elements.closeModal) {
    elements.closeModal.addEventListener('click', hideAuthModal);
  }

  // Close modal on overlay click
  const modalOverlay = document.querySelector('.modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', hideAuthModal);
  }

  // Initial toggle link in modal
  if (elements.switchToSignup) {
    elements.switchToSignup.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthModal(true);
    });
  }

  // Re-render opponent boards on resize (debounced)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (opponents.size > 0) {
        renderOpponentBoards();
      }
    }, 150);
  });
}

// Start
init();
