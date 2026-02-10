#!/usr/bin/env node
/**
 * Extraction Script v2 for Terraria Ultra Refactoring
 * Handles duplicate module names by appending _patch_N suffixes.
 * Patches are kept separate for traceability, then merged in Phase 3.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'index (92).html');
const content = fs.readFileSync(SRC, 'utf-8');
const lines = content.split('\n');

function writeFile(relPath, data) {
  const full = path.join(__dirname, '..', relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, data, 'utf-8');
  console.log(`  Written: ${relPath} (${data.length} bytes)`);
}

// Clean previous extraction
const rmDirs = ['js', 'css', 'html'];
for (const d of rmDirs) {
  const full = path.join(__dirname, '..', d);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════
// Extract <style> blocks
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Extracting CSS ===');

const styleBlocks = [];
let inStyle = false;
let styleStart = -1;
let styleContent = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<style') && !inStyle) {
    inStyle = true;
    styleStart = i;
    const match = line.match(/<style[^>]*>(.*)/s);
    if (match) {
      styleContent = match[1];
      const closeIdx = styleContent.indexOf('</style>');
      if (closeIdx !== -1) {
        styleBlocks.push({ start: i, end: i, content: styleContent.substring(0, closeIdx) });
        inStyle = false;
        styleContent = '';
      }
    }
  } else if (inStyle) {
    const closeIdx = line.indexOf('</style>');
    if (closeIdx !== -1) {
      styleContent += '\n' + line.substring(0, closeIdx);
      styleBlocks.push({ start: styleStart, end: i, content: styleContent });
      inStyle = false;
      styleContent = '';
    } else {
      styleContent += '\n' + line;
    }
  }
}

console.log(`Found ${styleBlocks.length} style blocks`);

// Write combined CSS
let allCSS = '';
for (const block of styleBlocks) {
  allCSS += `/* --- Style block from lines ${block.start}-${block.end} --- */\n`;
  allCSS += block.content.trim() + '\n\n';
}
writeFile('css/main.css', allCSS);

// ═══════════════════════════════════════════════════════════════
// Extract <script> blocks with duplicate handling
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Extracting JS ===');

const scriptBlocks = [];
let inScript = false;
let scrStart = -1;
let scrContent = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.match(/<script\b/) && !line.includes('src=') && !inScript) {
    inScript = true;
    scrStart = i;
    const match = line.match(/<script[^>]*>(.*)/);
    if (match) {
      scrContent = match[1];
      const closeIdx = scrContent.indexOf('</script>');
      if (closeIdx !== -1) {
        scriptBlocks.push({ start: i, end: i, content: scrContent.substring(0, closeIdx) });
        inScript = false;
        scrContent = '';
      }
    }
  } else if (inScript) {
    const closeIdx = line.indexOf('</script>');
    if (closeIdx !== -1) {
      scrContent += '\n' + line.substring(0, closeIdx);
      scriptBlocks.push({ start: scrStart, end: i, content: scrContent });
      inScript = false;
      scrContent = '';
    } else {
      scrContent += '\n' + lines[i];
    }
  }
}

console.log(`Found ${scriptBlocks.length} script blocks`);

// Classify each block
function classify(c, idx) {
  if (c.includes('TU_Defensive') && c.includes('TypeGuards')) return { name: 'defensive', dir: 'js/core' };
  if (c.includes('LOADING_TIMEOUT') && c.includes('checkLoading')) return { name: 'loading-guard', dir: 'js/boot' };
  if (c.includes('class EventManager') && c.includes('RingBuffer')) return { name: 'event-manager', dir: 'js/core' };
  if (c.includes('class EventManager') && !c.includes('RingBuffer')) return { name: 'event-manager', dir: 'js/core' };
  if (c.includes('ObjectPool') && c.includes('VecPool')) return { name: 'pools-and-memory', dir: 'js/performance' };
  if (c.includes('class GameSettings')) return { name: 'settings', dir: 'js/systems' };
  if (c.includes('class Toast') && !c.includes('class Game')) return { name: 'toast', dir: 'js/ui' };
  if (c.includes('class FullscreenManager')) return { name: 'fullscreen', dir: 'js/systems' };
  if (c.includes('class AudioManager')) return { name: 'audio', dir: 'js/systems' };
  if (c.includes('class SaveSystem')) return { name: 'save-system', dir: 'js/systems' };
  if (c.includes('wireUXUI') && c.includes('syncSettingsControls')) return { name: 'ux-wiring', dir: 'js/ui' };
  if (c.includes('const CONFIG') && c.includes('TILE_SIZE') && c.includes('const BLOCK =')) return { name: 'constants', dir: 'js/core' };
  if (c.includes('class NoiseGenerator')) return { name: 'noise', dir: 'js/engine' };
  if (c.includes('class WorldGenerator')) return { name: 'world-generator', dir: 'js/engine' };
  if (c.includes('class TextureGenerator') || c.includes('TextureCache')) return { name: 'textures', dir: 'js/engine' };
  if (c.includes('class ParticleSystem') && !c.includes('class AmbientParticles')) return { name: 'particle-system', dir: 'js/entities' };
  if (c.includes('class DroppedItem')) return { name: 'dropped-items', dir: 'js/entities' };
  if (c.includes('class AmbientParticles')) return { name: 'ambient-particles', dir: 'js/entities' };
  if (c.includes('class Player')) return { name: 'player', dir: 'js/entities' };
  if (c.includes('class TouchController')) return { name: 'touch-controller', dir: 'js/input' };
  if (c.includes('class Renderer') && c.includes('renderWorld')) return { name: 'renderer', dir: 'js/engine' };
  if (c.includes('renderParallaxMountains') && !c.includes('class Renderer')) return { name: 'parallax', dir: 'js/engine' };
  if (c.includes('class CraftingSystem')) return { name: 'crafting', dir: 'js/ui' };
  if (c.includes('class QualityManager')) return { name: 'quality', dir: 'js/systems' };
  if (c.includes('class UIManager') || c.includes('class UIFlushScheduler')) return { name: 'ui-manager', dir: 'js/ui' };
  if (c.includes('class Minimap')) return { name: 'minimap', dir: 'js/ui' };
  if (c.includes('class InventoryUI')) return { name: 'inventory-ui', dir: 'js/ui' };
  if (c.includes('class InventorySystem') && !c.includes('class InventoryUI')) return { name: 'inventory-system', dir: 'js/ui' };
  if (c.includes('class InputManager')) return { name: 'input-manager', dir: 'js/input' };
  if (c.includes('class Game') && c.includes('loop(timestamp)')) return { name: 'game', dir: 'js/engine' };
  if (c.includes('class TileLogicEngine') && c.includes('constructor(game)')) return { name: 'tile-logic-engine', dir: 'js/systems' };
  if (c.includes('TileLogicEngine') && !c.includes('class TileLogicEngine')) return { name: 'tile-logic-patches', dir: 'js/systems' };
  if (c.includes('WorldWorkerClient')) return { name: 'worker-client', dir: 'js/workers' };
  if (c.includes('_spreadLight') && c.includes('FINAL_SPREADLIGHT')) return { name: 'lighting-patch', dir: 'js/engine' };
  if (c.includes('HealthCheck') || c.includes('beforeunload')) return { name: 'health-check', dir: 'js/boot' };
  if (c.includes("new Game()") && c.includes("window.addEventListener('load'")) return { name: 'boot', dir: 'js/boot' };
  if (c.includes('Profiler') && c.includes('beginFrame')) return { name: 'profiler', dir: 'js/performance' };
  if (c.includes('__tuPlateGcOptV1') || c.includes('_pumpSim')) return { name: 'gc-optimizations', dir: 'js/performance' };
  if (c.includes('drawTile') && c.includes('light <= 0.05')) return { name: 'runtime-opt', dir: 'js/performance' };
  if (c.includes('safeToast') && c.includes("addEventListener('error'")) return { name: 'error-guards', dir: 'js/core' };
  if (c.includes('weatherPatternTick') || c.includes('_updateWeather') || c.includes('WEATHER_PATTERNS')) return { name: 'weather', dir: 'js/systems' };
  if (c.includes('__tu_sprint') || c.includes('sprintPatched')) return { name: 'sprint-patches', dir: 'js/engine' };
  if (c.includes('postProcess') || c.includes('_applyPostFX') || c.includes('canvasFX')) return { name: 'postfx', dir: 'js/engine' };
  if (c.includes('PatchManager') && c.includes('__p')) return { name: 'patch-manager', dir: 'js/core' };
  if (c.includes('PERF_MONITOR')) return { name: 'perf-monitor', dir: 'js/performance' };
  if (c.includes('DOM_IDS') || c.includes('UI_IDS') || c.includes('const DOM =')) return { name: 'dom-utils', dir: 'js/core' };
  
  return { name: `unclassified_${idx}`, dir: 'js/_unclassified' };
}

// Track name counts for dedup
const nameCounts = {};
const moduleList = [];

for (let idx = 0; idx < scriptBlocks.length; idx++) {
  const block = scriptBlocks[idx];
  const cls = classify(block.content, idx);
  
  const key = `${cls.dir}/${cls.name}`;
  nameCounts[key] = (nameCounts[key] || 0) + 1;
  const count = nameCounts[key];
  
  // First occurrence keeps base name, subsequent get _patch_N suffix
  const fileName = count === 1 ? cls.name : `${cls.name}_patch_${count - 1}`;
  const filePath = `${cls.dir}/${fileName}.js`;
  
  moduleList.push({
    path: filePath,
    name: fileName,
    dir: cls.dir,
    baseName: cls.name,
    patchNum: count - 1,
    startLine: block.start,
    endLine: block.end,
    size: block.content.length
  });
  
  writeFile(filePath, 
    `// Module: ${fileName}\n` +
    `// Source: lines ${block.start + 1}-${block.end + 1} of original file\n` +
    `// Category: ${cls.dir.replace('js/', '')}\n` +
    `// ═══════════════════════════════════════════════════════════\n\n` +
    block.content.trim() + '\n'
  );
}

// Write load order
const loadOrder = moduleList.map(m => m.path);
writeFile('js/load-order.json', JSON.stringify(loadOrder, null, 2));

// Write module manifest
writeFile('js/module-manifest.json', JSON.stringify(moduleList.map(m => ({
  path: m.path,
  baseName: m.baseName,
  patchNum: m.patchNum,
  lines: `${m.startLine + 1}-${m.endLine + 1}`,
  size: m.size
})), null, 2));

// ═══════════════════════════════════════════════════════════════
// Extract HTML body
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Extracting HTML body ===');

let bodyStart = -1;
let bodyEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<body') && bodyStart === -1) bodyStart = i;
  if (lines[i].includes('</body')) bodyEnd = i;
}

let htmlBody = '';
let skipScript = false;
if (bodyStart !== -1 && bodyEnd !== -1) {
  for (let i = bodyStart; i <= bodyEnd; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('<script')) {
      skipScript = true;
      continue;
    }
    if (trimmed.includes('</script>')) {
      skipScript = false;
      continue;
    }
    if (!skipScript && !trimmed.startsWith('<!-- =====')) {
      htmlBody += line + '\n';
    }
  }
}

writeFile('html/body-content.html', htmlBody.trim());

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Summary ===');
console.log(`CSS blocks extracted: ${styleBlocks.length}`);
console.log(`JS modules extracted: ${moduleList.length}`);

// Count by category
const cats = {};
for (const m of moduleList) {
  const cat = m.dir;
  cats[cat] = (cats[cat] || 0) + 1;
}
for (const [cat, count] of Object.entries(cats).sort()) {
  console.log(`  ${cat}: ${count} files`);
}

// Count patches
const patches = moduleList.filter(m => m.patchNum > 0);
console.log(`\nPatch files (monkey-patches): ${patches.length}`);
for (const p of patches) {
  console.log(`  ${p.path} (patch #${p.patchNum} of ${p.baseName})`);
}
