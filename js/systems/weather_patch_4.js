// Module: weather_patch_4
// Source: lines 21228-21799 of original file
// Category: systems
// ═══════════════════════════════════════════════════════════

(() => {
                                    const TU = window.TU || {};
                                    (function () {
                                        const __p = ({
                                            id: 'tu_acid_rain_hazard_v1',
                                            order: 100,
                                            description: "酸雨危害机制（v1）",
                                            apply: () => {
                                                'use strict';
                                                if (window.__TU_ACID_RAIN_HAZARD_V1__) return;
                                                window.__TU_ACID_RAIN_HAZARD_V1__ = true;

                                                const TU = window.TU || {};
                                                const Game = TU.Game;
                                                const Player = TU.Player;
                                                const UIManager = TU.UIManager;
                                                const WeatherCanvasFX = TU.WeatherCanvasFX;

                                                if (!Game || !Game.prototype) return;

                                                const ACID_CHANCE = 0.30;          // 30% chance when rain starts
                                                const ACID_MIN_INTENSITY = 0.06;   // below this, no damage / no strong effects
                                                const SHELTER_CHECK_MS = 120;      // shelter raycast throttling
                                                const DMG_INTERVAL_MIN = 250;      // ms
                                                const DMG_INTERVAL_MAX = 1050;     // ms

                                                // ───────────────────────── CSS & overlay element ─────────────────────────
                                                function ensureStyle() {
                                                    try {
                                                        if (document.getElementById('tu-acid-rain-style')) return;
                                                        const st = document.createElement('style');
                                                        st.id = 'tu-acid-rain-style';
                                                        st.textContent = `
              /* Acid rain damage flash overlay */
              #damage-flash{
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: 80; /* above weatherfx (55), below UI (100) */
                opacity: 0;
                background: radial-gradient(circle at 50% 45%,
                  rgba(255, 90, 90, 0.22),
                  rgba(0, 0, 0, 0)
                );
                mix-blend-mode: screen;
              }
              #damage-flash.acid{
                background: radial-gradient(circle at 50% 45%,
                  rgba(0, 255, 140, 0.20),
                  rgba(0, 0, 0, 0)
                );
              }
              #damage-flash.flash{
                animation: tuDamageFlash 0.28s ease-out 1;
              }
              @keyframes tuDamageFlash{
                0%{ opacity: 0; }
                28%{ opacity: 1; }
                100%{ opacity: 0; }
              }

              /* Health bar feedback when taking damage */
              .stat-bar.hurt-acid{
                animation: tuHurtShake 0.28s ease-out 1;
                border-color: rgba(0, 255, 140, 0.55) !important;
                box-shadow: 0 0 0 2px rgba(0, 255, 140, 0.25), var(--shadow);
              }
              .stat-bar.hurt-acid .fill{
                filter: brightness(1.25) saturate(1.35);
              }
              @keyframes tuHurtShake{
                0%{ transform: translateX(0) scale(1); }
                25%{ transform: translateX(-2px) scale(1.06); }
                55%{ transform: translateX(2px) scale(1.04); }
                100%{ transform: translateX(0) scale(1); }
              }
            `;
                                                        document.head && document.head.appendChild(st);
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                }

                                                function ensureDamageFlashEl() {
                                                    try {
                                                        let el = document.getElementById('damage-flash');
                                                        if (el) return el;
                                                        el = document.createElement('div');
                                                        el.id = 'damage-flash';
                                                        document.body && document.body.appendChild(el);
                                                        return el;
                                                    } catch (_) {
                                                        return null;
                                                    }
                                                }

                                                ensureStyle();
                                                const damageFlashEl = ensureDamageFlashEl();

                                                // ───────────────────────── UI: flash damage feedback ─────────────────────────
                                                if (UIManager && UIManager.prototype && !UIManager.prototype.flashDamage) {
                                                    UIManager.prototype.flashDamage = function (kind) {
                                                        try {
                                                            const isAcid = (kind === 'acid' || kind === 'acidRain');
                                                            const bar = this.healthFillEl && this.healthFillEl.closest ? this.healthFillEl.closest('.stat-bar') : null;
                                                            if (bar) {
                                                                // restart animation
                                                                bar.classList.remove('hurt-acid');
                                                                if (isAcid) {
                                                                    // force reflow once (only on damage, not per-frame)
                                                                    void bar.offsetWidth;
                                                                    bar.classList.add('hurt-acid');
                                                                }
                                                            }
                                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    };
                                                }

                                                // ───────────────────────── Player: simple hurt flash (render overlay) ─────────────────────────
                                                if (Player && Player.prototype && !Player.prototype.__tuAcidRainHurtFlash) {
                                                    Player.prototype.__tuAcidRainHurtFlash = true;

                                                    const _update = Player.prototype.update;
                                                    if (typeof _update === 'function') {
                                                        Player.prototype.update = function (input, world, dt) {
                                                            // 防御性参数检查
                                                            if (!world) {
                                                                console.warn('[Player.update] World not provided');
                                                                return;
                                                            }
                                                            if (typeof dt !== 'number' || dt <= 0) {
                                                                console.warn(`[Player.update] Invalid dt: ${dt}`);
                                                                dt = 16.67;
                                                            }

                                                            _update.call(this, input, world, dt);
                                                            const d = Math.min(50, Math.max(0, Number(dt) || 0));
                                                            if (this._hurtFlashMs > 0) {
                                                                this._hurtFlashMs = Math.max(0, this._hurtFlashMs - d);
                                                            }
                                                        };
                                                    }

                                                    const _render = Player.prototype.render;
                                                    if (typeof _render === 'function') {
                                                        Player.prototype.render = function (ctx, cam) {
                                                            _render.call(this, ctx, cam);
                                                            const ms = Number(this._hurtFlashMs) || 0;
                                                            if (ms <= 0 || !ctx || !cam) return;

                                                            const t = Math.min(1, ms / 240);
                                                            const sx = Math.floor(this.x - cam.x);
                                                            const sy = Math.floor(this.y - cam.y);

                                                            ctx.save();
                                                            try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            ctx.globalAlpha = 0.28 * t;
                                                            ctx.globalCompositeOperation = 'screen';
                                                            ctx.fillStyle = (this._hurtKind === 'acid') ? 'rgba(0,255,140,0.75)' : 'rgba(255,90,90,0.75)';
                                                            // slightly larger than hitbox for visibility
                                                            ctx.fillRect(sx - 2, sy - 2, (this.w | 0) + 4, (this.h | 0) + 4);
                                                            ctx.globalAlpha = 1;
                                                            ctx.globalCompositeOperation = 'source-over';
                                                            ctx.restore();
                                                        };
                                                    }
                                                }

                                                // ───────────────────────── WeatherCanvasFX: green rain variant when acid ─────────────────────────
                                                if (WeatherCanvasFX && WeatherCanvasFX.prototype && !WeatherCanvasFX.prototype.__tuAcidRainGreen) {
                                                    WeatherCanvasFX.prototype.__tuAcidRainGreen = true;

                                                    // Helper: robust ctx getter (some browsers dislike passing options)
                                                    function get2dCtx(canvas) {
                                                        if (!canvas || !canvas.getContext) return null;
                                                        try { return canvas.getContext('2d', { alpha: true }) || canvas.getContext('2d', { willReadFrequently: true }); } catch (e) {
                                                            try { return canvas.getContext('2d', { willReadFrequently: true }); } catch (_) { return null; }
                                                        }
                                                    }

                                                    // Ensure acid rain pattern cache slot exists
                                                    function acidSlot(self) {
                                                        if (!self._rainAcid) self._rainAcid = { tile: null, ctx: null, pattern: null, size: 0, ox: 0, oy: 0 };
                                                        return self._rainAcid;
                                                    }

                                                    // Invalidate acid cache on resize (pattern is ctx-bound)
                                                    const _resizeLike = WeatherCanvasFX.prototype.resizeLike;
                                                    if (typeof _resizeLike === 'function') {
                                                        WeatherCanvasFX.prototype.resizeLike = function (renderer) {
                                                            const oldW = this.canvas ? this.canvas.width : 0;
                                                            const oldH = this.canvas ? this.canvas.height : 0;
                                                            _resizeLike.call(this, renderer);
                                                            const nw = this.canvas ? this.canvas.width : 0;
                                                            const nh = this.canvas ? this.canvas.height : 0;
                                                            if (nw !== oldW || nh !== oldH) {
                                                                const s = acidSlot(this);
                                                                s.pattern = null; s.tile = null; s.size = 0; s.ox = 0; s.oy = 0;
                                                            }
                                                        };
                                                    }

                                                    // Build a green rain pattern (same performance profile as normal rain)
                                                    WeatherCanvasFX.prototype._ensureAcidRainPattern = function () {
                                                        // If the fixed patch installed _ensure2d, use it (it also restores ctx on old browsers)
                                                        if (typeof this._ensure2d === 'function') {
                                                            if (!this._ensure2d()) return;
                                                        }
                                                        const ctxOut = this.ctx;
                                                        if (!ctxOut) return;

                                                        const tile = (this._dpr > 1.25) ? 512 : 256;
                                                        const slot = acidSlot(this);
                                                        if (slot.pattern && slot.size === tile) return;

                                                        const mk = (typeof this._makeOffscreenCanvas === 'function')
                                                            ? (w, h) => this._makeOffscreenCanvas(w, h)
                                                            : (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

                                                        const c = mk(tile, tile);
                                                        const g = get2dCtx(c);
                                                        if (!g) return;

                                                        g.setTransform(1, 0, 0, 1, 0, 0);
                                                        g.clearRect(0, 0, tile, tile);

                                                        // Use deterministic RNG if available
                                                        const rand = (typeof this._rand01 === 'function') ? () => this._rand01() : () => Math.random();
                                                        const count = Math.max(220, (tile === 512 ? 420 : 260));

                                                        g.lineCap = 'round';

                                                        // Draw diagonal streaks with green gradient (one-time cost)
                                                        for (let i = 0; i < count; i++) {
                                                            const x = rand() * tile;
                                                            const y = rand() * tile;
                                                            const len = 18 + rand() * 46;
                                                            const lw = 0.55 + rand() * 0.95;

                                                            const ang = (Math.PI / 180) * (74 + rand() * 10);
                                                            const dx = Math.cos(ang) * len;
                                                            const dy = Math.sin(ang) * len;

                                                            const grad = g.createLinearGradient(x, y, x + dx, y + dy);
                                                            grad.addColorStop(0.00, 'rgba(0,255,140,0.00)');
                                                            grad.addColorStop(0.55, 'rgba(0,255,140,0.22)');
                                                            grad.addColorStop(1.00, 'rgba(0,255,140,0.85)');

                                                            g.strokeStyle = grad;
                                                            g.lineWidth = lw;
                                                            g.beginPath();
                                                            g.moveTo(x, y);
                                                            g.lineTo(x + dx, y + dy);
                                                            g.stroke();
                                                        }

                                                        let p = null;
                                                        try { p = ctxOut.createPattern(c, 'repeat'); } catch (_) { p = null; }
                                                        if (!p) return;

                                                        slot.tile = c;
                                                        slot.ctx = g;
                                                        slot.pattern = p;
                                                        slot.size = tile;
                                                        slot.ox = 0;
                                                        slot.oy = 0;
                                                    };

                                                    // Use acid pattern when the render wrapper marked it as acid rain
                                                    const _render = WeatherCanvasFX.prototype.render;
                                                    if (typeof _render === 'function') {
                                                        WeatherCanvasFX.prototype.render = function (weather, renderer) {
                                                            this._tuIsAcidRain = !!(weather && weather.acid);
                                                            return _render.call(this, weather, renderer);
                                                        };
                                                    }

                                                    // Override drawRain to optionally use acid pattern (no extra draw calls)
                                                    const _drawRain = WeatherCanvasFX.prototype.drawRain;
                                                    WeatherCanvasFX.prototype.drawRain = function (intensity, dtMs, isThunder) {
                                                        const useAcid = !!this._tuIsAcidRain;
                                                        if (!this.ctx) return;

                                                        if (useAcid) this._ensureAcidRainPattern();
                                                        else if (typeof this._ensureRainPattern === 'function') this._ensureRainPattern();

                                                        const rain = useAcid ? acidSlot(this) : this._rain;
                                                        if (!rain || !rain.pattern) {
                                                            // fallback to original if something went wrong
                                                            if (!useAcid && typeof _drawRain === 'function') return _drawRain.call(this, intensity, dtMs, isThunder);
                                                            return;
                                                        }

                                                        const ctx = this.ctx;
                                                        const w = this._wPx, h = this._hPx;
                                                        const tile = rain.size | 0;
                                                        if (!tile) return;

                                                        const it = Math.min(1, Math.max(0, Number(intensity) || 0));
                                                        const base = ((isThunder ? 1400 : 1100) * (this._dpr || 1));
                                                        const speed = base * (0.55 + 0.85 * it);

                                                        const dt = (Number(dtMs) || 0) / 1000;
                                                        rain.oy = (rain.oy + speed * dt) % tile;
                                                        rain.ox = (rain.ox + speed * 0.18 * dt) % tile;

                                                        const ox = rain.ox;
                                                        const oy = rain.oy;

                                                        const aBase = (0.10 + 0.28 * it) * (isThunder ? 1.10 : 1.0);

                                                        ctx.globalCompositeOperation = 'source-over';
                                                        ctx.fillStyle = rain.pattern;

                                                        // Far layer
                                                        ctx.globalAlpha = aBase * 0.55;
                                                        ctx.setTransform(1, 0, 0, 1, -ox * 0.65, -oy * 0.65);
                                                        ctx.fillRect(0, 0, w + tile, h + tile);

                                                        // Near layer
                                                        ctx.globalAlpha = aBase;
                                                        ctx.setTransform(1, 0, 0, 1, -ox, -oy);
                                                        ctx.fillRect(0, 0, w + tile, h + tile);

                                                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                                                        ctx.globalAlpha = 1;
                                                    };
                                                }

                                                // ───────────────────────── Weather logic: decide acid rain (30%) when rain starts ─────────────────────────
                                                if (!Game.prototype.__tuAcidRainWeatherLogic) {
                                                    Game.prototype.__tuAcidRainWeatherLogic = true;

                                                    const _updateWeather = Game.prototype._updateWeather;
                                                    if (typeof _updateWeather === 'function') {
                                                        Game.prototype._updateWeather = function (dtMs) {
                                                            _updateWeather.call(this, dtMs);

                                                            const w = this.weather;
                                                            if (!w) return;

                                                            const inRainDomain = (w.type === 'rain' || w.type === 'thunder');
                                                            const wasInRain = !!this._tuWasInRainDomain;

                                                            if (inRainDomain && !wasInRain) {
                                                                // New rain event => roll acid chance
                                                                let r = Math.random();
                                                                try {
                                                                    const rng = this._weatherRng;
                                                                    if (typeof rng === 'function') r = rng();
                                                                } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                                w.acid = (r < ACID_CHANCE);

                                                                if (w.acid) {
                                                                    try { if (typeof Toast !== 'undefined' && Toast && Toast.show) Toast.show('☣️ 酸雨降临！躲到遮挡物下避免伤害', 1800); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                                }
                                                            } else if (!inRainDomain) {
                                                                w.acid = false;
                                                            } else {
                                                                // staying in rain domain => keep previous
                                                                if (typeof w.acid !== 'boolean') w.acid = !!this._tuAcidWasOn;
                                                            }

                                                            this._tuWasInRainDomain = inRainDomain;
                                                            this._tuAcidWasOn = !!w.acid;

                                                            // Optional: let CSS react if you want (debug / future UI)
                                                            try { document.body && document.body.classList.toggle('weather-acid', inRainDomain && !!w.acid); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        };
                                                    }
                                                }

                                                // ───────────────────────── Acid rain damage (only if exposed to sky) ─────────────────────────
                                                function isSolid(blockId) {
                                                    try {
                                                        if (typeof BLOCK_SOLID !== 'undefined' && BLOCK_SOLID && BLOCK_SOLID[blockId]) return true;
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    try {
                                                        const bs = TU && TU.BLOCK_SOLID;
                                                        if (bs && bs[blockId]) return true;
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    return false;
                                                }

                                                // Blocks that count as "cover" even if not solid (platforms, leaves, etc.)
                                                const __TU_RAIN_COVER_IDS__ = (() => {
                                                    try {
                                                        if (typeof BLOCK !== 'undefined' && BLOCK) {
                                                            return new Set([
                                                                BLOCK.LEAVES, BLOCK.PALM_LEAVES, BLOCK.CHERRY_LEAVES, BLOCK.PINE_LEAVES,
                                                                BLOCK.LIVING_LEAF, BLOCK.MAHOGANY_LEAVES,
                                                                BLOCK.PLATFORMS_WOOD, BLOCK.PLATFORMS_STONE, BLOCK.PLATFORMS_METAL
                                                            ]);
                                                        }
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    return null;
                                                })();

                                                function blocksRain(id) {
                                                    if (isSolid(id)) return true;
                                                    const set = __TU_RAIN_COVER_IDS__;
                                                    if (set && set.has(id)) return true;

                                                    // Fallback: match by Chinese block name ("叶" / "平台")
                                                    try {
                                                        if (typeof BLOCK_META !== 'undefined' && BLOCK_META && BLOCK_META[id] && BLOCK_META[id].name) {
                                                            const n = BLOCK_META[id].name;
                                                            if (n.indexOf('叶') !== -1 || n.indexOf('平台') !== -1) return true;
                                                        }
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    return false;
                                                }

                                                function isShelteredFromRain(game) {
                                                    const world = game && game.world;
                                                    const p = game && game.player;
                                                    const ts = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.TILE_SIZE) ? CONFIG.TILE_SIZE : 16;
                                                    if (!world || !world.tiles || !p) return true;

                                                    const tiles = world.tiles;
                                                    const wW = world.w || tiles.length || 0;
                                                    if (wW <= 0) return true;

                                                    const AIR = (typeof BLOCK !== 'undefined' && BLOCK && typeof BLOCK.AIR !== 'undefined') ? BLOCK.AIR : 0;

                                                    const left = Math.floor(p.x / ts);
                                                    const right = Math.floor((p.x + p.w - 1) / ts);
                                                    const topY = Math.floor(p.y / ts) - 1;

                                                    if (topY <= 0) return false; // head is at/above top => exposed

                                                    // Rain can hit if ANY column above the player's width is open to sky
                                                    for (let tx = left; tx <= right; tx++) {
                                                        if (tx < 0 || tx >= wW) continue;
                                                        const col = tiles[tx];
                                                        if (!col) continue;

                                                        let blocked = false;
                                                        for (let ty = topY; ty >= 0; ty--) {
                                                            const id = col[ty];
                                                            if (id !== AIR && blocksRain(id)) { blocked = true; break; }
                                                        }
                                                        if (!blocked) return false;
                                                    }
                                                    return true;
                                                }

                                                function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

                                                function ensureFlash(game, kind) {
                                                    const el = (game && game._tuDamageFlashEl) || damageFlashEl || document.getElementById('damage-flash');
                                                    if (!el) return;
                                                    try {
                                                        if (game) game._tuDamageFlashEl = el;
                                                        el.classList.toggle('acid', kind === 'acid' || kind === 'acidRain');
                                                        el.classList.remove('flash');
                                                        void el.offsetWidth;
                                                        el.classList.add('flash');
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                }

                                                function applyDamage(game, amount, kind) {
                                                    const p = game && game.player;
                                                    if (!p) return;

                                                    const dmg = Math.max(0, amount | 0);
                                                    if (!dmg) return;

                                                    // Apply damage
                                                    p.health = Math.max(0, (p.health | 0) - dmg);

                                                    // Feedback (UI + flash + haptic)
                                                    p._hurtFlashMs = 240;
                                                    p._hurtKind = (kind === 'acidRain') ? 'acid' : (kind || 'acid');

                                                    try { if (game.ui && typeof game.ui.flashDamage === 'function') game.ui.flashDamage(p._hurtKind); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    ensureFlash(game, p._hurtKind);
                                                    try { if (typeof game._haptic === 'function') game._haptic(8); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                    // Death / respawn (simple)
                                                    if (p.health <= 0) {
                                                        try { if (typeof Toast !== 'undefined' && Toast && Toast.show) Toast.show('💀 你被酸雨腐蚀了…', 1500); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        p.health = p.maxHealth | 0;
                                                        if (game._tuSpawnPoint) {
                                                            p.x = game._tuSpawnPoint.x;
                                                            p.y = game._tuSpawnPoint.y;
                                                        }
                                                        p.vx = 0; p.vy = 0;
                                                    }
                                                }

                                                // Store spawn point after init
                                                if (!Game.prototype.__tuAcidRainSpawnPoint) {
                                                    Game.prototype.__tuAcidRainSpawnPoint = true;
                                                    const _init = Game.prototype.init;
                                                    if (typeof _init === 'function') {
                                                        Game.prototype.init = async function (...args) {
                                                            const r = await _init.apply(this, args);
                                                            try {
                                                                if (this.player && (this._tuSpawnPoint == null)) {
                                                                    this._tuSpawnPoint = { x: this.player.x, y: this.player.y };
                                                                }
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            return r;
                                                        };
                                                    }
                                                }

                                                // Damage tick in update
                                                if (!Game.prototype.__tuAcidRainDamageTick) {
                                                    Game.prototype.__tuAcidRainDamageTick = true;

                                                    Game.prototype._tuUpdateAcidRainDamage = function (dtMs) {
                                                        const w = this.weather;
                                                        const p = this.player;
                                                        if (!w || !p) return false;

                                                        const inRainDomain = (w.type === 'rain' || w.type === 'thunder');
                                                        const acid = !!w.acid;
                                                        const it = clamp01(Number(w.intensity) || 0);

                                                        if (!inRainDomain || !acid || it < ACID_MIN_INTENSITY) {
                                                            this._tuAcidDmgAcc = 0;
                                                            this._tuShelterAcc = 0;
                                                            this._tuSheltered = true;
                                                            return false;
                                                        }

                                                        // Shelter check (throttled)
                                                        this._tuShelterAcc = (this._tuShelterAcc || 0) + (Number(dtMs) || 0);
                                                        if (this._tuShelterAcc >= SHELTER_CHECK_MS || this._tuSheltered === undefined) {
                                                            this._tuShelterAcc = 0;
                                                            this._tuSheltered = isShelteredFromRain(this);
                                                        }

                                                        if (this._tuSheltered) {
                                                            this._tuAcidDmgAcc = 0; // don't "bank" damage while protected
                                                            return false;
                                                        }

                                                        // Damage interval scales with intensity
                                                        const interval = Math.max(DMG_INTERVAL_MIN, Math.min(DMG_INTERVAL_MAX, DMG_INTERVAL_MAX - 650 * it));
                                                        this._tuAcidDmgAcc = (this._tuAcidDmgAcc || 0) + (Number(dtMs) || 0);

                                                        let didDamage = false;
                                                        while (this._tuAcidDmgAcc >= interval) {
                                                            this._tuAcidDmgAcc -= interval;
                                                            const dmg = 1 + (it > 0.82 ? 1 : 0);
                                                            applyDamage(this, dmg, 'acidRain');
                                                            didDamage = true;
                                                        }
                                                        return didDamage;
                                                    };

                                                    const _update = Game.prototype.update;
                                                    if (typeof _update === 'function') {
                                                        Game.prototype.update = function (dt) {
                                                            _update.call(this, dt);
                                                            try {
                                                                const d = Math.min(50, Math.max(0, Number(dt) || 0));
                                                                const did = this._tuUpdateAcidRainDamage(d);
                                                                // Ensure UI reflects health change immediately (only when damage happened)
                                                                if (did && this.ui && typeof this.ui.updateStats === 'function') this.ui.updateStats();
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        };
                                                    }
                                                }
                                            }
                                        }); try { __p && __p.apply && __p.apply(); } catch (e) { console.warn('[TU merge] patch apply failed', __p && __p.id, e); }
                                    })();
                                })();
