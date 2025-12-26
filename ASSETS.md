# EPCVIP Tools Hub - Asset Guide

This guide explains what images are needed, their sizes, and how to create or find them.

## Quick Reference

| Asset | Size | Format | Location |
|-------|------|--------|----------|
| Player sprite sheet | 96×96 (4×4 grid of 24×24) | PNG | `assets/sprites/player.png` |
| Building (each tool) | 120×120 | PNG | `assets/sprites/building-{id}.png` |
| Tree | 24×48 | PNG | `assets/sprites/tree.png` |
| Flower | 16×16 | PNG | `assets/sprites/flower.png` |
| Ground tileset | 72×24 (3 tiles) | PNG | `assets/sprites/tiles.png` |

---

## Detailed Specifications

### Player Sprite Sheet

**File:** `assets/sprites/player.png`
**Size:** 96×96 pixels (4 columns × 4 rows of 24×24 frames)

```
┌────────┬────────┬────────┬────────┐
│  0     │  1     │  2     │  3     │  Row 0: Walk DOWN
├────────┼────────┼────────┼────────┤
│  4     │  5     │  6     │  7     │  Row 1: Walk UP
├────────┼────────┼────────┼────────┤
│  8     │  9     │  10    │  11    │  Row 2: Walk LEFT
├────────┼────────┼────────┼────────┤
│  12    │  13    │  14    │  15    │  Row 3: Walk RIGHT
└────────┴────────┴────────┴────────┘
        Each cell: 24×24 pixels
```

**Animation frames:**
- Frame 0: Standing/idle
- Frames 1-3: Walking animation

**Style notes:**
- Top-down perspective (like Pokemon/Zelda)
- Character should face the direction of movement
- Transparent background (PNG alpha)

---

### Building Sprites

**Files:** `assets/sprites/building-{toolId}.png`
**Size:** 120×120 pixels (5 tiles × 5 tiles)

| Tool ID | File | Suggested Color |
|---------|------|-----------------|
| `ping-tree` | `building-ping-tree.png` | Green (#48a868) |
| `athena` | `building-athena.png` | Blue (#5878a8) |
| `validator` | `building-validator.png` | Gold (#f0c000) |
| `tool4` | `building-tool4.png` | Gray (#808080) |
| `tool5` | `building-tool5.png` | Gray (#808080) |

**Structure:**
```
┌─────────────────────┐
│       ROOF          │  ← Gold for active, gray for inactive
├─────────────────────┤
│  [WIN]    [WIN]     │  ← Windows with glow
├─────────────────────┤
│     TOOL NAME       │  ← Sign with tool name
├─────────────────────┤
│       [DOOR]        │  ← Entrance
└─────────────────────┘
```

**Badge:** Include "LIVE" or "SOON" badge on roof (or we can overlay programmatically)

---

### Tree Sprite

**File:** `assets/sprites/tree.png`
**Size:** 24×48 pixels (1 tile wide × 2 tiles tall)

```
┌────────┐
│ LEAVES │  24×24 - Foliage (multiple shades of green)
├────────┤
│ TRUNK  │  24×24 - Brown trunk at bottom
└────────┘
```

---

### Flower Sprite (Optional)

**File:** `assets/sprites/flower.png`
**Size:** 16×16 pixels (or sprite sheet with multiple colors)

For variety, you can create a sprite sheet:
```
┌────┬────┬────┬────┬────┐
│ 🔴 │ 🟡 │ 🟢 │ 🔵 │ 🩷 │  5 colors, 16×16 each = 80×16 total
└────┴────┴────┴────┴────┘
```

---

### Ground Tileset

**File:** `assets/sprites/tiles.png`
**Size:** 72×24 pixels (3 tiles of 24×24)

```
┌────────┬────────┬────────┐
│ GRASS  │ PATH   │ PATH   │
│        │ (horiz)│ (vert) │
└────────┴────────┴────────┘
  Tile 0   Tile 1   Tile 2
```

---

## Color Palette

Our theme uses a dark gold palette:

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Gold | `#f0c000` | 240, 192, 0 | Accents, active elements |
| Gold Light | `#ffdd44` | 255, 221, 68 | Highlights |
| Dark | `#1a1a1a` | 26, 26, 26 | Backgrounds |
| Grass | `#58a028` | 88, 160, 40 | Ground |
| Grass Dark | `#408020` | 64, 128, 32 | Grass texture |
| Path | `#d8b060` | 216, 176, 96 | Walkways |

---

## Where to Find Free Assets

### Recommended Packs (Free)

1. **[Ninja Adventure](https://pixel-boy.itch.io/ninja-adventure-asset-pack)** - itch.io
   - Complete RPG kit with characters, buildings, tiles
   - 16×16 base size (scale up 1.5x for our 24×24)

2. **[Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack)** - itch.io
   - Cute farming/village style
   - Great buildings and characters

3. **[Kenney Tiny Town](https://kenney.nl/assets/tiny-town)** - kenney.nl
   - Clean, consistent style
   - CC0 license (public domain)

4. **[Pixel Art Top Down Basic](https://cainos.itch.io/pixel-art-top-down-basic)** - itch.io
   - 32×32 tiles (scale down slightly)

### Asset Marketplaces

- [itch.io/game-assets](https://itch.io/game-assets/free/tag-pixel-art) - Huge variety
- [OpenGameArt.org](https://opengameart.org/) - Open licensed
- [Kenney.nl](https://kenney.nl/assets) - All CC0

---

## AI Art Generation

### Prompts for Midjourney/DALL-E/Stable Diffusion

**Player character:**
```
16-bit pixel art sprite sheet, top-down RPG character, 4 directions,
walking animation, 24x24 pixels per frame, transparent background,
retro game style
```

**Building:**
```
16-bit pixel art building, top-down RPG style, small shop or house,
gold roof, dark walls, 120x120 pixels, transparent background
```

**Tileset:**
```
16-bit pixel art tileset, grass and dirt path tiles, top-down view,
seamless, 24x24 pixel tiles, retro game style
```

### Tools for Cleanup

- **[Piskel](https://www.piskelapp.com)** - Free online pixel editor
- **[Aseprite](https://www.aseprite.org/)** - $20 (or compile from source free)
- **[Photopea](https://www.photopea.com/)** - Free Photoshop alternative

---

## How Sprites Are Loaded

In `js/scenes/loading.js`, sprites are loaded like this:

```javascript
// Single image
loadSprite("player", "assets/sprites/player.png", {
  sliceX: 4,
  sliceY: 4,
  anims: {
    "walk-down": { from: 0, to: 3, loop: true, speed: 8 },
    "walk-up": { from: 4, to: 7, loop: true, speed: 8 },
    // ...
  }
});

// Simple image (no animation)
loadSprite("building-ping-tree", "assets/sprites/building-ping-tree.png");
```

---

## Fallback Behavior

If a sprite file doesn't exist, the game falls back to **programmatic drawing** (the current colored rectangles). This means:

1. You can add sprites incrementally
2. Missing sprites won't break the game
3. Start with placeholder colors, upgrade to art later

---

## File Checklist

```
assets/sprites/
├── player.png              [ ] 96×96 sprite sheet
├── building-ping-tree.png  [ ] 120×120
├── building-athena.png     [ ] 120×120
├── building-validator.png  [ ] 120×120
├── building-tool4.png      [ ] 120×120 (optional - coming soon)
├── building-tool5.png      [ ] 120×120 (optional - coming soon)
├── tree.png                [ ] 24×48
├── flower.png              [ ] 16×16 or 80×16 sheet
└── tiles.png               [ ] 72×24 (3 tiles)
```

---

## Questions?

Check the [KaPlay docs](https://kaplayjs.com) for sprite loading details, or ask Claude!
