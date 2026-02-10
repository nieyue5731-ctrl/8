#!/usr/bin/env node
/**
 * Extraction Script for Terraria Ultra Refactoring
 * Reads the monolithic HTML file and extracts CSS/JS into modular files.
 * Maintains exact behavioral equivalence by preserving code as-is during extraction.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'index (92).html');
const content = fs.readFileSync(SRC, 'utf-8');
const lines = content.split('\n');

// Helper: write file with directory creation
function writeFile(relPath, data) {
  const full = path.join(__dirname, '..', relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, data, 'utf-8');
  console.log(`  Written: ${relPath} (${data.length} bytes)`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: Extract CSS
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Extracting CSS ===');

// Find all <style> blocks
const styleBlocks = [];
let inStyle = false;
let styleStart = -1;
let styleContent = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<style') && !inStyle) {
    inStyle = true;
    styleStart = i;
    // Check if style content is on same line
    const match = line.match(/<style[^>]*>(.*)/s);
    if (match) {
      styleContent = match[1];
      // Check if it also closes on same line
      const closeIdx = styleContent.indexOf('</style>');
      if (closeIdx !== -1) {
        styleBlocks.push({
          start: i,
          end: i,
          content: styleContent.substring(0, closeIdx)
        });
        inStyle = false;
        styleContent = '';
      }
    }
  } else if (inStyle) {
    const closeIdx = line.indexOf('</style>');
    if (closeIdx !== -1) {
      styleContent += '\n' + line.substring(0, closeIdx);
      styleBlocks.push({
        start: styleStart,
        end: i,
        content: styleContent
      });
      inStyle = false;
      styleContent = '';
    } else {
      styleContent += '\n' + line;
    }
  }
}

console.log(`Found ${styleBlocks.length} style blocks`);

// Merge all CSS and write as single file first (Phase 2 will split further)
let allCSS = '';
for (const block of styleBlocks) {
  allCSS += block.content + '\n\n';
}

// Extract :root variables
const rootMatch = allCSS.match(/:root\s*\{[^}]+\}/g);
let variablesCSS = '';
if (rootMatch) {
  // Merge all :root blocks into one
  const allVars = new Set();
  let mergedVars = ':root {\n';
  for (const root of rootMatch) {
    const vars = root.match(/--[\w-]+\s*:[^;]+;/g);
    if (vars) {
      for (const v of vars) {
        const name = v.match(/^(--[\w-]+)/)[1];
        if (!allVars.has(name)) {
          allVars.add(name);
          mergedVars += '  ' + v.trim() + '\n';
        }
      }
    }
  }
  mergedVars += '}\n';
  variablesCSS = mergedVars;
}

writeFile('css/variables.css', variablesCSS);

// Write the full combined CSS (with !important cleanup notes)
writeFile('css/main.css', `/* Terraria Ultra - Combined Styles */
/* Phase 2: CSS consolidated from ${styleBlocks.length} inline <style> blocks */
/* Variables are in variables.css */

${allCSS}`);

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Extract JS modules
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Extracting JS ===');

// Find all <script> blocks (excluding inline event handlers)
const scriptBlocks = [];
let inScript = false;
let scriptStart = -1;
let scriptContent = '';
let scriptTag = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.match(/<script\b/) && !line.includes('src=') && !inScript) {
    inScript = true;
    scriptStart = i;
    scriptTag = line;
    const match = line.match(/<script[^>]*>(.*)/);
    if (match) {
      scriptContent = match[1];
      const closeIdx = scriptContent.indexOf('</script>');
      if (closeIdx !== -1) {
        scriptBlocks.push({
          start: i,
          end: i,
          content: scriptContent.substring(0, closeIdx),
          tag: scriptTag
        });
        inScript = false;
        scriptContent = '';
      }
    }
  } else if (inScript) {
    const closeIdx = line.indexOf('</script>');
    if (closeIdx !== -1) {
      scriptContent += '\n' + line.substring(0, closeIdx);
      scriptBlocks.push({
        start: scriptStart,
        end: i,
        content: scriptContent,
        tag: scriptTag
      });
      inScript = false;
      scriptContent = '';
    } else {
      scriptContent += '\n' + lines[i]; // preserve original indentation
    }
  }
}

console.log(`Found ${scriptBlocks.length} script blocks`);

// Map script blocks to modules based on content analysis
const modules = [];

for (let idx = 0; idx < scriptBlocks.length; idx++) {
  const block = scriptBlocks[idx];
  const c = block.content;
  let name = `script_${idx}`;
  let dir = 'js';

  // Identify module by content signatures
  if (c.includes('TU_Defensive') && c.includes('TypeGuards')) {
    name = 'defensive';
    dir = 'js/core';
  } else if (c.includes('Loading') && c.includes('LOADING_TIMEOUT') && c.includes('checkLoading')) {
    name = 'loading-guard';
    dir = 'js/boot';
  } else if (c.includes('class EventManager') || (c.includes('EventManager') && c.includes('RingBuffer'))) {
    name = 'event-utils';
    dir = 'js/core';
  } else if (c.includes('ObjectPool') && c.includes('VecPool') && c.includes('ArrayPool')) {
    name = 'pools-and-utils';
    dir = 'js/core';
  } else if (c.includes('class GameSettings')) {
    name = 'settings';
    dir = 'js/systems';
  } else if (c.includes('class Toast')) {
    name = 'toast';
    dir = 'js/ui';
  } else if (c.includes('class FullscreenManager')) {
    name = 'fullscreen';
    dir = 'js/systems';
  } else if (c.includes('class AudioManager')) {
    name = 'audio';
    dir = 'js/systems';
  } else if (c.includes('wireUXUI') || c.includes('applyInfoHintText')) {
    name = 'ux-wiring';
    dir = 'js/ui';
  } else if (c.includes('const CONFIG') && c.includes('TILE_SIZE') && c.includes('const BLOCK')) {
    name = 'constants';
    dir = 'js/core';
  } else if (c.includes('class NoiseGenerator') || c.includes('class WorldGenerator')) {
    name = 'world-generator';
    dir = 'js/engine';
  } else if (c.includes('class ParticleSystem')) {
    name = 'particle-system';
    dir = 'js/entities';
  } else if (c.includes('class DroppedItem')) {
    name = 'dropped-items';
    dir = 'js/entities';
  } else if (c.includes('class AmbientParticles')) {
    name = 'ambient-particles';
    dir = 'js/entities';
  } else if (c.includes('class Player')) {
    name = 'player';
    dir = 'js/entities';
  } else if (c.includes('class TouchController')) {
    name = 'touch-controller';
    dir = 'js/input';
  } else if (c.includes('class Renderer') || c.includes('renderParallaxMountains')) {
    name = 'renderer';
    dir = 'js/engine';
  } else if (c.includes('class CraftingSystem')) {
    name = 'crafting';
    dir = 'js/ui';
  } else if (c.includes('class QualityManager')) {
    name = 'quality';
    dir = 'js/systems';
  } else if (c.includes('class Minimap')) {
    name = 'minimap';
    dir = 'js/ui';
  } else if (c.includes('class InventoryUI') || c.includes('class InventorySystem')) {
    name = 'inventory';
    dir = 'js/ui';
  } else if (c.includes('class InputManager')) {
    name = 'input-manager';
    dir = 'js/input';
  } else if (c.includes('class Game')) {
    name = 'game';
    dir = 'js/engine';
  } else if (c.includes('class SaveSystem')) {
    name = 'save-system';
    dir = 'js/systems';
  } else if (c.includes('class UIManager') || c.includes('class UIFlushScheduler')) {
    name = 'ui-manager';
    dir = 'js/ui';
  } else if (c.includes('class TileLogicEngine') || c.includes('TileLogicEngine')) {
    name = 'tile-logic-engine';
    dir = 'js/systems';
  } else if (c.includes('WorldWorkerClient') || c.includes('workerGenerateWrapped')) {
    name = 'worker-client';
    dir = 'js/workers';
  } else if (c.includes('_spreadLight') && c.includes('FINAL_SPREADLIGHT')) {
    name = 'lighting-patch';
    dir = 'js/engine';
  } else if (c.includes('HealthCheck') || c.includes('beforeunload')) {
    name = 'health-check';
    dir = 'js/boot';
  } else if (c.includes('window.addEventListener') && c.includes('new Game()')) {
    name = 'boot';
    dir = 'js/boot';
  } else if (c.includes('Profiler') && c.includes('beginFrame')) {
    name = 'profiler';
    dir = 'js/performance';
  } else if (c.includes('PERF_MONITOR') || c.includes('PerfMonitor')) {
    name = 'perf-monitor';
    dir = 'js/performance';
  } else if (c.includes('__tuPlateGcOptV1') || c.includes('_pumpSim')) {
    name = 'gc-optimization-patches';
    dir = 'js/performance';
  } else if (c.includes('drawTile') && c.includes('light <= 0.05')) {
    name = 'runtime-optimization';
    dir = 'js/performance';
  } else if (c.includes('safeToast') && c.includes('error')) {
    name = 'error-guards';
    dir = 'js/core';
  } else if (c.includes('TextureGenerator') || c.includes('TextureCache')) {
    name = 'textures';
    dir = 'js/engine';
  } else if (c.includes('weatherPatternTick') || c.includes('_updateWeather')) {
    name = 'weather';
    dir = 'js/systems';
  } else if (c.includes('STRUCTURES') || c.includes('structures')) {
    name = 'structures';
    dir = 'js/engine';
  }

  modules.push({ ...block, name, dir });
}

// Write each module
for (const mod of modules) {
  writeFile(`${mod.dir}/${mod.name}.js`, `// Module: ${mod.name}\n// Extracted from lines ${mod.start}-${mod.end} of original monolithic file\n// ═══════════════════════════════════════════════════════════\n\n${mod.content.trim()}\n`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: Extract HTML body
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Extracting HTML body ===');

// Find the body content (between <body> markers, excluding scripts)
let bodyStart = -1;
let bodyEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<body') && bodyStart === -1) bodyStart = i;
  if (lines[i].includes('</body')) bodyEnd = i;
}

// Extract only the HTML structure (canvas, HUD, overlays, controls)
let htmlBody = '';
let skipScript = false;
if (bodyStart !== -1 && bodyEnd !== -1) {
  for (let i = bodyStart + 1; i < bodyEnd; i++) {
    const line = lines[i];
    if (line.trim().startsWith('<script')) {
      skipScript = true;
      continue;
    }
    if (line.includes('</script>')) {
      skipScript = false;
      continue;
    }
    if (!skipScript) {
      // Also skip comment markers that reference modules/sections
      if (line.trim().startsWith('<!-- =====')) continue;
      htmlBody += line + '\n';
    }
  }
}

writeFile('html/body-content.html', htmlBody.trim());

// ═══════════════════════════════════════════════════════════════
// Generate module load order for index.html
// ═══════════════════════════════════════════════════════════════
console.log('\n=== Generating load order ===');

const loadOrder = modules.map(m => `${m.dir}/${m.name}.js`);
writeFile('js/load-order.json', JSON.stringify(loadOrder, null, 2));

console.log(`\nExtraction complete!`);
console.log(`  CSS blocks: ${styleBlocks.length}`);
console.log(`  JS modules: ${modules.length}`);
console.log(`  Load order: ${loadOrder.length} scripts`);
