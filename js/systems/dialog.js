/**
 * Dialog System
 *
 * Manages the dialog box at the bottom of the screen.
 * Uses the HTML dialog box element for better text rendering.
 */

export const WELCOME_MESSAGE =
  'Welcome to the Innovation Lab! Arrow keys to move, ENTER to interact, SPACE to throw.';

let dialogElement = null;

export function initDialog() {
  dialogElement = document.getElementById('dialogBox');
  clearDialog();
}

export function showDialog(message) {
  if (dialogElement) {
    dialogElement.textContent = message;
    dialogElement.style.opacity = '1';
  }
}

export function clearDialog() {
  if (dialogElement) {
    dialogElement.textContent = '';
    dialogElement.style.opacity = '0';
  }
}
