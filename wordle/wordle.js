/**
 * Wordle Battle - Client
 *
 * Multiplayer Wordle game with real-time opponent visibility.
 */

// State
let socket = null;
let playerId = null;
let roomCode = null;
let isCreator = false;
let gameMode = 'casual';
let gameState = 'lobby'; // lobby, waiting, playing, results
let currentGuess = '';
let guesses = [];
let guessResults = [];
let opponents = new Map();
let targetWord = null;

// Auth state (SSO from Tools Hub or direct login)
let authUser = null; // { email, name, userId } if authenticated

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
  players: document.getElementById('players'),
  startGame: document.getElementById('startGame'),
  waitingMessage: document.getElementById('waitingMessage'),
  leaveRoom: document.getElementById('leaveRoom'),

  // Game
  opponentBoards: document.getElementById('opponentBoards'),
  grid: document.getElementById('grid'),
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

// Initialize
async function init() {
  // Check for SSO token from Tools Hub
  authUser = await checkSSOToken();

  if (authUser) {
    // SSO user - pre-fill name and save
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
    case 'gameStarted':
      handleGameStarted(msg);
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

  showView('waiting');
  elements.roomCode.textContent = roomCode;
  elements.startGame.classList.remove('hidden');
  elements.waitingMessage.classList.add('hidden');

  updatePlayerList([{ id: playerId, name: getPlayerName(), isCreator: true }]);
}

function handleRoomJoined(msg) {
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  isCreator = msg.isCreator;
  gameMode = msg.gameMode || 'casual';

  showView('waiting');
  elements.roomCode.textContent = roomCode;

  if (isCreator) {
    elements.startGame.classList.remove('hidden');
    elements.waitingMessage.classList.add('hidden');
  } else {
    elements.startGame.classList.add('hidden');
    elements.waitingMessage.classList.remove('hidden');
    // Disable mode buttons for non-creators
    elements.modeCasual.disabled = true;
    elements.modeCompetitive.disabled = true;
  }

  updatePlayerList(msg.players);
  updateModeButtons(gameMode);
}

function handlePlayerJoined(msg) {
  const li = document.createElement('li');
  li.id = `player-${msg.player.id}`;
  li.innerHTML = `
    <span>${msg.player.name}</span>
    ${msg.player.isCreator ? '<span class="host-badge">Host</span>' : ''}
  `;
  elements.players.appendChild(li);
}

function handlePlayerLeft(msg) {
  const li = document.getElementById(`player-${msg.playerId}`);
  if (li) li.remove();

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
}

function handleGameModeChanged(msg) {
  gameMode = msg.mode;
  updateModeButtons(gameMode);
}

// Game Handlers
function handleGameStarted(msg) {
  gameState = 'playing';
  currentGuess = '';
  guesses = [];
  guessResults = [];

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
  showView('waiting');
}

// UI Helpers
function showView(name) {
  for (const [key, view] of Object.entries(views)) {
    view.classList.toggle('hidden', key !== name);
  }
}

function updatePlayerList(players) {
  elements.players.innerHTML = '';
  for (const player of players) {
    const li = document.createElement('li');
    li.id = `player-${player.id}`;
    li.innerHTML = `
      <span>${player.name}${player.id === playerId ? ' (You)' : ''}</span>
      ${player.isCreator ? '<span class="host-badge">Host</span>' : ''}
    `;
    elements.players.appendChild(li);
  }
}

function updateModeButtons(mode) {
  elements.modeCasual.classList.toggle('active', mode === 'casual');
  elements.modeCompetitive.classList.toggle('active', mode === 'competitive');
}

function getPlayerName() {
  return elements.playerName.value.trim() || 'Player';
}

function showError(message) {
  elements.errorToast.textContent = message;
  elements.errorToast.classList.remove('hidden');
  elements.errorToast.classList.add('error');

  setTimeout(() => {
    elements.errorToast.classList.add('hidden');
  }, 3000);
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
      send({ type: 'guess', word: currentGuess });
    }
  } else if (key === 'BACKSPACE') {
    currentGuess = currentGuess.slice(0, -1);
    updateCurrentRow();
  } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
    currentGuess += key;
    updateCurrentRow();
  }
}

// Opponent Boards
function renderOpponentBoards() {
  elements.opponentBoards.innerHTML = '';

  for (const [id, opponent] of opponents) {
    const board = document.createElement('div');
    board.className = 'opponent-board';

    let statusBadge = '';
    if (opponent.isFinished) {
      statusBadge = `<span class="status-badge ${opponent.won ? 'won' : 'lost'}">${opponent.won ? 'Won' : 'Lost'}</span>`;
    }

    board.innerHTML = `
      <div class="player-name">
        <span>${opponent.name}</span>
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
}

// Start
init();
