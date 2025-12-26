/**
 * Overworld Scene
 *
 * Main game scene with buildings, player, and decorations.
 */

import { GAME_CONFIG, COLORS, TOOLS, TREES, FLOWERS } from '../config.js';
import { createPlayer } from '../entities/player.js';
import { createBuilding } from '../entities/building.js';
import { createTree, createFlower, drawGround } from '../entities/decoration.js';
import { initDialog, showDialog, clearDialog } from '../systems/dialog.js';
import { initFritelleSystem } from '../entities/collectible.js';

export function overworldScene() {
  const TILE = GAME_CONFIG.tileSize;

  // Draw ground (grass + paths)
  drawGround();

  // Create decorations
  TREES.forEach(t => createTree(t.x, t.y));

  // Create flowers from config
  FLOWERS.forEach(f => createFlower(f.x, f.y));

  // Create buildings for each tool
  const buildings = TOOLS.map(tool => createBuilding(tool));

  // Create welcome sign (centered in the larger world)
  createWelcomeSign();

  // Create player (start in center-ish area of world)
  const player = createPlayer({ x: 20 * TILE, y: 15 * TILE });

  // Initialize dialog system
  initDialog();
  clearDialog();

  // Initialize fritelle collectibles
  initFritelleSystem(player);

  // Proximity detection for dialog hints
  onUpdate(() => {
    const nearbyBuilding = buildings.find(b => {
      const dist = player.pos.dist(b.pos.add(vec2(b.buildingWidth / 2, b.buildingHeight)));
      return dist < 60;
    });

    if (nearbyBuilding) {
      const status = nearbyBuilding.isLive ? 'Press ENTER to open!' : 'Coming Soon!';
      showDialog(`${nearbyBuilding.toolName}: ${nearbyBuilding.toolDescription} ${status}`);
    } else {
      clearDialog();
    }
  });

  // Mobile controls
  setupMobileControls(player);
}

function createWelcomeSign() {
  const TILE = GAME_CONFIG.tileSize;

  // Sign post (centered in world)
  add([
    rect(6, 24),
    pos(19 * TILE + 9, 14 * TILE),
    color(...COLORS.gold),
    z(5),
  ]);

  // Sign board
  add([
    rect(4 * TILE, TILE * 1.2),
    pos(18 * TILE, 13 * TILE + 12),
    color(...COLORS.dark),
    outline(3, rgb(...COLORS.gold)),
    z(6),
  ]);

  // Sign text
  add([
    text('INNOVATION LAB', { size: 11 }),
    pos(20 * TILE, 14 * TILE + 8),
    anchor('center'),
    color(...COLORS.gold),
    z(7),
  ]);
}

function setupMobileControls(player) {
  // D-pad buttons
  const dpadBtns = document.querySelectorAll('.dpad-btn[data-dir]');
  let moveInterval = null;

  dpadBtns.forEach(btn => {
    const startMove = () => {
      const dir = btn.dataset.dir;
      player.startMoving(dir);
      moveInterval = setInterval(() => player.startMoving(dir), 100);
    };

    const stopMove = () => {
      clearInterval(moveInterval);
      player.stopMoving();
    };

    btn.addEventListener('mousedown', startMove);
    btn.addEventListener('mouseup', stopMove);
    btn.addEventListener('mouseleave', stopMove);
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startMove();
    });
    btn.addEventListener('touchend', stopMove);
  });

  // A button (interact)
  const btnA = document.getElementById('btnA');
  if (btnA) {
    btnA.addEventListener('click', () => player.interact());
    btnA.addEventListener('touchstart', (e) => {
      e.preventDefault();
      player.interact();
    });
  }
}
