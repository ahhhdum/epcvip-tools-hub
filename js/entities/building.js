/**
 * Building Entity
 *
 * Represents a tool building that can be interacted with.
 * Uses sprite-based buildings with wooden signs.
 *
 * NOTE: World objects do NOT use uiScale - only UI overlays scale with viewport.
 */

import { GAME_CONFIG, COLORS } from '../config.js';

export function createBuilding(tool) {
  const TILE = GAME_CONFIG.tileSize;
  const x = tool.position.x * TILE;
  const y = tool.position.y * TILE;
  const isActive = tool.live;

  // Building dimensions - use actual sprite size from config, scaled 20%
  const spriteScale = 1.2;
  const baseWidth = tool.spriteWidth || 144;   // Fallback for tools without dimensions
  const baseHeight = tool.spriteHeight || 128;
  const bWidth = baseWidth * spriteScale;
  const bHeight = baseHeight * spriteScale;

  // Sign styling (wooden style) - fixed sizes, not scaled
  const signPadding = 8;
  const signHeight = 28;
  const signTextSize = 16;
  const badgeTextSize = 9;
  const signY = y - signHeight - signPadding;

  // Wooden sign background (clickable)
  const signBg = add([
    rect(bWidth - 20, signHeight),
    pos(x + 10, signY),
    color(139, 69, 19),  // Wood brown #8b4513
    outline(3, rgb(93, 58, 26)),  // Darker wood border
    area(),  // Makes sign clickable
    z(5),
    'building-sign',
  ]);

  // Click sign to open tool
  signBg.onClick(() => {
    if (tool.url) {
      window.open(tool.url, '_blank');
    }
  });

  // Sign text (white with shadow effect)
  add([
    text(tool.name, { size: signTextSize }),
    pos(x + bWidth / 2 + 1, signY + signHeight / 2 + 1),
    anchor('center'),
    color(0, 0, 0),  // Shadow
    z(6),
  ]);

  add([
    text(tool.name, { size: signTextSize }),
    pos(x + bWidth / 2, signY + signHeight / 2),
    anchor('center'),
    color(255, 255, 255),
    z(7),
  ]);

  // LIVE/SOON badge (on the sign)
  const badgeW = 32;
  const badgeH = 14;
  const badgeX = x + bWidth - badgeW - 5;
  const badgeY = signY + (signHeight - badgeH) / 2;
  add([
    rect(badgeW, badgeH),
    pos(badgeX, badgeY),
    color(isActive ? 46 : 80, isActive ? 139 : 80, isActive ? 87 : 80),
    outline(1, rgb(isActive ? 34 : 60, isActive ? 100 : 60, isActive ? 60 : 60)),
    z(8),
  ]);

  add([
    text(isActive ? 'LIVE' : 'SOON', { size: badgeTextSize }),
    pos(badgeX + badgeW / 2, badgeY + badgeH / 2),
    anchor('center'),
    color(255, 255, 255),
    z(9),
  ]);

  // Building sprite (or fallback to colored rectangle)
  if (tool.sprite) {
    add([
      sprite(tool.sprite),
      pos(x, y),
      scale(spriteScale),
      z(4),
    ]);
  } else {
    // Fallback procedural building for tools without sprites
    add([
      rect(bWidth, bHeight),
      pos(x, y),
      color(isActive ? 60 : 40, isActive ? 60 : 40, isActive ? 60 : 40),
      outline(2, rgb(isActive ? 100 : 60, isActive ? 100 : 60, isActive ? 100 : 60)),
      z(4),
    ]);
  }

  // Create compound collision shapes from config
  // Shapes use normalized coordinates (0-1), scaled to actual building size
  const shapes = tool.collisionShapes || [
    { type: 'rect', x: 0, y: 0, w: 1, h: 1 }  // Fallback: full rect
  ];

  shapes.forEach((shape, index) => {
    if (shape.type === 'rect') {
      add([
        rect(shape.w * bWidth, shape.h * bHeight),
        pos(x + shape.x * bWidth, y + shape.y * bHeight),
        area(),
        body({ isStatic: true }),
        opacity(0),
        z(3),
        'building',
      ]);
    } else if (shape.type === 'polygon') {
      // Convert normalized points to actual coordinates
      const points = shape.points.map(([px, py]) =>
        vec2(px * bWidth, py * bHeight)
      );
      add([
        polygon(points),
        pos(x, y),
        area(),
        body({ isStatic: true }),
        opacity(0),
        z(3),
        'building',
      ]);
    }
  });

  // Main building entity for interaction (invisible, no collision)
  const building = add([
    rect(bWidth, bHeight),
    pos(x, y),
    opacity(0),
    z(2),
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

  // Hover effect on sign - highlight on mouseover
  signBg.onHover(() => {
    signBg.color = rgb(170, 90, 30);  // Lighter wood
  });

  signBg.onHoverEnd(() => {
    signBg.color = rgb(139, 69, 19);  // Original wood
  });

  return building;
}
