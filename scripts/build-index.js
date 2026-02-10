#!/usr/bin/env node
/**
 * Build index.html from extracted modular parts.
 * Loads CSS from css/main.css and JS modules in load-order.json sequence.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bodyContent = fs.readFileSync(path.join(root, 'html', 'body-content.html'), 'utf-8');
const loadOrder = JSON.parse(fs.readFileSync(path.join(root, 'js', 'load-order.json'), 'utf-8'));

// Scripts that must load before body (were in <head> in original)
const headScripts = [
  'js/core/defensive.js',      // TU_Defensive IIFE - must be first
  'js/boot/loading-guard.js'   // Loading timeout protection
];

// Check if loading-guard exists (may have different name)
const allFiles = loadOrder;
const hasLoadingGuard = allFiles.some(f => f.includes('loading-guard'));

// Head scripts from load order (first 2 were in <head>)
const headScriptFiles = loadOrder.slice(0, 2); // defensive + event-manager were before </head>
const bodyScriptFiles = loadOrder.slice(2);

// Generate script tags
const headScriptTags = headScriptFiles.map(f => `    <script src="${f}"></script>`).join('\n');
const bodyScriptTags = bodyScriptFiles.map(f => `    <script src="${f}"></script>`).join('\n');

// Extract just the inner body content (remove <body> and </body> tags)
let innerBody = bodyContent;
innerBody = innerBody.replace(/^\s*<body[^>]*>\s*\n?/, '');
innerBody = innerBody.replace(/\s*<\/body>\s*$/, '');

const html = `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="utf-8" />
    <meta name="description" content="Terraria Ultra - Aesthetic Edition - A beautiful 2D sandbox game">
    <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        name="viewport" />
    <meta content="yes" name="apple-mobile-web-app-capable" />
    <meta content="yes" name="mobile-web-app-capable" />
    <meta content="#1a1a2e" name="theme-color" />
    <title>Terraria Ultra - Aesthetic Edition</title>

    <!-- Consolidated CSS (Phase 2: extracted from 6 inline style blocks) -->
    <link rel="stylesheet" href="css/main.css" />

    <!-- Critical early scripts (must load before body renders) -->
${headScriptTags}
</head>

<body>
${innerBody}

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- Modular JS: ${bodyScriptFiles.length} modules loaded in dependency order -->
    <!-- ═══════════════════════════════════════════════════════════ -->
${bodyScriptTags}
</body>

</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), html, 'utf-8');
console.log(`index.html generated (${html.length} bytes)`);
console.log(`  Head scripts: ${headScriptFiles.length}`);
console.log(`  Body scripts: ${bodyScriptFiles.length}`);
console.log(`  Total scripts: ${loadOrder.length}`);
