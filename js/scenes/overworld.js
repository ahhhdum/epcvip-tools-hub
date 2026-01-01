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
import { connectToServer, isMultiplayerConnected, getPlayerCount } from '../systems/multiplayer.js';
import { loadEntities } from '../systems/entity-loader.js';
import { loadMapData } from '../systems/tilemap.js';

export async function overworldScene() {
  const TILE = GAME_CONFIG.tileSize;

  // Draw ground (grass + paths) - may use tilemap if enabled
  await drawGround();

  // Create decorations
  TREES.forEach((t) => createTree(t.x, t.y));

  // Create flowers from config
  FLOWERS.forEach((f) => createFlower(f.x, f.y));

  // Load buildings from map JSON (primary) or fall back to TOOLS config
  let buildings = [];
  try {
    const mapData = await loadMapData('maps/village.json');
    if (mapData.entities && mapData.entities.length > 0) {
      buildings = loadEntities(mapData);
      console.log(`Loaded ${buildings.length} buildings from map`);
    } else {
      // Map has no entities yet, use legacy TOOLS array
      console.log('Map has no entities, using TOOLS config');
      buildings = TOOLS.map((tool) => createBuilding(tool));
    }
  } catch (error) {
    // Map loading failed, use legacy TOOLS array
    console.warn('Failed to load map, using TOOLS config:', error);
    buildings = TOOLS.map((tool) => createBuilding(tool));
  }

  // Create player (start in center-ish area of world)
  const player = createPlayer({ x: 20 * TILE, y: 15 * TILE });

  // Initialize dialog system
  initDialog();
  clearDialog();

  // Try to connect to multiplayer server (non-blocking)
  const playerName = localStorage.getItem('epcvip_playerName') || 'Player';
  connectToServer(playerName).then((connected) => {
    if (connected) {
      showDialog('Connected to multiplayer! Other players will appear soon.');
      wait(3, clearDialog);
    }
  });

  // Initialize fritelle collectibles
  initFritelleSystem(player);

  // Proximity detection for dialog hints
  onUpdate(() => {
    // Check if near a building
    const nearbyBuilding = buildings.find((b) => {
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

function setupMobileControls(player) {
  // D-pad buttons
  const dpadBtns = document.querySelectorAll('.dpad-btn[data-dir]');
  let moveInterval = null;

  dpadBtns.forEach((btn) => {
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
