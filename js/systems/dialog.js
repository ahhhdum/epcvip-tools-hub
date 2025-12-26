/**
 * Dialog System
 *
 * Manages the dialog box at the bottom of the screen.
 * Uses the HTML dialog box element for better text rendering.
 */

const DEFAULT_MESSAGE = 'Welcome to the Innovation Lab! Use arrow keys to move. Walk up to a building and press ENTER to open the tool.';

let dialogElement = null;

export function initDialog() {
  dialogElement = document.getElementById('dialogBox');
  if (dialogElement) {
    dialogElement.textContent = DEFAULT_MESSAGE;
  }
}

export function showDialog(message) {
  if (dialogElement) {
    dialogElement.textContent = message;
  }
}

export function clearDialog() {
  showDialog(DEFAULT_MESSAGE);
}
