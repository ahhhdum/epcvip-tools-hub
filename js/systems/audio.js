/**
 * Audio System
 *
 * Manages sound effects with mute toggle.
 * Persists mute state in localStorage.
 */

let muted = localStorage.getItem('soundMuted') === 'true';

/**
 * Check if sound is muted
 */
export function isMuted() {
  return muted;
}

/**
 * Toggle mute state
 */
export function toggleMute() {
  muted = !muted;
  localStorage.setItem('soundMuted', muted.toString());
  return muted;
}

/**
 * Play a sound if not muted
 */
export function playSound(name, options = {}) {
  if (!muted) {
    play(name, options);
  }
}

/**
 * Load all game sounds (call from loading scene)
 */
export function loadSounds() {
  loadSound('pickup', 'assets/audio/pickup.wav');
  loadSound('powerup', 'assets/audio/powerup.wav');
  loadSound('throw', 'assets/audio/throw.wav');
}
