/**
 * UI Layout Helper
 *
 * Provides responsive layout calculations for all UI scenes.
 * Calculates positions relative to viewport dimensions.
 */

import { GAME_CONFIG } from '../config.js';

/**
 * Get layout regions for pause menu
 * Two-column layout: 55% left (controls), 45% right (character)
 */
export function getPauseLayout() {
  const S = GAME_CONFIG.uiScale;
  const W = width();
  const H = height();

  // Margins from viewport edges (scaled)
  const margin = 30 * S;

  // Usable area after margins
  const usableW = W - margin * 2;
  const usableH = H - margin * 2;

  // Two-column layout: 55% left, 45% right with gap
  const columnGap = 20 * S;
  const leftColWidth = usableW * 0.55 - columnGap / 2;
  const rightColWidth = usableW * 0.45 - columnGap / 2;

  return {
    // Viewport
    width: W,
    height: H,
    scale: S,

    // Margins
    margin: margin,

    // Column regions (absolute positions)
    leftCol: {
      x: margin,
      width: leftColWidth,
      center: margin + leftColWidth / 2,
    },
    rightCol: {
      x: W - margin - rightColWidth,
      width: rightColWidth,
      center: W - margin - rightColWidth / 2,
    },

    // Title region
    title: {
      y: 75 * S,
    },

    // Content start Y (below title)
    contentStartY: 120 * S,

    // Links section Y
    linksY: 320 * S,

    // Bottom buttons region (at very bottom to avoid overlapping links)
    bottomButtons: {
      y: H - 55 * S,
    },
  };
}

/**
 * Get layout for character selection modal
 * Calculates card sizes to fit 4x2 grid within viewport
 */
export function getCharSelectLayout() {
  const S = GAME_CONFIG.uiScale;
  const W = width();
  const H = height();

  // Grid dimensions that MUST fit
  const numCols = 4;
  const numRows = 2;

  // Available space (with margins)
  const marginX = 40 * S;
  const marginTop = 110 * S;
  const marginBottom = 90 * S;

  const availableW = W - marginX * 2;
  const availableH = H - marginTop - marginBottom;

  // Calculate card size to fit
  const gap = 10 * S;
  const totalGapsW = (numCols - 1) * gap;
  const totalGapsH = (numRows - 1) * gap;

  // Card width = (available - gaps) / columns
  const cardW = (availableW - totalGapsW) / numCols;
  // Card height = (available - gaps) / rows
  const cardH = (availableH - totalGapsH) / numRows;

  // Use the smaller dimension to keep cards proportional
  // Original aspect ratio was 135:165 = 0.818
  const targetAspect = 135 / 165;
  let finalCardW, finalCardH;

  if (cardW / cardH > targetAspect) {
    // Width is proportionally larger, constrain by height
    finalCardH = cardH;
    finalCardW = cardH * targetAspect;
  } else {
    // Height is proportionally larger, constrain by width
    finalCardW = cardW;
    finalCardH = cardW / targetAspect;
  }

  // Recalculate start position to center the grid
  const gridTotalW = finalCardW * numCols + gap * (numCols - 1);
  const gridTotalH = finalCardH * numRows + gap * (numRows - 1);
  const gridStartX = (W - gridTotalW) / 2;
  const gridStartY = marginTop;

  return {
    scale: S,
    gridStartX,
    gridStartY,
    cardW: finalCardW,
    cardH: finalCardH,
    gap,
    numCols,
    numRows,

    // Sprite scale within card (relative to card size)
    spriteScale: finalCardW / 135 * 1.35,

    // Text sizes (scaled to card size)
    nameSize: Math.round(12 * (finalCardW / 135)),
    roleSize: Math.round(10 * (finalCardW / 135)),

    // Button positions
    buttonY: H - 65 * S,
  };
}

/**
 * Get layout for loading screen
 * Centers all elements in viewport
 */
export function getLoadingLayout() {
  const S = GAME_CONFIG.uiScale;
  const W = width();
  const H = height();

  const barWidth = Math.min(300 * S, W * 0.6);  // 60% of width max
  const barHeight = 24 * S;

  return {
    scale: S,

    // Progress bar (centered)
    bar: {
      x: (W - barWidth) / 2,
      y: H * 0.45,
      width: barWidth,
      height: barHeight,
    },

    // Title
    title: {
      x: W / 2,
      y: H * 0.25,
      size: 24 * S,
    },

    // Star decorations offset from title
    starOffset: 110 * S,
    starSize: 20 * S,

    // Percentage text (below bar)
    percent: {
      x: W / 2,
      y: H * 0.45 + barHeight + 15 * S,
      size: 16 * S,
    },

    // Message text
    message: {
      x: W / 2,
      y: H * 0.65,
      size: 12 * S,
    },
  };
}
