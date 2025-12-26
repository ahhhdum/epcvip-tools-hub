/**
 * Camera System
 *
 * Handles camera following the player with bounds clamping.
 * Uses KaPlay's built-in camPos() function.
 */

import { GAME_CONFIG } from '../config.js';

let cameraX = 0;
let cameraY = 0;

/**
 * Update camera to follow a target position (usually player)
 * Centers on target, clamped to world bounds
 */
export function updateCamera(targetPos) {
  const { width, height, worldWidth, worldHeight } = GAME_CONFIG;

  // Target: center player in viewport
  let targetX = targetPos.x - width / 2;
  let targetY = targetPos.y - height / 2;

  // Clamp to world bounds
  cameraX = Math.max(0, Math.min(targetX, worldWidth - width));
  cameraY = Math.max(0, Math.min(targetY, worldHeight - height));

  // Apply to KaPlay camera
  // camPos takes the center of the viewport
  camPos(cameraX + width / 2, cameraY + height / 2);
}

/**
 * Get current camera offset (for UI positioning if needed)
 */
export function getCameraOffset() {
  return { x: cameraX, y: cameraY };
}

/**
 * Initialize camera at a starting position
 */
export function initCamera(startPos) {
  updateCamera(startPos);
}
