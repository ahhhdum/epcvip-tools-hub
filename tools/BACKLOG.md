# Map Editor - Feature Backlog

A tile-based map editor for creating game worlds.

## P0 - Core (Complete)

### Tile Painting
- [x] Load single tileset PNG (16x16 tiles)
- [x] Click tileset to select tile
- [x] Paint tiles on map canvas
- [x] Multiple layers (ground, paths, decorations)
- [x] Export/import JSON
- [x] Eraser tool (E key, right-click)
- [x] Fill tool (F key)
- [x] Zoom controls
- [x] Map resize
- [x] Layer switching (1/2/3 keys)

### Entity System (Phase 1)
- [x] Mode tabs (Tiles / Entities)
- [x] Asset library with categories (houses, commercial, farm)
- [x] Entity placement on tile grid
- [x] Entity selection and properties panel
- [x] Properties editing (name, URL, interactive)
- [x] Delete entity (Del key, button)
- [x] JSON export includes entities array

---

## P1 - Entity Movement ⭐ HIGH PRIORITY

Move placed entities after initial placement.

- [x] **Arrow key movement** - nudge selected entity by 1 tile
- [x] **Mouse drag movement** - click selected entity + drag to new position
- [x] Visual feedback during drag (semi-transparent, green dashed border)
- [x] Snap to grid (always on, entities snap to tile grid)
- [ ] Shift+Arrow for fine 1px movement (when grid snap off)
- [ ] Collision detection warning (overlapping entities)

---

## P2 - Sprite Sheet Support ⭐ COMPLETE

Handle building assets that contain multiple pieces in one PNG.

**Problem**: Assets like `GreenHouse_Green.png` (384×128) contain 4 separate 96×128 pieces side-by-side.

- [x] **Sprite sheet detection** - `pieces` array in asset metadata
- [x] **Sub-image selector** - each piece appears as selectable item in grid
- [x] Asset library metadata for sprite sheets (GreenHouse_Green, Wood, Metal)
- [x] Preview individual pieces in palette (canvas-based cropping)
- [x] Place individual pieces as separate entities (stores pieceId)
- [x] Render pieces using 9-arg drawImage
- [x] Movement/drag bounds use piece dimensions

---

## P3 - Multi-Tileset Support

Load and switch between multiple tilesets in a single session.

- [ ] Load multiple tilesets simultaneously
- [ ] Tileset tabs or dropdown selector
- [ ] Tileset browser/gallery panel
- [ ] Remember recently used tilesets (localStorage)
- [ ] Tileset metadata (name, tile size, source)

---

## P4 - Multi-Tile Selection (Brush Patterns) ⭐ COMPLETE

Select regions larger than 1x1 from the tileset to paint as a group.

- [x] Click-drag to select arbitrary NxM region
- [x] Visual selection rectangle on tileset
- [x] Preview multi-tile brush (scaled to fit)
- [x] Paint multi-tile stamp with single click
- [x] Eraser clears brush-sized area
- [x] Fill uses top-left tile of brush
- [ ] Save custom brushes/patterns
- [ ] Brush library panel
- [ ] Named brush presets (e.g., "3x3 house", "2x2 tree")

---

## P5 - Advanced Features

- [ ] Undo/redo history (Ctrl+Z, Ctrl+Y)
- [ ] Copy/paste entities (Ctrl+C, Ctrl+V)
- [ ] Duplicate entity (Ctrl+D)
- [ ] Auto-tiling (smart edge detection)
- [ ] Layer visibility toggles
- [ ] Layer opacity adjustment
- [ ] Map resize with anchor point selection
- [ ] Tile picker (sample tile from map)

---

## P6 - Polish

- [ ] **Eraser preview** - show brush-sized ghost on map hover when eraser active
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcut reference panel
- [ ] Auto-save work-in-progress (localStorage)
- [ ] Export map as PNG image
- [ ] Import Tiled JSON format
- [ ] Responsive layout for different screen sizes

---

## Technical Notes

### Current Data Format
```json
{
  "name": "Village",
  "width": 50,
  "height": 45,
  "tileSize": 16,
  "tileset": "Grass_Tiles_1",
  "layers": {
    "ground": [[1, 2, 1, ...], ...],
    "paths": [[0, 0, 5, ...], ...],
    "decorations": [[0, 12, 0, ...], ...]
  },
  "buildings": [...]
}
```

### Multi-Tileset Format (Proposed)
```json
{
  "tilesets": [
    { "id": "grass", "file": "Grass_Tiles_1.png", "tileSize": 16 },
    { "id": "buildings", "file": "Buildings.png", "tileSize": 16 }
  ],
  "layers": {
    "ground": {
      "tileset": "grass",
      "tiles": [[1, 2, 1, ...], ...]
    }
  }
}
```

### Multi-Tile Brush Format (Proposed)
```json
{
  "name": "3x3 House",
  "width": 3,
  "height": 3,
  "tileset": "buildings",
  "tiles": [
    [10, 11, 12],
    [26, 27, 28],
    [42, 43, 44]
  ]
}
```
