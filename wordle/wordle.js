/**
 * Wordle Battle - Client
 *
 * Multiplayer Wordle game with real-time opponent visibility.
 */

import { VALID_GUESSES } from './valid-guesses.js';
import {
  formatTime,
  computeBestKnownState,
  countFilledRows,
  calculateDateFromDailyNumber,
  formatDateForDisplay,
} from './utils/wordle-utils.js';
import {
  saveSession,
  clearSession,
  getSession,
  saveDailyProgress as saveStoredDailyProgress,
  getDailyProgress as getStoredDailyProgress,
  clearDailyProgress as clearStoredDailyProgress,
} from './utils/wordle-storage.js';
import { state } from './state/game-state.js';

// =============================================================================
// NOTE: Most state is now centralized in state/game-state.js
// Access via: state.playerId, state.roomCode, state.allPlayersReady, etc.
// See game-state.js for all available properties and computed getters.
// =============================================================================

// Browser-specific variables (not in state)
let socket = null;
let pendingRoomJoin = null; // Room code from URL to join after connection

// =============================================================================
// URL-Based Room Sharing (Phase 2)
// =============================================================================

/**
 * Parse room code from URL if present.
 * Supports: /wordle/room/ABC123
 */
function parseRoomCodeFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/wordle\/room\/([A-Z0-9]+)/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return null;
}

/**
 * Update browser URL to reflect current room state.
 * Uses history.pushState for seamless navigation.
 */
function updateURLForRoom(roomCode) {
  const newPath = `/wordle/room/${roomCode}`;
  if (window.location.pathname !== newPath) {
    history.pushState({ view: 'waiting', roomCode }, '', newPath);
  }
}

/**
 * Reset URL to lobby (no room code).
 */
function updateURLForLobby() {
  if (window.location.pathname !== '/wordle/' && window.location.pathname !== '/wordle') {
    history.pushState({ view: 'lobby' }, '', '/wordle/');
  }
}

/**
 * Handle browser back/forward button navigation.
 * When user presses back from a room URL, leave the room and show lobby.
 */
function setupPopstateHandler() {
  window.addEventListener('popstate', (_e) => {
    const roomCodeFromURL = parseRoomCodeFromURL();

    if (!roomCodeFromURL && state.roomCode) {
      // User pressed back from room URL to lobby
      console.log('[Wordle] Browser back: leaving room');
      send({ type: 'leaveRoom' });
      clearSession();
      showView('lobby');
      state.roomCode = null;
      state.playerId = null;
      state.isCreator = false;
      subscribeLobby();
    } else if (roomCodeFromURL && roomCodeFromURL !== state.roomCode) {
      // User navigated to a different room URL (forward/back to another room)
      console.log('[Wordle] Browser navigation: joining room', roomCodeFromURL);
      if (state.roomCode) {
        send({ type: 'leaveRoom' });
        clearSession();
      }
      const playerName = elements.playerName.value.trim() || 'Player';
      send({
        type: 'joinRoom',
        roomCode: roomCodeFromURL,
        playerName,
        playerEmail: state.authUser?.email,
      });
    }
  });
}

async function fetchSupabaseConfig() {
  if (state.supabaseConfig) return state.supabaseConfig;

  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      state.supabaseConfig = config.supabase;
      return state.supabaseConfig;
    }
  } catch (e) {
    console.warn('[Wordle Auth] Failed to fetch config:', e);
  }
  return null;
}

function getSupabase() {
  if (!state.supabase && state.supabaseConfig?.url && state.supabaseConfig?.anonKey) {
    state.supabase = window.supabase.createClient(
      state.supabaseConfig.url,
      state.supabaseConfig.anonKey
    );
  }
  return state.supabase;
}

// =============================================================================
// Daily Progress Wrappers (inject state.authUser.email)
// =============================================================================

function saveDailyProgress(progress) {
  saveStoredDailyProgress(progress, state.authUser?.email);
}

function getDailyProgress(dailyNumber) {
  return getStoredDailyProgress(dailyNumber, state.authUser?.email);
}

function clearDailyProgress(dailyNumber) {
  clearStoredDailyProgress(dailyNumber, state.authUser?.email);
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
  state.isReconnecting = true;
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
  state.isReconnecting = false;
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
  stats: document.getElementById('statsView'),
  settingsView: document.getElementById('settingsView'),
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
  copyLink: document.getElementById('copyLink'),
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
  forgotPasswordLink: document.getElementById('forgotPasswordLink'),

  // Password Reset
  resetPasswordForm: document.getElementById('resetPasswordForm'),
  resetEmail: document.getElementById('resetEmail'),
  resetError: document.getElementById('resetError'),
  resetSuccess: document.getElementById('resetSuccess'),
  sendResetLink: document.getElementById('sendResetLink'),
  backToLogin: document.getElementById('backToLogin'),

  // Update Password (after reset link clicked)
  updatePasswordForm: document.getElementById('updatePasswordForm'),
  newPassword: document.getElementById('newPassword'),
  confirmPassword: document.getElementById('confirmPassword'),
  updateError: document.getElementById('updateError'),
  updatePasswordBtn: document.getElementById('updatePasswordBtn'),

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

  // Stats Dashboard View
  viewStatsBtn: document.getElementById('viewStatsBtn'),
  backFromStats: document.getElementById('backFromStats'),
  statsGamesPlayed: document.getElementById('statsGamesPlayed'),
  statsWinRate: document.getElementById('statsWinRate'),
  statsCurrentStreak: document.getElementById('statsCurrentStreak'),
  statsBestStreak: document.getElementById('statsBestStreak'),
  statsFastestTime: document.getElementById('statsFastestTime'),
  statsAvgTime: document.getElementById('statsAvgTime'),
  distributionChart: document.getElementById('distributionChart'),

  // Header Toolbar (Lobby Redesign)
  backBtn: document.getElementById('backBtn'),
  headerTitle: document.getElementById('headerTitle'),
  settingsBtn: document.getElementById('settingsBtn'),
  profileBtn: document.getElementById('profileBtn'),

  // Profile Dropdown
  profileDropdown: document.getElementById('profileDropdown'),
  profileLabel: document.getElementById('profileLabel'),
  profileLoggedIn: document.getElementById('profileLoggedIn'),
  profileLoggedOut: document.getElementById('profileLoggedOut'),
  profileDisplayName: document.getElementById('profileDisplayName'),
  profileEmail: document.getElementById('profileEmail'),
  dropdownStats: document.getElementById('dropdownStats'),
  dropdownLogout: document.getElementById('dropdownLogout'),
  dropdownLogin: document.getElementById('dropdownLogin'),
  dropdownSignup: document.getElementById('dropdownSignup'),
  dropdownGuest: document.getElementById('dropdownGuest'),

  // Daily Tooltip (UX-001)
  dailyBtnContainer: document.getElementById('dailyBtnContainer'),
  dailyTooltip: document.getElementById('dailyTooltip'),
  tooltipSignIn: document.getElementById('tooltipSignIn'),

  // Simplified Lobby
  playWithFriendsLobbyBtn: document.getElementById('playWithFriendsLobbyBtn'),
  statsStrip: document.getElementById('statsStrip'),
  statsWins: document.getElementById('statsWins'),
  statsStreakStrip: document.getElementById('statsStreak'),
  statsBestStrip: document.getElementById('statsBest'),
  guestPrompt: document.getElementById('guestPrompt'),
  loginPromptLink: document.getElementById('loginPromptLink'),

  // Friends Bottom Sheet
  friendsSheet: document.getElementById('friendsSheet'),
  closeFriendsSheet: document.getElementById('closeFriendsSheet'),
  sheetBackdrop: document.querySelector('.sheet-backdrop'),

  // Settings View
  settingsView: document.getElementById('settingsView'),
  settingsName: document.getElementById('settingsName'),
  soundToggle: document.getElementById('soundToggle'),
  backFromSettings: document.getElementById('backFromSettings'),

  // Settings - Account Section (UX-003)
  settingsAccountSection: document.getElementById('settingsAccountSection'),
  changePasswordBtn: document.getElementById('changePasswordBtn'),
  changePasswordForm: document.getElementById('changePasswordForm'),
  currentPassword: document.getElementById('currentPassword'),
  newPasswordSettings: document.getElementById('newPasswordSettings'),
  confirmNewPassword: document.getElementById('confirmNewPassword'),
  changePasswordError: document.getElementById('changePasswordError'),
  changePasswordSuccess: document.getElementById('changePasswordSuccess'),
  submitPasswordChange: document.getElementById('submitPasswordChange'),
  cancelPasswordChange: document.getElementById('cancelPasswordChange'),
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
  if (!stats) return;

  // Update old stats section (if it exists)
  if (elements.playerStats) {
    elements.statPlayed.textContent = stats.games_played || 0;

    const winRate =
      stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
    elements.statWinRate.textContent = `${winRate}%`;

    elements.statStreak.textContent = stats.current_streak || 0;
    elements.statBestStreak.textContent = stats.best_streak || 0;

    elements.playerStats.classList.remove('hidden');
  }

  // Update new compact stats strip (lobby redesign)
  updateStatsStripValues(stats);
}

/**
 * Refresh stats from server and show lobby view.
 * Use this when returning from a completed game.
 */
async function refreshStatsAndShowLobby() {
  showView('lobby');
  updateURLForLobby(); // Reset URL to /wordle/
  if (state.authUser?.email) {
    const stats = await fetchPlayerStats(state.authUser.email);
    if (stats) {
      displayStats(stats);
    }
  }
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
      emailRedirectTo: `${window.location.origin}/wordle/`,
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
  state.authUser = null;
  updateAuthUI();
  elements.playerStats.classList.add('hidden');
  showView('lobby'); // Return to main page after logout
}

// Password Reset Functions
async function requestPasswordReset(email) {
  const client = getSupabase();
  if (!client) throw new Error('Auth not available');

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/wordle/`,
  });

  if (error) throw error;
  return true;
}

async function updatePassword(newPassword) {
  const client = getSupabase();
  if (!client) throw new Error('Auth not available');

  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
}

function showForgotPasswordForm() {
  // Hide login form, show reset form
  elements.authForm.classList.add('hidden');
  elements.authToggle.classList.add('hidden');
  document.querySelector('.forgot-password-link').classList.add('hidden');
  elements.resetPasswordForm.classList.remove('hidden');
  elements.modalTitle.textContent = 'Reset Password';
  elements.authError.classList.add('hidden');
}

function hideForgotPasswordForm() {
  // Show login form, hide reset form
  elements.authForm.classList.remove('hidden');
  elements.authToggle.classList.remove('hidden');
  document.querySelector('.forgot-password-link').classList.remove('hidden');
  elements.resetPasswordForm.classList.add('hidden');
  elements.modalTitle.textContent = 'Sign In';
  elements.authError.classList.add('hidden');
  elements.resetSuccess.classList.add('hidden');
  elements.resetError.classList.add('hidden');
}

function showPasswordUpdateForm() {
  // Show the update password form (after clicking reset link)
  showAuthModal();
  elements.authForm.classList.add('hidden');
  elements.authToggle.classList.add('hidden');
  document.querySelector('.forgot-password-link').classList.add('hidden');
  elements.resetPasswordForm.classList.add('hidden');
  elements.updatePasswordForm.classList.remove('hidden');
  elements.modalTitle.textContent = 'Set New Password';
  elements.authError.classList.add('hidden');
}

function hidePasswordUpdateForm() {
  elements.updatePasswordForm.classList.add('hidden');
  elements.authForm.classList.remove('hidden');
  elements.authToggle.classList.remove('hidden');
  document.querySelector('.forgot-password-link').classList.remove('hidden');
  elements.modalTitle.textContent = 'Sign In';
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
  // Update old auth section (if it exists - legacy support)
  if (elements.authPrompt && elements.authStatus) {
    if (state.authUser) {
      // Logged in - show status, hide prompt, show room actions
      elements.authPrompt.classList.add('hidden');
      elements.authStatus.classList.remove('hidden');
      if (elements.userEmail) {
        elements.userEmail.textContent = state.authUser.email;
      }
      if (elements.roomActionsSection) {
        elements.roomActionsSection.classList.remove('hidden');
      }
    } else {
      // Not logged in - show prompt, hide status, hide room actions (until guest chosen)
      elements.authPrompt.classList.remove('hidden');
      elements.authStatus.classList.add('hidden');
    }
  }

  if (state.authUser) {
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
    // Disable daily challenge for guests
    if (elements.dailyChallengeBtn) {
      elements.dailyChallengeBtn.disabled = true;
    }
    if (elements.dailyGuestMsg) {
      elements.dailyGuestMsg.classList.remove('hidden');
    }
  }

  // Update daily number display
  if (elements.dailyNum && state.todaysDailyNumber) {
    elements.dailyNum.textContent = state.todaysDailyNumber;
  }

  // Update profile dropdown UI (new lobby design)
  updateProfileDropdown();

  // Update profile button state (UX-001)
  updateProfileButtonState();

  // Update stats strip
  updateStatsStrip();

  // Update guest prompt visibility
  updateGuestPrompt();
}

// =============================================================================
// Profile Dropdown & New Lobby UI Functions
// =============================================================================

/**
 * Update the profile dropdown content based on auth state.
 */
function updateProfileDropdown() {
  if (!elements.profileLoggedIn || !elements.profileLoggedOut) return;

  if (state.authUser) {
    // Logged in state
    elements.profileLoggedIn.classList.remove('hidden');
    elements.profileLoggedOut.classList.add('hidden');

    if (elements.profileDisplayName) {
      elements.profileDisplayName.textContent = state.authUser.name || 'Player';
    }
    if (elements.profileEmail) {
      elements.profileEmail.textContent = state.authUser.email || '';
    }
  } else {
    // Logged out state
    elements.profileLoggedIn.classList.add('hidden');
    elements.profileLoggedOut.classList.remove('hidden');
  }
}

/**
 * Toggle the profile dropdown visibility.
 */
function toggleProfileDropdown() {
  if (!elements.profileDropdown) return;

  const isVisible = !elements.profileDropdown.classList.contains('hidden');
  if (isVisible) {
    closeProfileDropdown();
  } else {
    elements.profileDropdown.classList.remove('hidden');
    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', closeProfileDropdownOnOutsideClick);
    }, 0);
  }
}

function closeProfileDropdown() {
  if (elements.profileDropdown) {
    elements.profileDropdown.classList.add('hidden');
  }
  document.removeEventListener('click', closeProfileDropdownOnOutsideClick);
}

function closeProfileDropdownOnOutsideClick(e) {
  if (
    elements.profileDropdown &&
    !elements.profileDropdown.contains(e.target) &&
    !elements.profileBtn?.contains(e.target)
  ) {
    closeProfileDropdown();
  }
}

/**
 * Update profile button appearance based on auth state (UX-001).
 * - Logged out: Shows "Guest" with muted styling
 * - Logged in: Shows user initials with green styling
 */
function updateProfileButtonState() {
  if (!elements.profileBtn) return;

  if (state.authUser) {
    // Logged in
    elements.profileBtn.classList.remove('logged-out');
    elements.profileBtn.classList.add('logged-in');
    if (elements.profileLabel) {
      elements.profileLabel.textContent = getInitials(state.authUser.name);
    }
  } else {
    // Logged out
    elements.profileBtn.classList.remove('logged-in');
    elements.profileBtn.classList.add('logged-out');
    if (elements.profileLabel) {
      elements.profileLabel.textContent = 'Guest';
    }
  }
}

/**
 * Get user initials from name (up to 2 characters).
 */
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Show the daily challenge tooltip (when guest taps disabled button).
 */
function showDailyTooltip() {
  if (elements.dailyTooltip) {
    elements.dailyTooltip.classList.remove('hidden');
    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', closeDailyTooltipOnOutsideClick);
    }, 0);
  }
}

/**
 * Hide the daily challenge tooltip.
 */
function hideDailyTooltip() {
  if (elements.dailyTooltip) {
    elements.dailyTooltip.classList.add('hidden');
  }
  document.removeEventListener('click', closeDailyTooltipOnOutsideClick);
}

function closeDailyTooltipOnOutsideClick(e) {
  if (
    elements.dailyTooltip &&
    !elements.dailyTooltip.contains(e.target) &&
    !elements.dailyChallengeBtn?.contains(e.target)
  ) {
    hideDailyTooltip();
  }
}

/**
 * Update the compact stats strip on the lobby.
 */
function updateStatsStrip() {
  if (!elements.statsStrip) return;

  // Only show stats strip for logged-in users with stats
  if (state.authUser) {
    elements.statsStrip.classList.remove('hidden');
  } else {
    elements.statsStrip.classList.add('hidden');
  }
}

/**
 * Update stats strip values from fetched stats.
 */
function updateStatsStripValues(stats) {
  if (!stats) return;

  if (elements.statsWins) {
    elements.statsWins.textContent = `${stats.games_won || 0} wins`;
  }
  if (elements.statsStreakStrip) {
    elements.statsStreakStrip.textContent = `🔥 ${stats.current_streak || 0}`;
  }
  if (elements.statsBestStrip) {
    elements.statsBestStrip.textContent = `Best: ${stats.best_streak || 0}`;
  }
}

/**
 * Update guest prompt visibility.
 */
function updateGuestPrompt() {
  if (!elements.guestPrompt) return;

  if (state.authUser) {
    elements.guestPrompt.classList.add('hidden');
  } else {
    elements.guestPrompt.classList.remove('hidden');
  }
}

/**
 * Open the "Play With Friends" bottom sheet.
 */
function openFriendsSheet() {
  if (!elements.friendsSheet) return;
  elements.friendsSheet.classList.remove('hidden');
  elements.friendsSheet.classList.add('visible');
  // Prevent body scroll when sheet is open
  document.body.style.overflow = 'hidden';
}

/**
 * Close the "Play With Friends" bottom sheet.
 */
function closeFriendsSheet() {
  if (!elements.friendsSheet) return;
  elements.friendsSheet.classList.remove('visible');
  // Wait for animation to complete
  setTimeout(() => {
    elements.friendsSheet.classList.add('hidden');
  }, 300);
  document.body.style.overflow = '';
}

/**
 * Show the Settings view.
 */
function showSettings() {
  // Load current settings
  const savedName = localStorage.getItem('wordle_playerName') || '';
  if (elements.settingsName) {
    elements.settingsName.value = savedName;
  }

  // Load sound setting
  const soundEnabled = localStorage.getItem('wordle_soundEnabled') !== 'false';
  if (elements.soundToggle) {
    elements.soundToggle.textContent = soundEnabled ? 'On' : 'Off';
    elements.soundToggle.setAttribute('aria-pressed', soundEnabled.toString());
  }

  // Show account section only for logged-in users (UX-003)
  if (elements.settingsAccountSection) {
    if (state.authUser) {
      elements.settingsAccountSection.classList.remove('hidden');
    } else {
      elements.settingsAccountSection.classList.add('hidden');
    }
  }

  // Reset password form state
  hideChangePasswordForm();

  showView('settingsView');
}

/**
 * Show the change password form in settings (UX-003).
 */
function showChangePasswordForm() {
  if (elements.changePasswordBtn) {
    elements.changePasswordBtn.classList.add('hidden');
  }
  if (elements.changePasswordForm) {
    elements.changePasswordForm.classList.remove('hidden');
  }
  // Clear previous inputs and messages
  if (elements.currentPassword) elements.currentPassword.value = '';
  if (elements.newPasswordSettings) elements.newPasswordSettings.value = '';
  if (elements.confirmNewPassword) elements.confirmNewPassword.value = '';
  if (elements.changePasswordError) {
    elements.changePasswordError.textContent = '';
    elements.changePasswordError.classList.add('hidden');
  }
  if (elements.changePasswordSuccess) {
    elements.changePasswordSuccess.textContent = '';
    elements.changePasswordSuccess.classList.add('hidden');
  }
}

/**
 * Hide the change password form in settings.
 */
function hideChangePasswordForm() {
  if (elements.changePasswordBtn) {
    elements.changePasswordBtn.classList.remove('hidden');
  }
  if (elements.changePasswordForm) {
    elements.changePasswordForm.classList.add('hidden');
  }
}

/**
 * Handle password change submission (UX-003).
 */
async function handlePasswordChange() {
  // Note: currentPassword collected for future server-side verification
  const _currentPassword = elements.currentPassword?.value?.trim();
  const newPassword = elements.newPasswordSettings?.value?.trim();
  const confirmPassword = elements.confirmNewPassword?.value?.trim();

  // Clear previous messages
  if (elements.changePasswordError) {
    elements.changePasswordError.classList.add('hidden');
  }
  if (elements.changePasswordSuccess) {
    elements.changePasswordSuccess.classList.add('hidden');
  }

  // Validation
  if (!newPassword || !confirmPassword) {
    showChangePasswordError('Please fill in all fields');
    return;
  }

  if (newPassword.length < 6) {
    showChangePasswordError('New password must be at least 6 characters');
    return;
  }

  if (newPassword !== confirmPassword) {
    showChangePasswordError('New passwords do not match');
    return;
  }

  try {
    // Use Supabase to update password
    const { error } = await state.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      showChangePasswordError(error.message);
      return;
    }

    // Success
    if (elements.changePasswordSuccess) {
      elements.changePasswordSuccess.textContent = 'Password updated successfully!';
      elements.changePasswordSuccess.classList.remove('hidden');
    }

    // Clear form after brief delay
    setTimeout(() => {
      hideChangePasswordForm();
    }, 2000);
  } catch (_err) {
    showChangePasswordError('Failed to update password. Please try again.');
  }
}

function showChangePasswordError(message) {
  if (elements.changePasswordError) {
    elements.changePasswordError.textContent = message;
    elements.changePasswordError.classList.remove('hidden');
  }
}

/**
 * Save settings and return to lobby.
 */
function saveSettings() {
  // Save name
  if (elements.settingsName) {
    const name = elements.settingsName.value.trim();
    if (name) {
      localStorage.setItem('wordle_playerName', name);
      // Update the playerName input if it exists
      if (elements.playerName) {
        elements.playerName.value = name;
      }
    }
  }

  showView('lobby');
}

/**
 * Toggle sound setting.
 */
function toggleSound() {
  const currentEnabled = localStorage.getItem('wordle_soundEnabled') !== 'false';
  const newEnabled = !currentEnabled;
  localStorage.setItem('wordle_soundEnabled', newEnabled.toString());

  if (elements.soundToggle) {
    elements.soundToggle.textContent = newEnabled ? 'On' : 'Off';
    elements.soundToggle.setAttribute('aria-pressed', newEnabled.toString());
  }
}

/**
 * Update header back button visibility based on current view.
 */
function updateBackButton(currentView) {
  if (!elements.backBtn) return;

  // Show back button on all views except lobby
  const viewsWithBackButton = [
    'waiting',
    'game',
    'results',
    'roomConfig',
    'settingsView',
    'stats',
    'historicalDailies',
    'dailyCompleted',
  ];

  if (viewsWithBackButton.includes(currentView)) {
    elements.backBtn.classList.remove('hidden');
  } else {
    elements.backBtn.classList.add('hidden');
  }
}

/**
 * Handle header back button click based on current view.
 */
function handleBackButton() {
  const currentView = getCurrentView();

  switch (currentView) {
    case 'settingsView':
      saveSettings();
      break;
    case 'stats':
      showView('lobby');
      break;
    case 'historicalDailies':
      showView('lobby');
      // Clear cached data so it refreshes on next visit
      state.historicalDailiesData = null;
      break;
    case 'dailyCompleted':
      showView('lobby');
      break;
    case 'roomConfig':
      showView('lobby');
      break;
    case 'waiting':
      // Leave room
      send({ type: 'leaveRoom' });
      clearSession();
      showView('lobby');
      updateURLForLobby();
      state.roomCode = null;
      state.playerId = null;
      state.isCreator = false;
      subscribeLobby();
      break;
    case 'game':
      // Leave game (with confirmation modal)
      showLeaveConfirmModal();
      break;
    case 'results':
      // Go back to lobby
      if (state.roomCode) {
        send({ type: 'leaveRoom' });
        clearSession();
      }
      state.resetRoom();
      showView('lobby');
      updateURLForLobby();
      subscribeLobby();
      break;
    default:
      showView('lobby');
  }
}

/**
 * Get the current visible view.
 */
function getCurrentView() {
  const views = [
    'lobby',
    'waiting',
    'game',
    'results',
    'roomConfig',
    'settingsView',
    'stats',
    'historicalDailies',
    'dailyCompleted',
  ];
  for (const viewId of views) {
    const el = document.getElementById(viewId);
    if (el && !el.classList.contains('hidden')) {
      return viewId;
    }
  }
  return 'lobby';
}

// Daily Challenge Functions
async function fetchDailyNumber() {
  try {
    const response = await fetch('/api/wordle/daily-number');
    if (response.ok) {
      const data = await response.json();
      state.todaysDailyNumber = data.dailyNumber;
      console.log('[Wordle] Daily number:', state.todaysDailyNumber);
      return state.todaysDailyNumber;
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

  if (state.todayCompleted) {
    elements.dailyChallengeBtn.innerHTML = `<span class="daily-check">&#10003;</span> Daily #${state.todaysDailyNumber} Completed`;
    elements.dailyChallengeBtn.classList.add('completed');
  } else {
    elements.dailyChallengeBtn.innerHTML = `Daily Challenge #<span id="dailyNum">${state.todaysDailyNumber || '---'}</span>`;
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
  if (!state.authUser || !state.todaysDailyNumber) {
    showError('Please login to play Daily Challenge');
    return;
  }

  // Check if already completed
  const completion = await checkDailyCompletion(state.authUser.email, state.todaysDailyNumber);

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
    elements.modalDailyNum.textContent = state.todaysDailyNumber;
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
  state.pendingDailyAction = { type: actionType, dailyNumber: state.todaysDailyNumber };

  if (elements.confirmDailyNum) {
    elements.confirmDailyNum.textContent = state.todaysDailyNumber;
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
    const guessCount = state.guesses.length;
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

  const targetDaily = dailyNum || state.todaysDailyNumber;
  const name = getPlayerName();
  localStorage.setItem('wordle_playerName', name);

  // Check for saved progress on this daily
  const savedProgress = getDailyProgress(targetDaily);
  if (savedProgress && savedProgress.guesses?.length > 0) {
    console.log(
      `[DAILY] Resuming daily #${targetDaily} with ${savedProgress.guesses.length} guesses`
    );
    state.pendingResumeGuesses = {
      guesses: savedProgress.guesses,
      guessResults: savedProgress.guessResults,
    };
  } else {
    state.pendingResumeGuesses = null;
  }

  console.log(`[DAILY] Starting ${solo ? 'solo' : 'friends'} daily challenge #${targetDaily}`);

  send({
    type: 'createDailyChallenge',
    playerName: name,
    playerEmail: state.authUser.email,
    dailyNumber: targetDaily,
    solo: solo,
  });
}

// ============================================================
// Historical Dailies Functions
// ============================================================

async function fetchHistoricalDailies() {
  if (!state.authUser?.email) return null;

  try {
    const response = await fetch(
      `/api/wordle/historical-dailies/${encodeURIComponent(state.authUser.email)}`
    );
    if (response.ok) {
      state.historicalDailiesData = await response.json();
      return state.historicalDailiesData;
    }
  } catch (e) {
    console.warn('[Wordle] Failed to fetch historical dailies:', e);
  }
  return null;
}

async function fetchRandomUnplayedDaily() {
  if (!state.authUser?.email) return null;

  try {
    const response = await fetch(
      `/api/wordle/random-unplayed-daily/${encodeURIComponent(state.authUser.email)}`
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
  if (!state.historicalDailiesData) {
    await fetchHistoricalDailies();
  }

  if (!state.historicalDailiesData) {
    showError('Failed to load historical dailies');
    return;
  }

  // Update browse range text
  if (elements.browseRange) {
    elements.browseRange.textContent = `Enter a daily number between 1 and ${state.historicalDailiesData.current_daily - 1}`;
  }

  // Set max on input
  if (elements.browseDailyNumber) {
    elements.browseDailyNumber.max = state.historicalDailiesData.current_daily - 1;
  }

  // Update random unplayed info
  if (elements.randomUnplayedInfo) {
    const completed = state.historicalDailiesData.total_completed;
    const available = state.historicalDailiesData.total_available - 1; // Exclude today
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
  if (!elements.recentDailiesList || !state.historicalDailiesData) return;

  elements.recentDailiesList.innerHTML = '';

  // Get last 7 days excluding today (skip first item which is today)
  const recentDailies = state.historicalDailiesData.dailies.slice(1, 8);

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

// ============================================================================
// Stats Dashboard View
// ============================================================================

/**
 * Show the stats dashboard view with full stats and distribution chart.
 */
async function showStatsView() {
  if (!state.authUser?.email) {
    showError('Please log in to view your stats');
    return;
  }

  // Fetch fresh stats
  const stats = await fetchPlayerStats(state.authUser.email);

  if (!stats) {
    showError('Failed to load stats');
    return;
  }

  // Update stat cards
  if (elements.statsGamesPlayed) {
    elements.statsGamesPlayed.textContent = stats.games_played || 0;
  }

  if (elements.statsWinRate) {
    const winRate =
      stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
    elements.statsWinRate.textContent = `${winRate}%`;
  }

  if (elements.statsCurrentStreak) {
    elements.statsCurrentStreak.textContent = stats.current_streak || 0;
  }

  if (elements.statsBestStreak) {
    elements.statsBestStreak.textContent = stats.best_streak || 0;
  }

  if (elements.statsFastestTime) {
    elements.statsFastestTime.textContent = formatTimeMs(stats.fastest_solve_ms);
  }

  if (elements.statsAvgTime) {
    elements.statsAvgTime.textContent = formatTimeMs(stats.avg_solve_time_ms);
  }

  // Render distribution chart
  renderDistributionChart(stats);

  showView('stats');
}

/**
 * Format milliseconds as MM:SS or --:-- if null/0.
 */
function formatTimeMs(ms) {
  if (!ms || ms === 0) return '--:--';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Render the guess distribution chart.
 */
function renderDistributionChart(stats) {
  if (!elements.distributionChart) return;

  // Get distribution data
  const distribution = [
    { label: '1', count: stats.guesses_1 || 0 },
    { label: '2', count: stats.guesses_2 || 0 },
    { label: '3', count: stats.guesses_3 || 0 },
    { label: '4', count: stats.guesses_4 || 0 },
    { label: '5', count: stats.guesses_5 || 0 },
    { label: '6', count: stats.guesses_6 || 0 },
  ];

  // Calculate losses (games played - games won)
  const losses = (stats.games_played || 0) - (stats.games_won || 0);

  // Find max for scaling
  const allCounts = [...distribution.map((d) => d.count), losses];
  const maxCount = Math.max(...allCounts, 1); // At least 1 to avoid division by zero
  const totalGames = stats.games_played || 0;

  // Clear existing content
  elements.distributionChart.innerHTML = '';

  // Render each row (1-6)
  for (const item of distribution) {
    const row = document.createElement('div');
    row.className = 'distribution-row';

    const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
    const gamePercent = totalGames > 0 ? Math.round((item.count / totalGames) * 100) : 0;

    // Highlight the row with the most wins
    const isHighlight = item.count === maxCount && item.count > 0;

    row.innerHTML = `
      <span class="distribution-label">${item.label}</span>
      <div class="distribution-bar-container">
        <div class="distribution-bar${isHighlight ? ' highlight' : ''}" style="width: ${Math.max(widthPercent, 8)}%">
          <span class="distribution-count">${item.count}</span>
        </div>
      </div>
      <span class="distribution-percent">${gamePercent}%</span>
    `;

    elements.distributionChart.appendChild(row);
  }

  // Add losses row if any
  if (losses > 0) {
    const lossRow = document.createElement('div');
    lossRow.className = 'distribution-row';

    const widthPercent = (losses / maxCount) * 100;
    const gamePercent = totalGames > 0 ? Math.round((losses / totalGames) * 100) : 0;

    lossRow.innerHTML = `
      <span class="distribution-label">X</span>
      <div class="distribution-bar-container">
        <div class="distribution-bar losses" style="width: ${Math.max(widthPercent, 8)}%">
          <span class="distribution-count">${losses}</span>
        </div>
      </div>
      <span class="distribution-percent">${gamePercent}%</span>
    `;

    elements.distributionChart.appendChild(lossRow);
  }
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
  state.selectedHistoricalDaily = {
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

  if (dailyNum >= state.todaysDailyNumber) {
    showError(`Daily #${dailyNum} hasn't happened yet`);
    return;
  }

  // Check if already completed
  const daily = state.historicalDailiesData?.dailies.find((d) => d.daily_number === dailyNum);
  if (daily?.completed) {
    showError(`You've already completed Daily #${dailyNum}`);
    return;
  }

  // Show mode selection
  const dateStr = daily?.date || calculateDateFromDailyNumber(dailyNum);
  state.selectedHistoricalDaily = {
    daily_number: dailyNum,
    date: dateStr,
  };
  showHistoricalModeModal();
}

function handleRecentDailyClick(daily) {
  if (daily.completed) {
    showError(`You've already completed Daily #${daily.daily_number}`);
    return;
  }

  state.selectedHistoricalDaily = {
    daily_number: daily.daily_number,
    date: daily.date,
  };
  showHistoricalModeModal();
}

function showHistoricalModeModal() {
  if (!state.selectedHistoricalDaily) return;

  if (elements.historicalModalNum) {
    elements.historicalModalNum.textContent = state.selectedHistoricalDaily.daily_number;
  }
  if (elements.historicalModalDate) {
    elements.historicalModalDate.textContent = formatDateForDisplay(
      state.selectedHistoricalDaily.date
    );
  }
  if (elements.historicalModeModal) {
    elements.historicalModeModal.classList.remove('hidden');
  }
}

function hideHistoricalModeModal() {
  if (elements.historicalModeModal) {
    elements.historicalModeModal.classList.add('hidden');
  }
  state.selectedHistoricalDaily = null;
}

function startHistoricalDaily(solo) {
  if (!state.selectedHistoricalDaily) return;

  // Store before hiding modal (which clears state.selectedHistoricalDaily)
  const dailyNumber = state.selectedHistoricalDaily.daily_number;

  hideHistoricalModeModal();

  const name = getPlayerName();
  localStorage.setItem('wordle_playerName', name);

  console.log(
    `[HISTORICAL] Starting ${solo ? 'solo' : 'friends'} historical daily #${dailyNumber}`
  );

  send({
    type: 'createDailyChallenge',
    playerName: name,
    playerEmail: state.authUser.email,
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

      state.authUser = {
        email: user.email,
        name: name,
        userId: user.id,
      };

      // Update UI
      elements.playerName.value = state.authUser.name;
      localStorage.setItem('wordle_playerName', state.authUser.name);
      updateAuthUI();
      hideAuthModal();

      // Fetch and display stats
      const stats = await fetchPlayerStats(state.authUser.email);
      if (stats) {
        displayStats(stats);
      }

      console.log('[Wordle Auth] Logged in as:', state.authUser.email);
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

  // Set up auth state change listener (handles email confirmation redirects)
  const client = getSupabase();
  if (client) {
    client.auth.onAuthStateChange(async (event, session) => {
      console.log('[Wordle] Auth state changed:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        // User just confirmed email or signed in
        state.authUser = {
          email: session.user.email,
          name: session.user.user_metadata?.display_name || session.user.email.split('@')[0],
        };
        hideAuthModal();
        updateAuthUI();

        // Fetch and display stats
        const stats = await fetchPlayerStats(state.authUser.email);
        if (stats) displayStats(stats);

        // Fetch daily status
        const dailyStatus = await fetchDailyStatus(state.authUser.email);
        if (dailyStatus) {
          state.todayCompleted = dailyStatus.completed;
          if (dailyStatus.completed) state.todayCompletionData = dailyStatus;
          updateDailyButtonState();
        }
      } else if (event === 'SIGNED_OUT') {
        state.authUser = null;
        updateAuthUI();
      } else if (event === 'PASSWORD_RECOVERY') {
        // User clicked password reset link - show update password form
        showPasswordUpdateForm();
      }
    });
  }

  // Fetch today's daily number
  await fetchDailyNumber();

  // Priority 1: Check for SSO token from Tools Hub
  state.authUser = await checkSSOToken();

  // Priority 2: Check for existing Supabase session
  if (!state.authUser) {
    state.authUser = await checkExistingSession();
  }

  if (state.authUser) {
    // Authenticated user - pre-fill name and save
    elements.playerName.value = state.authUser.name;
    localStorage.setItem('wordle_playerName', state.authUser.name);
    console.log('[Wordle] Logged in as:', state.authUser.name);

    // Fetch and display stats
    const stats = await fetchPlayerStats(state.authUser.email);
    if (stats) {
      displayStats(stats);
    }

    // Fetch today's daily status for button indicator
    const dailyStatus = await fetchDailyStatus(state.authUser.email);
    if (dailyStatus) {
      state.todayCompleted = dailyStatus.completed;
      if (dailyStatus.completed) {
        state.todayCompletionData = dailyStatus;
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

  // Check for room code in URL (shareable link)
  pendingRoomJoin = parseRoomCodeFromURL();
  if (pendingRoomJoin) {
    console.log('[Wordle] Room code from URL:', pendingRoomJoin);
  }

  // Connect to WebSocket
  connect();

  // Event listeners
  setupEventListeners();

  // Browser history navigation (back/forward buttons)
  setupPopstateHandler();

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

    // Priority 1: If URL has room code, handle that first
    if (pendingRoomJoin) {
      const session = getSession();

      // Check if we have a session for this exact room
      if (session && session.roomCode === pendingRoomJoin) {
        // Rejoin existing session
        console.log('[Wordle] Rejoining room from URL:', pendingRoomJoin);
        attemptRejoin();
      } else {
        // Join as new player
        console.log('[Wordle] Joining room from URL:', pendingRoomJoin);
        const playerName = elements.playerName.value.trim() || 'Player';
        send({
          type: 'joinRoom',
          roomCode: pendingRoomJoin,
          playerName,
          playerEmail: state.authUser?.email,
        });
      }
      pendingRoomJoin = null; // Clear after handling
      return;
    }

    // Priority 2: Try to rejoin if we have a saved session
    const hadSession = attemptRejoin();

    // Priority 3: If no saved session, subscribe to lobby for public rooms
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
  state.roomCode = null;
  state.playerId = null;
  state.isCreator = false;
  state.guesses = [];
  state.guessResults = [];
  state.opponents.clear();

  // Return to lobby
  showView('lobby');
  subscribeLobby();
}

// Room Handlers
function handleRoomCreated(msg) {
  state.playerId = msg.playerId;
  state.roomCode = msg.roomCode;
  state.isCreator = true;
  state.isReady = false;
  // allPlayersReady is now computed from state.playersInRoom

  // Use settings from server (configured in pre-creation screen)
  state.gameMode = msg.gameMode || 'casual';
  state.wordMode = msg.wordMode || 'daily';
  state.dailyNumber = msg.dailyNumber || null;
  state.isRoomPublic = msg.isPublic !== undefined ? msg.isPublic : true;

  // Unsubscribe from lobby (we're in a room now)
  unsubscribeLobby();

  // Save session for reconnection
  saveSession(state.roomCode, state.playerId);

  showView('waiting');
  elements.roomCode.textContent = state.roomCode;
  updateURLForRoom(state.roomCode); // Update URL for shareable link
  setupCreatorUI();

  state.playersInRoom = [
    { id: state.playerId, name: getPlayerName(), isCreator: true, isReady: false },
  ];
  updatePlayerList(state.playersInRoom);
  updateModeButtons(state.gameMode);
  updateWordModeButtons();
  updateVisibilityButtons();
  updateReadyButton();
  updateStartButton();
}

function handleRoomJoined(msg) {
  state.playerId = msg.playerId;
  state.roomCode = msg.roomCode;
  state.isCreator = msg.isCreator;
  state.gameMode = msg.gameMode || 'casual';
  state.wordMode = msg.wordMode || 'daily';
  state.isReady = false;
  // allPlayersReady is now computed from state.playersInRoom

  // Unsubscribe from lobby (we're in a room now)
  unsubscribeLobby();

  // Save session for reconnection
  saveSession(state.roomCode, state.playerId);

  // For solo daily: skip waiting room, countdown will start automatically
  // The countdown overlay is position:fixed, so it shows over any view
  if (msg.isSolo) {
    console.log('[DAILY] Solo mode - waiting for countdown');
    // Stay on lobby view - the countdown overlay will appear shortly
    return;
  }

  showView('waiting');
  elements.roomCode.textContent = state.roomCode;
  updateURLForRoom(state.roomCode); // Update URL for shareable link

  if (state.isCreator) {
    setupCreatorUI();
  } else {
    setupNonCreatorUI();
  }

  // Store players with ready status
  state.playersInRoom = msg.players.map((p) => ({
    ...p,
    isReady: p.isReady || false,
  }));
  updatePlayerList(state.playersInRoom);
  updateModeButtons(state.gameMode);
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
  state.playersInRoom.push(newPlayer);
  updatePlayerList(state.playersInRoom, msg.player.id);

  // Show toast notification
  showInfoToast(`${msg.player.name} joined`);

  // Update start button (in case we now have enough players)
  updateStartButton();
}

function handlePlayerLeft(msg) {
  // Find player name before removing
  const leavingPlayer = state.playersInRoom.find((p) => p.id === msg.playerId);
  const playerName = leavingPlayer?.name || 'A player';

  // Remove from players list
  state.playersInRoom = state.playersInRoom.filter((p) => p.id !== msg.playerId);
  updatePlayerList(state.playersInRoom);

  // Show toast notification
  showInfoToast(`${playerName} left`);

  // Update start button
  updateStartButton();

  // Remove from state.opponents in game
  state.opponents.delete(msg.playerId);
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
  state.roomCode = null;
  state.playerId = null;
  state.isCreator = false;
  state.playersInRoom = [];

  // Return to lobby
  showView('lobby');
  subscribeLobby();
}

function handleBecameCreator() {
  state.isCreator = true;
  setupCreatorUI();
  updateStartButton();
}

function handleGameModeChanged(msg) {
  state.gameMode = msg.mode;
  updateModeButtons(state.gameMode);
}

function handleWordModeChanged(msg) {
  state.wordMode = msg.mode;
  state.dailyNumber = msg.dailyNumber;
  updateWordModeButtons();
}

function handlePlayerReadyChanged(msg) {
  // Update player in our list
  const player = state.playersInRoom.find((p) => p.id === msg.playerId);
  if (player) {
    player.isReady = msg.isReady;
    updatePlayerList(state.playersInRoom);
  }

  // Update our own ready state if it's us
  if (msg.playerId === state.playerId) {
    state.isReady = msg.isReady;
    updateReadyButton();
  }
}

function handleAllPlayersReadyStatus(_msg) {
  // allPlayersReady is now computed from state.playersInRoom
  // Server message is informational only - UI will recompute from source of truth
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

function handleTimerSync(msg) {
  state.gameTimer = msg.gameTime;
  state.playerTimes = msg.playerTimes;

  // Update main timer display
  if (elements.gameTimerDisplay) {
    const myTime = state.playerTimes[state.playerId];
    if (myTime && myTime.finished) {
      elements.gameTimerDisplay.textContent = formatTime(myTime.finishTime);
      elements.gameTimerDisplay.classList.add('finished');
    } else {
      elements.gameTimerDisplay.textContent = formatTime(state.gameTimer);
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
  state.gamePhase = 'playing';
  state.gameTimer = 0;
  state.playerTimes = {};
  state.currentGuess = '';
  state.guesses = [];
  state.guessResults = [];
  state.lastRejectedWord = null;
  state.rejectionCount = 0;

  // Initialize opponent boards
  state.opponents.clear();
  for (const player of msg.players) {
    if (player.id !== state.playerId) {
      state.opponents.set(player.id, {
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
  if (state.pendingResumeGuesses && state.pendingResumeGuesses.guesses.length > 0) {
    console.log(`[DAILY] Replaying ${state.pendingResumeGuesses.guesses.length} saved guesses`);
    replayResumeGuesses();
  }
}

/**
 * Replay saved guesses when resuming a daily challenge
 * Submits each guess with a small delay to allow UI updates
 */
function replayResumeGuesses() {
  if (!state.pendingResumeGuesses || state.pendingResumeGuesses.guesses.length === 0) {
    state.pendingResumeGuesses = null;
    return;
  }

  const guessesToReplay = [...state.pendingResumeGuesses.guesses];
  state.pendingResumeGuesses = null;

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
  state.guesses.push(msg.word);
  state.guessResults.push(msg.result);

  // Update grid with results
  const rowIndex = state.guesses.length - 1;
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

  state.currentGuess = '';

  if (msg.isWin) {
    elements.message.textContent = 'You won!';
    elements.message.className = 'game-message success';
  } else if (msg.isLoss) {
    elements.message.textContent = 'Out of guesses!';
    elements.message.className = 'game-message error';
  }
}

function handleOpponentGuess(msg) {
  const opponent = state.opponents.get(msg.playerId);
  if (!opponent) return;

  opponent.guessResults.push(msg.colors);
  opponent.isFinished = msg.isFinished;
  opponent.won = msg.won;

  renderOpponentBoards();
}

function handleGameEnded(msg) {
  state.gamePhase = 'results';
  state.targetWord = msg.word;

  // Clear any saved daily progress since the game completed
  if (state.dailyNumber) {
    clearDailyProgress(state.dailyNumber);
  }

  showView('results');
  elements.revealedWord.textContent = msg.word;

  // Build results list
  elements.resultsList.innerHTML = '';
  msg.results.forEach((result, index) => {
    elements.resultsList.appendChild(renderResultItem(result, index));
  });
}

function handleReturnedToLobby() {
  state.gamePhase = 'waiting';
  state.isReady = false;
  // allPlayersReady is now computed from state.playersInRoom, no assignment needed

  // Reset all players' ready status
  state.playersInRoom = state.playersInRoom.map((p) => ({ ...p, isReady: false }));

  showView('waiting');
  updatePlayerList(state.playersInRoom);
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
  if (state.isSubscribedToLobby) return;
  send({ type: 'subscribeLobby' });
  state.isSubscribedToLobby = true;
  console.log('[Wordle] Subscribed to lobby');
}

/**
 * Unsubscribe from lobby updates (when joining/creating a room)
 */
function unsubscribeLobby() {
  if (!state.isSubscribedToLobby) return;
  send({ type: 'unsubscribeLobby' });
  state.isSubscribedToLobby = false;
  console.log('[Wordle] Unsubscribed from lobby');
}

/**
 * Handle public rooms list update from server
 */
function handlePublicRoomsList(msg) {
  state.publicRooms = msg.rooms || [];
  renderPublicRooms();
}

/**
 * Render the public rooms list in the lobby
 */
function renderPublicRooms() {
  if (!elements.publicRoomsList || !elements.noPublicRooms) return;

  elements.publicRoomsList.innerHTML = '';

  if (state.publicRooms.length === 0) {
    elements.noPublicRooms.classList.remove('hidden');
    return;
  }

  elements.noPublicRooms.classList.add('hidden');

  for (const room of state.publicRooms) {
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
      room.dailyNumber && state.todayCompleted && room.dailyNumber === state.todaysDailyNumber;

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
  if (dailyNumber && state.authUser) {
    const completion = await checkDailyCompletion(state.authUser.email, dailyNumber);
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
    playerEmail: state.authUser?.email || null,
  });
}

/**
 * Handle room visibility changed (from server, when creator toggles)
 */
function handleRoomVisibilityChanged(msg) {
  state.isRoomPublic = msg.isPublic;
  updateVisibilityButtons();
}

/**
 * Update visibility toggle buttons in waiting room
 */
function updateVisibilityButtons() {
  if (!elements.visibilityPublic || !elements.visibilityPrivate) return;

  elements.visibilityPublic.classList.toggle('active', state.isRoomPublic);
  elements.visibilityPrivate.classList.toggle('active', !state.isRoomPublic);

  if (elements.visibilityHint) {
    elements.visibilityHint.textContent = state.isRoomPublic
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
  state.playerId = msg.playerId;
  state.roomCode = msg.roomCode;
  state.isCreator = msg.isCreator;
  state.gameMode = msg.gameMode || 'casual';
  state.wordMode = msg.wordMode || 'daily';
  state.dailyNumber = msg.dailyNumber;
  state.isReady = msg.isReady;
  state.playersInRoom = msg.players;
  state.gamePhase = 'waiting';

  // Update session with current data
  saveSession(state.roomCode, state.playerId);

  // Show waiting room
  showView('waiting');
  elements.roomCode.textContent = state.roomCode;

  if (state.isCreator) {
    setupCreatorUI();
  } else {
    setupNonCreatorUI();
  }

  updatePlayerList(state.playersInRoom);
  updateModeButtons(state.gameMode);
  updateWordModeButtons();
  updateReadyButton();
  updateStartButton();

  showToast('Reconnected!', 'success');
  console.log('[Wordle] Rejoined waiting room:', state.roomCode);
}

/**
 * Handle successful rejoin to active game
 */
function handleRejoinGame(msg) {
  hideReconnectingOverlay();

  // Restore state
  state.playerId = msg.playerId;
  state.roomCode = msg.roomCode;
  state.gameMode = msg.gameMode || 'casual';
  state.guesses = msg.guesses || [];
  state.guessResults = msg.guessResults || [];
  state.gamePhase = 'playing';

  // Update session
  saveSession(state.roomCode, state.playerId);

  // Restore state.opponents
  state.opponents.clear();
  if (msg.opponents) {
    for (const opp of msg.opponents) {
      state.opponents.set(opp.id, {
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
  for (let row = 0; row < state.guesses.length; row++) {
    const guess = state.guesses[row];
    const results = state.guessResults[row];
    const rowEl = elements.grid.children[row];

    for (let col = 0; col < 5; col++) {
      const tile = rowEl.children[col];
      tile.textContent = guess[col].toUpperCase();
      tile.classList.add('filled', 'flip', results[col]);
    }
  }

  // Restore keyboard state
  for (let row = 0; row < state.guessResults.length; row++) {
    const guess = state.guesses[row];
    const results = state.guessResults[row];
    for (let i = 0; i < 5; i++) {
      const letter = guess[i].toLowerCase();
      const result = results[i];
      updateKeyboardKey(letter, result);
    }
  }

  // Render state.opponents
  renderOpponentBoards();

  // Calculate game timer from start time
  if (msg.gameStartTime) {
    state.gameTimer = Date.now() - msg.gameStartTime;
  }

  showToast('Reconnected to game!', 'success');
  console.log('[Wordle] Rejoined active game:', state.roomCode);
}

/**
 * Handle successful rejoin to results screen
 */
function handleRejoinResults(msg) {
  hideReconnectingOverlay();

  // Restore state
  state.roomCode = msg.roomCode;
  state.targetWord = msg.word;
  state.gameMode = msg.gameMode || 'casual';
  state.gamePhase = 'finished';

  // Clear session since game is over
  clearSession();

  // Show results
  showView('results');
  elements.revealedWord.textContent = msg.word;

  // Build results list (uses shared renderResultItem function)
  elements.resultsList.innerHTML = '';
  msg.results.forEach((result, index) => {
    elements.resultsList.appendChild(renderResultItem(result, index));
  });

  showToast('Reconnected to results', 'success');
  console.log('[Wordle] Rejoined results screen:', state.roomCode);
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
  const player = state.playersInRoom.find((p) => p.id === msg.playerId);
  if (player) {
    player.connectionState = 'disconnected';
    updatePlayerList(state.playersInRoom);
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
  const player = state.playersInRoom.find((p) => p.id === msg.playerId);
  if (player) {
    player.connectionState = 'connected';
    updatePlayerList(state.playersInRoom);
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
    if (view) {
      view.classList.toggle('hidden', key !== name);
    }
  }
  // Update header back button visibility
  updateBackButton(name);
  // Close profile dropdown when changing views
  closeProfileDropdown();
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
      <span class="player-name">${player.name}${player.id === state.playerId ? ' (You)' : ''}</span>
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
    elements.wordModeDaily.classList.toggle('active', state.wordMode === 'daily');
  }
  if (elements.wordModeRandom) {
    elements.wordModeRandom.classList.toggle('active', state.wordMode === 'random');
  }
  if (elements.dailyNumberDisplay) {
    if (state.wordMode === 'daily' && state.dailyNumber) {
      elements.dailyNumberDisplay.textContent = `#${state.dailyNumber}`;
      elements.dailyNumberDisplay.classList.remove('hidden');
    } else {
      elements.dailyNumberDisplay.classList.add('hidden');
    }
  }
}

// Room Config View helpers
function resetPendingConfig() {
  state.pendingConfig.gameMode = 'casual';
  state.pendingConfig.wordMode = 'daily';
  state.pendingConfig.isPublic = true;
}

function updateConfigButtons() {
  if (elements.configModeCasual) {
    elements.configModeCasual.classList.toggle('active', state.pendingConfig.gameMode === 'casual');
  }
  if (elements.configModeCompetitive) {
    elements.configModeCompetitive.classList.toggle(
      'active',
      state.pendingConfig.gameMode === 'competitive'
    );
  }
  if (elements.configWordDaily) {
    elements.configWordDaily.classList.toggle('active', state.pendingConfig.wordMode === 'daily');
  }
  if (elements.configWordRandom) {
    elements.configWordRandom.classList.toggle('active', state.pendingConfig.wordMode === 'random');
  }
  if (elements.configVisPublic) {
    elements.configVisPublic.classList.toggle('active', state.pendingConfig.isPublic === true);
  }
  if (elements.configVisPrivate) {
    elements.configVisPrivate.classList.toggle('active', state.pendingConfig.isPublic === false);
  }
}

function updateReadyButton() {
  if (!elements.readyBtn) return;

  if (state.isReady) {
    elements.readyBtn.textContent = 'Not Ready';
    elements.readyBtn.classList.add('ready');
  } else {
    elements.readyBtn.textContent = "I'm Ready";
    elements.readyBtn.classList.remove('ready');
  }
}

function updateStartButton() {
  if (!elements.startGame || !state.isCreator) return;

  if (state.allPlayersReady) {
    elements.startGame.disabled = false;
    elements.startGame.classList.remove('disabled');
  } else {
    elements.startGame.disabled = true;
    elements.startGame.classList.add('disabled');
  }
}

/**
 * Render a single result list item.
 * Handles both playerId and id field names for compatibility.
 *
 * @param {Object} result - Result object with name, won, guesses, time, score
 * @param {number} index - Position in results list (0-based)
 * @returns {HTMLLIElement} The rendered list item
 */
function renderResultItem(result, index) {
  const li = document.createElement('li');

  let rankClass = '';
  if (index === 0) rankClass = 'gold';
  else if (index === 1) rankClass = 'silver';
  else if (index === 2) rankClass = 'bronze';

  // Handle both playerId and id field names (server inconsistency)
  const isMe = (result.playerId || result.id) === state.playerId;

  const timeStr = result.time ? `${(result.time / 1000).toFixed(1)}s` : '-';
  const statsStr =
    state.gameMode === 'competitive'
      ? `${result.guesses} guesses • ${timeStr} • ${result.score} pts`
      : `${result.guesses} guesses • ${timeStr}`;

  li.innerHTML = `
    <span class="rank ${rankClass}">${index + 1}</span>
    <div class="player-info">
      <div class="player-name">${result.name}${isMe ? ' (You)' : ''}</div>
      <div class="player-stats">${result.won ? statsStr : 'Did not solve'}</div>
    </div>
    <span class="result-badge ${result.won ? 'won' : 'lost'}">${result.won ? 'Solved' : 'Failed'}</span>
  `;
  return li;
}

/**
 * Configure UI for room creator (host).
 * Shows Start Game button, Close Room button, visibility selector,
 * and enables game mode controls.
 */
function setupCreatorUI() {
  elements.startGame?.classList.remove('hidden');
  elements.waitingMessage?.classList.add('hidden');
  if (elements.closeRoom) elements.closeRoom.classList.remove('hidden');
  elements.modeCasual.disabled = false;
  elements.modeCompetitive.disabled = false;
  if (elements.wordModeDaily) elements.wordModeDaily.disabled = false;
  if (elements.wordModeRandom) elements.wordModeRandom.disabled = false;
  if (elements.visibilitySelector) {
    elements.visibilitySelector.classList.remove('hidden');
  }
}

/**
 * Configure UI for non-creator player.
 * Hides Start Game button, shows waiting message,
 * and disables game mode controls.
 */
function setupNonCreatorUI() {
  elements.startGame?.classList.add('hidden');
  elements.waitingMessage?.classList.remove('hidden');
  if (elements.closeRoom) elements.closeRoom.classList.add('hidden');
  elements.modeCasual.disabled = true;
  elements.modeCompetitive.disabled = true;
  if (elements.wordModeDaily) elements.wordModeDaily.disabled = true;
  if (elements.wordModeRandom) elements.wordModeRandom.disabled = true;
  if (elements.visibilitySelector) {
    elements.visibilitySelector.classList.add('hidden');
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
  const rowIndex = state.guesses.length;
  if (rowIndex >= 6) return;

  const row = elements.grid.children[rowIndex];
  for (let i = 0; i < 5; i++) {
    const tile = row.children[i];
    tile.textContent = state.currentGuess[i] || '';
    tile.classList.toggle('filled', !!state.currentGuess[i]);
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
  if (state.gamePhase !== 'playing') return;
  if (state.guesses.length >= 6) return;

  if (key === 'ENTER') {
    if (state.currentGuess.length === 5) {
      // Dictionary validation
      if (!VALID_GUESSES.has(state.currentGuess)) {
        if (state.currentGuess === state.lastRejectedWord) {
          state.rejectionCount++;
          if (state.rejectionCount >= 2) {
            // Third attempt - force submit
            send({ type: 'guess', word: state.currentGuess, forced: true });
            state.lastRejectedWord = null;
            state.rejectionCount = 0;
            state.currentGuess = '';
            return;
          }
          // Second attempt - warn them
          showGameMessage('Not recognized. Enter again to force.');
        } else {
          // First attempt with this word
          state.lastRejectedWord = state.currentGuess;
          state.rejectionCount = 0; // Will be 1 on second attempt, 2 on third
          showGameMessage('Not in word list');
        }
        shakeCurrentRow();
        return;
      }

      // Valid word - submit normally
      send({ type: 'guess', word: state.currentGuess, forced: false });
      state.lastRejectedWord = null;
      state.rejectionCount = 0;
      state.currentGuess = '';
    }
  } else if (key === 'BACKSPACE') {
    state.currentGuess = state.currentGuess.slice(0, -1);
    // Reset rejection if changing word
    if (
      state.lastRejectedWord &&
      state.currentGuess !== state.lastRejectedWord.slice(0, state.currentGuess.length)
    ) {
      state.lastRejectedWord = null;
      state.rejectionCount = 0;
    }
    updateCurrentRow();
  } else if (/^[A-Z]$/.test(key) && state.currentGuess.length < 5) {
    state.currentGuess += key;
    updateCurrentRow();
  }
}

// Visual feedback for invalid words
function shakeCurrentRow() {
  const rowIndex = state.guesses.length;
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

function renderOpponentBoards() {
  elements.opponentBoards.innerHTML = '';
  const isMobile = isMobileView();

  for (const [id, opponent] of state.opponents) {
    const board = document.createElement('div');
    board.className = isMobile ? 'opponent-board compact' : 'opponent-board';

    if (opponent.isFinished && opponent.won) {
      board.classList.add('solved');
    }

    // Get timer for this opponent
    let timerDisplay = '';
    const opponentTime = state.playerTimes[id];
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
    closeFriendsSheet();
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
      playerEmail: state.authUser?.email || null,
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
      state.pendingConfig.gameMode = 'casual';
      updateConfigButtons();
    });
  }

  if (elements.configModeCompetitive) {
    elements.configModeCompetitive.addEventListener('click', () => {
      state.pendingConfig.gameMode = 'competitive';
      updateConfigButtons();
    });
  }

  if (elements.configWordDaily) {
    elements.configWordDaily.addEventListener('click', () => {
      state.pendingConfig.wordMode = 'daily';
      updateConfigButtons();
    });
  }

  if (elements.configWordRandom) {
    elements.configWordRandom.addEventListener('click', () => {
      state.pendingConfig.wordMode = 'random';
      updateConfigButtons();
    });
  }

  if (elements.configVisPublic) {
    elements.configVisPublic.addEventListener('click', () => {
      state.pendingConfig.isPublic = true;
      updateConfigButtons();
    });
  }

  if (elements.configVisPrivate) {
    elements.configVisPrivate.addEventListener('click', () => {
      state.pendingConfig.isPublic = false;
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
        playerEmail: state.authUser?.email || null,
        gameMode: state.pendingConfig.gameMode,
        wordMode: state.pendingConfig.wordMode,
        isPublic: state.pendingConfig.isPublic,
      });
    });
  }

  // Waiting
  elements.copyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(state.roomCode);
    elements.copyCode.textContent = '✓';
    setTimeout(() => {
      elements.copyCode.textContent = '📋';
    }, 1500);
  });

  elements.copyLink.addEventListener('click', () => {
    const shareableLink = `${window.location.origin}/wordle/room/${state.roomCode}`;
    navigator.clipboard.writeText(shareableLink);
    elements.copyLink.textContent = '✓';
    showToast('Link copied! Share it with friends', 'success');
    setTimeout(() => {
      elements.copyLink.textContent = '🔗';
    }, 1500);
  });

  elements.modeCasual.addEventListener('click', () => {
    if (state.isCreator) {
      send({ type: 'setGameMode', mode: 'casual' });
    }
  });

  elements.modeCompetitive.addEventListener('click', () => {
    if (state.isCreator) {
      send({ type: 'setGameMode', mode: 'competitive' });
    }
  });

  // Word mode buttons
  if (elements.wordModeDaily) {
    elements.wordModeDaily.addEventListener('click', () => {
      if (state.isCreator) {
        send({ type: 'setWordMode', mode: 'daily' });
      }
    });
  }

  if (elements.wordModeRandom) {
    elements.wordModeRandom.addEventListener('click', () => {
      if (state.isCreator) {
        send({ type: 'setWordMode', mode: 'random' });
      }
    });
  }

  // Visibility toggle buttons
  if (elements.visibilityPublic) {
    elements.visibilityPublic.addEventListener('click', () => {
      if (state.isCreator && !state.isRoomPublic) {
        send({ type: 'setRoomVisibility', isPublic: true });
      }
    });
  }

  if (elements.visibilityPrivate) {
    elements.visibilityPrivate.addEventListener('click', () => {
      if (state.isCreator && state.isRoomPublic) {
        send({ type: 'setRoomVisibility', isPublic: false });
      }
    });
  }

  // Ready button
  if (elements.readyBtn) {
    elements.readyBtn.addEventListener('click', () => {
      send({ type: 'setReady', ready: !state.isReady });
    });
  }

  elements.startGame.addEventListener('click', () => {
    send({ type: 'startGame' });
  });

  elements.leaveRoom.addEventListener('click', () => {
    send({ type: 'leaveRoom' });
    clearSession();
    showView('lobby');
    updateURLForLobby(); // Reset URL to /wordle/
    state.roomCode = null;
    state.playerId = null;
    state.isCreator = false;
    // Resubscribe to lobby for public rooms
    subscribeLobby();
  });

  // Close Room button (host only - kicks everyone)
  if (elements.closeRoom) {
    elements.closeRoom.addEventListener('click', () => {
      if (!state.isCreator) return;
      // Confirm before closing
      if (state.playersInRoom.length > 1) {
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
      if (state.wordMode === 'daily' && state.guesses.length > 0) {
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
    if (state.gamePhase !== 'playing') return;

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
    refreshStatsAndShowLobby();
    state.roomCode = null;
    state.playerId = null;
    state.isCreator = false;
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

  // Forgot Password link
  if (elements.forgotPasswordLink) {
    elements.forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showForgotPasswordForm();
    });
  }

  // Back to Login from reset form
  if (elements.backToLogin) {
    elements.backToLogin.addEventListener('click', () => {
      hideForgotPasswordForm();
    });
  }

  // Reset Password form submit
  if (elements.resetPasswordForm) {
    elements.resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = elements.resetEmail.value.trim();
      if (!email) return;

      elements.sendResetLink.disabled = true;
      elements.sendResetLink.textContent = 'Sending...';
      elements.resetError.classList.add('hidden');
      elements.resetSuccess.classList.add('hidden');

      try {
        await requestPasswordReset(email);
        elements.resetSuccess.textContent = 'Check your email for the reset link!';
        elements.resetSuccess.classList.remove('hidden');
        elements.resetEmail.value = '';
      } catch (error) {
        elements.resetError.textContent = error.message || 'Failed to send reset link';
        elements.resetError.classList.remove('hidden');
      } finally {
        elements.sendResetLink.disabled = false;
        elements.sendResetLink.textContent = 'Send Reset Link';
      }
    });
  }

  // Update Password form submit (after clicking reset link)
  if (elements.updatePasswordForm) {
    elements.updatePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = elements.newPassword.value;
      const confirmPass = elements.confirmPassword.value;

      if (newPass !== confirmPass) {
        elements.updateError.textContent = 'Passwords do not match';
        elements.updateError.classList.remove('hidden');
        return;
      }

      if (newPass.length < 6) {
        elements.updateError.textContent = 'Password must be at least 6 characters';
        elements.updateError.classList.remove('hidden');
        return;
      }

      elements.updatePasswordBtn.disabled = true;
      elements.updatePasswordBtn.textContent = 'Updating...';
      elements.updateError.classList.add('hidden');

      try {
        await updatePassword(newPass);
        hidePasswordUpdateForm();
        hideAuthModal();
        showError('Password updated successfully!', 'success');
      } catch (error) {
        elements.updateError.textContent = error.message || 'Failed to update password';
        elements.updateError.classList.remove('hidden');
      } finally {
        elements.updatePasswordBtn.disabled = false;
        elements.updatePasswordBtn.textContent = 'Update Password';
      }
    });
  }

  // Daily Challenge events
  if (elements.dailyChallengeBtn) {
    elements.dailyChallengeBtn.addEventListener('click', handleDailyChallengeClick);
  }

  if (elements.playRandomInstead) {
    elements.playRandomInstead.addEventListener('click', () => {
      refreshStatsAndShowLobby();
      // Optionally auto-create a random game
    });
  }

  if (elements.backFromDaily) {
    elements.backFromDaily.addEventListener('click', () => {
      refreshStatsAndShowLobby();
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
      if (state.pendingDailyAction) {
        startDailyChallenge(state.pendingDailyAction.type === 'solo');
        state.pendingDailyAction = null;
      }
    });
  }

  if (elements.confirmDailyCancel) {
    elements.confirmDailyCancel.addEventListener('click', () => {
      hideDailyConfirmModal();
      state.pendingDailyAction = null;
    });
  }

  // Close confirm modal on overlay click
  if (elements.dailyConfirmModal) {
    const overlay = elements.dailyConfirmModal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        hideDailyConfirmModal();
        state.pendingDailyAction = null;
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
      const maxDaily = (state.todaysDailyNumber || 734) - 1;
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
      state.historicalDailiesData = null;
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

  // Stats Dashboard View events
  if (elements.viewStatsBtn) {
    elements.viewStatsBtn.addEventListener('click', showStatsView);
  }

  if (elements.backFromStats) {
    elements.backFromStats.addEventListener('click', () => {
      showView('lobby');
    });
  }

  // ==========================================================================
  // Header Toolbar & New Lobby UI Events (Lobby Redesign)
  // ==========================================================================

  // Header back button
  if (elements.backBtn) {
    elements.backBtn.addEventListener('click', handleBackButton);
  }

  // Settings button
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', showSettings);
  }

  // Profile button
  if (elements.profileBtn) {
    elements.profileBtn.addEventListener('click', toggleProfileDropdown);
  }

  // Profile dropdown actions
  if (elements.dropdownStats) {
    elements.dropdownStats.addEventListener('click', () => {
      closeProfileDropdown();
      showStatsView();
    });
  }

  if (elements.dropdownLogout) {
    elements.dropdownLogout.addEventListener('click', async () => {
      closeProfileDropdown();
      await logout();
    });
  }

  if (elements.dropdownLogin) {
    elements.dropdownLogin.addEventListener('click', () => {
      closeProfileDropdown();
      showAuthModal(false); // false = login mode
    });
  }

  if (elements.dropdownSignup) {
    elements.dropdownSignup.addEventListener('click', () => {
      closeProfileDropdown();
      showAuthModal(true); // true = signup mode
    });
  }

  if (elements.dropdownGuest) {
    elements.dropdownGuest.addEventListener('click', () => {
      closeProfileDropdown();
      // Hide the auth section and show room actions (same as playAsGuest button)
      if (elements.authSection) {
        elements.authSection.classList.add('hidden');
      }
      if (elements.roomActionsSection) {
        elements.roomActionsSection.classList.remove('hidden');
      }
      if (elements.dailyChallengeSection) {
        elements.dailyChallengeSection.classList.remove('hidden');
      }
    });
  }

  // Daily Challenge tooltip (UX-001) - show when guest taps disabled button
  // Use container because click events don't fire on disabled buttons
  if (elements.dailyBtnContainer) {
    elements.dailyBtnContainer.addEventListener('click', (e) => {
      // Only show tooltip if button is disabled (user not logged in)
      if (elements.dailyChallengeBtn?.disabled) {
        e.preventDefault();
        showDailyTooltip();
      }
    });
  }

  // Tooltip sign-in button opens auth modal
  if (elements.tooltipSignIn) {
    elements.tooltipSignIn.addEventListener('click', () => {
      hideDailyTooltip();
      showAuthModal(false); // false = login mode
    });
  }

  // Play With Friends button (opens bottom sheet)
  if (elements.playWithFriendsLobbyBtn) {
    elements.playWithFriendsLobbyBtn.addEventListener('click', openFriendsSheet);
  }

  // Friends sheet close button
  if (elements.closeFriendsSheet) {
    elements.closeFriendsSheet.addEventListener('click', closeFriendsSheet);
  }

  // Friends sheet backdrop click to close
  if (elements.friendsSheet) {
    const backdrop = elements.friendsSheet.querySelector('.sheet-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeFriendsSheet);
    }
  }

  // Stats strip (opens stats view)
  if (elements.statsStrip) {
    elements.statsStrip.addEventListener('click', showStatsView);
  }

  // Guest prompt login link
  if (elements.loginPromptLink) {
    elements.loginPromptLink.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthModal(false); // false = login mode
    });
  }

  // Settings view events
  if (elements.soundToggle) {
    elements.soundToggle.addEventListener('click', toggleSound);
  }

  if (elements.backFromSettings) {
    elements.backFromSettings.addEventListener('click', saveSettings);
  }

  // Save name on blur in settings
  if (elements.settingsName) {
    elements.settingsName.addEventListener('blur', () => {
      const name = elements.settingsName.value.trim();
      if (name) {
        localStorage.setItem('wordle_playerName', name);
        if (elements.playerName) {
          elements.playerName.value = name;
        }
      }
    });
  }

  // Password change in settings (UX-003)
  if (elements.changePasswordBtn) {
    elements.changePasswordBtn.addEventListener('click', showChangePasswordForm);
  }

  if (elements.submitPasswordChange) {
    elements.submitPasswordChange.addEventListener('click', handlePasswordChange);
  }

  if (elements.cancelPasswordChange) {
    elements.cancelPasswordChange.addEventListener('click', hideChangePasswordForm);
  }

  // Re-render opponent boards on resize (debounced)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (state.opponents.size > 0) {
        renderOpponentBoards();
      }
    }, 150);
  });
}

// Start
init();
