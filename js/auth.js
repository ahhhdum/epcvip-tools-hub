/**
 * EPCVIP Tools Hub - Authentication Module
 *
 * Server-side auth redirects unauthenticated users to /login.
 * This module just retrieves the current user from Supabase session.
 */

// Auth state
let supabase = null;
let currentUser = null;

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
      console.log('[Auth] Found session for:', currentUser.email);
      return currentUser;
    }
  } catch (e) {
    console.error('[Auth] Session check failed:', e);
  }
  return null;
}

/**
 * Initialize auth - get current user from session
 * Server-side middleware handles redirecting unauthenticated users to /login
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

  // Initialize Supabase
  await initSupabase();

  // Get user from session (server already verified auth via cookie)
  const user = await checkSession();
  if (user) {
    console.log('[Auth] User authenticated:', user.email);
    return user;
  }

  // If no session found, redirect to login
  // This shouldn't happen if server middleware is working correctly
  console.warn('[Auth] No session found, redirecting to login');
  window.location.href = '/login';

  // Return a never-resolving promise to prevent app from continuing
  return new Promise(() => {});
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Log out - redirect to logout endpoint
 */
export function logout() {
  window.location.href = '/logout';
}
