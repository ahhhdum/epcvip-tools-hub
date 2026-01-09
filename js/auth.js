/**
 * EPCVIP Tools Hub - Authentication Module
 *
 * Handles Supabase authentication with login modal.
 * Must be authenticated before accessing the game.
 */

// Auth state
let supabase = null;
let currentUser = null;
let isSignUpMode = false;

// DOM elements (initialized after DOMContentLoaded)
let elements = {};

/**
 * Initialize Supabase client
 */
async function initSupabase() {
  // Try to get config from server first (for Railway deployment)
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      if (config.supabase?.url && config.supabase?.anonKey) {
        supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);
        console.log('[Auth] Supabase initialized from server config');
        return;
      }
    }
  } catch (e) {
    console.warn('[Auth] Failed to fetch server config:', e);
  }

  // Fall back to window config (set in index.html)
  if (window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.anonKey) {
    supabase = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
    console.log('[Auth] Supabase initialized from window config');
  } else {
    console.error('[Auth] No Supabase configuration available');
  }
}

/**
 * Check for existing session
 */
async function checkSession() {
  if (!supabase) return null;

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] Session check error:', error);
      return null;
    }
    if (session?.user) {
      currentUser = session.user;
      console.log('[Auth] Found existing session for:', currentUser.email);
      return currentUser;
    }
  } catch (e) {
    console.error('[Auth] Session check failed:', e);
  }
  return null;
}

/**
 * Sign in with email/password
 */
async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  currentUser = data.user;
  return currentUser;
}

/**
 * Sign up with email/password
 */
async function signUp(email, password, displayName) {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0],
      },
    },
  });

  if (error) throw error;

  // Check if email confirmation is required
  if (data.user && !data.session) {
    throw new Error('Please check your email to confirm your account.');
  }

  currentUser = data.user;
  return currentUser;
}

/**
 * Send password reset email
 */
async function resetPassword(email) {
  if (!supabase) throw new Error('Supabase not initialized');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/wordle/`, // Wordle handles password reset
  });

  if (error) throw error;
}

/**
 * Show the login modal
 */
function showModal() {
  elements.authModal.classList.remove('hidden');
}

/**
 * Hide the login modal
 */
function hideModal() {
  elements.authModal.classList.add('hidden');
}

/**
 * Toggle between login and signup mode
 */
function toggleMode() {
  isSignUpMode = !isSignUpMode;

  if (isSignUpMode) {
    elements.modalTitle.textContent = 'Create Account';
    elements.authSubtitle.textContent = 'Sign up to access the Innovation Lab';
    elements.submitBtn.textContent = 'Sign Up';
    elements.displayNameGroup.classList.remove('hidden');
    elements.switchLink.textContent = 'Login';
    elements.toggleText.textContent = 'Already have an account? ';
  } else {
    elements.modalTitle.textContent = 'Welcome to EPCVIP Tools';
    elements.authSubtitle.textContent = 'Sign in to access the Innovation Lab';
    elements.submitBtn.textContent = 'Sign In';
    elements.displayNameGroup.classList.add('hidden');
    elements.switchLink.textContent = 'Sign up';
    elements.toggleText.textContent = "Don't have an account? ";
  }

  // Clear errors
  elements.authError.classList.add('hidden');
  elements.authError.textContent = '';
}

/**
 * Show error message
 */
function showError(message) {
  elements.authError.textContent = message;
  elements.authError.classList.remove('hidden');
}

/**
 * Clear error message
 */
function clearError() {
  elements.authError.classList.add('hidden');
  elements.authError.textContent = '';
}

/**
 * Show reset password form
 */
function showResetForm() {
  elements.authForm.classList.add('hidden');
  elements.authToggle.classList.add('hidden');
  elements.forgotLink.parentElement.classList.add('hidden');
  elements.resetForm.classList.remove('hidden');
}

/**
 * Show login form (from reset form)
 */
function showLoginForm() {
  elements.resetForm.classList.add('hidden');
  elements.authForm.classList.remove('hidden');
  elements.authToggle.classList.remove('hidden');
  elements.forgotLink.parentElement.classList.remove('hidden');
  elements.resetSuccess.classList.add('hidden');
  elements.resetError.classList.add('hidden');
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
  e.preventDefault();
  clearError();

  const email = elements.emailInput.value.trim();
  const password = elements.passwordInput.value;
  const displayName = elements.displayNameInput?.value.trim();

  // Set loading state
  elements.submitBtn.classList.add('loading');
  elements.submitBtn.disabled = true;

  try {
    if (isSignUpMode) {
      await signUp(email, password, displayName);
    } else {
      await signIn(email, password);
    }

    // Success - hide modal
    hideModal();

    // Dispatch custom event so main.js knows auth is complete
    window.dispatchEvent(new CustomEvent('auth-success', { detail: currentUser }));
  } catch (error) {
    console.error('[Auth] Submit error:', error);
    showError(error.message || 'Authentication failed');
  } finally {
    elements.submitBtn.classList.remove('loading');
    elements.submitBtn.disabled = false;
  }
}

/**
 * Handle reset password form submission
 */
async function handleResetSubmit(e) {
  e.preventDefault();

  const email = elements.resetEmailInput.value.trim();
  const submitBtn = elements.resetForm.querySelector('button[type="submit"]');

  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  elements.resetError.classList.add('hidden');
  elements.resetSuccess.classList.add('hidden');

  try {
    await resetPassword(email);
    elements.resetSuccess.textContent = 'Reset link sent! Check your email.';
    elements.resetSuccess.classList.remove('hidden');
  } catch (error) {
    console.error('[Auth] Reset error:', error);
    elements.resetError.textContent = error.message || 'Failed to send reset link';
    elements.resetError.classList.remove('hidden');
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
}

/**
 * Initialize auth and show modal if needed
 * Returns a promise that resolves when user is authenticated
 */
export async function initAuth() {
  // Wait for DOM
  await new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });

  // Cache DOM elements
  elements = {
    authModal: document.getElementById('authModal'),
    authForm: document.getElementById('authForm'),
    modalTitle: document.getElementById('authModalTitle'),
    authSubtitle: document.querySelector('.auth-subtitle'),
    emailInput: document.getElementById('authEmail'),
    passwordInput: document.getElementById('authPassword'),
    displayNameInput: document.getElementById('authDisplayName'),
    displayNameGroup: document.getElementById('displayNameGroup'),
    authError: document.getElementById('authError'),
    submitBtn: document.getElementById('authSubmit'),
    authToggle: document.getElementById('authToggle'),
    switchLink: document.getElementById('switchToSignup'),
    forgotLink: document.getElementById('forgotPasswordLink'),
    resetForm: document.getElementById('resetPasswordForm'),
    resetEmailInput: document.getElementById('resetEmail'),
    resetError: document.getElementById('resetError'),
    resetSuccess: document.getElementById('resetSuccess'),
    backToLoginBtn: document.getElementById('backToLogin'),
  };

  // Find toggle text node (the text before the link)
  if (elements.authToggle) {
    elements.toggleText = elements.authToggle.firstChild;
  }

  // Initialize Supabase
  await initSupabase();

  // Check for existing session
  const user = await checkSession();
  if (user) {
    console.log('[Auth] User already authenticated:', user.email);
    return user;
  }

  // Set up event listeners
  if (elements.authForm) {
    elements.authForm.addEventListener('submit', handleSubmit);
  }

  if (elements.switchLink) {
    elements.switchLink.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMode();
    });
  }

  if (elements.forgotLink) {
    elements.forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showResetForm();
    });
  }

  if (elements.backToLoginBtn) {
    elements.backToLoginBtn.addEventListener('click', () => {
      showLoginForm();
    });
  }

  if (elements.resetForm) {
    elements.resetForm.addEventListener('submit', handleResetSubmit);
  }

  // Show modal and wait for authentication
  showModal();

  return new Promise((resolve) => {
    window.addEventListener(
      'auth-success',
      (e) => {
        resolve(e.detail);
      },
      { once: true }
    );
  });
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return currentUser;
}
