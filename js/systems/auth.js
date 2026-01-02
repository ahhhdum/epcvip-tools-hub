/**
 * Auth System
 *
 * Uses Supabase for authentication and data persistence.
 * Provides optional login - guests can play, logged-in users get persistence.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase client (initialized on first use)
let supabase = null;

// Auth state
let currentUser = null;
let currentProfile = null;
let authListeners = [];

/**
 * Initialize Supabase client
 */
function getSupabase() {
  if (!supabase) {
    const config = window.SUPABASE_CONFIG;
    if (!config?.url || !config?.anonKey) {
      console.warn('[Auth] Supabase not configured');
      return null;
    }
    supabase = createClient(config.url, config.anonKey);
  }
  return supabase;
}

/**
 * Initialize auth system - check for existing session
 */
export async function initAuth() {
  const client = getSupabase();
  if (!client) return null;

  try {
    // Check for existing session
    const {
      data: { session },
    } = await client.auth.getSession();

    if (session?.user) {
      currentUser = session.user;
      await loadProfile();
      notifyListeners();
    }

    // Listen for auth changes
    client.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State changed:', event);
      currentUser = session?.user || null;

      if (currentUser) {
        await loadProfile();
      } else {
        currentProfile = null;
      }
      notifyListeners();
    });

    return currentUser;
  } catch (e) {
    console.error('[Auth] Init error:', e);
    return null;
  }
}

/**
 * Sign up with email/password
 */
export async function signUp(email, password, displayName) {
  const client = getSupabase();
  if (!client) throw new Error('Auth not available');

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // Create player profile
  if (data.user) {
    const { error: profileError } = await client.from('players').insert({
      id: data.user.id,
      display_name: displayName,
    });

    if (profileError) {
      console.error('[Auth] Profile creation error:', profileError);
      // Don't throw - user is created, profile can be retried
    }
  }

  return data.user;
}

/**
 * Sign in with email/password
 */
export async function signIn(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Auth not available');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

/**
 * Sign out
 */
export async function signOut() {
  const client = getSupabase();
  if (!client) return;

  await client.auth.signOut();
  currentUser = null;
  currentProfile = null;
}

/**
 * Get current user (null if not logged in)
 */
export function getUser() {
  return currentUser;
}

/**
 * Get current player profile (null if not logged in)
 */
export function getProfile() {
  return currentProfile;
}

/**
 * Check if user is logged in
 */
export function isLoggedIn() {
  return currentUser !== null;
}

/**
 * Load player profile from database
 */
async function loadProfile() {
  if (!currentUser) return;

  const client = getSupabase();
  if (!client) return;

  const { data, error } = await client
    .from('players')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    // Profile might not exist yet - create it
    if (error.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await client
        .from('players')
        .insert({
          id: currentUser.id,
          display_name: currentUser.email?.split('@')[0] || 'Player',
        })
        .select()
        .single();

      if (!createError) {
        currentProfile = newProfile;
      }
    } else {
      console.error('[Auth] Profile load error:', error);
    }
  } else {
    currentProfile = data;
  }
}

/**
 * Update player profile
 */
export async function updateProfile(updates) {
  if (!currentUser) throw new Error('Not logged in');

  const client = getSupabase();
  if (!client) throw new Error('Auth not available');

  const { data, error } = await client
    .from('players')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentUser.id)
    .select()
    .single();

  if (error) throw error;

  currentProfile = data;
  notifyListeners();
  return data;
}

/**
 * Save character selection to profile
 */
export async function saveCharacterSelection(characterId) {
  if (!currentUser) {
    // Guest mode - save to localStorage only
    localStorage.setItem('selectedCharacter', characterId);
    return;
  }

  // Logged in - save to database and localStorage
  localStorage.setItem('selectedCharacter', characterId);
  await updateProfile({ character_id: characterId });
}

/**
 * Get saved character selection
 */
export function getSavedCharacter() {
  // Check profile first (if logged in)
  if (currentProfile?.character_id) {
    return currentProfile.character_id;
  }

  // Fall back to localStorage
  return localStorage.getItem('selectedCharacter') || 'Farmer_Bob';
}

/**
 * Add auth state change listener
 */
export function onAuthChange(callback) {
  authListeners.push(callback);

  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Notify all listeners of auth state change
 */
function notifyListeners() {
  const state = {
    user: currentUser,
    profile: currentProfile,
    isLoggedIn: isLoggedIn(),
  };

  for (const listener of authListeners) {
    try {
      listener(state);
    } catch (e) {
      console.error('[Auth] Listener error:', e);
    }
  }
}

/**
 * Get Supabase client for direct queries (e.g., stats)
 */
export function getSupabaseClient() {
  return getSupabase();
}

/**
 * Generate SSO token for cross-app authentication (e.g., Wordle)
 * Token is signed by the server and validated by the target app
 */
export async function generateSSOToken(targetApp = 'multiplayer-wordle') {
  if (!currentUser) {
    throw new Error('User not logged in');
  }

  const payload = {
    sub: currentUser.email,
    name: currentProfile?.display_name || currentUser.email.split('@')[0],
    aud: targetApp,
  };

  try {
    const response = await fetch('/api/sso/sign-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate SSO token');
    }

    const { token } = await response.json();
    return token;
  } catch (e) {
    console.error('[Auth] SSO token generation failed:', e);
    throw e;
  }
}
