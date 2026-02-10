// Module: worker-client
// Source: lines 21802-22775 of original file
// Category: workers
// ═══════════════════════════════════════════════════════════

(() => {
                                    const TU = window.TU || {};
                                    (function () {
                                        const __p = ({
                                            id: 'tu_world_worker_patch_v1',
                                            order: 110,
                                            description: "世界生成 Worker + 渲染解耦（v1）",
                                            apply: () => {
                                                'use strict';
                                                if (window.__TU_WORLD_WORKER_PATCHED__) return;
                                                window.__TU_WORLD_WORKER_PATCHED__ = true;

                                                const TU = (window.TU = window.TU || {});

                                                const SUPPORT_GEN_WORKER = (typeof Worker !== 'undefined') && (typeof Blob !== 'undefined') && (typeof URL !== 'undefined');
                                                const SUPPORT_RENDER_WORKER =
                                                    SUPPORT_GEN_WORKER &&
                                                    (typeof OffscreenCanvas !== 'undefined') &&
                                                    (typeof ImageBitmap !== 'undefined');

                                                function _safeNow() {
                                                    try { return performance.now(); } catch (_) { return Date.now(); }
                                                }

                                                function _fnToExpr(fn) {
                                                    const s = String(fn);
                                                    // For class methods, toString() returns "name(args){...}" which isn't a valid expression.
                                                    // Prefix with "function " to make it a valid function expression.
                                                    if (s.startsWith('function')) return s;
                                                    return 'function ' + s;
                                                }

                                                class WorldWorkerClient {
                                                    constructor() {
                                                        // 防御性初始化
                                                        this.worker = null;
                                                        this._initSent = false;
                                                        this._pendingGen = null;
                                                        this._reqId = 1;
                                                        this._state = 'idle';
                                                        this._stateLock = Promise.resolve();
                                                        this._seq = 0;
                                                        this._pending = new Map();
                                                        this._processedSeqs = new Set();

                                                        let __tuWwRender = true;
                                                        try { __tuWwRender = (typeof localStorage === 'undefined' || localStorage.getItem('tuWorkerRender') !== '0'); } catch (_) { __tuWwRender = true; }
                                                        this._renderEnabled = !!SUPPORT_RENDER_WORKER && __tuWwRender;
                                                        this._worldReady = false;

                                                        this._frameInFlight = false;
                                                        this._frameId = 1;
                                                        this._initializing = false;
                                                        this._lastBitmap = null;
                                                        this._lastFrameSentAt = 0;
                                                        this._frameTimeouts = 0;

                                                        this._lightSynced = false;

                                                        this.perf = {
                                                            genMs: null
                                                        };
                                                    }

                                                    get renderEnabled() { return this._renderEnabled; }
                                                    get worldReady() { return this._worldReady; }
                                                    get lightSynced() { return this._lightSynced; }

                                                    _ensureWorker() {
                                                        if (this.worker) return;

                                                        const parts = WorldWorkerClient._buildWorkerSourceParts();
                                                        const blob = new Blob(parts, { type: 'application/javascript' });
                                                        const url = URL.createObjectURL(blob);

                                                        try {
                                                            this.worker = new Worker(url);
                                                        } catch (e) {
                                                            console.error('[WorldWorkerClient] Failed to create worker:', e);
                                                            this._initializing = false;
                                                            throw e;
                                                        }
                                                        URL.revokeObjectURL(url);

                                                        this.worker.onmessage = (e) => this._onMessage(e.data);
                                                        this.worker.onerror = (e) => {
                                                            console.error('[WorldWorker] error event', e);
                                                            if (this._pendingGen) {
                                                                const rej = this._pendingGen.reject;
                                                                this._pendingGen = null;
                                                                try { rej(new Error((e && e.message) ? e.message : 'Worker error')); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            } try { this._frameInFlight = false; this._renderEnabled = false; this._worldReady = false; this._lightSynced = false; if (this._lastBitmap && this._lastBitmap.close) { try { this._lastBitmap.close(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } } this._lastBitmap = null; const _w = this.worker; if (_w && _w.terminate) { try { _w.terminate(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } } this.worker = null; this._initSent = false; } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        };
                                                    }

                                                    _sendInitOnce() {
                                                        if (this._initSent) return;
                                                        this._initSent = true;

                                                        const structuresEl = document.getElementById('tu-structures-json');
                                                        const structuresJSON = structuresEl ? structuresEl.textContent : '[]';

                                                        // Copy typed arrays so we can transfer their buffers without detaching originals.
                                                        let solidBuf = null;
                                                        let lightBuf = null;
                                                        let sunDecayBuf = null;

                                                        try {
                                                            if (typeof BLOCK_SOLID !== 'undefined' && BLOCK_SOLID) {
                                                                const c = new Uint8Array(BLOCK_SOLID);
                                                                solidBuf = c.buffer;
                                                            }
                                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                        try {
                                                            if (typeof BLOCK_LIGHT !== 'undefined' && BLOCK_LIGHT) {
                                                                const c = new Uint8Array(BLOCK_LIGHT);
                                                                lightBuf = c.buffer;
                                                            }
                                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                        try {
                                                            if (typeof SUN_DECAY !== 'undefined' && SUN_DECAY) {
                                                                const c = new Uint8Array(SUN_DECAY);
                                                                sunDecayBuf = c.buffer;
                                                            }
                                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                        const transfer = [];
                                                        if (solidBuf) transfer.push(solidBuf);
                                                        if (lightBuf) transfer.push(lightBuf);
                                                        if (sunDecayBuf) transfer.push(sunDecayBuf);

                                                        this.worker.postMessage({
                                                            type: 'init',
                                                            CONFIG,
                                                            BLOCK,
                                                            BLOCK_DATA,
                                                            structuresJSON,
                                                            solid: solidBuf,
                                                            light: lightBuf,
                                                            sunDecay: sunDecayBuf,
                                                            renderEnabled: this._renderEnabled
                                                        }, transfer);
                                                    }

                                                    async generate(w, h, seed, progressCb) {
                                                        // 防御性参数验证
                                                        if (!SUPPORT_GEN_WORKER) {
                                                            throw new Error('Worker not supported');
                                                        }

                                                        // 验证世界尺寸
                                                        if (!Number.isInteger(w) || w <= 0 || w > 10000) {
                                                            throw new Error(`Invalid world width: ${w}`);
                                                        }
                                                        if (!Number.isInteger(h) || h <= 0 || h > 10000) {
                                                            throw new Error(`Invalid world height: ${h}`);
                                                        }

                                                        // 验证种子
                                                        if (seed === undefined || seed === null) {
                                                            seed = Date.now();
                                                        }

                                                        this._ensureWorker();
                                                        this._sendInitOnce();

                                                        this._worldReady = false;
                                                        this._lightSynced = false;

                                                        return await new Promise((resolve, reject) => {
                                                            const id = this._reqId++;
                                                            this._pendingGen = {
                                                                id,
                                                                resolve,
                                                                reject,
                                                                progressCb: (typeof progressCb === 'function') ? progressCb : null,
                                                                t0: _safeNow()
                                                            };
                                                            this.worker.postMessage({
                                                                type: 'generate',
                                                                id,
                                                                w: w | 0,
                                                                h: h | 0,
                                                                seed: seed,
                                                                keepCopy: !!this._renderEnabled
                                                            });
                                                        });
                                                    }

                                                    _onMessage(msg) {
                                                        // 防御性：验证消息格式
                                                        if (!msg || typeof msg !== 'object') {
                                                            console.warn('[WorldWorkerClient] Invalid message format');
                                                            return;
                                                        }
                                                        if (!msg.type) {
                                                            console.warn('[WorldWorkerClient] Message missing type');
                                                            return;
                                                        }

                                                        // 序列号验证（防重放）
                                                        if (msg._seq !== undefined) {
                                                            if (this._processedSeqs.has(msg._seq)) {
                                                                console.warn(`[WorldWorkerClient] Duplicate message seq: ${msg._seq}`);
                                                                return;
                                                            }
                                                            this._processedSeqs.add(msg._seq);
                                                            if (this._processedSeqs.size > 4096) {
                                                                this._processedSeqs.clear();
                                                                this._processedSeqs.add(msg._seq);
                                                            }
                                                        }

                                                        if (msg.type === 'progress') {
                                                            if (this._pendingGen && msg.id === this._pendingGen.id && this._pendingGen.progressCb) {
                                                                try { this._pendingGen.progressCb(msg.status, msg.percent); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            }
                                                            return;
                                                        }

                                                        if (msg.type === 'done') {
                                                            if (!this._pendingGen || msg.id !== this._pendingGen.id) return;

                                                            const { resolve, t0 } = this._pendingGen;
                                                            this._pendingGen = null;

                                                            const w = msg.w | 0;
                                                            const h = msg.h | 0;

                                                            const tilesBuf = msg.tiles;
                                                            const wallsBuf = msg.walls;
                                                            const lightBuf = msg.light;

                                                            const world = { w, h, tiles: new Array(w), walls: new Array(w), light: new Array(w) };
                                                            for (let x = 0; x < w; x++) {
                                                                world.tiles[x] = new Uint8Array(tilesBuf, x * h, h);
                                                                world.walls[x] = new Uint8Array(wallsBuf, x * h, h);
                                                                world.light[x] = new Uint8Array(lightBuf, x * h, h);
                                                            }

                                                            this._worldReady = true;

                                                            const genMs = (typeof msg.genMs === 'number') ? msg.genMs : (_safeNow() - t0);
                                                            this.perf.genMs = genMs;
                                                            try {
                                                                console.info(`[WorldWorker] generated ${w}x${h} in ${genMs.toFixed(1)}ms`);
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                            // Expose perf for manual benchmarking in devtools.
                                                            window.__TU_PERF__ = window.__TU_PERF__ || {};
                                                            window.__TU_PERF__.worldGenMs = genMs;

                                                            resolve(world);
                                                            return;
                                                        }

                                                        if (msg.type === 'error') {
                                                            console.error('[WorldWorker] message error', msg);
                                                            if (this._pendingGen && msg.id === this._pendingGen.id) {
                                                                const rej = this._pendingGen.reject;
                                                                this._pendingGen = null;
                                                                try { rej(new Error(msg.message || 'Worker error')); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            }
                                                            try { this._frameInFlight = false; this._renderEnabled = false; this._worldReady = false; this._lightSynced = false; if (this._lastBitmap && this._lastBitmap.close) { try { this._lastBitmap.close(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } } this._lastBitmap = null; const _w = this.worker; if (_w && _w.terminate) { try { _w.terminate(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } } this.worker = null; this._initSent = false; } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } return;
                                                        }

                                                        if (msg.type === 'frame') {
                                                            // Bitmap world layer for main thread to draw.
                                                            if (this._lastBitmap && this._lastBitmap.close) {
                                                                try { this._lastBitmap.close(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            }
                                                            this._lastBitmap = msg.bitmap || null;
                                                            this._frameInFlight = false;
                                                            this._lastFrameSentAt = 0;
                                                            this._frameTimeouts = 0;
                                                            return;
                                                        }
                                                    }

                                                    requestFrame(cam, time, renderer) {
                                                        // 防御性状态检查
                                                        if (!this._renderEnabled || !this._worldReady || !this.worker) return;

                                                        // 验证相机对象
                                                        if (!cam || typeof cam.x !== 'number' || typeof cam.y !== 'number') {
                                                            console.warn('[WorldWorkerClient] Invalid camera object');
                                                            return;
                                                        }

                                                        // 验证renderer
                                                        if (!renderer || typeof renderer.w !== 'number' || typeof renderer.h !== 'number') {
                                                            console.warn('[WorldWorkerClient] Invalid renderer object');
                                                            return;
                                                        }

                                                        const now = (performance && performance.now) ? performance.now() : Date.now();

                                                        // Watchdog: prevent permanent stall if worker never returns a frame.
                                                        if (this._frameInFlight) {
                                                            if (this._lastFrameSentAt && (now - this._lastFrameSentAt) > 1500) {
                                                                this._frameTimeouts = (this._frameTimeouts | 0) + 1;
                                                                console.warn('[WorldWorkerClient] Frame timeout, resetting inFlight (count=' + this._frameTimeouts + ')');

                                                                this._frameInFlight = false;

                                                                // Too many consecutive timeouts -> disable worker rendering to fall back.
                                                                if (this._frameTimeouts >= 3) {
                                                                    console.warn('[WorldWorkerClient] Too many frame timeouts, disabling worker rendering');
                                                                    this._renderEnabled = false;
                                                                    this._frameTimeouts = 0;
                                                                    return;
                                                                }
                                                            }
                                                            return;
                                                        }

                                                        this._frameInFlight = true;
                                                        this._lastFrameSentAt = now;
                                                        const id = this._frameId++;

                                                        // Use renderer's CSS units & DPR to match its coordinate system.
                                                        const wCss = renderer && renderer.w ? renderer.w : 0;
                                                        const hCss = renderer && renderer.h ? renderer.h : 0;
                                                        const dpr = renderer && renderer.dpr ? renderer.dpr : 1;

                                                        try {
                                                            this.worker.postMessage({
                                                                type: 'render',
                                                                id,
                                                                camX: cam.x,
                                                                camY: cam.y,
                                                                time: time,
                                                                wCss: wCss,
                                                                hCss: hCss,
                                                                dpr: dpr
                                                            });
                                                        } catch (e) {
                                                            // If postMessage fails (e.g., terminated worker), reset flags to avoid perma-stall
                                                            this._frameInFlight = false;
                                                            this._lastFrameSentAt = 0;
                                                            this._frameTimeouts = 0;
                                                            this._renderEnabled = false; // fall back to main-thread renderer
                                                            window.TU_Defensive && window.TU_Defensive.ErrorReporter && window.TU_Defensive.ErrorReporter.report(e, { source: 'WorldWorkerClient.postMessage' });
                                                        }
                                                    }

                                                    consumeBitmap() {
                                                        const bm = this._lastBitmap;
                                                        this._lastBitmap = null;
                                                        return bm;
                                                    }

                                                    notifyTile(x, y, id) {
                                                        if (!this._renderEnabled || !this.worker) return;
                                                        this.worker.postMessage({ type: 'tile', x: x | 0, y: y | 0, id: id | 0 });
                                                    }

                                                    applyDiffMap(diffMap) {
                                                        if (!this._renderEnabled || !this.worker || !diffMap || !diffMap.size) return;

                                                        const n = diffMap.size;
                                                        const triples = new Int32Array(n * 3);
                                                        let i = 0;

                                                        for (const [key, val] of diffMap.entries()) {
                                                            const comma = key.indexOf(',');
                                                            if (comma < 0) continue;
                                                            triples[i++] = (key.slice(0, comma) | 0);
                                                            triples[i++] = (key.slice(comma + 1) | 0);
                                                            triples[i++] = (val | 0);
                                                        }

                                                        // If some entries were skipped due to malformed keys, slice to real size.
                                                        const buf = (i === triples.length) ? triples.buffer : triples.slice(0, i).buffer;
                                                        this.worker.postMessage({ type: 'tileBatch', buf }, [buf]);
                                                    }

                                                    syncLightFull(world) {
                                                        if (!this._renderEnabled || !this.worker || !world || !world.light) return;

                                                        const w = world.w | 0;
                                                        const h = world.h | 0;

                                                        const flat = new Uint8Array(w * h);
                                                        for (let x = 0; x < w; x++) {
                                                            flat.set(world.light[x], x * h);
                                                        }

                                                        const buf = flat.buffer;
                                                        this.worker.postMessage({ type: 'lightFull', w, h, buf }, [buf]);
                                                        this._lightSynced = true;
                                                    }

                                                    syncLightRegion(world, cx, cy, r) {
                                                        if (!this._renderEnabled || !this.worker || !world || !world.light) return;
                                                        if (!this._lightSynced) return; // suppress spam during load; full sync happens after init

                                                        const w = world.w | 0;
                                                        const h = world.h | 0;
                                                        const rr = (r == null) ? 14 : (r | 0);

                                                        const x0 = Math.max(0, (cx | 0) - rr);
                                                        const x1 = Math.min(w - 1, (cx | 0) + rr);
                                                        const y0 = Math.max(0, (cy | 0) - rr);
                                                        const y1 = Math.min(h - 1, (cy | 0) + rr);

                                                        const rw = (x1 - x0 + 1) | 0;
                                                        const rh = (y1 - y0 + 1) | 0;
                                                        if (rw <= 0 || rh <= 0) return;

                                                        const flat = new Uint8Array(rw * rh);
                                                        for (let x = x0; x <= x1; x++) {
                                                            const col = world.light[x];
                                                            const off = (x - x0) * rh;
                                                            for (let y = y0; y <= y1; y++) {
                                                                flat[off + (y - y0)] = col[y] | 0;
                                                            }
                                                        }

                                                        const buf = flat.buffer;
                                                        this.worker.postMessage({ type: 'lightRegion', x0, y0, w: rw, h: rh, buf }, [buf]);
                                                    }

                                                    static _buildWorkerSourceParts() {
                                                        if (WorldWorkerClient.__cachedWorkerParts) return WorldWorkerClient.__cachedWorkerParts;

                                                        // Capture current (possibly patched) generator code.
                                                        const NG = (typeof NoiseGenerator !== 'undefined') ? NoiseGenerator : null;
                                                        const WG = (typeof WorldGenerator !== 'undefined') ? WorldGenerator : null;

                                                        const parts = [];
                                                        const PRE = `'use strict';\n` +
                                                            `const window = self;\n` +
                                                            `let CONFIG=null, BLOCK=null, BLOCK_DATA=null;\n` +
                                                            `let BLOCK_SOLID=null, BLOCK_LIGHT=null, SUN_DECAY=null;\n` +
                                                            `let __STRUCT_JSON='[]';\n` +
                                                            `let __AIR=0;\n` +
                                                            `const Utils = { clamp: (v,a,b) => Math.max(a, Math.min(b, v)) };\n`;
                                                        parts.push(PRE);

                                                        // Minimal TU.Structures for patched structure welding.
                                                        parts.push("self.TU = self.TU || {};\n");
                                                        parts.push("self.TU.Structures = (function(){\n");
                                                        parts.push("  let _loaded = false;\n");
                                                        parts.push("  let _list = [];\n");
                                                        parts.push("  function _normDepth(d){\n");
                                                        parts.push("    if (Array.isArray(d) && d.length>=2) return [+(d[0]||0), +(d[1]||1)];\n");
                                                        parts.push("    return [0,1];\n");
                                                        parts.push("  }\n");
                                                        parts.push("  function _toId(name){\n");
                                                        parts.push("    if (!name) return 0;\n");
                                                        parts.push("    const v = BLOCK && (BLOCK[name] != null) ? BLOCK[name] : 0;\n");
                                                        parts.push("    return v|0;\n");
                                                        parts.push("  }\n");
                                                        parts.push("  function _normalize(raw){\n");
                                                        parts.push("    if (!raw || !Array.isArray(raw.pattern)) return null;\n");
                                                        parts.push("    const grid = raw.pattern.slice();\n");
                                                        parts.push("    const h = grid.length|0;\n");
                                                        parts.push("    let w = 0;\n");
                                                        parts.push("    for (let i=0;i<grid.length;i++){ const row=grid[i]||''; if (row.length>w) w=row.length; }\n");
                                                        parts.push("    const legend = {};\n");
                                                        parts.push("    if (raw.legend){\n");
                                                        parts.push("      for (const ch in raw.legend){\n");
                                                        parts.push("        const r = raw.legend[ch] || {};\n");
                                                        parts.push("        legend[ch] = {\n");
                                                        parts.push("          tile: _toId(r.tile),\n");
                                                        parts.push("          wall: _toId(r.wall),\n");
                                                        parts.push("          replace: r.replace || 'any',\n");
                                                        parts.push("          chance: (r.chance==null?1:+r.chance)\n");
                                                        parts.push("        };\n");
                                                        parts.push("      }\n");
                                                        parts.push("    }\n");
                                                        parts.push("    return {\n");
                                                        parts.push("      id: raw.id || '',\n");
                                                        parts.push("      tags: Array.isArray(raw.tags) ? raw.tags.slice() : [],\n");
                                                        parts.push("      weight: +raw.weight || 1,\n");
                                                        parts.push("      depth: _normDepth(raw.depth),\n");
                                                        parts.push("      anchor: Array.isArray(raw.anchor) ? [raw.anchor[0]|0, raw.anchor[1]|0] : [0,0],\n");
                                                        parts.push("      placement: raw.placement || {},\n");
                                                        parts.push("      grid,\n");
                                                        parts.push("      w,\n");
                                                        parts.push("      h,\n");
                                                        parts.push("      legend,\n");
                                                        parts.push("      connectors: Array.isArray(raw.connectors) ? raw.connectors.map(c=>({x:c.x|0,y:c.y|0,dir:c.dir||'down'})) : []\n");
                                                        parts.push("    };\n");
                                                        parts.push("  }\n");
                                                        parts.push("  function ensureLoaded(){\n");
                                                        parts.push("    if (_loaded) return;\n");
                                                        parts.push("    _loaded = true;\n");
                                                        parts.push("    let raw = [];\n");
                                                        parts.push("    try { raw = JSON.parse(__STRUCT_JSON || '[]'); } catch (_) { raw = []; }\n");
                                                        parts.push("    _list = raw.map(_normalize).filter(Boolean);\n");
                                                        parts.push("  }\n");
                                                        parts.push("  function count(){ ensureLoaded(); return _list.length; }\n");
                                                        parts.push("  function pick(depthN, tags){\n");
                                                        parts.push("    ensureLoaded();\n");
                                                        parts.push("    const tagArr = Array.isArray(tags) ? tags : (tags ? [tags] : []);\n");
                                                        parts.push("    const candidates = [];\n");
                                                        parts.push("    for (let i=0;i<_list.length;i++){\n");
                                                        parts.push("      const d = _list[i];\n");
                                                        parts.push("      if (depthN < d.depth[0] || depthN > d.depth[1]) continue;\n");
                                                        parts.push("      if (tagArr.length){\n");
                                                        parts.push("        let ok=false;\n");
                                                        parts.push("        for (let k=0;k<tagArr.length;k++){ if (d.tags && d.tags.indexOf(tagArr[k])>=0){ ok=true; break; } }\n");
                                                        parts.push("        if (!ok) continue;\n");
                                                        parts.push("      }\n");
                                                        parts.push("      candidates.push(d);\n");
                                                        parts.push("    }\n");
                                                        parts.push("    const pool = candidates.length ? candidates : _list;\n");
                                                        parts.push("    if (!pool.length) return null;\n");
                                                        parts.push("    let sum = 0;\n");
                                                        parts.push("    for (let i=0;i<pool.length;i++) sum += pool[i].weight || 1;\n");
                                                        parts.push("    let r = Math.random() * sum;\n");
                                                        parts.push("    for (let i=0;i<pool.length;i++){ r -= pool[i].weight || 1; if (r<=0) return pool[i]; }\n");
                                                        parts.push("    return pool[pool.length-1];\n");
                                                        parts.push("  }\n");
                                                        parts.push("  return { ensureLoaded, count, pick };\n");
                                                        parts.push("})();\n");

                                                        // Include generator classes.
                                                        if (NG) parts.push(NG.toString(), "\n");
                                                        if (WG) parts.push(WG.toString(), "\n");

                                                        // Re-apply any prototype patches that were applied on the main thread (biomes/structures/etc).
                                                        const patchNames = [
                                                            '_weldStructuresFromLibrary',
                                                            '_carveConnectorTunnel',
                                                            '_biome',
                                                            '_getSurfaceBlock',
                                                            '_getSubSurfaceBlock',
                                                            '_getUndergroundBlock',
                                                            '_getUndergroundBlockLegacy',
                                                            '_placeTemple',
                                                            '_generateMultiLayerMines',
                                                            '_structures'
                                                        ];
                                                        if (WG && WG.prototype) {
                                                            for (let i = 0; i < patchNames.length; i++) {
                                                                const name = patchNames[i];
                                                                const fn = WG.prototype[name];
                                                                if (typeof fn === 'function') {
                                                                    const expr = _fnToExpr(fn.toString());
                                                                    parts.push("WorldGenerator.prototype.", name, " = ", expr, ";\n");
                                                                }
                                                            }
                                                        }

                                                        // Simple render (world layer only) to ImageBitmap using OffscreenCanvas.
                                                        parts.push("let __renderEnabled = false;\n");
                                                        parts.push("let __worldW=0, __worldH=0;\n");
                                                        parts.push("let __tiles=null, __walls=null, __light=null;\n");
                                                        parts.push("let __tileLUT=null, __wallLUT=null, __maxId=0;\n");
                                                        parts.push("function __nightFactor(time){\n");
                                                        parts.push("  // same shape as Utils.nightFactor (0 day -> 1 night)\n");
                                                        parts.push("  const t = time - Math.floor(time);\n");
                                                        parts.push("  const d = Math.min(Math.abs(t - 0.5) * 2, 1);\n");
                                                        parts.push("  return Math.min(1, Math.pow(d, 2));\n");
                                                        parts.push("}\n");
                                                        parts.push("function __parseHexColor(hex){\n");
                                                        parts.push("  if (!hex || typeof hex !== 'string') return [128,128,128];\n");
                                                        parts.push("  const s = hex.trim();\n");
                                                        parts.push("  if (s[0] !== '#') return [128,128,128];\n");
                                                        parts.push("  if (s.length === 4){\n");
                                                        parts.push("    const r = parseInt(s[1]+s[1],16), g=parseInt(s[2]+s[2],16), b=parseInt(s[3]+s[3],16);\n");
                                                        parts.push("    return [r|0,g|0,b|0];\n");
                                                        parts.push("  }\n");
                                                        parts.push("  if (s.length === 7){\n");
                                                        parts.push("    const r = parseInt(s.slice(1,3),16), g=parseInt(s.slice(3,5),16), b=parseInt(s.slice(5,7),16);\n");
                                                        parts.push("    return [r|0,g|0,b|0];\n");
                                                        parts.push("  }\n");
                                                        parts.push("  return [128,128,128];\n");
                                                        parts.push("}\n");
                                                        parts.push("function __buildColorLUT(){\n");
                                                        parts.push("  if (!BLOCK_DATA || !BLOCK) return;\n");
                                                        parts.push("  __maxId = 0;\n");
                                                        parts.push("  for (const k in BLOCK){ const v = BLOCK[k]|0; if (v>__maxId) __maxId=v; }\n");
                                                        parts.push("  const maxLight = 15;\n");
                                                        parts.push("  __tileLUT = new Array((__maxId+1)*16);\n");
                                                        parts.push("  __wallLUT = new Array((__maxId+1)*16);\n");
                                                        parts.push("  for (let id=0; id<=__maxId; id++){\n");
                                                        parts.push("    const data = BLOCK_DATA[id] || BLOCK_DATA[String(id)] || {};\n");
                                                        parts.push("    const rgb = __parseHexColor(data.color);\n");
                                                        parts.push("    for (let l=0; l<16; l++){\n");
                                                        parts.push("      const m = l / maxLight;\n");
                                                        parts.push("      const r = (rgb[0]*m)|0, g=(rgb[1]*m)|0, b=(rgb[2]*m)|0;\n");
                                                        parts.push("      __tileLUT[id*16+l] = 'rgb(' + r + ',' + g + ',' + b + ')';\n");
                                                        parts.push("      const wr=(rgb[0]*m*0.6)|0, wg=(rgb[1]*m*0.6)|0, wb=(rgb[2]*m*0.6)|0;\n");
                                                        parts.push("      __wallLUT[id*16+l] = 'rgb(' + wr + ',' + wg + ',' + wb + ')';\n");
                                                        parts.push("    }\n");
                                                        parts.push("  }\n");
                                                        parts.push("}\n");
                                                        parts.push("class __SimpleWorldRenderer {\n");
                                                        parts.push("  constructor(){\n");
                                                        parts.push("    this.canvas = new OffscreenCanvas(1,1);\n");
                                                        parts.push("    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });\n");
                                                        parts.push("    this.wCss = 1; this.hCss = 1; this.dpr = 1;\n");
                                                        parts.push("    this.ts = (CONFIG && CONFIG.TILE_SIZE) ? CONFIG.TILE_SIZE : 16;\n");
                                                        parts.push("  }\n");
                                                        parts.push("  resize(wCss,hCss,dpr){\n");
                                                        parts.push("    wCss = Math.max(1, wCss|0);\n");
                                                        parts.push("    hCss = Math.max(1, hCss|0);\n");
                                                        parts.push("    dpr = (dpr && dpr>0) ? dpr : 1;\n");
                                                        parts.push("    const wPx = Math.max(1, Math.floor(wCss * dpr));\n");
                                                        parts.push("    const hPx = Math.max(1, Math.floor(hCss * dpr));\n");
                                                        parts.push("    if (this.canvas.width !== wPx) this.canvas.width = wPx;\n");
                                                        parts.push("    if (this.canvas.height !== hPx) this.canvas.height = hPx;\n");
                                                        parts.push("    this.wCss = wCss; this.hCss = hCss; this.dpr = dpr;\n");
                                                        parts.push("    this.ctx.setTransform(dpr,0,0,dpr,0,0);\n");
                                                        parts.push("  }\n");
                                                        parts.push("  render(camX, camY, time){\n");
                                                        parts.push("    const ctx = this.ctx;\n");
                                                        parts.push("    const ts = this.ts;\n");
                                                        parts.push("    const wCss = this.wCss;\n");
                                                        parts.push("    const hCss = this.hCss;\n");
                                                        parts.push("    const halfW = wCss/2;\n");
                                                        parts.push("    const halfH = hCss/2;\n");
                                                        parts.push("    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);\n");
                                                        parts.push("    ctx.clearRect(0,0,wCss,hCss);\n");
                                                        parts.push("    const margin = 2;\n");
                                                        parts.push("    const x0 = Math.max(0, Math.floor((camX - halfW)/ts) - margin);\n");
                                                        parts.push("    const x1 = Math.min(__worldW-1, Math.floor((camX + halfW)/ts) + margin);\n");
                                                        parts.push("    const y0 = Math.max(0, Math.floor((camY - halfH)/ts) - margin);\n");
                                                        parts.push("    const y1 = Math.min(__worldH-1, Math.floor((camY + halfH)/ts) + margin);\n");
                                                        parts.push("    // Walls behind air\n");
                                                        parts.push("    for (let y=y0; y<=y1; y++){\n");
                                                        parts.push("      const sy = y*ts - camY + halfH;\n");
                                                        parts.push("      let runStart = x0;\n");
                                                        parts.push("      let runStyle = null;\n");
                                                        parts.push("      for (let x=x0; x<=x1+1; x++){\n");
                                                        parts.push("        let style = null;\n");
                                                        parts.push("        if (x<=x1){\n");
                                                        parts.push("          const idx = x*__worldH + y;\n");
                                                        parts.push("          const tid = __tiles ? __tiles[idx] : 0;\n");
                                                        parts.push("          const wid = __walls ? __walls[idx] : 0;\n");
                                                        parts.push("          if (wid && tid===__AIR){\n");
                                                        parts.push("            const lv = __light ? (__light[idx]&15) : 15;\n");
                                                        parts.push("            style = __wallLUT ? __wallLUT[wid*16 + lv] : 'rgb(40,40,40)';\n");
                                                        parts.push("          }\n");
                                                        parts.push("        }\n");
                                                        parts.push("        if (style !== runStyle){\n");
                                                        parts.push("          if (runStyle){\n");
                                                        parts.push("            ctx.fillStyle = runStyle;\n");
                                                        parts.push("            const sx = runStart*ts - camX + halfW;\n");
                                                        parts.push("            ctx.fillRect(sx, sy, (x-runStart)*ts, ts);\n");
                                                        parts.push("          }\n");
                                                        parts.push("          runStyle = style;\n");
                                                        parts.push("          runStart = x;\n");
                                                        parts.push("        }\n");
                                                        parts.push("      }\n");
                                                        parts.push("    }\n");
                                                        parts.push("    // Foreground tiles\n");
                                                        parts.push("    for (let y=y0; y<=y1; y++){\n");
                                                        parts.push("      const sy = y*ts - camY + halfH;\n");
                                                        parts.push("      let runStart = x0;\n");
                                                        parts.push("      let runStyle = null;\n");
                                                        parts.push("      for (let x=x0; x<=x1+1; x++){\n");
                                                        parts.push("        let style = null;\n");
                                                        parts.push("        if (x<=x1){\n");
                                                        parts.push("          const idx = x*__worldH + y;\n");
                                                        parts.push("          const tid = __tiles ? __tiles[idx] : 0;\n");
                                                        parts.push("          if (tid && tid!==__AIR){\n");
                                                        parts.push("            const lv = __light ? (__light[idx]&15) : 15;\n");
                                                        parts.push("            style = __tileLUT ? __tileLUT[tid*16 + lv] : 'rgb(120,120,120)';\n");
                                                        parts.push("          }\n");
                                                        parts.push("        }\n");
                                                        parts.push("        if (style !== runStyle){\n");
                                                        parts.push("          if (runStyle){\n");
                                                        parts.push("            ctx.fillStyle = runStyle;\n");
                                                        parts.push("            const sx = runStart*ts - camX + halfW;\n");
                                                        parts.push("            ctx.fillRect(sx, sy, (x-runStart)*ts, ts);\n");
                                                        parts.push("          }\n");
                                                        parts.push("          runStyle = style;\n");
                                                        parts.push("          runStart = x;\n");
                                                        parts.push("        }\n");
                                                        parts.push("      }\n");
                                                        parts.push("    }\n");
                                                        parts.push("    // Global night tint (cheap)\n");
                                                        parts.push("    const nf = __nightFactor(time || 0);\n");
                                                        parts.push("    if (nf > 0.001){\n");
                                                        parts.push("      ctx.fillStyle = 'rgba(0,0,0,' + (nf*0.35) + ')';\n");
                                                        parts.push("      ctx.fillRect(0,0,wCss,hCss);\n");
                                                        parts.push("    }\n");
                                                        parts.push("    return this.canvas.transferToImageBitmap();\n");
                                                        parts.push("  }\n");
                                                        parts.push("}\n");

                                                        // Worker message handler.
                                                        parts.push("async function __doGenerate(id,w,h,seed,keepCopy){\n");
                                                        parts.push("  const t0 = (self.performance && performance.now) ? performance.now() : Date.now();\n");
                                                        parts.push("  const gen = new WorldGenerator(w,h,seed);\n");
                                                        parts.push("  const data = await gen.generate((status, percent)=>{\n");
                                                        parts.push("    self.postMessage({ type: 'progress', id, status, percent });\n");
                                                        parts.push("  });\n");
                                                        parts.push("  // Flatten column arrays into a single transferable buffer per layer.\n");
                                                        parts.push("  const tilesBuf = new ArrayBuffer(w*h);\n");
                                                        parts.push("  const wallsBuf = new ArrayBuffer(w*h);\n");
                                                        parts.push("  const lightBuf = new ArrayBuffer(w*h);\n");
                                                        parts.push("  const tilesFlat = new Uint8Array(tilesBuf);\n");
                                                        parts.push("  const wallsFlat = new Uint8Array(wallsBuf);\n");
                                                        parts.push("  const lightFlat = new Uint8Array(lightBuf);\n");
                                                        parts.push("  for (let x=0; x<w; x++){\n");
                                                        parts.push("    tilesFlat.set(data.tiles[x], x*h);\n");
                                                        parts.push("    wallsFlat.set(data.walls[x], x*h);\n");
                                                        parts.push("    lightFlat.set(data.light[x], x*h);\n");
                                                        parts.push("  }\n");
                                                        parts.push("  if (keepCopy && __renderEnabled){\n");
                                                        parts.push("    __worldW = w; __worldH = h;\n");
                                                        parts.push("    __tiles = new Uint8Array(tilesBuf.slice(0));\n");
                                                        parts.push("    __walls = new Uint8Array(wallsBuf.slice(0));\n");
                                                        parts.push("    __light = new Uint8Array(lightBuf.slice(0));\n");
                                                        parts.push("    if (!__tileLUT) __buildColorLUT();\n");
                                                        parts.push("  }\n");
                                                        parts.push("  const t1 = (self.performance && performance.now) ? performance.now() : Date.now();\n");
                                                        parts.push("  const genMs = t1 - t0;\n");
                                                        parts.push("  self.postMessage({ type: 'done', id, w, h, tiles: tilesBuf, walls: wallsBuf, light: lightBuf, genMs }, [tilesBuf, wallsBuf, lightBuf]);\n");
                                                        parts.push("}\n");

                                                        parts.push("self.onmessage = async (e) => {\n");
                                                        parts.push("  const msg = e.data || {};\n");
                                                        parts.push("  const type = msg.type;\n");
                                                        parts.push("  try {\n");
                                                        parts.push("    if (type === 'init'){\n");
                                                        parts.push("      CONFIG = msg.CONFIG || null;\n");
                                                        parts.push("      BLOCK = msg.BLOCK || null;\n");
                                                        parts.push("      BLOCK_DATA = msg.BLOCK_DATA || null;\n");
                                                        parts.push("      __STRUCT_JSON = msg.structuresJSON || '[]';\n");
                                                        parts.push("      BLOCK_SOLID = msg.solid ? new Uint8Array(msg.solid) : null;\n");
                                                        parts.push("      BLOCK_LIGHT = msg.light ? new Uint8Array(msg.light) : null;\n");
                                                        parts.push("      SUN_DECAY = msg.sunDecay ? new Uint8Array(msg.sunDecay) : null;\n");
                                                        parts.push("      __AIR = (BLOCK && (BLOCK.AIR != null)) ? (BLOCK.AIR|0) : 0;\n");
                                                        parts.push("      __renderEnabled = !!msg.renderEnabled && (typeof OffscreenCanvas !== 'undefined');\n");
                                                        parts.push("      __buildColorLUT();\n");
                                                        parts.push("      return;\n");
                                                        parts.push("    }\n");
                                                        parts.push("    if (type === 'generate'){\n");
                                                        parts.push("      const id = msg.id|0;\n");
                                                        parts.push("      const w = msg.w|0;\n");
                                                        parts.push("      const h = msg.h|0;\n");
                                                        parts.push("      const seed = msg.seed;\n");
                                                        parts.push("      const keepCopy = !!msg.keepCopy;\n");
                                                        parts.push("      await __doGenerate(id,w,h,seed,keepCopy);\n");
                                                        parts.push("      return;\n");
                                                        parts.push("    }\n");
                                                        parts.push("    if (type === 'tile'){\n");
                                                        parts.push("      if (!__tiles) return;\n");
                                                        parts.push("      const x = msg.x|0, y = msg.y|0, id = msg.id|0;\n");
                                                        parts.push("      if (x<0||y<0||x>=__worldW||y>=__worldH) return;\n");
                                                        parts.push("      __tiles[x*__worldH + y] = id;\n");
                                                        parts.push("      return;\n");
                                                        parts.push("    }\n");
                                                        parts.push("    if (type === 'tileBatch'){\n");
                                                        parts.push("      if (!__tiles || !msg.buf) return;\n");
                                                        parts.push("      const a = new Int32Array(msg.buf);\n");
                                                        parts.push("      for (let i=0; i<a.length; i+=3){\n");
                                                        parts.push("        const x=a[i]|0, y=a[i+1]|0, id=a[i+2]|0;\n");
                                                        parts.push("        if (x<0||y<0||x>=__worldW||y>=__worldH) continue;\n");
                                                        parts.push("        __tiles[x*__worldH + y] = id;\n");
                                                        parts.push("      }\n");
                                                        parts.push("      return;\n");
                                                        parts.push("    }\n");
                                                        parts.push("    if (type === 'lightFull'){\n");
                                                        parts.push("      if (!msg.buf) return;\n");
                                                        parts.push("      const w = msg.w|0, h = msg.h|0;\n");
                                                        parts.push("      __worldW = w; __worldH = h;\n");
                                                        parts.push("      __light = new Uint8Array(msg.buf);\n");
                                                        parts.push("      return;\n");
                                                        parts.push("    }\n");
                                                        parts.push("    if (type === 'lightRegion'){\n");
                                                        parts.push("      if (!__light || !msg.buf) return;\n");
                                                        parts.push("      const x0 = msg.x0|0, y0 = msg.y0|0;\n");
                                                        parts.push("      const w = msg.w|0, h = msg.h|0;\n");
                                                        parts.push("      const src = new Uint8Array(msg.buf);\n");
                                                        parts.push("      for (let dx=0; dx<w; dx++){\n");
                                                        parts.push("        const off = dx*h;\n");
                                                        parts.push("        const x = x0 + dx;\n");
                                                        parts.push("        if (x<0||x>=__worldW) continue;\n");
                                                        parts.push("        for (let dy=0; dy<h; dy++){\n");
                                                        parts.push("          const y = y0 + dy;\n");
                                                        parts.push("          if (y<0||y>=__worldH) continue;\n");
                                                        parts.push("          __light[x*__worldH + y] = src[off + dy] & 15;\n");
                                                        parts.push("        }\n");
                                                        parts.push("      }\n");
                                                        parts.push("      return;\n");
                                                        parts.push("    }\n");
                                                        parts.push("    if (type === 'render'){\n");
                                                        parts.push("      if (!__renderEnabled || !__tiles) return;\n");
                                                        parts.push("      if (!__tileLUT) __buildColorLUT();\n");
                                                        parts.push("      if (!self.__tuRenderer) self.__tuRenderer = new __SimpleWorldRenderer();\n");
                                                        parts.push("      const r = self.__tuRenderer;\n");
                                                        parts.push("      const wCss = msg.wCss|0;\n");
                                                        parts.push("      const hCss = msg.hCss|0;\n");
                                                        parts.push("      const dpr = msg.dpr || 1;\n");
                                                        parts.push("      r.resize(wCss,hCss,dpr);\n");
                                                        parts.push("      const bmp = r.render(+msg.camX||0, +msg.camY||0, +msg.time||0);\n");
                                                        parts.push("      self.postMessage({ type: 'frame', id: msg.id|0, bitmap: bmp }, [bmp]);\n");
                                                        parts.push("      return;\n");
                                                        parts.push("    }\n");
                                                        parts.push("  } catch (err) {\n");
                                                        parts.push("    self.postMessage({ type: 'error', id: msg.id|0, message: String(err && err.message ? err.message : err), stack: err && err.stack ? String(err.stack) : '' });\n");
                                                        parts.push("  }\n");
                                                        parts.push("};\n");

                                                        WorldWorkerClient.__cachedWorkerParts = parts;
                                                        return parts;
                                                    }
                                                }

                                                TU._worldWorkerClient = TU._worldWorkerClient || new WorldWorkerClient();

                                                // 1) Patch WorldGenerator.generate -> delegate to worker (fallback to main thread on any failure).
                                                if (typeof WorldGenerator !== 'undefined' && WorldGenerator.prototype && typeof WorldGenerator.prototype.generate === 'function') {
                                                    const _origGenerate = WorldGenerator.prototype.generate;
                                                    if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_workerGenerateWrapped', null) : !WorldGenerator.prototype.__tu_workerGenerateWrapped) {
                                                        // [refactor] Removed obsolete alias: WorldGenerator.prototype._generateMainThread (keep local _origGenerate only).
                                                        WorldGenerator.prototype.generate = async function (progressCb) {
                                                            const client = TU._worldWorkerClient;

                                                            // If workers aren't supported, keep original behavior.
                                                            if (!SUPPORT_GEN_WORKER) {
                                                                return _origGenerate.call(this, progressCb);
                                                            }

                                                            try {
                                                                const world = await client.generate(this.w, this.h, this.seed, progressCb);

                                                                // Attach bridge to current game instance (boot script sets window.__GAME_INSTANCE__).
                                                                const g = window.__GAME_INSTANCE__;
                                                                if (g) {
                                                                    g._worldWorkerClient = client;
                                                                    if (g.renderer) g.renderer.__ww = client;
                                                                }

                                                                return world;
                                                            } catch (err) {
                                                                console.warn('[WorldWorker] generation failed; falling back to main thread.', err);
                                                                return _origGenerate.call(this, progressCb);
                                                            }
                                                        };
                                                    }
                                                }

                                                // 2) Patch Renderer.renderWorld: if worker has a ready bitmap, draw it; otherwise fallback.
                                                if (typeof Renderer !== 'undefined' && Renderer.prototype && typeof Renderer.prototype.renderWorld === 'function') {
                                                    const _origRW = Renderer.prototype.renderWorld;
                                                    if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_workerRenderWorldWrapped', null) : !Renderer.prototype.__tu_workerRenderWorldWrapped) {
                                                        Renderer.prototype.renderWorld = function (world, cam, time) {
                                                            const ww = this.__ww;
                                                            if (ww && ww.renderEnabled && ww.worldReady) {
                                                                ww.requestFrame(cam, time, this);
                                                                const bm = ww.consumeBitmap();
                                                                if (bm) {
                                                                    try {
                                                                        // Canvas context is in CSS units (scaled by DPR). Draw bitmap scaled to CSS size.
                                                                        this.ctx.drawImage(bm, 0, 0, this.w, this.h);
                                                                        return;
                                                                    } finally {
                                                                        if (bm.close) {
                                                                            try { bm.close(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                            return _origRW.call(this, world, cam, time);
                                                        };
                                                    }
                                                }

                                                // 3) Keep worker's world copy in sync with live gameplay edits (tiles).
                                                if (typeof Game !== 'undefined' && Game.prototype && typeof Game.prototype._writeTileFast === 'function') {
                                                    const _origWTF = Game.prototype._writeTileFast;
                                                    if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_workerWriteTileWrapped', null) : !Game.prototype.__tu_workerWriteTileWrapped) {
                                                        Game.prototype._writeTileFast = function (x, y, id, persist = true) {
                                                            const r = _origWTF.call(this, x, y, id, persist);
                                                            const ww = this._worldWorkerClient;
                                                            if (ww) ww.notifyTile(x, y, id);
                                                            return r;
                                                        };
                                                    }
                                                }

                                                // 4) Keep worker's world copy in sync with save diffs applied on load (batch).
                                                if (typeof SaveSystem !== 'undefined' && SaveSystem.prototype && typeof SaveSystem.prototype.applyToWorld === 'function') {
                                                    const _origApply = SaveSystem.prototype.applyToWorld;
                                                    if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_workerApplyToWorldWrapped', null) : !SaveSystem.prototype.__tu_workerApplyToWorldWrapped) {
                                                        SaveSystem.prototype.applyToWorld = function (world, save) {
                                                            const r = _origApply.call(this, world, save);
                                                            try {
                                                                const g = this.game;
                                                                const ww = g && g._worldWorkerClient;
                                                                if (ww && ww.renderEnabled && save && save._diffMap && save._diffMap.size) {
                                                                    ww.applyDiffMap(save._diffMap);
                                                                }
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            return r;
                                                        };
                                                    }
                                                }

                                                // 5) Sync light map (full once after init), and optionally region updates for dynamic changes.
                                                if (typeof Game !== 'undefined' && Game.prototype && typeof Game.prototype.init === 'function') {
                                                    const _origInit = Game.prototype.init;
                                                    if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_workerInitWrapped', null) : !Game.prototype.__tu_workerInitWrapped) {
                                                        Game.prototype.init = async function (...args) {
                                                            window.__TU_PERF__ = window.__TU_PERF__ || {};
                                                            if (!window.__TU_PERF__.initStart) window.__TU_PERF__.initStart = _safeNow();
                                                            const r = await _origInit.apply(this, args);
                                                            window.__TU_PERF__.initEnd = _safeNow();
                                                            window.__TU_PERF__.initMs = window.__TU_PERF__.initEnd - window.__TU_PERF__.initStart;

                                                            // After init completes, do a single full light sync so worker rendering matches loaded saves.
                                                            try {
                                                                const ww = this._worldWorkerClient;
                                                                if (ww && ww.renderEnabled && this.world) {
                                                                    ww.syncLightFull(this.world);
                                                                }
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                            return r;
                                                        };
                                                    }
                                                }

                                                if (typeof Game !== 'undefined' && Game.prototype && typeof Game.prototype._updateLight === 'function') {
                                                    const _origUL = Game.prototype._updateLight;
                                                    if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_workerUpdateLightWrapped', null) : !Game.prototype.__tu_workerUpdateLightWrapped) {
                                                        Game.prototype._updateLight = function (x, y) {
                                                            _origUL.call(this, x, y);
                                                            try {
                                                                const ww = this._worldWorkerClient;
                                                                if (ww && ww.renderEnabled && this.world) {
                                                                    ww.syncLightRegion(this.world, x, y, 14);
                                                                }
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        };
                                                    }
                                                }

                                                // PERF: record first frame timing (init -> first RAF)
                                                if (typeof Game !== 'undefined' && Game.prototype && typeof Game.prototype._startRaf === 'function') {
                                                    const _origStartRaf = Game.prototype._startRaf;
                                                    if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_perfStartRafWrapped', null) : !Game.prototype.__tu_perfStartRafWrapped) {

                                                        Game.prototype._startRaf = function () {
                                                            try {
                                                                window.__TU_PERF__ = window.__TU_PERF__ || {};
                                                                if (!window.__TU_PERF__.rafStart) window.__TU_PERF__.rafStart = _safeNow();

                                                                if ((window.TU && window.TU.PatchManager) ? window.TU.PatchManager.once('tu_perfRafCbWrapped', null) : (!this.__tu_perfRafCbWrapped && this._rafCb)) {
                                                                    const _origCb = this._rafCb;

                                                                    this._rafCb = (t) => {
                                                                        const perf = (window.__TU_PERF__ = window.__TU_PERF__ || {});
                                                                        if (!perf.firstFrameAt) {
                                                                            perf.firstFrameAt = t;
                                                                            perf.firstFrameMs = _safeNow() - (perf.rafStart || _safeNow());
                                                                            if (perf.initStart) perf.firstFrameFromInitMs = _safeNow() - perf.initStart;
                                                                        }
                                                                        return _origCb(t);
                                                                    };
                                                                }
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                            return _origStartRaf.call(this);
                                                        };
                                                    }
                                                }
                                            }
                                        }); try { __p && __p.apply && __p.apply(); } catch (e) { console.warn('[TU merge] patch apply failed', __p && __p.id, e); }
                                    })();
                                })();
