// Module: tile-logic-patches_patch_3
// Source: lines 23468-24119 of original file
// Category: systems
// ═══════════════════════════════════════════════════════════

(() => {
                                    'use strict';

                                    // ─────────────────────────────────────────────────────────────
                                    // 1) Chunk glow bake: bake glow layer into chunk glowCanvas (with padding)
                                    // ─────────────────────────────────────────────────────────────
                                    try {
                                        if (typeof Renderer !== 'undefined' && Renderer && Renderer.prototype && Renderer.prototype.__cb2_getEntry) {
                                            const GLOW_PAD = 32; // chunk-level padding to avoid blur clipping on chunk borders

                                            // Wrap/replace rebuildChunk to draw BOTH base + glow layers into chunk-local canvases.
                                            const _origRebuild = Renderer.prototype.__cb2_rebuildChunk;
                                            Renderer.prototype.__cb2_rebuildChunk = function (entry, world) {
                                                try {
                                                    const cfg = this.__cb2_cfg || { tiles: 16 };
                                                    const cts = (cfg.tiles | 0) || 16;
                                                    const ts = (CONFIG && CONFIG.TILE_SIZE) ? (CONFIG.TILE_SIZE | 0) : 16;

                                                    const pxW = cts * ts;
                                                    const pad = GLOW_PAD | 0;
                                                    const glowW = pxW + pad * 2;

                                                    // Ensure base canvas
                                                    if (!entry.canvas) {
                                                        entry.canvas = document.createElement('canvas');
                                                        entry.ctx = entry.canvas.getContext('2d', { alpha: true });
                                                        entry.ctx.imageSmoothingEnabled = false;
                                                    }
                                                    if (entry.canvas.width !== pxW || entry.canvas.height !== pxW) {
                                                        entry.canvas.width = entry.canvas.height = pxW;
                                                    }
                                                    const ctx = entry.ctx;

                                                    // Ensure glow canvas
                                                    if (!entry.glowCanvas) {
                                                        entry.glowCanvas = document.createElement('canvas');
                                                        entry.glowCtx = entry.glowCanvas.getContext('2d', { alpha: true });
                                                        entry.glowCtx.imageSmoothingEnabled = false;
                                                        entry.glowPad = pad;
                                                        entry.hasGlow = false;
                                                    }
                                                    if (entry.glowCanvas.width !== glowW || entry.glowCanvas.height !== glowW) {
                                                        entry.glowCanvas.width = entry.glowCanvas.height = glowW;
                                                    }
                                                    const gctx = entry.glowCtx;
                                                    entry.glowPad = pad;
                                                    entry.hasGlow = false;

                                                    // Clear
                                                    ctx.clearRect(0, 0, pxW, pxW);
                                                    gctx.clearRect(0, 0, glowW, glowW);

                                                    const tilesCols = world && world.tiles;
                                                    const tilesFlat = world && world.tilesFlat;
                                                    const H = world ? (world.h | 0) : 0;

                                                    const texGen = this.textures;
                                                    const BL = (typeof BLOCK_LIGHT !== 'undefined') ? BLOCK_LIGHT : null;

                                                    const cx0 = (entry.cx | 0) * cts;
                                                    const cy0 = (entry.cy | 0) * cts;

                                                    for (let lx = 0; lx < cts; lx++) {
                                                        const wx = cx0 + lx;
                                                        if (wx < 0 || wx >= world.w) continue;

                                                        let col = null;
                                                        let baseIdx = 0;
                                                        if (tilesFlat && H) {
                                                            baseIdx = (wx * H) | 0;
                                                        } else if (tilesCols) {
                                                            col = tilesCols[wx];
                                                        }

                                                        for (let ly = 0; ly < cts; ly++) {
                                                            const wy = cy0 + ly;
                                                            if (wy < 0 || wy >= world.h) continue;

                                                            const id = (tilesFlat && H) ? (tilesFlat[baseIdx + wy] | 0) : (col ? (col[wy] | 0) : 0);
                                                            if (id === 0) continue;

                                                            // Base tile & glow bake
                                                            const tex = texGen && texGen.get ? texGen.get(id) : null;
                                                            const bl = BL ? (BL[id] | 0) : 0;

                                                            if (bl > 5) {
                                                                // Glow tiles: draw into glowCanvas (includes tile content when using getGlow fallback),
                                                                // base canvas intentionally skips to avoid double-draw.
                                                                const gtex = (texGen && texGen.getGlow) ? texGen.getGlow(id) : null;
                                                                if (gtex) {
                                                                    const gp = gtex.__pad | 0;
                                                                    gctx.drawImage(gtex, lx * ts + pad - gp, ly * ts + pad - gp);
                                                                    entry.hasGlow = true;
                                                                } else if (tex) {
                                                                    // Fallback: shadowBlur bake directly into glowCanvas
                                                                    try {
                                                                        gctx.save();
                                                                        gctx.shadowColor = (typeof BLOCK_COLOR !== 'undefined' && BLOCK_COLOR[id]) ? BLOCK_COLOR[id] : '#ffffff';
                                                                        gctx.shadowBlur = bl * 2;
                                                                        gctx.drawImage(tex, lx * ts + pad, ly * ts + pad);
                                                                        gctx.restore();
                                                                        entry.hasGlow = true;
                                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                }
                                                            } else {
                                                                if (tex) ctx.drawImage(tex, lx * ts, ly * ts);
                                                            }

                                                        }
                                                    }

                                                    entry.dirty = false;
                                                    return;
                                                } catch (e) {
                                                    // Fallback to previous rebuild if anything goes wrong.
                                                    try { if (_origRebuild) return _origRebuild.call(this, entry, world); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    entry.dirty = false;
                                                }
                                            };

                                            // Ensure existing cached entries get glow canvases after patch
                                            try {
                                                const oldGet = Renderer.prototype.__cb2_getEntry;
                                                Renderer.prototype.__cb2_getEntry = function (world, cx, cy) {
                                                    const e = oldGet.call(this, world, cx, cy);
                                                    if (e && !e.glowCanvas) {
                                                        e.dirty = true; // force rebuild with new glow bake path
                                                        try { this.__cb2_rebuildChunk(e, world); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    }
                                                    return e;
                                                };
                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                    // ─────────────────────────────────────────────────────────────
                                    // 2) Vignette/darkness: tile-resolution alpha-map (offscreen ImageData), single draw
                                    //    + draw glowCanvas per chunk (no per-tile glow loops)
                                    // ─────────────────────────────────────────────────────────────
                                    try {
                                        if (typeof Renderer !== 'undefined' && Renderer && Renderer.prototype && typeof Renderer.prototype.renderWorld === 'function') {
                                            const _prevRW = Renderer.prototype.renderWorld;

                                            function parseRgb(str) {
                                                // supports 'rgb(r,g,b)' or 'rgba(r,g,b,a)' or '#rrggbb'
                                                if (!str) return { r: 10, g: 5, b: 20 };
                                                const s = String(str).trim();
                                                let m = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*/i);
                                                if (m) return { r: (m[1] | 0), g: (m[2] | 0), b: (m[3] | 0) };
                                                m = s.match(/^#([0-9a-f]{6})$/i);
                                                if (m) {
                                                    const n = parseInt(m[1], 16);
                                                    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
                                                }
                                                return { r: 10, g: 5, b: 20 };
                                            }

                                            // dark LUT builder (same as original renderWorld)
                                            function buildDarkLUT(levels, nightBonus) {
                                                const lut = new Float32Array(256);
                                                for (let i = 0; i < 256; i++) {
                                                    const darkness = 1 - (i / levels);
                                                    let totalDark = darkness * 0.6 + nightBonus;
                                                    if (totalDark > 0.88) totalDark = 0.88;
                                                    lut[i] = (totalDark > 0.05) ? totalDark : 0;
                                                }
                                                return lut;
                                            }

                                            Renderer.prototype.renderWorld = function (world, cam, time) {
                                                // Preserve worker-rendered fast path (if present)
                                                try {
                                                    const ww = this.__ww;
                                                    if (ww && ww.renderEnabled && ww.worldReady) {
                                                        ww.requestFrame(cam, time, this);
                                                        const bm = ww.consumeBitmap();
                                                        if (bm) {
                                                            try { this.ctx.drawImage(bm, 0, 0, this.w, this.h); return; }
                                                            finally { try { bm.close && bm.close(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } }
                                                        }
                                                    }
                                                } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                // Preconditions for our path
                                                if (!world || !cam || !this.__cb2_getEntry || !this.__cb2_cfg || !this.ctx) {
                                                    return _prevRW.call(this, world, cam, time);
                                                }
                                                const ts = (CONFIG && CONFIG.TILE_SIZE) ? (CONFIG.TILE_SIZE | 0) : 16;
                                                const ctx = this.ctx;

                                                // Visible tile range (clamped once)
                                                let startX = (cam.x / ts) | 0; startX -= 1;
                                                let startY = (cam.y / ts) | 0; startY -= 1;
                                                let endX = startX + ((this.w / ts) | 0) + 3;
                                                let endY = startY + ((this.h / ts) | 0) + 3;

                                                if (startX < 0) startX = 0;
                                                if (startY < 0) startY = 0;
                                                if (endX >= world.w) endX = world.w - 1;
                                                if (endY >= world.h) endY = world.h - 1;

                                                const camCeilX = Math.ceil(cam.x);
                                                const camCeilY = Math.ceil(cam.y);

                                                // ───────── LUT (day/night + weather gloom/flash) ─────────
                                                const Utils = window.Utils || (window.TU && window.TU.Utils);
                                                const night = Utils && Utils.nightFactor ? Utils.nightFactor(time) : 0;
                                                const qNight = Math.round(night * 100) / 100;
                                                const levels = (CONFIG && CONFIG.LIGHT_LEVELS) ? (CONFIG.LIGHT_LEVELS | 0) : 16;

                                                const wf = window.TU_WEATHER_FX || null;
                                                let wType = (wf && wf.type) ? wf.type : 'clear';
                                                let wGloom = (wf && typeof wf.gloom === 'number') ? wf.gloom : 0;
                                                let wFlash = (wf && typeof wf.lightning === 'number') ? wf.lightning : 0;
                                                if (wGloom < 0) wGloom = 0;
                                                if (wGloom > 1) wGloom = 1;
                                                if (wFlash < 0) wFlash = 0;
                                                if (wFlash > 1) wFlash = 1;
                                                const wKey = wType + ':' + ((wGloom * 100) | 0) + ':' + ((wFlash * 100) | 0) + ':' + qNight + ':' + levels;

                                                if (!this._darkAlphaLUTDay || this._darkAlphaLUTLevels !== levels) {
                                                    this._darkAlphaLUTLevels = levels;
                                                    this._darkAlphaLUTDay = buildDarkLUT(levels, 0);
                                                    this._darkAlphaLUTNight = buildDarkLUT(levels, 0.2);
                                                }
                                                let lut = this._darkAlphaLUTBlend;
                                                if (!lut || this._darkAlphaLUTBlendWeatherKey !== wKey || this._darkAlphaLUTBlendNight !== qNight || this._darkAlphaLUTBlendLevels !== levels) {
                                                    lut = this._darkAlphaLUTBlend || (this._darkAlphaLUTBlend = new Float32Array(256));
                                                    const dayL = this._darkAlphaLUTDay;
                                                    const nightL = this._darkAlphaLUTNight;
                                                    const lv = levels || 1;
                                                    const gloom = wGloom;
                                                    const flash = wFlash;
                                                    let th = 0.05 - gloom * 0.02;
                                                    if (th < 0.02) th = 0.02;

                                                    for (let i = 0; i < 256; i++) {
                                                        let v = dayL[i] + (nightL[i] - dayL[i]) * qNight;

                                                        if (gloom > 0.001) {
                                                            let light01 = i / lv;
                                                            if (light01 < 0) light01 = 0;
                                                            if (light01 > 1) light01 = 1;
                                                            const sh = 1 - light01;
                                                            v += gloom * (0.08 + 0.22 * sh);
                                                            v *= (1 + gloom * 0.18);
                                                        }

                                                        if (flash > 0.001) {
                                                            v *= (1 - flash * 0.75);
                                                            v -= flash * 0.08;
                                                        }

                                                        if (v > 0.92) v = 0.92;
                                                        if (v < th) v = 0;
                                                        lut[i] = v;
                                                    }
                                                    this._darkAlphaLUTBlendNight = qNight;
                                                    this._darkAlphaLUTBlendLevels = levels;
                                                    this._darkAlphaLUTBlendWeatherKey = wKey;
                                                }
                                                window.BLOCK_LIGHT_LUT = lut;

                                                // ───────── 1) Draw tile chunks (base) ─────────
                                                ctx.globalCompositeOperation = 'source-over';
                                                ctx.globalAlpha = 1;
                                                ctx.shadowBlur = 0;

                                                const cfg = this.__cb2_cfg || { tiles: 16 };
                                                const cts = (cfg.tiles | 0) || 16;

                                                const cStartX = (startX / cts) | 0;
                                                const cStartY = (startY / cts) | 0;
                                                const cEndX = (endX / cts) | 0;
                                                const cEndY = (endY / cts) | 0;

                                                for (let cy = cStartY; cy <= cEndY; cy++) {
                                                    for (let cx = cStartX; cx <= cEndX; cx++) {
                                                        const e = this.__cb2_getEntry(world, cx, cy);
                                                        if (!e || !e.canvas) continue;
                                                        const dx = cx * cts * ts - camCeilX;
                                                        const dy = cy * cts * ts - camCeilY;
                                                        ctx.drawImage(e.canvas, dx, dy);
                                                    }
                                                }

                                                // ───────── 2) Draw baked glow canvases (chunk-level) ─────────
                                                if (this.enableGlow) {
                                                    for (let cy = cStartY; cy <= cEndY; cy++) {
                                                        for (let cx = cStartX; cx <= cEndX; cx++) {
                                                            const e = this.__cb2_getEntry(world, cx, cy);
                                                            if (!e || !e.glowCanvas || !e.hasGlow) continue;
                                                            const pad = e.glowPad | 0;
                                                            const dx = cx * cts * ts - camCeilX - pad;
                                                            const dy = cy * cts * ts - camCeilY - pad;
                                                            ctx.drawImage(e.glowCanvas, dx, dy);
                                                        }
                                                    }
                                                }

                                                // ───────── 3) Tile-resolution darkness alpha-map (offscreen ImageData) ─────────
                                                const tilesCols = world.tiles;
                                                const lightCols = world.light;
                                                const tilesFlat = world.tilesFlat;
                                                const lightFlat = world.lightFlat;
                                                const H = world.h | 0;

                                                const wTiles = (endX - startX + 1) | 0;
                                                const hTiles = (endY - startY + 1) | 0;

                                                let mask = this.__tu_darkMask;
                                                if (!mask || mask.w !== wTiles || mask.h !== hTiles) {
                                                    const c = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(wTiles, hTiles) : document.createElement('canvas');
                                                    c.width = wTiles; c.height = hTiles;
                                                    const mctx = c.getContext('2d', { alpha: true });
                                                    mask = this.__tu_darkMask = { canvas: c, ctx: mctx, w: wTiles, h: hTiles, imageData: mctx.createImageData(wTiles, hTiles) };
                                                }

                                                const wfShadow = wf && wf.shadowColor ? wf.shadowColor : 'rgb(10,5,20)';
                                                const rgb = parseRgb(wfShadow);

                                                const data = mask.imageData.data;
                                                // Fill
                                                let di = 0;
                                                if (tilesFlat && lightFlat && H) {
                                                    // x-major scan for cache friendliness on column-major flat arrays
                                                    // We write into row-major ImageData with a constant stride.
                                                    for (let y = 0; y < hTiles; y++) {
                                                        const wy = startY + y;
                                                        const rowBase = (y * wTiles) << 2;
                                                        for (let x = 0; x < wTiles; x++) {
                                                            const wx = startX + x;
                                                            const idx = (wx * H + wy) | 0;
                                                            const id = tilesFlat[idx] | 0;
                                                            const a = id ? lut[lightFlat[idx] | 0] : 0;
                                                            const o = rowBase + (x << 2);
                                                            data[o] = rgb.r;
                                                            data[o + 1] = rgb.g;
                                                            data[o + 2] = rgb.b;
                                                            data[o + 3] = a ? ((a * 255) | 0) : 0;
                                                        }
                                                    }
                                                } else {
                                                    for (let y = startY; y <= endY; y++) {
                                                        for (let x = startX; x <= endX; x++) {
                                                            const id = tilesCols && tilesCols[x] ? (tilesCols[x][y] | 0) : 0;
                                                            const lv = lightCols && lightCols[x] ? (lightCols[x][y] | 0) : 0;
                                                            const a = id ? lut[lv] : 0;
                                                            data[di++] = rgb.r;
                                                            data[di++] = rgb.g;
                                                            data[di++] = rgb.b;
                                                            data[di++] = a ? ((a * 255) | 0) : 0;
                                                        }
                                                    }
                                                }

                                                mask.ctx.putImageData(mask.imageData, 0, 0);

                                                const oldSmooth = ctx.imageSmoothingEnabled;
                                                ctx.imageSmoothingEnabled = false;
                                                ctx.globalAlpha = 1;
                                                ctx.globalCompositeOperation = 'source-over';

                                                ctx.drawImage(
                                                    mask.canvas,
                                                    0, 0, wTiles, hTiles,
                                                    startX * ts - camCeilX,
                                                    startY * ts - camCeilY,
                                                    wTiles * ts,
                                                    hTiles * ts
                                                );

                                                ctx.imageSmoothingEnabled = oldSmooth;
                                                ctx.globalAlpha = 1;
                                            };
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                    // ─────────────────────────────────────────────────────────────
                                    // 3) TileLogic diff: column-view bitpack (only when diff is huge) + apply path
                                    // ─────────────────────────────────────────────────────────────
                                    try {
                                        if (typeof TileLogicEngine !== 'undefined' && TileLogicEngine) {

                                            // ---- Worker source: add packed path when len is large ----
                                            if (!TileLogicEngine.__tu_packXYWorkerSourcePatched && typeof TileLogicEngine._workerSource === 'function') {
                                                const _orig = TileLogicEngine._workerSource;
                                                TileLogicEngine._workerSource = function () {
                                                    let s = _orig.call(TileLogicEngine);
                                                    try {
                                                        if (!s || s.indexOf("type: 'changes'") === -1) return s;
                                                        if (s.indexOf("type: 'changesXY'") !== -1) return s;

                                                        // 1) inject allocator + threshold near pool definition
                                                        const poolDecl = "const __TU_OUT_POOL__ = [];";
                                                        if (s.indexOf(poolDecl) !== -1) {
                                                            const inject = `
  const __TU_PACK_THRESHOLD__ = 6144; // ints (3 per change); only pack when very large
  function __tuAllocOutPacked(n) {
    const need = (n << 3) >>> 0; // 8 bytes per change (xy uint32 + ids uint16 + pad)
    let b = null;
    for (let i = __TU_OUT_POOL__.length - 1; i >= 0; i--) {
      const cand = __TU_OUT_POOL__[i];
      if (cand && cand.byteLength >= need) { b = cand; __TU_OUT_POOL__.splice(i, 1); break; }
    }
    return b || new ArrayBuffer(need);
  }
`;
                                                            s = s.replace(poolDecl, poolDecl + inject);
                                                        }

                                                        // 2) replace postMessage line with conditional packed send
                                                        const needle = "postMessage({ type: 'changes', buf: buf, len: len }, [buf]);";
                                                        if (s.indexOf(needle) !== -1) {
                                                            const repl = `
      if (len >= __TU_PACK_THRESHOLD__) {
        const n = (len / 3) | 0;
        const pbuf = __tuAllocOutPacked(n);
        const xy = new Uint32Array(pbuf, 0, n);
        const ids = new Uint16Array(pbuf, n * 4, n);
        for (let k = 0, j = 0; k < n; k++, j += 3) {
          const idx = __tuOutView[j] | 0;
          const x = (idx / H) | 0;
          const y = idx - x * H;
          xy[k] = ((x & 0xffff) << 16) | (y & 0xffff);
          const oldId = __tuOutView[j + 1] | 0;
          const newId = __tuOutView[j + 2] | 0;
          ids[k] = ((oldId & 255) | ((newId & 255) << 8)) & 0xffff;
        }
        try { __TU_OUT_POOL__.push(buf); } catch(_) { /* silently ignore */ }
        postMessage({ type: 'changesXY', buf: pbuf, n: n }, [pbuf]);
      } else {
        postMessage({ type: 'changes', buf: buf, len: len }, [buf]);
      }`;
                                                            s = s.replace(needle, repl);
                                                        }

                                                        return s;
                                                    } catch (_) {
                                                        return s;
                                                    }
                                                };
                                                TileLogicEngine.__tu_packXYWorkerSourcePatched = true;
                                            }

                                            // ---- Main thread: accept changesXY and apply using column view getter ----
                                            if (TileLogicEngine.prototype && !TileLogicEngine.prototype.__tu_packXYApplyWrapped) {
                                                TileLogicEngine.prototype.__tu_packXYApplyWrapped = true;

                                                // Column view getter (cached)
                                                TileLogicEngine.prototype.__tu_getTileCol = function (x) {
                                                    const wx = x | 0;
                                                    if (this.__tu_lastColX === wx && this.__tu_lastCol) return this.__tu_lastCol;
                                                    const cols = this.world && this.world.tiles;
                                                    const col = cols ? cols[wx] : null;
                                                    this.__tu_lastColX = wx;
                                                    this.__tu_lastCol = col;
                                                    return col;
                                                };

                                                // Wrap _initWorker to extend onmessage
                                                if (typeof TileLogicEngine.prototype._initWorker === 'function') {
                                                    const _origInit = TileLogicEngine.prototype._initWorker;
                                                    TileLogicEngine.prototype._initWorker = function () {
                                                        _origInit.call(this);

                                                        try {
                                                            if (!this.worker || this.__tu_packXYOnMsgWrapped) return;
                                                            this.__tu_packXYOnMsgWrapped = true;

                                                            const self = this;
                                                            const w = this.worker;
                                                            const oldHandler = w.onmessage;

                                                            // pending pool (reuse objects)
                                                            const pendingPool = [];
                                                            function allocPendingPacked(buf, n) {
                                                                const o = pendingPool.pop() || { type: 'xy', buf: null, n: 0, pos: 0 };
                                                                o.type = 'xy';
                                                                o.buf = buf;
                                                                o.n = n | 0;
                                                                o.pos = 0;
                                                                return o;
                                                            }
                                                            function allocPendingArr(arr) {
                                                                const o = pendingPool.pop() || { type: 'i32', arr: null, pos: 0 };
                                                                o.type = 'i32';
                                                                o.arr = arr;
                                                                o.pos = 0;
                                                                return o;
                                                            }
                                                            function freePending(o) {
                                                                o.type = 'i32';
                                                                o.arr = null;
                                                                o.buf = null;
                                                                o.n = 0;
                                                                o.pos = 0;
                                                                pendingPool.push(o);
                                                            }
                                                            self.__tu_pendingPool2 = { allocPendingPacked, allocPendingArr, freePending };

                                                            w.onmessage = (e) => {
                                                                const msg = e.data;
                                                                if (!msg || !msg.type) { if (oldHandler) try { oldHandler(e); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } return; }

                                                                if (msg.type === 'changes' && msg.buf) {
                                                                    try {
                                                                        const len = (msg.len | 0) > 0 ? (msg.len | 0) : 0;
                                                                        const arr = len ? new Int32Array(msg.buf, 0, len) : new Int32Array(msg.buf);
                                                                        self.pending.push(allocPendingArr(arr));
                                                                        self._scheduleApply();
                                                                        return;
                                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                }

                                                                if (msg.type === 'changesXY' && msg.buf) {
                                                                    try {
                                                                        const n = (msg.n | 0) > 0 ? (msg.n | 0) : 0;
                                                                        self.pending.push(allocPendingPacked(msg.buf, n));
                                                                        self._scheduleApply();
                                                                        return;
                                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                }

                                                                if (oldHandler) {
                                                                    try { oldHandler(e); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                }
                                                            };
                                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    };
                                                }

                                                // Replace _applyPending with a packed-aware version (keeps recycle behavior)
                                                if (typeof TileLogicEngine.prototype._applyPending === 'function') {
                                                    const _origApply = TileLogicEngine.prototype._applyPending;

                                                    TileLogicEngine.prototype._applyPending = function (deadline) {
                                                        // If we don't have packed items, just use original (perfpack wrapper will recycle buffers)
                                                        let hasPacked = false;
                                                        for (let i = 0; i < this.pending.length; i++) {
                                                            const it = this.pending[i];
                                                            if (it && it.type === 'xy') { hasPacked = true; break; }
                                                        }
                                                        if (!hasPacked) return _origApply.call(this, deadline);

                                                        this._applyScheduled = false;
                                                        if (!this.pending.length) return;

                                                        const game = this.game;
                                                        const world = this.world;
                                                        const renderer = game && game.renderer;

                                                        const BL = (typeof BLOCK_LIGHT !== 'undefined') ? BLOCK_LIGHT : null;

                                                        let any = false;
                                                        const lightSeeds = [];
                                                        const maxLightSeeds = 16;

                                                        const maxOps = 2000;
                                                        let ops = 0;

                                                        const pool = this.__tu_pendingPool2 || null;
                                                        const getCol = this.__tu_getTileCol ? this.__tu_getTileCol.bind(this) : null;

                                                        while (this.pending.length && (deadline.timeRemaining() > 2 || deadline.didTimeout) && ops < maxOps) {
                                                            const cur = this.pending[0];

                                                            if (cur.type === 'xy') {
                                                                const n = cur.n | 0;
                                                                const buf = cur.buf;
                                                                if (!buf || !n) { this.pending.shift(); ops++; continue; }

                                                                const xy = new Uint32Array(buf, 0, n);
                                                                const ids = new Uint16Array(buf, n * 4, n);

                                                                while ((cur.pos | 0) < n && ops < maxOps) {
                                                                    const k = cur.pos | 0;
                                                                    cur.pos = k + 1;

                                                                    const v = xy[k] >>> 0;
                                                                    const x = (v >>> 16) & 0xffff;
                                                                    const y = v & 0xffff;
                                                                    if (x >= (this.w | 0) || y >= (this.h | 0)) { ops++; continue; }

                                                                    const pack = ids[k] >>> 0;
                                                                    const expectOld = pack & 255;
                                                                    const newId = (pack >>> 8) & 255;

                                                                    const col = getCol ? getCol(x) : (world.tiles ? world.tiles[x] : null);
                                                                    if (!col) { ops++; continue; }
                                                                    const oldMain = col[y] | 0;
                                                                    if (oldMain !== expectOld) { ops++; continue; }

                                                                    col[y] = newId;
                                                                    any = true;

                                                                    try { renderer && renderer.invalidateTile && renderer.invalidateTile(x, y); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                                    if (BL) {
                                                                        const blOld = BL[expectOld] | 0;
                                                                        const blNew = BL[newId] | 0;
                                                                        if (blOld !== blNew && lightSeeds.length < maxLightSeeds) lightSeeds.push([x, y]);
                                                                    }

                                                                    this._minimapDirty = true;
                                                                    ops++;
                                                                }

                                                                if ((cur.pos | 0) >= n) {
                                                                    this.pending.shift();
                                                                    // recycle packed buffer back to worker
                                                                    const rbuf = cur.buf;
                                                                    if (rbuf && this.worker && typeof this.worker.postMessage === 'function') {
                                                                        try { this.worker.postMessage({ type: 'recycle', buf: rbuf }, [rbuf]); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                    }
                                                                    if (pool && pool.freePending) try { pool.freePending(cur); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                } else {
                                                                    break;
                                                                }
                                                            } else {
                                                                // Non-packed: delegate to original apply for this timeslice (keeps semantics & recycling)
                                                                _origApply.call(this, deadline);
                                                                break;
                                                            }
                                                        }

                                                        if (any) {
                                                            if (lightSeeds.length && game && game._deferLightUpdate) {
                                                                for (let i = 0; i < lightSeeds.length; i++) {
                                                                    const p = lightSeeds[i];
                                                                    try { game._deferLightUpdate(p[0], p[1]); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                }
                                                            }

                                                            const now = performance.now();
                                                            if (this._minimapDirty && (now - this._lastMinimapFlush > 600)) {
                                                                this._minimapDirty = false;
                                                                this._lastMinimapFlush = now;
                                                                try { game._deferMinimapUpdate && game._deferMinimapUpdate(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            }
                                                        }

                                                        if (this.pending.length) this._scheduleApply();
                                                    };
                                                }
                                            }
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                })();
