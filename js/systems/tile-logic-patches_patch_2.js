// Module: tile-logic-patches_patch_2
// Source: lines 22817-23465 of original file
// Category: systems
// ═══════════════════════════════════════════════════════════

(() => {
                                    'use strict';
                                    const TU = window.TU = window.TU || {};

                                    // ------------------------------------------------------------
                                    // Lightweight Profiler (default OFF)
                                    // ------------------------------------------------------------
                                    const Profiler = TU.Profiler = TU.Profiler || (function () {
                                        const P = {
                                            enabled: false,
                                            frame: 0,
                                            _lastUI: 0,
                                            _uiInterval: 250, // ms
                                            _now: (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now(),
                                            _m: Object.create(null),
                                            _c: Object.create(null),
                                            _extra: Object.create(null),
                                            ui: null,

                                            beginFrame() {
                                                this.frame = (this.frame + 1) | 0;
                                                this._m.renderWorld = 0;
                                                this._m.updateLight = 0;
                                                this._m.workerApply = 0;
                                                this._c.renderWorld = 0;
                                                this._c.updateLight = 0;
                                                this._c.workerApply = 0;
                                                this._extra.workerChanges = 0;
                                            },

                                            add(name, dt, countInc = 1, extraKey = null, extraVal = 0) {
                                                if (!this.enabled) return;
                                                this._m[name] = (this._m[name] || 0) + dt;
                                                this._c[name] = (this._c[name] || 0) + countInc;
                                                if (extraKey) this._extra[extraKey] = (this._extra[extraKey] || 0) + extraVal;
                                            },

                                            ensureUI() {
                                                if (this.ui) return this.ui;
                                                const div = document.createElement('div');
                                                div.id = 'tu-profiler';
                                                div.style.cssText = [
                                                    'position:fixed',
                                                    'left:8px',
                                                    'top:8px',
                                                    'z-index:9999',
                                                    'padding:6px 8px',
                                                    'background:rgba(0,0,0,0.55)',
                                                    'color:#e8f0ff',
                                                    'font:12px/1.25 ui-monospace,Menlo,Consolas,monospace',
                                                    'border:1px solid rgba(255,255,255,0.18)',
                                                    'border-radius:6px',
                                                    'pointer-events:none',
                                                    'white-space:pre',
                                                    'image-rendering:pixelated'
                                                ].join(';');
                                                div.textContent = 'Profiler ON';
                                                document.body.appendChild(div);
                                                this.ui = div;
                                                return div;
                                            },

                                            setEnabled(v) {
                                                this.enabled = !!v;
                                                try {
                                                    if (this.enabled) this.ensureUI().style.display = 'block';
                                                    else if (this.ui) this.ui.style.display = 'none';
                                                    try { localStorage.setItem('tu_profiler_enabled', this.enabled ? '1' : '0'); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                            },

                                            toggle() { this.setEnabled(!this.enabled); },

                                            updateUI(game) {
                                                if (!this.enabled) return;
                                                const now = this._now();
                                                if (now - this._lastUI < this._uiInterval) return;
                                                this._lastUI = now;

                                                const fps = game && game.fps ? game.fps : 0;
                                                const rw = this._m.renderWorld || 0;
                                                const ul = this._m.updateLight || 0;
                                                const wa = this._m.workerApply || 0;

                                                const c_rw = this._c.renderWorld || 0;
                                                const c_ul = this._c.updateLight || 0;
                                                const c_wa = this._c.workerApply || 0;

                                                const ch = this._extra.workerChanges || 0;

                                                const text =
                                                    'TU Profiler (toggle: F3)\n' +
                                                    'FPS: ' + fps.toFixed(1) + '\n' +
                                                    'renderWorld: ' + rw.toFixed(2) + 'ms (' + c_rw + ')\n' +
                                                    'updateLight: ' + ul.toFixed(2) + 'ms (' + c_ul + ')\n' +
                                                    'workerApply: ' + wa.toFixed(2) + 'ms (' + c_wa + ') chg:' + ch + '\n';

                                                this.ensureUI().textContent = text;
                                            }
                                        };

                                        try { P.enabled = (localStorage.getItem('tu_profiler_enabled') === '1'); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                        return P;
                                    })();

                                    // Key toggle (F3)
                                    try {
                                        window.addEventListener('keydown', (e) => {
                                            if (e.key === 'F3') {
                                                e.preventDefault();
                                                Profiler.toggle();
                                            }
                                        }, { passive: false });
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                    // ------------------------------------------------------------
                                    // World buffers: tiles/light/walls -> flat TypedArray + subarray views
                                    // ------------------------------------------------------------
                                    function flatifyColumns(cols, w, h, ctor) {
                                        if (!cols || !cols.length || !w || !h) return null;
                                        if (cols.__tu_flat && cols.__tu_flat.buf) return cols.__tu_flat;

                                        const flat = new ctor(w * h);
                                        for (let x = 0; x < w; x++) flat.set(cols[x], x * h);

                                        const views = new Array(w);
                                        for (let x = 0; x < w; x++) views[x] = flat.subarray(x * h, (x + 1) * h);

                                        views.__tu_flat = { buf: flat, views, w, h };
                                        return { buf: flat, views, w, h };
                                    }

                                    TU.flatifyWorld = TU.flatifyWorld || function (world) {
                                        try {
                                            if (!world || !world.w || !world.h) return false;
                                            if (world.__tu_flatified) return true;
                                            const w = world.w | 0, h = world.h | 0;

                                            if (world.tiles && Array.isArray(world.tiles) && world.tiles.length === w) {
                                                const t = flatifyColumns(world.tiles, w, h, Uint8Array);
                                                if (t) { world.tilesFlat = t.buf; world.tiles = t.views; }
                                            }
                                            if (world.light && Array.isArray(world.light) && world.light.length === w) {
                                                const l = flatifyColumns(world.light, w, h, Uint8Array);
                                                if (l) { world.lightFlat = l.buf; world.light = l.views; }
                                            }
                                            if (world.walls && Array.isArray(world.walls) && world.walls.length === w) {
                                                const wa = flatifyColumns(world.walls, w, h, Uint8Array);
                                                if (wa) { world.wallsFlat = wa.buf; world.walls = wa.views; }
                                            }

                                            world.__tu_flatified = true;
                                            return true;
                                        } catch (e) {
                                            try { console.warn('[tu_perf_pack] flatifyWorld failed', e); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                            return false;
                                        }
                                    };

                                    // Wrap WorldGenerator.generate to flatify at world creation
                                    try {
                                        if (typeof WorldGenerator !== 'undefined' && WorldGenerator && WorldGenerator.prototype && typeof WorldGenerator.prototype.generate === 'function') {
                                            const _origGen = WorldGenerator.prototype.generate;
                                            if (!WorldGenerator.prototype.__tu_perfPackGenWrapped) {
                                                WorldGenerator.prototype.__tu_perfPackGenWrapped = true;
                                                WorldGenerator.prototype.generate = async function (progress) {
                                                    const data = await _origGen.call(this, progress);
                                                    try { TU.flatifyWorld(data); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    return data;
                                                };
                                            }
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                    // ------------------------------------------------------------
                                    // Renderer: reduce per-tile Canvas API cost (glow + dark mask)
                                    // ------------------------------------------------------------
                                    function ensureTexArray(renderer) {
                                        try {
                                            const map = renderer && renderer.textures;
                                            if (!map || typeof map.get !== 'function') return null;
                                            if (renderer.__tu_texArr && renderer.__tu_texArrMap === map) return renderer.__tu_texArr;

                                            const arr = renderer.__tu_texArr || (renderer.__tu_texArr = new Array(256));
                                            for (let i = 0; i < 256; i++) arr[i] = null;
                                            try { map.forEach((v, k) => { arr[k & 255] = v; }); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                            renderer.__tu_texArrMap = map;
                                            return arr;
                                        } catch (_) { return null; }
                                    }

                                    function getBucketState(renderer) {
                                        let st = renderer.__tu_tileBuckets;
                                        if (st) return st;
                                        st = renderer.__tu_tileBuckets = {
                                            glowKeys: [],
                                            glowLists: new Array(256),
                                            darkKeys: [],
                                            darkLists: new Array(256),
                                            reset() {
                                                for (let i = 0; i < this.glowKeys.length; i++) this.glowLists[this.glowKeys[i]].length = 0;
                                                for (let i = 0; i < this.darkKeys.length; i++) this.darkLists[this.darkKeys[i]].length = 0;
                                                this.glowKeys.length = 0;
                                                this.darkKeys.length = 0;
                                            }
                                        };
                                        for (let i = 0; i < 256; i++) { st.glowLists[i] = []; st.darkLists[i] = []; }
                                        return st;
                                    }

                                    function packPos(px, py) { return ((px & 0xffff) << 16) | (py & 0xffff); }
                                    function unpackX(p) { return (p >> 16) & 0xffff; }
                                    function unpackY(p) { return p & 0xffff; }

                                    try {
                                        if (typeof Renderer !== 'undefined' && Renderer && Renderer.prototype && typeof Renderer.prototype.renderWorld === 'function') {
                                            const _baseRenderWorld = Renderer.prototype.renderWorld;
                                            if (!Renderer.prototype.__tu_perfPackRenderWrapped) {
                                                Renderer.prototype.__tu_perfPackRenderWrapped = true;

                                                Renderer.prototype.renderWorld = function (world, cam, time) {
                                                    if (this.__tu_disablePerfPackRender) return _baseRenderWorld.call(this, world, cam, time);
                                                    const doProf = Profiler.enabled;
                                                    const t0 = doProf ? (performance.now ? performance.now() : Date.now()) : 0;

                                                    try {
                                                        if (!world || !world.tiles || !world.light || !this.textures || !window.BLOCK_LIGHT || !window.CONFIG) {
                                                            return _baseRenderWorld.call(this, world, cam, time);
                                                        }
                                                        if (this.__disableChunkBatching) return _baseRenderWorld.call(this, world, cam, time);

                                                        const ctx = this.ctx;
                                                        const ts = CONFIG.TILE_SIZE;

                                                        let startX = ((cam.x / ts) | 0) - 1;
                                                        let startY = ((cam.y / ts) | 0) - 1;
                                                        let endX = startX + ((this.w / ts) | 0) + 3;
                                                        let endY = startY + ((this.h / ts) | 0) + 3;

                                                        if (startX < 0) startX = 0;
                                                        if (startY < 0) startY = 0;
                                                        if (endX >= world.w) endX = world.w - 1;
                                                        if (endY >= world.h) endY = world.h - 1;

                                                        const camCeilX = Math.ceil(cam.x);
                                                        const camCeilY = Math.ceil(cam.y);

                                                        const lut = window.BLOCK_LIGHT_LUT;
                                                        if (!lut || lut.length < 16) return _baseRenderWorld.call(this, world, cam, time);

                                                        ctx.globalCompositeOperation = 'source-over';
                                                        ctx.globalAlpha = 1;
                                                        ctx.shadowBlur = 0;

                                                        // Draw chunks using existing cache
                                                        const cfg = this.__cb2_cfg || { tiles: 16 };
                                                        const cts = (cfg.tiles | 0) || 16;

                                                        const cx0 = (startX / cts) | 0;
                                                        const cy0 = (startY / cts) | 0;
                                                        const cx1 = (endX / cts) | 0;
                                                        const cy1 = (endY / cts) | 0;

                                                        for (let cx = cx0; cx <= cx1; cx++) {
                                                            for (let cy = cy0; cy <= cy1; cy++) {
                                                                const entry = this.__cb2_getEntry ? this.__cb2_getEntry(world, cx, cy) : null;
                                                                if (!entry || !entry.canvas) continue;
                                                                ctx.drawImage(entry.canvas, cx * cts * ts - camCeilX, cy * cts * ts - camCeilY);
                                                            }
                                                        }

                                                        // Bucket tiles
                                                        const tilesCols = world.tiles;
                                                        const lightCols = world.light;
                                                        const tilesFlat = world.tilesFlat;
                                                        const lightFlat = world.lightFlat;

                                                        const BL = window.BLOCK_LIGHT;
                                                        const BC = window.BLOCK_COLOR || null;
                                                        const AIR = (window.BLOCK && window.BLOCK.AIR !== undefined) ? window.BLOCK.AIR : 0;

                                                        const bucket = getBucketState(this);
                                                        bucket.reset();

                                                        const texArr = ensureTexArray(this);
                                                        const H = world.h | 0;

                                                        if (tilesFlat && lightFlat && tilesFlat.length === (world.w * world.h)) {
                                                            for (let x = startX; x <= endX; x++) {
                                                                const base = x * H;
                                                                for (let y = startY; y <= endY; y++) {
                                                                    const idx = base + y;
                                                                    const block = tilesFlat[idx] | 0;
                                                                    if (block === AIR) continue;

                                                                    const px = x * ts - camCeilX;
                                                                    const py = y * ts - camCeilY;

                                                                    const bl = BL[block] | 0;
                                                                    if (bl > 5) {
                                                                        const list = bucket.glowLists[block];
                                                                        if (list.length === 0) bucket.glowKeys.push(block);
                                                                        list.push(packPos(px, py));
                                                                    }

                                                                    const lv = lightFlat[idx] & 255;
                                                                    const a = lut[lv];
                                                                    if (a) {
                                                                        const dl = bucket.darkLists[lv];
                                                                        if (dl.length === 0) bucket.darkKeys.push(lv);
                                                                        dl.push(packPos(px, py));
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            for (let x = startX; x <= endX; x++) {
                                                                const colT = tilesCols[x];
                                                                const colL = lightCols[x];
                                                                for (let y = startY; y <= endY; y++) {
                                                                    const block = colT[y] | 0;
                                                                    if (block === AIR) continue;

                                                                    const px = x * ts - camCeilX;
                                                                    const py = y * ts - camCeilY;

                                                                    const bl = BL[block] | 0;
                                                                    if (bl > 5) {
                                                                        const list = bucket.glowLists[block];
                                                                        if (list.length === 0) bucket.glowKeys.push(block);
                                                                        list.push(packPos(px, py));
                                                                    }

                                                                    const lv = colL[y] & 255;
                                                                    const a = lut[lv];
                                                                    if (a) {
                                                                        const dl = bucket.darkLists[lv];
                                                                        if (dl.length === 0) bucket.darkKeys.push(lv);
                                                                        dl.push(packPos(px, py));
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        // Draw glow tiles grouped by block
                                                        if (bucket.glowKeys.length) {
                                                            const enableGlow = !!this.enableGlow;
                                                            for (let ki = 0; ki < bucket.glowKeys.length; ki++) {
                                                                const blockId = bucket.glowKeys[ki] | 0;
                                                                const list = bucket.glowLists[blockId];
                                                                if (!list || !list.length) continue;

                                                                const tex = texArr ? texArr[blockId] : this.textures.get(blockId);
                                                                if (!tex) continue;

                                                                const bl = BL[blockId] | 0;

                                                                if (enableGlow) {
                                                                    ctx.shadowColor = (BC && BC[blockId]) ? BC[blockId] : '#fff';
                                                                    ctx.shadowBlur = bl * 2;
                                                                } else {
                                                                    ctx.shadowBlur = 0;
                                                                }

                                                                for (let i = 0; i < list.length; i++) {
                                                                    const p = list[i] | 0;
                                                                    ctx.drawImage(tex, unpackX(p), unpackY(p));
                                                                }
                                                            }
                                                            ctx.shadowBlur = 0;
                                                        }

                                                        // Draw dark mask grouped by light value (one fill per bucket)
                                                        if (bucket.darkKeys.length) {
                                                            ctx.fillStyle = '#000';
                                                            bucket.darkKeys.sort((a, b) => a - b);
                                                            for (let ki = 0; ki < bucket.darkKeys.length; ki++) {
                                                                const lv = bucket.darkKeys[ki] & 255;
                                                                const a = lut[lv];
                                                                if (!a) continue;
                                                                const list = bucket.darkLists[lv];
                                                                if (!list || !list.length) continue;

                                                                ctx.globalAlpha = a;
                                                                ctx.beginPath();
                                                                for (let i = 0; i < list.length; i++) {
                                                                    const p = list[i] | 0;
                                                                    ctx.rect(unpackX(p), unpackY(p), ts, ts);
                                                                }
                                                                ctx.fill();
                                                            }
                                                            ctx.globalAlpha = 1;
                                                        }

                                                    } catch (e) {
                                                        this.__tu_disablePerfPackRender = true;
                                                        try { console.warn('[tu_perf_pack] renderWorld patch disabled:', e); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        return _baseRenderWorld.call(this, world, cam, time);
                                                    } finally {
                                                        if (doProf) {
                                                            const t1 = (performance.now ? performance.now() : Date.now());
                                                            Profiler.add('renderWorld', t1 - t0, 1);
                                                        }
                                                    }
                                                };
                                            }
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                    // ------------------------------------------------------------
                                    // TileLogicEngine worker: diff buffer reuse + recycle
                                    // ------------------------------------------------------------
                                    function patchWorkerSource() {
                                        try {
                                            if (typeof TileLogicEngine === 'undefined' || !TileLogicEngine) return false;
                                            if (TileLogicEngine.__tu_perfPackWorkerSource) return true;

                                            const orig = TileLogicEngine._workerSource;
                                            if (typeof orig !== 'function') return false;

                                            const inject = `

  // __TU_OUT_POOL__: preallocated out buffers (recycled by main thread)
  const __TU_OUT_POOL__ = [];
  let __tuOutView = null;
  let __tuOutLen = 0;

  function __tuAllocOut(minInts) {
    minInts = (minInts|0) || 1024;
    for (let i = __TU_OUT_POOL__.length - 1; i >= 0; i--) {
      const buf = __TU_OUT_POOL__[i];
      if (buf && buf.byteLength >= (minInts << 2)) {
        __TU_OUT_POOL__.splice(i, 1);
        return buf;
      }
    }
    return new ArrayBuffer(minInts << 2);
  }

  function __tuEnsureOut(extraInts) {
    if (!__tuOutView) {
      __tuOutView = new Int32Array(__tuAllocOut(2048));
      __tuOutLen = 0;
      return;
    }
    if ((__tuOutLen + extraInts) <= __tuOutView.length) return;

    // grow: allocate bigger, copy, recycle old
    const need = (__tuOutLen + extraInts) | 0;
    let next = __tuOutView.length << 1;
    while (next < need) next = next << 1;
    const nb = __tuAllocOut(next);
    const nv = new Int32Array(nb);
    nv.set(__tuOutView.subarray(0, __tuOutLen));
    try { __TU_OUT_POOL__.push(__tuOutView.buffer); } catch(_) { /* silently ignore */ }
    __tuOutView = nv;
  }

  const __tuChanges = {
    length: 0,
    reset() {
      __tuEnsureOut(0);
      __tuOutLen = 0;
      this.length = 0;
    },
    push(i, oldId, newId) {
      __tuEnsureOut(3);
      __tuOutView[__tuOutLen++] = i|0;
      __tuOutView[__tuOutLen++] = oldId|0;
      __tuOutView[__tuOutLen++] = newId|0;
      this.length = __tuOutLen;
    }
  };
`;

                                            TileLogicEngine._workerSource = function () {
                                                let s = orig.call(TileLogicEngine);
                                                if (!s || s.indexOf("const changes = [];") === -1 || s.indexOf("postMessage({ type: 'changes'") === -1) return s;
                                                if (s.indexOf('__TU_OUT_POOL__') !== -1) return s;

                                                const injectKey = "let AIR = 0, WATER = 27;";
                                                if (s.indexOf(injectKey) === -1) return s;

                                                s = s.replace(injectKey, injectKey + inject);

                                                s = s.replace(/function step\(\)\s*\{\s*\n\s*const changes = \[\];/m,
                                                    "function step() {\n    __tuChanges.reset();\n    const changes = __tuChanges;"
                                                );

                                                s = s.replace(/if\s*\(changes\.length\)\s*\{\s*\n\s*const buf = new Int32Array\(changes\);\s*\n\s*postMessage\(\{ type: 'changes', buf: buf\.buffer \}, \[buf\.buffer\]\);\s*\n\s*\}/m,
                                                    "if (changes.length) {\n      const len = changes.length|0;\n      const buf = __tuOutView.buffer;\n      postMessage({ type: 'changes', buf: buf, len: len }, [buf]);\n      __tuOutView = null;\n      __tuOutLen = 0;\n      __tuChanges.length = 0;\n    }"
                                                );

                                                s = s.replace(/switch\s*\(m\.type\)\s*\{\s*/m,
                                                    (m) => m + "\n      case 'recycle': {\n        if (m.buf) {\n          try { __TU_OUT_POOL__.push(m.buf); } catch(_) { /* silently ignore */ }\n        }\n        break;\n      }\n"
                                                );

                                                return s;
                                            };

                                            TileLogicEngine.__tu_perfPackWorkerSource = true;
                                            return true;
                                        } catch (e) {
                                            try { console.warn('[tu_perf_pack] patchWorkerSource failed', e); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                            return false;
                                        }
                                    }

                                    patchWorkerSource();

                                    try {
                                        if (typeof TileLogicEngine !== 'undefined' && TileLogicEngine && TileLogicEngine.prototype) {

                                            if (typeof TileLogicEngine.prototype._flattenTiles === 'function' && !TileLogicEngine.prototype.__tu_perfPackFlattenWrapped) {
                                                TileLogicEngine.prototype.__tu_perfPackFlattenWrapped = true;
                                                const _origFlat = TileLogicEngine.prototype._flattenTiles;
                                                TileLogicEngine.prototype._flattenTiles = function () {
                                                    try {
                                                        const w = this.world;
                                                        if (w && w.tilesFlat && w.tilesFlat.length === (this.w * this.h)) {
                                                            return new Uint8Array(w.tilesFlat);
                                                        }
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    return _origFlat.call(this);
                                                };
                                            }

                                            if (typeof TileLogicEngine.prototype._initWorker === 'function' && !TileLogicEngine.prototype.__tu_perfPackInitWrapped) {
                                                TileLogicEngine.prototype.__tu_perfPackInitWrapped = true;
                                                const _origInit = TileLogicEngine.prototype._initWorker;
                                                TileLogicEngine.prototype._initWorker = function () {
                                                    _origInit.call(this);

                                                    try {
                                                        if (!this.worker || this.__tu_perfPackOnMsgWrapped) return;
                                                        this.__tu_perfPackOnMsgWrapped = true;

                                                        const self = this;
                                                        const w = this.worker;

                                                        const pendingPool = [];
                                                        function allocPending(arr) {
                                                            const o = pendingPool.pop() || { arr: null, pos: 0 };
                                                            o.arr = arr; o.pos = 0;
                                                            return o;
                                                        }
                                                        function freePending(o) {
                                                            o.arr = null; o.pos = 0;
                                                            pendingPool.push(o);
                                                        }
                                                        self.__tu_pendingPool = { allocPending, freePending };

                                                        w.onmessage = (e) => {
                                                            const msg = e.data;
                                                            if (!msg || !msg.type) return;
                                                            if (msg.type === 'changes' && msg.buf) {
                                                                try {
                                                                    const len = (msg.len | 0) > 0 ? (msg.len | 0) : 0;
                                                                    const arr = len ? new Int32Array(msg.buf, 0, len) : new Int32Array(msg.buf);
                                                                    self.pending.push(allocPending(arr));
                                                                    self._scheduleApply();
                                                                } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            }
                                                        };
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                };
                                            }

                                            if (typeof TileLogicEngine.prototype._applyPending === 'function' && !TileLogicEngine.prototype.__tu_perfPackApplyWrapped) {
                                                TileLogicEngine.prototype.__tu_perfPackApplyWrapped = true;
                                                const _origApply = TileLogicEngine.prototype._applyPending;

                                                function pendingRemaining(pending) {
                                                    let rem = 0;
                                                    for (let i = 0; i < pending.length; i++) {
                                                        const it = pending[i];
                                                        if (!it || !it.arr) continue;
                                                        rem += (it.arr.length - (it.pos | 0));
                                                    }
                                                    return rem;
                                                }

                                                TileLogicEngine.prototype._applyPending = function (deadline) {
                                                    const doProf = Profiler.enabled;
                                                    const before = doProf ? pendingRemaining(this.pending) : 0;
                                                    const t0 = doProf ? (performance.now ? performance.now() : Date.now()) : 0;

                                                    _origApply.call(this, deadline);

                                                    try {
                                                        while (this.pending.length && this.pending[0] && this.pending[0].arr && (this.pending[0].pos >= this.pending[0].arr.length)) {
                                                            const done = this.pending.shift();
                                                            const buf = done && done.arr && done.arr.buffer;
                                                            if (buf && this.worker && typeof this.worker.postMessage === 'function') {
                                                                try { this.worker.postMessage({ type: 'recycle', buf: buf }, [buf]); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            }
                                                            try {
                                                                const pool = this.__tu_pendingPool;
                                                                if (pool && pool.freePending) pool.freePending(done);
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        }
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                    if (doProf) {
                                                        const t1 = (performance.now ? performance.now() : Date.now());
                                                        const after = pendingRemaining(this.pending);
                                                        const processedElems = (before - after) | 0;
                                                        const changes = processedElems > 0 ? ((processedElems / 3) | 0) : 0;
                                                        Profiler.add('workerApply', t1 - t0, 1, 'workerChanges', changes);
                                                    }
                                                };
                                            }
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                    // ------------------------------------------------------------
                                    // Profile hooks: Game.loop + Game._updateLight
                                    // ------------------------------------------------------------
                                    try {
                                        if (typeof Game !== 'undefined' && Game && Game.prototype) {
                                            if (typeof Game.prototype.loop === 'function' && !Game.prototype.__tu_profLoopWrapped) {
                                                Game.prototype.__tu_profLoopWrapped = true;
                                                const _origLoop = Game.prototype.loop;
                                                Game.prototype.loop = function (timestamp) {
                                                    if (Profiler.enabled) Profiler.beginFrame();
                                                    const r = _origLoop.call(this, timestamp);
                                                    if (Profiler.enabled) Profiler.updateUI(this);
                                                    return r;
                                                };
                                            }

                                            if (typeof Game.prototype._updateLight === 'function' && !Game.prototype.__tu_profUpdateLightWrapped) {
                                                Game.prototype.__tu_profUpdateLightWrapped = true;
                                                const _origUL = Game.prototype._updateLight;
                                                Game.prototype._updateLight = function (x, y) {
                                                    if (!Profiler.enabled) return _origUL.call(this, x, y);
                                                    const t0 = performance.now ? performance.now() : Date.now();
                                                    try { return _origUL.call(this, x, y); }
                                                    finally {
                                                        const t1 = performance.now ? performance.now() : Date.now();
                                                        Profiler.add('updateLight', t1 - t0, 1);
                                                    }
                                                };
                                            }
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                })();
