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
const opponents = new Map();
let _targetWord = null; // Server sends word, client validates guesses but never displays it
let playersInRoom = [];
let gameTimer = 0; // Current game timer in ms
let playerTimes = {}; // Per-player timer data

// Dictionary validation state
let lastRejectedWord = null;
let rejectionCount = 0;

// Auth state (SSO from Tools Hub or direct login)
let authUser = null; // { email, name, userId } if authenticated

// Daily Challenge state
let todaysDailyNumber = null;
let todayCompleted = false; // True if user has completed today's daily
let _todayCompletionData = null; // Full completion data for word reveal (future use)

// Historical Dailies state
let historicalDailiesData = null; // Cached data from API
let selectedHistoricalDaily = null; // { daily_number, date } when selecting from list

// Pending room config (before room creation)
const pendingConfig = {
  gameMode: 'casual',
  wordMode: 'daily',
  isPublic: true,
};

// Reconnection state
let _isReconnecting = false; // True when attempting to rejoin a room (for future use)
const SESSION_STORAGE_KEY = 'wordle_session';
const SESSION_MAX_AGE_MS = 120000; // 2 minutes - matches server grace period

// Daily progress storage (for resumption after leaving mid-game)
const DAILY_PROGRESS_KEY = 'wordle_daily_progress';

// Pending action (for confirmation modals)
let pendingDailyAction = null; // { type: 'solo' | 'friends', dailyNumber }

// Pending resume guesses (for continuing daily after leave)
let pendingResumeGuesses = null; // { guesses: [], guessResults: [] }

// Public rooms state
let publicRooms = [];
let isSubscribedToLobby = false;
let isRoomPublic = true; // Default to public

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

// =============================================================================
// Session Storage (for reconnection)
// =============================================================================

/**
 * Save session data when joining a room
 * This allows reconnection if the page is refreshed or connection is lost
 */
function saveSession(roomCodeValue, playerIdValue) {
  try {
    const session = {
      roomCode: roomCodeValue,
      playerId: playerIdValue,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log('[Wordle] Session saved:', session.roomCode);
  } catch (e) {
    console.warn('[Wordle] Failed to save session:', e);
  }
}

/**
 * Clear session data when intentionally leaving a room
 */
function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('[Wordle] Session cleared');
  } catch (e) {
    console.warn('[Wordle] Failed to clear session:', e);
  }
}

/**
 * Get session data if it exists and is still valid
 * @returns {Object|null} Session object or null if expired/missing
 */
function getSession() {
  try {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return null;

    const session = JSON.parse(data);
    const age = Date.now() - session.savedAt;

    // Session expired
    if (age > SESSION_MAX_AGE_MS) {
      console.log('[Wordle] Session expired, clearing');
      clearSession();
      return null;
    }

    return session;
  } catch (e) {
    console.warn('[Wordle] Failed to get session:', e);
    return null;
  }
}

// =============================================================================
// Daily Progress Storage (for mid-game leave/resume)
// =============================================================================

/**
 * Save daily challenge progress when leaving mid-game
 * Progress is keyed by email+dailyNumber so users can resume their specific attempt
 */
function saveDailyProgress(progress) {
  if (!progress || !authUser?.email) return;

  try {
    const key = `${DAILY_PROGRESS_KEY}_${authUser.email}_${progress.dailyNumber}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        ...progress,
        savedAt: Date.now(),
      })
    );
    console.log(
      `[Wordle] Daily #${progress.dailyNumber} progress saved (${progress.guesses.length} guesses)`
    );
  } catch (e) {
    console.warn('[Wordle] Failed to save daily progress:', e);
  }
}

/**
 * Get saved daily progress for a specific daily challenge
 */
function getDailyProgress(dailyNumber) {
  if (!authUser?.email) return null;

  try {
    const key = `${DAILY_PROGRESS_KEY}_${authUser.email}_${dailyNumber}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const progress = JSON.parse(data);
    // Progress is valid indefinitely for daily challenges (unlike session which expires)
    return progress;
  } catch (e) {
    console.warn('[Wordle] Failed to get daily progress:', e);
    return null;
  }
}

/**
 * Clear daily progress after completion or explicit clear
 */
function clearDailyProgress(dailyNumber) {
  if (!authUser?.email) return;

  try {
    const key = `${DAILY_PROGRESS_KEY}_${authUser.email}_${dailyNumber}`;
    localStorage.removeItem(key);
    console.log(`[Wordle] Daily #${dailyNumber} progress cleared`);
  } catch (e) {
    console.warn('[Wordle] Failed to clear daily progress:', e);
  }
}

/**
 * Attempt to rejoin a room using saved session data
 */
function attemptRejoin() {
  const session = getSession();
  if (!session) {
    return false;
  }

  console.log('[Wordle] Attempting to rejoin room:', session.roomCode);
  _isReconnecting = true;
  showReconnectingOverlay();

  send({
    type: 'rejoin',
    roomCode: session.roomCode,
    playerId: session.playerId,
  });

  return true;
}

/**
 * Show the reconnecting overlay
 */
function showReconnectingOverlay() {
  const overlay = document.getElementById('reconnectingOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

/**
 * Hide the reconnecting overlay
 */
function hideReconnectingOverlay() {
  const overlay = document.getElementById('reconnectingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
  _isReconnecting = false;
}

// DOM Elements
const views = {
  lobby: document.getElementById('lobby'),
  roomConfig: document.getElementById('roomConfig'),
  waiting: document.getElementById('waiting'),
  game: document.getElementById('game'),
  results: document.getElementById('results'),
  dailyCompleted: document.getElementById('dailyCompleted'),
  historicalDailies: document.getElementById('historicalDailies'),
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
  closeRoom: document.getElementById('closeRoom'),
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

  // Daily Challenge
  dailyChallengeSection: document.getElementById('dailyChallengeSection'),
  dailyChallengeBtn: document.getElementById('dailyChallengeBtn'),
  dailyNum: document.getElementById('dailyNum'),
  dailyGuestMsg: document.getElementById('dailyGuestMsg'),

  // Daily Completed View
  dailyCompletedView: document.getElementById('dailyCompleted'),
  completedDailyNum: document.getElementById('completedDailyNum'),
  completedWord: document.getElementById('completedWord'),
  completedGridContainer: document.getElementById('completedGridContainer'),
  completedGuesses: document.getElementById('completedGuesses'),
  completedTime: document.getElementById('completedTime'),
  completedResult: document.getElementById('completedResult'),
  nextDailyCountdown: document.getElementById('nextDailyCountdown'),
  playRandomInstead: document.getElementById('playRandomInstead'),
  backFromDaily: document.getElementById('backFromDaily'),

  // Daily Mode Selection Modal
  dailyModeModal: document.getElementById('dailyModeModal'),
  modalDailyNum: document.getElementById('modalDailyNum'),
  playSoloBtn: document.getElementById('playSoloBtn'),
  playWithFriendsBtn: document.getElementById('playWithFriendsBtn'),
  cancelDailyMode: document.getElementById('cancelDailyMode'),

  // Historical Dailies
  historicalDailiesBtn: document.getElementById('historicalDailiesBtn'),
  historicalDailiesView: document.getElementById('historicalDailies'),
  randomUnplayedBtn: document.getElementById('randomUnplayedBtn'),
  randomUnplayedInfo: document.getElementById('randomUnplayedInfo'),
  recentDailiesList: document.getElementById('recentDailiesList'),
  browseDailyNumber: document.getElementById('browseDailyNumber'),
  browseGoBtn: document.getElementById('browseGoBtn'),
  browseRange: document.getElementById('browseRange'),
  backFromHistorical: document.getElementById('backFromHistorical'),

  // Historical Daily Mode Modal
  historicalModeModal: document.getElementById('historicalModeModal'),
  historicalModalNum: document.getElementById('historicalModalNum'),
  historicalModalDate: document.getElementById('historicalModalDate'),
  historicalSoloBtn: document.getElementById('historicalSoloBtn'),
  historicalMultiBtn: document.getElementById('historicalMultiBtn'),
  cancelHistoricalMode: document.getElementById('cancelHistoricalMode'),

  // Public Rooms
  publicRoomsSection: document.getElementById('publicRoomsSection'),
  publicRoomsList: document.getElementById('publicRoomsList'),
  noPublicRooms: document.getElementById('noPublicRooms'),

  // Visibility Toggle (waiting room)
  visibilitySelector: document.getElementById('visibilitySelector'),
  visibilityPublic: document.getElementById('visibilityPublic'),
  visibilityPrivate: document.getElementById('visibilityPrivate'),
  visibilityHint: document.getElementById('visibilityHint'),

  // Leave Game (during play)
  leaveGameBtn: document.getElementById('leaveGameBtn'),

  // Daily Confirmation Modal
  dailyConfirmModal: document.getElementById('dailyConfirmModal'),
  confirmDailyNum: document.getElementById('confirmDailyNum'),
  confirmDailyStart: document.getElementById('confirmDailyStart'),
  confirmDailyCancel: document.getElementById('confirmDailyCancel'),

  // Leave Confirmation Modal
  leaveConfirmModal: document.getElementById('leaveConfirmModal'),
  leaveConfirmMessage: document.getElementById('leaveConfirmMessage'),
  confirmLeave: document.getElementById('confirmLeave'),
  cancelLeave: document.getElementById('cancelLeave'),

  // Room Config View (pre-creation)
  roomConfigView: document.getElementById('roomConfig'),
  configModeCasual: document.getElementById('configModeCasual'),
  configModeCompetitive: document.getElementById('configModeCompetitive'),
  configWordDaily: document.getElementById('configWordDaily'),
  configWordRandom: document.getElementById('configWordRandom'),
  configVisPublic: document.getElementById('configVisPublic'),
  configVisPrivate: document.getElementById('configVisPrivate'),
  configCancel: document.getElementById('configCancel'),
  configCreate: document.getElementById('configCreate'),
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
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) {
      // Get display name from profile or metadata
      let displayName = user.user_metadata?.display_name || user.email.split('@')[0];

      // Try to get from players table
      const { data: profile } = await client
        .from('players')
        .select('display_name')
        .eq('id', user.id)
        .single();
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

    // Enable daily challenge for logged-in users
    if (elements.dailyChallengeSection) {
      elements.dailyChallengeSection.classList.remove('hidden');
    }
    if (elements.dailyChallengeBtn) {
      elements.dailyChallengeBtn.disabled = false;
    }
    if (elements.dailyGuestMsg) {
      elements.dailyGuestMsg.classList.add('hidden');
    }
    // Show historical dailies button for logged-in users
    if (elements.historicalDailiesBtn) {
      elements.historicalDailiesBtn.classList.remove('hidden');
    }
  } else {
    // Not logged in - show prompt, hide status, hide room actions (until guest chosen)
    elements.authPrompt.classList.remove('hidden');
    elements.authStatus.classList.add('hidden');
    // Room actions stay hidden until user clicks "play as guest"

    // Disable daily challenge for guests
    if (elements.dailyChallengeBtn) {
      elements.dailyChallengeBtn.disabled = true;
    }
    if (elements.dailyGuestMsg) {
      elements.dailyGuestMsg.classList.remove('hidden');
    }
  }

  // Update daily number display
  if (elements.dailyNum && todaysDailyNumber) {
    elements.dailyNum.textContent = todaysDailyNumber;
  }
}

// Daily Challenge Functions
async function fetchDailyNumber() {
  try {
    const response = await fetch('/api/wordle/daily-number');
    if (response.ok) {
      const data = await response.json();
      todaysDailyNumber = data.dailyNumber;
      console.log('[Wordle] Daily number:', todaysDailyNumber);
      return todaysDailyNumber;
    }
  } catch (e) {
    console.warn('[Wordle] Failed to fetch daily number:', e);
  }
  return null;
}

async function checkDailyCompletion(email, dailyNumber) {
  try {
    const response = await fetch(
      `/api/wordle/daily-completion/${encodeURIComponent(email)}/${dailyNumber}`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('[Wordle] Failed to check daily completion:', e);
  }
  return null;
}

/**
 * Fetch today's daily challenge status for UI indicators
 */
async function fetchDailyStatus(email) {
  try {
    const response = await fetch(`/api/wordle/daily-status/${encodeURIComponent(email)}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('[Wordle] Failed to fetch daily status:', e);
  }
  return null;
}

/**
 * Update daily button appearance based on completion status
 */
function updateDailyButtonState() {
  if (!elements.dailyChallengeBtn) return;

  if (todayCompleted) {
    elements.dailyChallengeBtn.innerHTML = `<span class="daily-check">&#10003;</span> Daily #${todaysDailyNumber} Completed`;
    elements.dailyChallengeBtn.classList.add('completed');
  } else {
    elements.dailyChallengeBtn.innerHTML = `Daily Challenge #<span id="dailyNum">${todaysDailyNumber || '---'}</span>`;
    elements.dailyChallengeBtn.classList.remove('completed');
  }
}

/**
 * Calculate time until next daily resets (midnight UTC)
 */
function getTimeUntilNextDaily() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${mins}m`;
}

function showDailyCompletionView(completion) {
  // Set header info
  if (elements.completedDailyNum) {
    elements.completedDailyNum.textContent = completion.daily_number;
  }

  // Show the word
  if (elements.completedWord && completion.word) {
    elements.completedWord.textContent = completion.word.toUpperCase();
  }

  // Set stats
  if (elements.completedGuesses) {
    elements.completedGuesses.textContent = completion.guess_count;
  }
  if (elements.completedTime) {
    elements.completedTime.textContent = completion.solve_time_ms
      ? formatTime(completion.solve_time_ms)
      : '--:--';
  }
  if (elements.completedResult) {
    elements.completedResult.textContent = completion.won ? 'Won' : 'Lost';
  }

  // Show countdown to next daily
  if (elements.nextDailyCountdown) {
    const nextDaily = getTimeUntilNextDaily();
    elements.nextDailyCountdown.textContent = `Next daily in ${nextDaily}`;
  }

  // Build the grid showing their previous guesses
  buildCompletedGrid(completion.guesses, completion.word);

  // Show the view
  showView('dailyCompleted');
}

function buildCompletedGrid(guesses, word) {
  if (!elements.completedGridContainer) return;

  elements.completedGridContainer.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'completed-grid';

  // Build 6 rows
  for (let row = 0; row < 6; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'grid-row';

    const guess = guesses[row] || '';

    for (let col = 0; col < 5; col++) {
      const tile = document.createElement('div');
      tile.className = 'tile';

      if (guess[col]) {
        tile.textContent = guess[col];
        tile.classList.add('filled');

        // Determine color based on word
        if (word[col] === guess[col]) {
          tile.classList.add('correct');
        } else if (word.includes(guess[col])) {
          tile.classList.add('present');
        } else {
          tile.classList.add('absent');
        }
      }

      rowDiv.appendChild(tile);
    }

    grid.appendChild(rowDiv);
  }

  elements.completedGridContainer.appendChild(grid);
}

async function handleDailyChallengeClick() {
  if (!authUser || !todaysDailyNumber) {
    showError('Please login to play Daily Challenge');
    return;
  }

  // Check if already completed
  const completion = await checkDailyCompletion(authUser.email, todaysDailyNumber);

  if (completion && completion.completed) {
    // Already completed - show results
    showDailyCompletionView(completion);
  } else {
    // Not completed - show mode selection modal
    showDailyModeModal();
  }
}

// Show the daily mode selection modal
function showDailyModeModal() {
  if (elements.modalDailyNum) {
    elements.modalDailyNum.textContent = todaysDailyNumber;
  }
  if (elements.dailyModeModal) {
    elements.dailyModeModal.classList.remove('hidden');
  }
}

// Hide the daily mode selection modal
function hideDailyModeModal() {
  if (elements.dailyModeModal) {
    elements.dailyModeModal.classList.add('hidden');
  }
}

// Show the daily confirmation modal
function showDailyConfirmModal(actionType) {
  pendingDailyAction = { type: actionType, dailyNumber: todaysDailyNumber };

  if (elements.confirmDailyNum) {
    elements.confirmDailyNum.textContent = todaysDailyNumber;
  }

  // Hide the mode selection modal
  hideDailyModeModal();

  if (elements.dailyConfirmModal) {
    elements.dailyConfirmModal.classList.remove('hidden');
  }
}

// Hide the daily confirmation modal
function hideDailyConfirmModal() {
  if (elements.dailyConfirmModal) {
    elements.dailyConfirmModal.classList.add('hidden');
  }
}

// Show the leave confirmation modal
function showLeaveConfirmModal() {
  // Update message based on progress
  if (elements.leaveConfirmMessage) {
    const guessCount = guesses.length;
    elements.leaveConfirmMessage.textContent =
      `You have ${guessCount} guess${guessCount !== 1 ? 'es' : ''} saved. ` +
      'Your progress will be preserved and you can resume later.';
  }

  if (elements.leaveConfirmModal) {
    elements.leaveConfirmModal.classList.remove('hidden');
  }
}

// Hide the leave confirmation modal
function hideLeaveConfirmModal() {
  if (elements.leaveConfirmModal) {
    elements.leaveConfirmModal.classList.add('hidden');
  }
}

// Start daily challenge (solo or friends mode)
function startDailyChallenge(solo, dailyNum = null) {
  hideDailyModeModal();
  hideDailyConfirmModal();

  const targetDaily = dailyNum || todaysDailyNumber;
  const name = getPlayerName();
  localStorage.setItem('wordle_playerName', name);

  // Check for saved progress on this daily
  const savedProgress = getDailyProgress(targetDaily);
  if (savedProgress && savedProgress.guesses?.length > 0) {
    console.log(
      `[DAILY] Resuming daily #${targetDaily} with ${savedProgress.guesses.length} guesses`
    );
    pendingResumeGuesses = {
      guesses: savedProgress.guesses,
      guessResults: savedProgress.guessResults,
    };
  } else {
    pendingResumeGuesses = null;
  }

  console.log(`[DAILY] Starting ${solo ? 'solo' : 'friends'} daily challenge #${targetDaily}`);

  send({
    type: 'createDailyChallenge',
    playerName: name,
    playerEmail: authUser.email,
    dailyNumber: targetDaily,
    solo: solo,
  });
}

// ============================================================
// Historical Dailies Functions
// ============================================================

async function fetchHistoricalDailies() {
  if (!authUser?.email) return null;

  try {
    const response = await fetch(
      `/api/wordle/historical-dailies/${encodeURIComponent(authUser.email)}`
    );
    if (response.ok) {
      historicalDailiesData = await response.json();
      return historicalDailiesData;
    }
  } catch (e) {
    console.warn('[Wordle] Failed to fetch historical dailies:', e);
  }
  return null;
}

async function fetchRandomUnplayedDaily() {
  if (!authUser?.email) return null;

  try {
    const response = await fetch(
      `/api/wordle/random-unplayed-daily/${encodeURIComponent(authUser.email)}`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('[Wordle] Failed to fetch random unplayed daily:', e);
  }
  return null;
}

async function showHistoricalDailiesView() {
  // Fetch data if not cached
  if (!historicalDailiesData) {
    await fetchHistoricalDailies();
  }

  if (!historicalDailiesData) {
    showError('Failed to load historical dailies');
    return;
  }

  // Update browse range text
  if (elements.browseRange) {
    elements.browseRange.textContent = `Enter a daily number between 1 and ${historicalDailiesData.current_daily - 1}`;
  }

  // Set max on input
  if (elements.browseDailyNumber) {
    elements.browseDailyNumber.max = historicalDailiesData.current_daily - 1;
  }

  // Update random unplayed info
  if (elements.randomUnplayedInfo) {
    const completed = historicalDailiesData.total_completed;
    const available = historicalDailiesData.total_available - 1; // Exclude today
    const remaining = available - completed;
    if (remaining > 0) {
      elements.randomUnplayedInfo.textContent = `${remaining} unplayed dailies available`;
    } else {
      elements.randomUnplayedInfo.textContent = 'All historical dailies completed!';
      if (elements.randomUnplayedBtn) {
        elements.randomUnplayedBtn.disabled = true;
      }
    }
  }

  // Render recent dailies (last 7 days, excluding today)
  renderRecentDailies();

  showView('historicalDailies');
}

function renderRecentDailies() {
  if (!elements.recentDailiesList || !historicalDailiesData) return;

  elements.recentDailiesList.innerHTML = '';

  // Get last 7 days excluding today (skip first item which is today)
  const recentDailies = historicalDailiesData.dailies.slice(1, 8);

  for (const daily of recentDailies) {
    const item = document.createElement('div');
    item.className = `recent-daily-item${daily.completed ? ' completed' : ''}`;
    item.dataset.dailyNumber = daily.daily_number;
    item.dataset.date = daily.date;

    const statusText = daily.completed
      ? daily.won
        ? `✓ Won in ${daily.guess_count}`
        : '✗ Failed'
      : 'Not played';

    const statusClass = daily.completed ? 'completed' : 'not-played';

    item.innerHTML = `
      <span class="daily-item-number">Daily #${daily.daily_number}</span>
      <span class="daily-item-date">${formatDateForDisplay(daily.date)}</span>
      <span class="daily-item-status ${statusClass}">${statusText}</span>
    `;

    item.addEventListener('click', () => handleRecentDailyClick(daily));
    elements.recentDailiesList.appendChild(item);
  }
}

function formatDateForDisplay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

async function handleRandomUnplayedClick() {
  const result = await fetchRandomUnplayedDaily();

  if (!result) {
    showError('Failed to find random daily');
    return;
  }

  if (!result.found) {
    showError(result.message || 'All dailies completed!');
    return;
  }

  // Show mode selection for this daily
  selectedHistoricalDaily = {
    daily_number: result.daily_number,
    date: result.date,
  };
  showHistoricalModeModal();
}

function handleBrowseDailyGo() {
  const dailyNum = parseInt(elements.browseDailyNumber?.value, 10);

  if (!dailyNum || dailyNum < 1) {
    showError('Please enter a valid daily number');
    return;
  }

  if (dailyNum >= todaysDailyNumber) {
    showError(`Daily #${dailyNum} hasn't happened yet`);
    return;
  }

  // Check if already completed
  const daily = historicalDailiesData?.dailies.find((d) => d.daily_number === dailyNum);
  if (daily?.completed) {
    showError(`You've already completed Daily #${dailyNum}`);
    return;
  }

  // Show mode selection
  const dateStr = daily?.date || calculateDateFromDailyNumber(dailyNum);
  selectedHistoricalDaily = {
    daily_number: dailyNum,
    date: dateStr,
  };
  showHistoricalModeModal();
}

function calculateDateFromDailyNumber(dailyNum) {
  // Epoch is 2024-01-01
  const epoch = new Date('2024-01-01T00:00:00Z');
  const date = new Date(epoch.getTime() + (dailyNum - 1) * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

function handleRecentDailyClick(daily) {
  if (daily.completed) {
    showError(`You've already completed Daily #${daily.daily_number}`);
    return;
  }

  selectedHistoricalDaily = {
    daily_number: daily.daily_number,
    date: daily.date,
  };
  showHistoricalModeModal();
}

function showHistoricalModeModal() {
  if (!selectedHistoricalDaily) return;

  if (elements.historicalModalNum) {
    elements.historicalModalNum.textContent = selectedHistoricalDaily.daily_number;
  }
  if (elements.historicalModalDate) {
    elements.historicalModalDate.textContent = formatDateForDisplay(selectedHistoricalDaily.date);
  }
  if (elements.historicalModeModal) {
    elements.historicalModeModal.classList.remove('hidden');
  }
}

function hideHistoricalModeModal() {
  if (elements.historicalModeModal) {
    elements.historicalModeModal.classList.add('hidden');
  }
  selectedHistoricalDaily = null;
}

function startHistoricalDaily(solo) {
  if (!selectedHistoricalDaily) return;

  // Store before hiding modal (which clears selectedHistoricalDaily)
  const dailyNumber = selectedHistoricalDaily.daily_number;

  hideHistoricalModeModal();

  const name = getPlayerName();
  localStorage.setItem('wordle_playerName', name);

  console.log(
    `[HISTORICAL] Starting ${solo ? 'solo' : 'friends'} historical daily #${dailyNumber}`
  );

  send({
    type: 'createDailyChallenge',
    playerName: name,
    playerEmail: authUser.email,
    dailyNumber: dailyNumber,
    solo: solo,
  });
}

function showAuthModal(signup = false) {
  isSignupMode = signup;

  elements.modalTitle.textContent = signup ? 'Sign Up' : 'Login';
  elements.authSubmit.textContent = signup ? 'Sign Up' : 'Login';

  if (signup) {
    elements.displayNameGroup.classList.remove('hidden');
    elements.authToggle.innerHTML =
      'Already have an account? <a href="#" id="switchToLogin">Login</a>';
  } else {
    elements.displayNameGroup.classList.add('hidden');
    elements.authToggle.innerHTML =
      'Don\'t have an account? <a href="#" id="switchToSignup">Sign up</a>';
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
        const { data: profile } = await client
          .from('players')
          .select('display_name')
          .eq('id', user.id)
          .single();
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

  // Fetch today's daily number
  await fetchDailyNumber();

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

    // Fetch today's daily status for button indicator
    const dailyStatus = await fetchDailyStatus(authUser.email);
    if (dailyStatus) {
      todayCompleted = dailyStatus.completed;
      if (dailyStatus.completed) {
        _todayCompletionData = dailyStatus;
      }
      updateDailyButtonState();
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

    // Try to rejoin if we have a saved session
    const hadSession = attemptRejoin();

    // If no saved session, subscribe to lobby for public rooms
    if (!hadSession) {
      subscribeLobby();
    }
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
    case 'roomClosed':
      handleRoomClosed(msg);
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

    // Reconnection messages
    case 'rejoinWaiting':
      handleRejoinWaiting(msg);
      break;
    case 'rejoinGame':
      handleRejoinGame(msg);
      break;
    case 'rejoinResults':
      handleRejoinResults(msg);
      break;
    case 'rejoinFailed':
      handleRejoinFailed(msg);
      break;
    case 'playerDisconnected':
      handlePlayerDisconnected(msg);
      break;
    case 'playerReconnected':
      handlePlayerReconnected(msg);
      break;
    case 'replacedByNewConnection':
      handleReplacedByNewConnection(msg);
      break;

    // Public rooms messages
    case 'publicRoomsList':
      handlePublicRoomsList(msg);
      break;
    case 'roomVisibilityChanged':
      handleRoomVisibilityChanged(msg);
      break;

    case 'leftRoom':
      handleLeftRoom(msg);
      break;

    case 'error':
      showError(msg.message);
      break;
  }
}

/**
 * Handle confirmation that we've left the room
 * Saves daily progress if applicable
 */
function handleLeftRoom(msg) {
  console.log('[Wordle] Left room:', msg.roomCode);

  // Save daily progress if we had any
  if (msg.progress) {
    saveDailyProgress(msg.progress);
  }

  // Clear session
  clearSession();

  // Reset state
  roomCode = null;
  playerId = null;
  isCreator = false;
  guesses = [];
  guessResults = [];
  opponents.clear();

  // Return to lobby
  showView('lobby');
  subscribeLobby();
}

// Room Handlers
function handleRoomCreated(msg) {
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  isCreator = true;
  isReady = false;
  allPlayersReady = false;

  // Use settings from server (configured in pre-creation screen)
  gameMode = msg.gameMode || 'casual';
  wordMode = msg.wordMode || 'daily';
  dailyNumber = msg.dailyNumber || null;
  isRoomPublic = msg.isPublic !== undefined ? msg.isPublic : true;

  // Unsubscribe from lobby (we're in a room now)
  unsubscribeLobby();

  // Save session for reconnection
  saveSession(roomCode, playerId);

  showView('waiting');
  elements.roomCode.textContent = roomCode;
  elements.startGame.classList.remove('hidden');
  elements.waitingMessage.classList.add('hidden');
  if (elements.closeRoom) elements.closeRoom.classList.remove('hidden');

  // Settings are already configured - still allow changes in waiting room
  elements.modeCasual.disabled = false;
  elements.modeCompetitive.disabled = false;
  if (elements.wordModeDaily) elements.wordModeDaily.disabled = false;
  if (elements.wordModeRandom) elements.wordModeRandom.disabled = false;

  // Show visibility selector for creator
  if (elements.visibilitySelector) {
    elements.visibilitySelector.classList.remove('hidden');
  }

  playersInRoom = [{ id: playerId, name: getPlayerName(), isCreator: true, isReady: false }];
  updatePlayerList(playersInRoom);
  updateModeButtons(gameMode);
  updateWordModeButtons();
  updateVisibilityButtons();
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

  // Unsubscribe from lobby (we're in a room now)
  unsubscribeLobby();

  // Save session for reconnection
  saveSession(roomCode, playerId);

  // For solo daily: skip waiting room, countdown will start automatically
  // The countdown overlay is position:fixed, so it shows over any view
  if (msg.isSolo) {
    console.log('[DAILY] Solo mode - waiting for countdown');
    // Stay on lobby view - the countdown overlay will appear shortly
    return;
  }

  showView('waiting');
  elements.roomCode.textContent = roomCode;

  if (isCreator) {
    elements.startGame.classList.remove('hidden');
    elements.waitingMessage.classList.add('hidden');
    if (elements.closeRoom) elements.closeRoom.classList.remove('hidden');
    elements.modeCasual.disabled = false;
    elements.modeCompetitive.disabled = false;
    if (elements.wordModeDaily) elements.wordModeDaily.disabled = false;
    if (elements.wordModeRandom) elements.wordModeRandom.disabled = false;
    // Show visibility selector for creator
    if (elements.visibilitySelector) {
      elements.visibilitySelector.classList.remove('hidden');
    }
  } else {
    elements.startGame.classList.add('hidden');
    elements.waitingMessage.classList.remove('hidden');
    if (elements.closeRoom) elements.closeRoom.classList.add('hidden');
    // Disable mode buttons for non-creators
    elements.modeCasual.disabled = true;
    elements.modeCompetitive.disabled = true;
    if (elements.wordModeDaily) elements.wordModeDaily.disabled = true;
    if (elements.wordModeRandom) elements.wordModeRandom.disabled = true;
    // Hide visibility selector for non-creators
    if (elements.visibilitySelector) {
      elements.visibilitySelector.classList.add('hidden');
    }
  }

  // Store players with ready status
  playersInRoom = msg.players.map((p) => ({
    ...p,
    isReady: p.isReady || false,
  }));
  updatePlayerList(playersInRoom);
  updateModeButtons(gameMode);
  updateWordModeButtons();
  updateVisibilityButtons();
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

/**
 * Handle room closed by host
 */
function handleRoomClosed(msg) {
  console.log('[Wordle] Room closed:', msg.message);

  // Show notification
  showInfoToast(msg.message || 'Room was closed');

  // Clean up state
  clearSession();
  roomCode = null;
  playerId = null;
  isCreator = false;
  playersInRoom = [];

  // Return to lobby
  showView('lobby');
  subscribeLobby();
}

function handleBecameCreator() {
  isCreator = true;
  elements.startGame.classList.remove('hidden');
  elements.waitingMessage.classList.add('hidden');
  if (elements.closeRoom) elements.closeRoom.classList.remove('hidden');
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

  // If we have saved progress to resume, replay the guesses
  if (pendingResumeGuesses && pendingResumeGuesses.guesses.length > 0) {
    console.log(`[DAILY] Replaying ${pendingResumeGuesses.guesses.length} saved guesses`);
    replayResumeGuesses();
  }
}

/**
 * Replay saved guesses when resuming a daily challenge
 * Submits each guess with a small delay to allow UI updates
 */
function replayResumeGuesses() {
  if (!pendingResumeGuesses || pendingResumeGuesses.guesses.length === 0) {
    pendingResumeGuesses = null;
    return;
  }

  const guessesToReplay = [...pendingResumeGuesses.guesses];
  pendingResumeGuesses = null;

  let index = 0;
  function replayNext() {
    if (index >= guessesToReplay.length) return;

    const guess = guessesToReplay[index];
    console.log(`[DAILY] Replaying guess ${index + 1}: ${guess}`);

    // Submit the guess
    send({ type: 'guess', word: guess.toLowerCase(), forced: false });

    index++;
    // Wait a bit before next guess to allow server response and UI update
    if (index < guessesToReplay.length) {
      setTimeout(replayNext, 200);
    }
  }

  // Start replaying with a small delay
  setTimeout(replayNext, 100);
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
  _targetWord = msg.word;

  // Clear any saved daily progress since the game completed
  if (dailyNumber) {
    clearDailyProgress(dailyNumber);
  }

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

// =============================================================================
// Public Rooms (Lobby) Functions
// =============================================================================

/**
 * Subscribe to lobby updates for public rooms list
 */
function subscribeLobby() {
  if (isSubscribedToLobby) return;
  send({ type: 'subscribeLobby' });
  isSubscribedToLobby = true;
  console.log('[Wordle] Subscribed to lobby');
}

/**
 * Unsubscribe from lobby updates (when joining/creating a room)
 */
function unsubscribeLobby() {
  if (!isSubscribedToLobby) return;
  send({ type: 'unsubscribeLobby' });
  isSubscribedToLobby = false;
  console.log('[Wordle] Unsubscribed from lobby');
}

/**
 * Handle public rooms list update from server
 */
function handlePublicRoomsList(msg) {
  publicRooms = msg.rooms || [];
  renderPublicRooms();
}

/**
 * Render the public rooms list in the lobby
 */
function renderPublicRooms() {
  if (!elements.publicRoomsList || !elements.noPublicRooms) return;

  elements.publicRoomsList.innerHTML = '';

  if (publicRooms.length === 0) {
    elements.noPublicRooms.classList.remove('hidden');
    return;
  }

  elements.noPublicRooms.classList.add('hidden');

  for (const room of publicRooms) {
    const item = document.createElement('div');
    item.className = 'public-room-item';
    item.dataset.roomCode = room.code;

    const modeLabel = room.gameMode === 'competitive' ? 'Competitive' : 'Casual';
    // Show daily number if available, otherwise just "Daily" or "Random"
    let wordLabel;
    if (room.wordMode === 'daily' && room.dailyNumber) {
      wordLabel = `Daily #${room.dailyNumber}`;
    } else {
      wordLabel = room.wordMode === 'daily' ? 'Daily' : 'Random';
    }

    // FEAT-002: Check if user already completed this daily
    const isCompletedDaily =
      room.dailyNumber && todayCompleted && room.dailyNumber === todaysDailyNumber;

    // Add completed class if applicable
    if (isCompletedDaily) {
      item.classList.add('completed-daily');
    }

    // Build the button based on completion status
    const buttonText = isCompletedDaily ? '✓ Completed' : 'Join';
    const buttonDisabled = isCompletedDaily ? 'disabled' : '';

    item.innerHTML = `
      <div class="public-room-info">
        <div class="public-room-creator">${room.creatorName}'s Room</div>
        <div class="public-room-details">${modeLabel} • ${wordLabel}</div>
      </div>
      <span class="public-room-players">${room.playerCount}/${room.maxPlayers}</span>
      <button class="public-room-join${isCompletedDaily ? ' completed' : ''}" ${buttonDisabled}>${buttonText}</button>
    `;

    // Only add click handlers if not a completed daily
    if (!isCompletedDaily) {
      // Join button click
      const joinBtn = item.querySelector('.public-room-join');
      joinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        joinPublicRoom(room.code, room.dailyNumber);
      });

      // Clicking the whole item also joins
      item.addEventListener('click', () => {
        joinPublicRoom(room.code, room.dailyNumber);
      });
    }

    elements.publicRoomsList.appendChild(item);
  }
}

/**
 * Join a public room by code
 * @param {string} code - Room code
 * @param {number|null} dailyNumber - Daily number if room is a daily challenge
 */
async function joinPublicRoom(code, dailyNumber = null) {
  // If room is a daily challenge and user is logged in, check if they already completed it
  if (dailyNumber && authUser) {
    const completion = await checkDailyCompletion(authUser.email, dailyNumber);
    if (completion?.completed) {
      showError(`You've already completed Daily #${dailyNumber}`);
      return;
    }
  }

  const name = getPlayerName();
  localStorage.setItem('wordle_playerName', name);

  unsubscribeLobby();

  send({
    type: 'joinRoom',
    roomCode: code,
    playerName: name,
    playerEmail: authUser?.email || null,
  });
}

/**
 * Handle room visibility changed (from server, when creator toggles)
 */
function handleRoomVisibilityChanged(msg) {
  isRoomPublic = msg.isPublic;
  updateVisibilityButtons();
}

/**
 * Update visibility toggle buttons in waiting room
 */
function updateVisibilityButtons() {
  if (!elements.visibilityPublic || !elements.visibilityPrivate) return;

  elements.visibilityPublic.classList.toggle('active', isRoomPublic);
  elements.visibilityPrivate.classList.toggle('active', !isRoomPublic);

  if (elements.visibilityHint) {
    elements.visibilityHint.textContent = isRoomPublic
      ? 'Public rooms appear in lobby for others to join'
      : 'Private rooms require the room code to join';
  }
}

// =============================================================================
// Reconnection Handlers
// =============================================================================

/**
 * Handle successful rejoin to waiting room
 */
function handleRejoinWaiting(msg) {
  hideReconnectingOverlay();

  // Restore state
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  isCreator = msg.isCreator;
  gameMode = msg.gameMode || 'casual';
  wordMode = msg.wordMode || 'daily';
  dailyNumber = msg.dailyNumber;
  isReady = msg.isReady;
  playersInRoom = msg.players;
  gameState = 'waiting';

  // Update session with current data
  saveSession(roomCode, playerId);

  // Show waiting room
  showView('waiting');
  elements.roomCode.textContent = roomCode;

  if (isCreator) {
    elements.startGame.classList.remove('hidden');
    elements.waitingMessage.classList.add('hidden');
    if (elements.closeRoom) elements.closeRoom.classList.remove('hidden');
    elements.modeCasual.disabled = false;
    elements.modeCompetitive.disabled = false;
    if (elements.wordModeDaily) elements.wordModeDaily.disabled = false;
    if (elements.wordModeRandom) elements.wordModeRandom.disabled = false;
  } else {
    elements.startGame.classList.add('hidden');
    elements.waitingMessage.classList.remove('hidden');
    if (elements.closeRoom) elements.closeRoom.classList.add('hidden');
    elements.modeCasual.disabled = true;
    elements.modeCompetitive.disabled = true;
    if (elements.wordModeDaily) elements.wordModeDaily.disabled = true;
    if (elements.wordModeRandom) elements.wordModeRandom.disabled = true;
  }

  updatePlayerList(playersInRoom);
  updateModeButtons(gameMode);
  updateWordModeButtons();
  updateReadyButton();
  updateStartButton();

  showToast('Reconnected!', 'success');
  console.log('[Wordle] Rejoined waiting room:', roomCode);
}

/**
 * Handle successful rejoin to active game
 */
function handleRejoinGame(msg) {
  hideReconnectingOverlay();

  // Restore state
  playerId = msg.playerId;
  roomCode = msg.roomCode;
  gameMode = msg.gameMode || 'casual';
  guesses = msg.guesses || [];
  guessResults = msg.guessResults || [];
  gameState = 'playing';

  // Update session
  saveSession(roomCode, playerId);

  // Restore opponents
  opponents.clear();
  if (msg.opponents) {
    for (const opp of msg.opponents) {
      opponents.set(opp.id, {
        name: opp.name,
        guessResults: opp.guessResults || [],
        guessCount: opp.guessCount || 0,
        isFinished: opp.isFinished || false,
        won: opp.won || false,
      });
    }
  }

  // Show game view
  showView('game');
  buildGrid();

  // Restore grid state
  for (let row = 0; row < guesses.length; row++) {
    const guess = guesses[row];
    const results = guessResults[row];
    const rowEl = elements.grid.children[row];

    for (let col = 0; col < 5; col++) {
      const tile = rowEl.children[col];
      tile.textContent = guess[col].toUpperCase();
      tile.classList.add('filled', 'flip', results[col]);
    }
  }

  // Restore keyboard state
  for (let row = 0; row < guessResults.length; row++) {
    const guess = guesses[row];
    const results = guessResults[row];
    for (let i = 0; i < 5; i++) {
      const letter = guess[i].toLowerCase();
      const result = results[i];
      updateKeyboardKey(letter, result);
    }
  }

  // Render opponents
  renderOpponentBoards();

  // Calculate game timer from start time
  if (msg.gameStartTime) {
    gameTimer = Date.now() - msg.gameStartTime;
  }

  showToast('Reconnected to game!', 'success');
  console.log('[Wordle] Rejoined active game:', roomCode);
}

/**
 * Handle successful rejoin to results screen
 */
function handleRejoinResults(msg) {
  hideReconnectingOverlay();

  // Restore state
  roomCode = msg.roomCode;
  _targetWord = msg.word;
  gameMode = msg.gameMode || 'casual';
  gameState = 'finished';

  // Clear session since game is over
  clearSession();

  // Show results
  showView('results');
  elements.revealedWord.textContent = msg.word;

  // Build results list (same as handleGameEnded)
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
      <span class="player-name">${result.name}${result.id === playerId ? ' (You)' : ''}</span>
      <span class="player-stats">${result.won ? statsStr : 'Did not solve'}</span>
    `;
    elements.resultsList.appendChild(li);
  });

  showToast('Reconnected to results', 'success');
  console.log('[Wordle] Rejoined results screen:', roomCode);
}

/**
 * Handle failed rejoin attempt
 */
function handleRejoinFailed(msg) {
  hideReconnectingOverlay();
  clearSession();

  console.log('[Wordle] Rejoin failed:', msg.reason, msg.message);

  // Show appropriate message based on reason
  if (msg.reason === 'roomNotFound') {
    showToast('Room no longer exists', 'error');
  } else if (msg.reason === 'playerNotFound') {
    showToast('Session expired', 'error');
  } else {
    showToast(msg.message || 'Could not reconnect', 'error');
  }

  // Stay on lobby
  showView('lobby');
}

/**
 * Handle notification that another player disconnected
 */
function handlePlayerDisconnected(msg) {
  console.log('[Wordle] Player disconnected:', msg.playerName);

  // Update player in list to show disconnected state
  const player = playersInRoom.find((p) => p.id === msg.playerId);
  if (player) {
    player.connectionState = 'disconnected';
    updatePlayerList(playersInRoom);
  }

  // Show toast
  showToast(`${msg.playerName} disconnected (${msg.gracePeriodSeconds}s to reconnect)`, 'warning');
}

/**
 * Handle notification that a player reconnected
 */
function handlePlayerReconnected(msg) {
  console.log('[Wordle] Player reconnected:', msg.playerName);

  // Update player in list to show connected state
  const player = playersInRoom.find((p) => p.id === msg.playerId);
  if (player) {
    player.connectionState = 'connected';
    updatePlayerList(playersInRoom);
  }

  showToast(`${msg.playerName} reconnected`, 'success');
}

/**
 * Handle being replaced by a new connection (duplicate tab)
 */
function handleReplacedByNewConnection(_msg) {
  console.log('[Wordle] Replaced by new connection');
  clearSession();
  showError('Connected from another tab');
  showView('lobby');
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

// Room Config View helpers
function resetPendingConfig() {
  pendingConfig.gameMode = 'casual';
  pendingConfig.wordMode = 'daily';
  pendingConfig.isPublic = true;
}

function updateConfigButtons() {
  if (elements.configModeCasual) {
    elements.configModeCasual.classList.toggle('active', pendingConfig.gameMode === 'casual');
  }
  if (elements.configModeCompetitive) {
    elements.configModeCompetitive.classList.toggle(
      'active',
      pendingConfig.gameMode === 'competitive'
    );
  }
  if (elements.configWordDaily) {
    elements.configWordDaily.classList.toggle('active', pendingConfig.wordMode === 'daily');
  }
  if (elements.configWordRandom) {
    elements.configWordRandom.classList.toggle('active', pendingConfig.wordMode === 'random');
  }
  if (elements.configVisPublic) {
    elements.configVisPublic.classList.toggle('active', pendingConfig.isPublic === true);
  }
  if (elements.configVisPrivate) {
    elements.configVisPrivate.classList.toggle('active', pendingConfig.isPublic === false);
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

/**
 * Show a toast notification with a specific type
 * @param {string} message - Message to display
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 */
function showToast(message, type = 'info') {
  elements.errorToast.textContent = message;
  elements.errorToast.classList.remove('hidden', 'error', 'info', 'success', 'warning');
  elements.errorToast.classList.add(type);

  const duration = type === 'error' ? 4000 : 3000;
  setTimeout(() => {
    elements.errorToast.classList.add('hidden');
  }, duration);
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
  } else if (
    result === 'absent' &&
    !key.classList.contains('correct') &&
    !key.classList.contains('present')
  ) {
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
          showGameMessage('Not recognized. Enter again to force.');
        } else {
          // First attempt with this word
          lastRejectedWord = currentGuess;
          rejectionCount = 0; // Will be 1 on second attempt, 2 on third
          showGameMessage('Not in word list');
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
    // Show config view instead of immediately creating room
    resetPendingConfig();
    updateConfigButtons();
    showView('roomConfig');
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

  // Room Config View (pre-creation)
  if (elements.configModeCasual) {
    elements.configModeCasual.addEventListener('click', () => {
      pendingConfig.gameMode = 'casual';
      updateConfigButtons();
    });
  }

  if (elements.configModeCompetitive) {
    elements.configModeCompetitive.addEventListener('click', () => {
      pendingConfig.gameMode = 'competitive';
      updateConfigButtons();
    });
  }

  if (elements.configWordDaily) {
    elements.configWordDaily.addEventListener('click', () => {
      pendingConfig.wordMode = 'daily';
      updateConfigButtons();
    });
  }

  if (elements.configWordRandom) {
    elements.configWordRandom.addEventListener('click', () => {
      pendingConfig.wordMode = 'random';
      updateConfigButtons();
    });
  }

  if (elements.configVisPublic) {
    elements.configVisPublic.addEventListener('click', () => {
      pendingConfig.isPublic = true;
      updateConfigButtons();
    });
  }

  if (elements.configVisPrivate) {
    elements.configVisPrivate.addEventListener('click', () => {
      pendingConfig.isPublic = false;
      updateConfigButtons();
    });
  }

  if (elements.configCancel) {
    elements.configCancel.addEventListener('click', () => {
      showView('lobby');
    });
  }

  if (elements.configCreate) {
    elements.configCreate.addEventListener('click', () => {
      const name = getPlayerName();
      localStorage.setItem('wordle_playerName', name);
      send({
        type: 'createRoom',
        playerName: name,
        playerEmail: authUser?.email || null,
        gameMode: pendingConfig.gameMode,
        wordMode: pendingConfig.wordMode,
        isPublic: pendingConfig.isPublic,
      });
    });
  }

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

  // Visibility toggle buttons
  if (elements.visibilityPublic) {
    elements.visibilityPublic.addEventListener('click', () => {
      if (isCreator && !isRoomPublic) {
        send({ type: 'setRoomVisibility', isPublic: true });
      }
    });
  }

  if (elements.visibilityPrivate) {
    elements.visibilityPrivate.addEventListener('click', () => {
      if (isCreator && isRoomPublic) {
        send({ type: 'setRoomVisibility', isPublic: false });
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
    clearSession();
    showView('lobby');
    roomCode = null;
    playerId = null;
    isCreator = false;
    // Resubscribe to lobby for public rooms
    subscribeLobby();
  });

  // Close Room button (host only - kicks everyone)
  if (elements.closeRoom) {
    elements.closeRoom.addEventListener('click', () => {
      if (!isCreator) return;
      // Confirm before closing
      if (playersInRoom.length > 1) {
        if (!confirm('This will kick all players from the room. Continue?')) {
          return;
        }
      }
      send({ type: 'closeRoom' });
      // The roomClosed handler will clean up state
    });
  }

  // Leave Game button (during gameplay)
  if (elements.leaveGameBtn) {
    elements.leaveGameBtn.addEventListener('click', () => {
      // For daily challenges with guesses, show confirmation
      if (wordMode === 'daily' && guesses.length > 0) {
        showLeaveConfirmModal();
      } else {
        // Leave immediately
        send({ type: 'leaveRoom' });
      }
    });
  }

  // Leave Confirmation Modal events
  if (elements.confirmLeave) {
    elements.confirmLeave.addEventListener('click', () => {
      hideLeaveConfirmModal();
      send({ type: 'leaveRoom' });
    });
  }

  if (elements.cancelLeave) {
    elements.cancelLeave.addEventListener('click', hideLeaveConfirmModal);
  }

  // Close leave confirm modal on overlay click
  if (elements.leaveConfirmModal) {
    const overlay = elements.leaveConfirmModal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', hideLeaveConfirmModal);
    }
  }

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
    clearSession();
    showView('lobby');
    roomCode = null;
    playerId = null;
    isCreator = false;
    // Resubscribe to lobby for public rooms
    subscribeLobby();
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
      // Show daily challenge section (but disabled for guests)
      if (elements.dailyChallengeSection) {
        elements.dailyChallengeSection.classList.remove('hidden');
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

  // Daily Challenge events
  if (elements.dailyChallengeBtn) {
    elements.dailyChallengeBtn.addEventListener('click', handleDailyChallengeClick);
  }

  if (elements.playRandomInstead) {
    elements.playRandomInstead.addEventListener('click', () => {
      showView('lobby');
      // Optionally auto-create a random game
    });
  }

  if (elements.backFromDaily) {
    elements.backFromDaily.addEventListener('click', () => {
      showView('lobby');
    });
  }

  // Daily Mode Selection Modal events
  if (elements.playSoloBtn) {
    elements.playSoloBtn.addEventListener('click', () => {
      showDailyConfirmModal('solo');
    });
  }

  if (elements.playWithFriendsBtn) {
    elements.playWithFriendsBtn.addEventListener('click', () => {
      showDailyConfirmModal('friends');
    });
  }

  if (elements.cancelDailyMode) {
    elements.cancelDailyMode.addEventListener('click', hideDailyModeModal);
  }

  // Daily Confirmation Modal events
  if (elements.confirmDailyStart) {
    elements.confirmDailyStart.addEventListener('click', () => {
      hideDailyConfirmModal();
      if (pendingDailyAction) {
        startDailyChallenge(pendingDailyAction.type === 'solo');
        pendingDailyAction = null;
      }
    });
  }

  if (elements.confirmDailyCancel) {
    elements.confirmDailyCancel.addEventListener('click', () => {
      hideDailyConfirmModal();
      pendingDailyAction = null;
    });
  }

  // Close confirm modal on overlay click
  if (elements.dailyConfirmModal) {
    const overlay = elements.dailyConfirmModal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        hideDailyConfirmModal();
        pendingDailyAction = null;
      });
    }
  }

  // Close modal on overlay click
  if (elements.dailyModeModal) {
    const overlay = elements.dailyModeModal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', hideDailyModeModal);
    }
  }

  // Historical Dailies events
  if (elements.historicalDailiesBtn) {
    elements.historicalDailiesBtn.addEventListener('click', showHistoricalDailiesView);
  }

  if (elements.randomUnplayedBtn) {
    elements.randomUnplayedBtn.addEventListener('click', handleRandomUnplayedClick);
  }

  if (elements.browseGoBtn) {
    // Initialize as disabled until valid input
    elements.browseGoBtn.disabled = true;
    elements.browseGoBtn.addEventListener('click', handleBrowseDailyGo);
  }

  if (elements.browseDailyNumber) {
    elements.browseDailyNumber.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleBrowseDailyGo();
      }
    });

    // Enable/disable Go button based on valid input
    elements.browseDailyNumber.addEventListener('input', () => {
      const value = parseInt(elements.browseDailyNumber.value, 10);
      const maxDaily = (todaysDailyNumber || 734) - 1;
      const isValid = value >= 1 && value <= maxDaily;

      if (elements.browseGoBtn) {
        elements.browseGoBtn.disabled = !isValid;
      }
    });
  }

  if (elements.backFromHistorical) {
    elements.backFromHistorical.addEventListener('click', () => {
      showView('lobby');
      // Clear cached data so it refreshes on next visit
      historicalDailiesData = null;
    });
  }

  // Historical Mode Modal events
  if (elements.historicalSoloBtn) {
    elements.historicalSoloBtn.addEventListener('click', () => {
      startHistoricalDaily(true);
    });
  }

  if (elements.historicalMultiBtn) {
    elements.historicalMultiBtn.addEventListener('click', () => {
      startHistoricalDaily(false);
    });
  }

  if (elements.cancelHistoricalMode) {
    elements.cancelHistoricalMode.addEventListener('click', hideHistoricalModeModal);
  }

  // Close historical modal on overlay click
  if (elements.historicalModeModal) {
    const overlay = elements.historicalModeModal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', hideHistoricalModeModal);
    }
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
