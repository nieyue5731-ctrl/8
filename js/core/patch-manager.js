// Module: patch-manager
// Source: lines 20901-21225 of original file
// Category: core
// ═══════════════════════════════════════════════════════════

(() => {
                                    const TU = window.TU || {};
                                    (function () {
                                        const __p = ({
                                            id: 'tu_weather_rain_visible_fix_v1',
                                            order: 90,
                                            description: "雨滴可见性修复（v1）",
                                            apply: () => {
                                                'use strict';
                                                const TU = window.TU || {};
                                                const W = TU.WeatherCanvasFX;
                                                if (!W || !W.prototype) return;
                                                if ((window.TU && window.TU.PatchManager) ? !window.TU.PatchManager.once('tu_weather_rain_visible_fix_v1', null) : W.prototype.__tu_weather_rain_visible_fix_v1) return;

                                                // 1) Ensure the weather overlay canvas is NOT hidden (some builds hid it under reduced-motion)
                                                try {
                                                    const st = document.createElement('style');
                                                    st.setAttribute('data-tu-patch', 'tu_weather_rain_visible_fix_v1');
                                                    st.textContent = `
            #weatherfx{ display:block !important; opacity:1 !important; }
            .reduced-motion #weatherfx{ display:block !important; opacity:1 !important; }
          `;
                                                    document.head && document.head.appendChild(st);
                                                } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                // Helper: get 2D ctx with maximum compatibility (some browsers return null when passing options)
                                                function get2dCtx(canvas) {
                                                    if (!canvas || !canvas.getContext) return null;
                                                    try {
                                                        return canvas.getContext('2d', { alpha: true }) || canvas.getContext('2d', { willReadFrequently: true });
                                                    } catch (e) {
                                                        try { return canvas.getContext('2d', { willReadFrequently: true }); } catch (_) { return null; }
                                                    }
                                                }

                                                // 2) Ensure WeatherCanvasFX always has a valid ctx (fallback to getContext('2d', { willReadFrequently: true }) without options)
                                                if (!W.prototype._ensure2d) {
                                                    W.prototype._ensure2d = function () {
                                                        if (this.ctx) return true;
                                                        this.ctx = get2dCtx(this.canvas);
                                                        if (this.ctx) {
                                                            try { this.ctx.imageSmoothingEnabled = false; } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        }
                                                        return !!this.ctx;
                                                    };
                                                }

                                                // 3) More robust pattern builders (use ctx fallback on OffscreenCanvas / old WebViews)
                                                const _mk = (typeof W.prototype._makeOffscreenCanvas === 'function')
                                                    ? W.prototype._makeOffscreenCanvas
                                                    : function (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

                                                W.prototype._ensureRainPattern = function () {
                                                    if (!this._ensure2d || !this._ensure2d()) return;
                                                    const ctxOut = this.ctx;
                                                    if (!ctxOut) return;

                                                    const tile = (this._dpr > 1.25) ? 512 : 256;
                                                    if (this._rain && this._rain.pattern && this._rain.size === tile) return;

                                                    const c = _mk.call(this, tile, tile);
                                                    const g = get2dCtx(c);
                                                    if (!g) return;

                                                    g.setTransform(1, 0, 0, 1, 0, 0);
                                                    g.clearRect(0, 0, tile, tile);

                                                    // Draw diagonal rain streaks (one-time cost)
                                                    const rand = (typeof this._rand01 === 'function') ? () => this._rand01() : () => Math.random();
                                                    const count = Math.max(220, (tile === 512 ? 420 : 260));
                                                    g.lineCap = 'round';

                                                    for (let i = 0; i < count; i++) {
                                                        const x = rand() * tile;
                                                        const y = rand() * tile;
                                                        const len = 18 + rand() * 46;
                                                        const lw = 0.55 + rand() * 0.95;

                                                        // Around 78deg (down-right)
                                                        const ang = (Math.PI / 180) * (74 + rand() * 10);
                                                        const dx = Math.cos(ang) * len;
                                                        const dy = Math.sin(ang) * len;

                                                        const grad = g.createLinearGradient(x, y, x + dx, y + dy);
                                                        grad.addColorStop(0.00, 'rgba(180,220,255,0.00)');
                                                        grad.addColorStop(0.55, 'rgba(180,220,255,0.20)');
                                                        grad.addColorStop(1.00, 'rgba(180,220,255,0.85)');

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

                                                    this._rain = this._rain || { tile: null, ctx: null, pattern: null, size: 0, ox: 0, oy: 0 };
                                                    this._rain.tile = c;
                                                    this._rain.ctx = g;
                                                    this._rain.pattern = p;
                                                    this._rain.size = tile;
                                                    this._rain.ox = 0;
                                                    this._rain.oy = 0;
                                                };

                                                W.prototype._ensureSnowPattern = function () {
                                                    if (!this._ensure2d || !this._ensure2d()) return;
                                                    const ctxOut = this.ctx;
                                                    if (!ctxOut) return;

                                                    const tile = (this._dpr > 1.25) ? 512 : 256;
                                                    if (this._snow && this._snow.pattern && this._snow.size === tile) return;

                                                    const c = _mk.call(this, tile, tile);
                                                    const g = get2dCtx(c);
                                                    if (!g) return;

                                                    g.setTransform(1, 0, 0, 1, 0, 0);
                                                    g.clearRect(0, 0, tile, tile);

                                                    const rand = (typeof this._rand01 === 'function') ? () => this._rand01() : () => Math.random();
                                                    const count = Math.max(160, (tile === 512 ? 320 : 220));

                                                    for (let i = 0; i < count; i++) {
                                                        const x = rand() * tile;
                                                        const y = rand() * tile;
                                                        const r = 0.6 + rand() * 1.8;

                                                        // soft snow dot
                                                        const grad = g.createRadialGradient(x, y, 0, x, y, r);
                                                        grad.addColorStop(0.00, 'rgba(255,255,255,0.85)');
                                                        grad.addColorStop(1.00, 'rgba(255,255,255,0.00)');

                                                        g.fillStyle = grad;
                                                        g.beginPath();
                                                        g.arc(x, y, r, 0, Math.PI * 2);
                                                        g.fill();
                                                    }

                                                    let p = null;
                                                    try { p = ctxOut.createPattern(c, 'repeat'); } catch (_) { p = null; }
                                                    if (!p) return;

                                                    this._snow = this._snow || { tile: null, ctx: null, pattern: null, size: 0, ox: 0, oy: 0 };
                                                    this._snow.tile = c;
                                                    this._snow.ctx = g;
                                                    this._snow.pattern = p;
                                                    this._snow.size = tile;
                                                    this._snow.ox = 0;
                                                    this._snow.oy = 0;
                                                };

                                                // 4) Fallback draw (if pattern creation fails on some devices)
                                                W.prototype._drawRainFallback = function (intensity, dtMs, isThunder) {
                                                    if (!this._ensure2d || !this._ensure2d()) return;
                                                    const ctx = this.ctx;
                                                    if (!ctx) return;

                                                    const w = this._wPx || (this.canvas ? this.canvas.width : 0);
                                                    const h = this._hPx || (this.canvas ? this.canvas.height : 0);
                                                    if (!w || !h) return;

                                                    const rand = (typeof this._rand01 === 'function') ? () => this._rand01() : () => Math.random();
                                                    const dt = (dtMs || 0) / 1000;
                                                    const speed = (isThunder ? 1600 : 1250) * (0.55 + 0.85 * Math.min(1, Math.max(0, intensity))) * (this._dpr || 1);

                                                    // Advance a rolling offset so rain "moves"
                                                    this._rain = this._rain || { ox: 0, oy: 0 };
                                                    this._rain.oy = (this._rain.oy + speed * dt) % (h + 1);
                                                    this._rain.ox = (this._rain.ox + speed * 0.18 * dt) % (w + 1);

                                                    const n = Math.max(60, Math.min(240, (80 + intensity * 220) | 0));
                                                    const alpha = (0.08 + 0.22 * intensity) * (isThunder ? 1.10 : 1.0);

                                                    ctx.save();
                                                    ctx.globalCompositeOperation = 'source-over';
                                                    ctx.globalAlpha = alpha;
                                                    ctx.strokeStyle = 'rgba(190,225,255,0.9)';
                                                    ctx.lineCap = 'round';

                                                    for (let i = 0; i < n; i++) {
                                                        const x = ((rand() * (w + 200)) - 100 + (this._rain.ox || 0)) % (w + 200) - 100;
                                                        const y = ((rand() * (h + 200)) - 100 + (this._rain.oy || 0)) % (h + 200) - 100;

                                                        const len = 10 + rand() * 22;
                                                        const lw = 0.7 + rand() * 1.1;
                                                        const dx = len * 0.30;
                                                        const dy = len * 1.00;

                                                        ctx.lineWidth = lw;
                                                        ctx.beginPath();
                                                        ctx.moveTo(x, y);
                                                        ctx.lineTo(x + dx, y + dy);
                                                        ctx.stroke();
                                                    }
                                                    ctx.restore();
                                                };

                                                W.prototype._drawSnowFallback = function (intensity, dtMs) {
                                                    if (!this._ensure2d || !this._ensure2d()) return;
                                                    const ctx = this.ctx;
                                                    if (!ctx) return;

                                                    const w = this._wPx || (this.canvas ? this.canvas.width : 0);
                                                    const h = this._hPx || (this.canvas ? this.canvas.height : 0);
                                                    if (!w || !h) return;

                                                    const rand = (typeof this._rand01 === 'function') ? () => this._rand01() : () => Math.random();
                                                    const dt = (dtMs || 0) / 1000;

                                                    this._snow = this._snow || { ox: 0, oy: 0 };
                                                    const speed = 280 * (0.35 + 0.8 * Math.min(1, Math.max(0, intensity))) * (this._dpr || 1);
                                                    this._snow.oy = (this._snow.oy + speed * dt) % (h + 1);
                                                    this._snow.ox = (this._snow.ox + speed * 0.12 * dt) % (w + 1);

                                                    const n = Math.max(40, Math.min(180, (60 + intensity * 180) | 0));
                                                    const alpha = 0.10 + 0.25 * intensity;

                                                    ctx.save();
                                                    ctx.globalCompositeOperation = 'source-over';
                                                    ctx.globalAlpha = alpha;
                                                    ctx.fillStyle = 'rgba(255,255,255,0.95)';

                                                    for (let i = 0; i < n; i++) {
                                                        const x = ((rand() * (w + 200)) - 100 + (this._snow.ox || 0)) % (w + 200) - 100;
                                                        const y = ((rand() * (h + 200)) - 100 + (this._snow.oy || 0)) % (h + 200) - 100;
                                                        const r = 0.7 + rand() * 1.9;
                                                        ctx.beginPath();
                                                        ctx.arc(x, y, r, 0, Math.PI * 2);
                                                        ctx.fill();
                                                    }
                                                    ctx.restore();
                                                };

                                                // 5) Wrap drawRain/drawSnow: if the pattern path fails, use fallback so "只有声音没画面" never happens
                                                const _origDrawRain = W.prototype.drawRain;
                                                W.prototype.drawRain = function (intensity, dtMs, isThunder) {
                                                    if (!this._ensure2d || !this._ensure2d()) return;
                                                    try { if (typeof _origDrawRain === 'function') _origDrawRain.call(this, intensity, dtMs, isThunder); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    if (!this._rain || !this._rain.pattern) {
                                                        try { this._drawRainFallback(intensity, dtMs, isThunder); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    }
                                                };

                                                const _origDrawSnow = W.prototype.drawSnow;
                                                W.prototype.drawSnow = function (intensity, dtMs) {
                                                    if (!this._ensure2d || !this._ensure2d()) return;
                                                    try { if (typeof _origDrawSnow === 'function') _origDrawSnow.call(this, intensity, dtMs); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    if (!this._snow || !this._snow.pattern) {
                                                        try { this._drawSnowFallback(intensity, dtMs); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    }
                                                };

                                                // 6) Override render: do NOT early-return just because of reduced-motion; instead render with slower motion.
                                                W.prototype.render = function (weather, renderer) {
                                                    if (!this.canvas) return;
                                                    if (!this._ensure2d || !this._ensure2d()) return;

                                                    const reduced = !!(document.documentElement && document.documentElement.classList.contains('reduced-motion'));
                                                    const motionScale = reduced ? 0.15 : 1.0;
                                                    const densityScale = reduced ? 0.75 : 1.0;

                                                    // Keep size synced to main renderer
                                                    try { this.resizeLike(renderer); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                                                    let dtMs = now - (this._lastNow || now);
                                                    if (!Number.isFinite(dtMs)) dtMs = 0;
                                                    if (dtMs < 0) dtMs = 0;
                                                    if (dtMs > 200) dtMs = 200;
                                                    this._lastNow = now;
                                                    dtMs *= motionScale;

                                                    const w = weather || {};
                                                    const type = (w.type || 'clear').toString();
                                                    const intensity = (Number(w.intensity) || 0) * densityScale;
                                                    const lightning = Number(w.lightning) || 0;

                                                    // If nothing to draw, clear once then stop touching the canvas
                                                    if (intensity <= 0.001 && lightning <= 0.001) {
                                                        if (this._hadFx) {
                                                            const ctx = this.ctx;
                                                            ctx.setTransform(1, 0, 0, 1, 0, 0);
                                                            ctx.clearRect(0, 0, (this._wPx || this.canvas.width), (this._hPx || this.canvas.height));
                                                            this._hadFx = false;
                                                        }
                                                        this._prevLightning = lightning;
                                                        return;
                                                    }

                                                    this._hadFx = true;

                                                    const ctx = this.ctx;
                                                    const wPx = this._wPx || this.canvas.width;
                                                    const hPx = this._hPx || this.canvas.height;

                                                    // Clear overlay each frame when active (transparent canvas)
                                                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                                                    ctx.clearRect(0, 0, wPx, hPx);

                                                    if ((type === 'rain' || type === 'thunder') && intensity > 0.01) {
                                                        this.drawRain(intensity, dtMs, type === 'thunder');
                                                    } else if (type === 'snow' && intensity > 0.01) {
                                                        this.drawSnow(intensity, dtMs);
                                                    }

                                                    if (lightning > 0.001) {
                                                        this.drawLightning(lightning, dtMs);
                                                    } else if (this._bolt && this._bolt.life > 0) {
                                                        // Let bolt fade out naturally even if lightning param drops fast
                                                        this.drawLightning(Math.max(0, this._prevLightning * 0.8), dtMs);
                                                    }

                                                    this._prevLightning = lightning;
                                                };
                                            }
                                        }); try { __p && __p.apply && __p.apply(); } catch (e) { console.warn('[TU merge] patch apply failed', __p && __p.id, e); }
                                    })();
                                })();
