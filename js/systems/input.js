/**
 * Input System
 *
 * Handles virtual button inputs from the D-pad and action buttons.
 * Allows touch/click controls to work like keyboard.
 */

// Track which virtual buttons are currently pressed
export const virtualInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  a: false,
  b: false,
};

// Callbacks for button presses
let onInteractCallback = null;
let onPauseCallback = null;

export function setInteractCallback(callback) {
  onInteractCallback = callback;
}

export function setPauseCallback(callback) {
  onPauseCallback = callback;
}

export function initInput() {
  // D-pad buttons
  const dpadButtons = document.querySelectorAll('.dpad-btn[data-dir]');
  dpadButtons.forEach(btn => {
    const dir = btn.dataset.dir;

    // Mouse events
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      virtualInput[dir] = true;
    });

    btn.addEventListener('mouseup', () => {
      virtualInput[dir] = false;
    });

    btn.addEventListener('mouseleave', () => {
      virtualInput[dir] = false;
    });

    // Touch events for mobile
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      virtualInput[dir] = true;
    });

    btn.addEventListener('touchend', () => {
      virtualInput[dir] = false;
    });

    btn.addEventListener('touchcancel', () => {
      virtualInput[dir] = false;
    });
  });

  // A button (interact)
  const btnA = document.getElementById('btnA');
  if (btnA) {
    btnA.addEventListener('mousedown', (e) => {
      e.preventDefault();
      virtualInput.a = true;
      if (onInteractCallback) onInteractCallback();
    });

    btnA.addEventListener('mouseup', () => {
      virtualInput.a = false;
    });

    btnA.addEventListener('touchstart', (e) => {
      e.preventDefault();
      virtualInput.a = true;
      if (onInteractCallback) onInteractCallback();
    });

    btnA.addEventListener('touchend', () => {
      virtualInput.a = false;
    });
  }

  // B button (could be used for cancel/back in future)
  const btnB = document.getElementById('btnB');
  if (btnB) {
    btnB.addEventListener('mousedown', (e) => {
      e.preventDefault();
      virtualInput.b = true;
      if (onPauseCallback) onPauseCallback();
    });

    btnB.addEventListener('mouseup', () => {
      virtualInput.b = false;
    });

    btnB.addEventListener('touchstart', (e) => {
      e.preventDefault();
      virtualInput.b = true;
      if (onPauseCallback) onPauseCallback();
    });

    btnB.addEventListener('touchend', () => {
      virtualInput.b = false;
    });
  }

  // Prevent context menu on long press
  document.querySelectorAll('.dpad-btn, .action-btn').forEach(btn => {
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
