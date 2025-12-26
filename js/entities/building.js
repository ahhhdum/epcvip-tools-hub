/**
 * Building Entity
 *
 * Represents a tool building that can be interacted with.
 * Uses simple colored rectangles until sprites are loaded.
 */

import { GAME_CONFIG, COLORS } from '../config.js';

export function createBuilding(tool) {
  const TILE = GAME_CONFIG.tileSize;
  const bWidth = 5 * TILE;
  const bHeight = 5 * TILE;
  const x = tool.position.x * TILE;
  const y = tool.position.y * TILE;
  const isActive = tool.live;

  // Main building container (invisible, just for collision/interaction)
  const building = add([
    rect(bWidth, bHeight),
    pos(x, y),
    area(),
    body({ isStatic: true }),
    color(42, 42, 42),
    z(3),
    'building',
    'interactable',
    {
      toolId: tool.id,
      toolName: tool.name,
      toolDescription: tool.description,
      toolUrl: tool.url,
      isLive: tool.live,
      toolColor: tool.color,
      buildingWidth: bWidth,
      buildingHeight: bHeight,

      interact() {
        if (this.toolUrl) {
          // Flash effect
          add([
            rect(width(), height()),
            pos(0, 0),
            color(255, 255, 255),
            opacity(0.8),
            z(100),
            lifespan(0.1),
          ]);

          wait(0.1, () => {
            window.open(this.toolUrl, '_blank');
          });
        }
      },
    },
  ]);

  // Roof
  add([
    rect(bWidth + 8, TILE * 0.8),
    pos(x - 4, y),
    color(isActive ? 240 : 80, isActive ? 192 : 80, isActive ? 0 : 80),
    z(4),
  ]);

  // Roof highlight
  add([
    rect(bWidth + 8, 4),
    pos(x - 4, y),
    color(isActive ? 255 : 104, isActive ? 221 : 104, isActive ? 68 : 104),
    z(5),
  ]);

  // LIVE/SOON badge
  const badgeColor = isActive ? [0, 204, 0] : [102, 102, 0];
  add([
    rect(28, 12),
    pos(x + 2, y + 3),
    color(...badgeColor),
    z(6),
  ]);

  add([
    text(isActive ? 'LIVE' : 'SOON', { size: 8 }),
    pos(x + 16, y + 9),
    anchor('center'),
    color(isActive ? 0 : 51, isActive ? 51 : 51, 0),
    z(7),
  ]);

  // Windows
  const windowY = y + TILE * 0.8 + 8;
  const windowSize = TILE * 0.8;
  const windowColor = isActive ? COLORS.gold : [80, 80, 80];

  // Left window frame
  add([
    rect(windowSize, windowSize),
    pos(x + 8, windowY),
    color(...windowColor),
    z(4),
  ]);
  // Left window inner
  add([
    rect(windowSize - 6, windowSize - 6),
    pos(x + 11, windowY + 3),
    color(10, 10, 10),
    z(5),
  ]);

  // Right window frame
  add([
    rect(windowSize, windowSize),
    pos(x + bWidth - 8 - windowSize, windowY),
    color(...windowColor),
    z(4),
  ]);
  // Right window inner
  add([
    rect(windowSize - 6, windowSize - 6),
    pos(x + bWidth - 8 - windowSize + 3, windowY + 3),
    color(10, 10, 10),
    z(5),
  ]);

  // Sign board
  const signY = windowY + windowSize + 10;
  const signWidth = bWidth - 20;
  const signHeight = TILE * 0.7;
  add([
    rect(signWidth, signHeight),
    pos(x + 10, signY),
    color(26, 26, 26),
    outline(2, rgb(...windowColor)),
    z(4),
  ]);

  // Sign text
  add([
    text(tool.name, { size: 9 }),
    pos(x + bWidth / 2, signY + signHeight / 2),
    anchor('center'),
    color(...windowColor),
    z(5),
  ]);

  // Door frame
  const doorWidth = TILE * 1.1;
  const doorHeight = TILE * 1.4;
  const doorX = x + (bWidth - doorWidth) / 2;
  const doorY = y + bHeight - doorHeight;

  add([
    rect(doorWidth + 6, doorHeight + 3),
    pos(doorX - 3, doorY - 3),
    color(...windowColor),
    z(4),
  ]);

  // Door
  add([
    rect(doorWidth, doorHeight),
    pos(doorX, doorY),
    color(isActive ? 10 : 48, isActive ? 10 : 48, isActive ? 10 : 48),
    z(5),
  ]);

  // Click anywhere on building to open
  building.onClick(() => {
    if (building.toolUrl) {
      window.open(building.toolUrl, '_blank');
    }
  });

  return building;
}
