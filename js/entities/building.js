/**
 * Building Entity
 *
 * Represents a tool building that can be interacted with.
 */

import { GAME_CONFIG, COLORS } from '../config.js';

export function createBuilding(tool) {
  const TILE = GAME_CONFIG.tileSize;
  const bWidth = 5 * TILE;
  const bHeight = 5 * TILE;
  const x = tool.position.x * TILE;
  const y = tool.position.y * TILE;

  const building = add([
    rect(bWidth, bHeight),
    pos(x, y),
    area(),
    body({ isStatic: true }),
    opacity(0),  // Make base rect invisible, we draw everything in onDraw
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

  // Custom draw for building
  building.onDraw = function() {
    const isActive = this.isLive;
    const c = this.toolColor;

    // Building shadow
    drawRect({
      pos: vec2(4, 4),
      width: bWidth,
      height: bHeight,
      color: rgb(0, 0, 0),
      opacity: 0.3,
    });

    // Main building body
    drawRect({
      pos: vec2(0, 0),
      width: bWidth,
      height: bHeight,
      color: isActive ? rgb(42, 42, 42) : rgb(64, 64, 64),
    });

    // Roof
    const roofHeight = TILE * 0.8;
    drawRect({
      pos: vec2(-4, 0),
      width: bWidth + 8,
      height: roofHeight,
      color: isActive ? rgb(...COLORS.gold) : rgb(80, 80, 80),
    });

    // Roof highlight
    drawRect({
      pos: vec2(-4, 0),
      width: bWidth + 8,
      height: 4,
      color: isActive ? rgb(255, 221, 68) : rgb(104, 104, 104),
    });

    // LIVE/SOON badge
    const badgeText = isActive ? 'LIVE' : 'SOON';
    const badgeColor = isActive ? rgb(0, 204, 0) : rgb(102, 102, 0);
    drawRect({
      pos: vec2(2, 3),
      width: 28,
      height: 12,
      color: badgeColor,
    });
    drawText({
      text: badgeText,
      pos: vec2(16, 9),
      size: 8,
      anchor: 'center',
      color: isActive ? rgb(0, 51, 0) : rgb(51, 51, 0),
    });

    // Windows
    const windowY = roofHeight + 8;
    const windowSize = TILE * 0.8;
    const windowColor = isActive ? rgb(...COLORS.gold) : rgb(80, 80, 80);

    // Left window
    drawRect({
      pos: vec2(8, windowY),
      width: windowSize,
      height: windowSize,
      color: windowColor,
    });
    drawRect({
      pos: vec2(11, windowY + 3),
      width: windowSize - 6,
      height: windowSize - 6,
      color: rgb(10, 10, 10),
    });

    // Right window
    drawRect({
      pos: vec2(bWidth - 8 - windowSize, windowY),
      width: windowSize,
      height: windowSize,
      color: windowColor,
    });
    drawRect({
      pos: vec2(bWidth - 8 - windowSize + 3, windowY + 3),
      width: windowSize - 6,
      height: windowSize - 6,
      color: rgb(10, 10, 10),
    });

    // Sign
    const signY = windowY + windowSize + 10;
    const signWidth = bWidth - 20;
    const signHeight = TILE * 0.7;
    drawRect({
      pos: vec2(10, signY),
      width: signWidth,
      height: signHeight,
      color: rgb(26, 26, 26),
      outline: { color: windowColor, width: 2 },
    });
    drawText({
      text: this.toolName,
      pos: vec2(bWidth / 2, signY + signHeight - 5),
      size: 10,
      anchor: 'center',
      color: windowColor,
    });

    // Door
    const doorWidth = TILE * 1.1;
    const doorHeight = TILE * 1.4;
    const doorX = (bWidth - doorWidth) / 2;
    const doorY = bHeight - doorHeight;

    // Door frame
    drawRect({
      pos: vec2(doorX - 3, doorY - 3),
      width: doorWidth + 6,
      height: doorHeight + 3,
      color: windowColor,
    });

    // Door
    drawRect({
      pos: vec2(doorX, doorY),
      width: doorWidth,
      height: doorHeight,
      color: isActive ? rgb(10, 10, 10) : rgb(48, 48, 48),
    });

    // Door handle
    drawCircle({
      pos: vec2(doorX + doorWidth - 7, doorY + doorHeight / 2),
      radius: 3,
      color: windowColor,
    });
  };

  // Click to open
  building.onClick(() => {
    if (building.toolUrl) {
      window.open(building.toolUrl, '_blank');
    }
  });

  return building;
}
