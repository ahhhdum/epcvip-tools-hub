# EPCVIP Tools Hub

A retro-style game interface for accessing EPCVIP innovation tools. Built with KaPlay (Kaboom.js fork).

## Quick Start

```bash
# Local development
npx serve . -p 3333
# Open http://localhost:3333
```

## Project Structure

```
├── index.html          # Main game entry point
├── sprite-test.html    # Standalone sprite animation tool
├── js/
│   ├── main.js         # KaPlay initialization, scene registration
│   ├── config.js       # Game settings, colors, tool links
│   ├── scenes/
│   │   ├── loading.js  # Loading screen, asset loading
│   │   ├── overworld.js# Main game world
│   │   ├── pause.js    # Pause menu with tool links
│   │   └── sprite-test.js # In-game sprite test (dev)
│   ├── entities/
│   │   ├── player.js   # Player sprite, movement, collision
│   │   ├── building.js # Interactive buildings
│   │   ├── collectible.js # Fritelle throwing mechanics
│   │   └── decoration.js  # Flowers, trees, etc.
│   └── systems/
│       ├── input.js    # Virtual D-pad, keyboard handling
│       ├── camera.js   # Camera following player
│       ├── audio.js    # Sound effects
│       ├── dialog.js   # In-game dialogs
│       └── multiplayer.js # WebSocket multiplayer (optional)
├── assets/
│   └── sprites/        # Character sprites (Cute_Fantasy pack)
└── server/             # Railway deployment config
```

## Key Features

- **Sprite-based player**: Uses Farmer_Bob.png with directional animations
- **Building interactions**: Walk up and press Enter to open tool links
- **Fritelle throwing**: Press Space/B to throw, collect powerups
- **Multiplayer**: Optional WebSocket-based player sync

## Dev Tools

### Sprite Animation Tool (`sprite-test.html`)

Standalone tool for analyzing and configuring sprite sheet animations.

**Features:**
- Visual grid of all sprite frames with labels
- Animation preview with play/pause, speed control
- Sequence builder (click frames to add)
- Row presets for quick testing
- Export as KaPlay config or frame array
- FlipX toggle for mirrored animations

**Usage:**
1. Open `http://localhost:3333/sprite-test.html`
2. Adjust sprite path/dimensions at top of file if needed
3. Click frames or use row presets to build sequences
4. Export config for use in `loadSprite()` calls

**Current sprite config** (Farmer_Bob.png, 6x13 grid):
| Row | Frames | Animation |
|-----|--------|-----------|
| 0 | 0-5 | idle-down |
| 1 | 6-11 | idle-right |
| 2 | 12-17 | idle-up |
| 3 | 18-23 | walk-down |
| 4 | 24-29 | walk-right |
| 5 | 30-35 | walk-up |
| 6 | 36-41 | hit/fall |

## Deployment

Deployed on Railway with reverse proxy routing:
- `/` → Tools Hub game
- `/ping-tree` → Ping Tree Compare tool
- `/athena` → Athena Usage Monitor

## Related

- Asset pack: Cute_Fantasy (see ASSETS.md)
- Parent directory: `../CLAUDE.md`
