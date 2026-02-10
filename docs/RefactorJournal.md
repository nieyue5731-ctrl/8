# Refactor Journal - Terraria Ultra Modular Refactoring

## Overview

- **Source**: `index (92).html` - 24,673-line monolithic single-file game
- **Target**: Modular multi-file project structure with separated CSS, JS, and HTML
- **Primary Goal**: Maintain 100% behavioral equivalence while improving maintainability

---

## Phase 0: Baseline Snapshot

### Core Module Map (original file)

| Lines | Module | Responsibility |
|-------|--------|---------------|
| 1-2100 | CSS (6 style blocks) | All visual styling, HUD, mobile, overlays, effects |
| 2101-2480 | TU_Defensive IIFE | Error handling, type guards, safe math, world access |
| 2482-2517 | Loading guard | Loading screen timeout protection |
| 2526-2670 | EventManager + ParticlePool + RingBuffer | Event lifecycle, particle pooling |
| 2671-2715 | PERF_MONITOR stub | Performance monitoring placeholder |
| 2716-3130 | HTML body | Canvas, HUD, overlays, mobile controls |
| 3135-3878 | Core namespace + Utils + DOM + PatchManager | Global utilities and DOM helpers |
| 3879-4308 | GameSettings | Settings management with localStorage |
| 4314-4405 | Toast + FullscreenManager | UI notifications and fullscreen API |
| 4408-5312 | AudioManager + UX/UI wiring | WebAudio sound effects, UI event bindings |
| 5318-5598 | CONFIG + BLOCK constants + BLOCK_DATA | Game configuration and block definitions |
| 5599-6353 | Block lookup tables | BLOCK_SOLID, BLOCK_COLOR, BLOCK_HARDNESS, etc. |
| 6354-6434 | Structure definitions | Dungeon/building templates (JSON) |
| 6435-8750 | NoiseGenerator + WorldGenerator | Procedural world generation |
| 8751-8900 | ParticleSystem | Visual particle effects |
| 8901-9200 | DroppedItem + DroppedItemManager | Item drop physics and pickup |
| 9201-9370 | AmbientParticles | Firefly/ambient particle effects |
| 9371-9730 | Player | Player entity with sprite, physics, animation |
| 9731-9940 | TouchController | Mobile joystick/button input |
| 9941-11160 | Renderer + TextureGenerator + Parallax | World rendering, texture generation, mountains |
| 11161-11438 | CraftingSystem | Crafting recipes and UI |
| 11439-12220 | QualityManager | Dynamic performance scaling |
| 12221-12430 | Minimap | Minimap rendering |
| 12431-13225 | InventoryUI + InventorySystem | Inventory management and UI |
| 13226-13590 | InputManager | Keyboard/mouse input handling |
| 13593-14500 | Game class | Core game loop, update, render, init |
| 14501-17000 | SaveSystem + UIManager + UIFlushScheduler | Save/load, HUD management |
| 17001-22500 | Patch layers | Weather, canvas FX, worker client, structures, biomes |
| 22501-24520 | TileLogicEngine + Water physics | Water simulation, wiring, logic blocks |
| 24521-24673 | Bootstrap + health check | Game instantiation and runtime monitoring |

### Dependency Graph (load order critical)

```
TU_Defensive -> EventManager -> ParticlePool -> PERF_MONITOR
  -> [HTML body renders]
  -> ObjectPool/VecPool/ArrayPool/MemoryManager/EventUtils
  -> Utils/DOM/PatchManager
  -> GameSettings -> Toast -> FullscreenManager
  -> AudioManager -> SaveSystem -> UX Wiring
  -> CONFIG/BLOCK/BLOCK_DATA/lookup tables
  -> NoiseGenerator -> TextureGenerator -> Structures
  -> WorldGenerator
  -> ParticleSystem -> DroppedItems -> AmbientParticles
  -> Player -> TouchController
  -> Renderer (+ Parallax)
  -> CraftingSystem -> UIManager -> QualityManager
  -> UIManager patches -> Minimap
  -> InventoryUI -> InputManager -> InventorySystem
  -> Game class
  -> [Patch layers: weather, postfx, tile-logic, worker-client]
  -> Boot -> Health Check
```

### Patch Chain Analysis (monkey-patches)

| Target | Patch Count | Final Version Location |
|--------|------------|----------------------|
| weather system | 5 patches | weather_patch_4.js |
| tile-logic-engine | 5 patches | tile-logic-patches_patch_4.js |
| parallax mountains | 2 patches | parallax_patch_1.js |
| ui-manager | 2 patches | ui-manager_patch_1.js |
| Game.init | 1 patch | worker-client.js |
| Game._writeTileFast | 1 patch | worker-client.js |
| Game._updateLight | 1 patch | worker-client.js |
| Renderer.renderWorld | 1 patch | worker-client.js |
| Game._spreadLight | 1 patch | lighting-patch.js |
| Renderer.drawTile | 1 patch | runtime-opt (gc-optimizations.js) |

---

## Phase 1: Safe Cleanup

### Actions Taken
- Extracted 55 script blocks into separate JS files
- Extracted 6 style blocks into consolidated CSS
- Preserved exact load order from original file
- Dead code identified but preserved for safety (RingBuffer, PERF_MONITOR stub)
- Duplicate utility functions preserved in original locations (safeGet, clamp, lerp duplicates across TU_Defensive and event-manager)

### Evidence
- Load order preserved in `js/load-order.json`
- Module manifest with line mappings in `js/module-manifest.json`
- All 55 script blocks extracted with source line annotations

---

## Phase 2: CSS Consolidation

### Actions Taken
- Extracted all 6 `<style>` blocks into `css/main.css` (72,964 bytes)
- Created `css/variables.css` with merged `:root` variables
- Replaced inline styles with `<link rel="stylesheet">` in new index.html

### Evidence
- 6 style blocks identified at lines: 17, 18-2098, 2519-2523, and 3 more
- All CSS preserved verbatim (no rule deletion or modification)

---

## Phase 3: Monkey-Patch Preservation

### Strategy
- Patches are extracted as separate `_patch_N.js` files
- Load order maintained to ensure patches apply correctly
- Each patch file annotated with source line numbers

### Patch Files Created
- `js/systems/weather.js` + 4 patches
- `js/systems/tile-logic-engine.js` + `tile-logic-patches.js` + 4 patches
- `js/engine/parallax.js` + 1 patch
- `js/ui/ui-manager.js` + 1 patch
- `js/workers/worker-client.js` (contains Game/Renderer/SaveSystem patches)
- `js/engine/lighting-patch.js` (_spreadLight final patch)
- `js/performance/gc-optimizations.js` (runtime optimizations)

---

## Phase 4-8: Structure Established

The modular file structure has been established with clear separation:
- `js/core/` - Defensive infrastructure, constants, DOM utilities, error guards
- `js/engine/` - Renderer, world generator, textures, parallax, lighting
- `js/entities/` - Player, particles, dropped items, ambient effects
- `js/systems/` - Settings, audio, save, fullscreen, quality, weather, tile-logic
- `js/ui/` - Toast, crafting, inventory, minimap, UI manager, UX wiring
- `js/input/` - Input manager, touch controller
- `js/performance/` - Object pools, memory manager, perf monitor, GC optimizations
- `js/workers/` - World worker client
- `js/boot/` - Bootstrap, health check

---

## Verification Results

| Check | Result |
|-------|--------|
| All script blocks extracted | PASS (55/55) |
| All style blocks extracted | PASS (6/6) |
| HTML body content preserved | PASS |
| Load order maintained | PASS |
| Source line annotations | PASS |
| Original file preserved | PASS (index (92).html) |
