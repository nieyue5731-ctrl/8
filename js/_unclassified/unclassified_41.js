// Module: unclassified_41
// Source: lines 18817-19005 of original file
// Category: _unclassified
// ═══════════════════════════════════════════════════════════

(() => {
                                    const TU = window.TU || {};
                                    (function () {
                                        const __p = ({
                                            id: 'tu_experience_optimizations_v3',
                                            order: 70,
                                            description: "体验优化（v3）",
                                            apply: () => {
                                                const TU = window.TU || {};
                                                const Game = TU.Game;
                                                const InputManager = TU.InputManager;
                                                const AudioManager = TU.AudioManager;

                                                // ───────────────────────── 1) Dispatch tu:gameReady after init completes ─────────────────────────
                                                if (Game && Game.prototype && !Game.prototype.__tuGameReadyEvent) {
                                                    Game.prototype.__tuGameReadyEvent = true;
                                                    const _init = Game.prototype.init;
                                                    if (typeof _init === 'function') {
                                                        Game.prototype.init = async function (...args) {
                                                            const r = await _init.apply(this, args);
                                                            try {
                                                                document.dispatchEvent(new CustomEvent('tu:gameReady', { detail: { game: this } }));
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            return r;
                                                        };
                                                    }
                                                }

                                                // ───────────────────────── 2) Input safety + mouse wheel hotbar (desktop QoL) ─────────────────────────
                                                if (InputManager && InputManager.prototype && !InputManager.prototype.__tuInputSafety) {
                                                    InputManager.prototype.__tuInputSafety = true;
                                                    const _bind = InputManager.prototype.bind;

                                                    InputManager.prototype.bind = function (...args) {
                                                        if (typeof _bind === 'function') _bind.apply(this, args);

                                                        if (this.__tuExtraBound) return;
                                                        this.__tuExtraBound = true;

                                                        const game = this.game;

                                                        const resetKeys = () => {
                                                            if (!game || !game.input) return;
                                                            game.input.left = false;
                                                            game.input.right = false;
                                                            game.input.jump = false;
                                                            game.input.sprint = false;
                                                        };
                                                        const resetMouseButtons = () => {
                                                            if (!game || !game.input) return;
                                                            game.input.mouseLeft = false;
                                                            game.input.mouseRight = false;
                                                        };
                                                        const resetAll = () => { resetKeys(); resetMouseButtons(); };

                                                        // Window blur/tab switch: avoid “stuck key/button”
                                                        window.addEventListener('blur', resetAll, { passive: true });
                                                        document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); }, { passive: true });

                                                        // Mouse leaves canvas: clear mouse buttons to avoid “stuck mining/placing”
                                                        if (game && game.canvas) {
                                                            game.canvas.addEventListener('mouseleave', resetMouseButtons, { passive: true });
                                                        }
                                                        // Mouse up anywhere: clear buttons even if released outside canvas
                                                        window.addEventListener('mouseup', resetMouseButtons, { passive: true });

                                                        // Mouse wheel: switch hotbar slot (1..9)
                                                        const onWheel = (e) => {
                                                            if (e.ctrlKey) return; // allow browser zoom / trackpad pinch
                                                            const g = game || window.__GAME_INSTANCE__;
                                                            if (!g || !g.ui || !g.player) return;

                                                            // If UI modal open, do nothing
                                                            const modal = (g.inventoryUI && g.inventoryUI.isOpen) ||
                                                                (g.crafting && g.crafting.isOpen) ||
                                                                g.paused || g._inputBlocked;
                                                            if (modal) return;

                                                            const dx = Number(e.deltaX) || 0;
                                                            const dy = Number(e.deltaY) || 0;
                                                            const delta = (Math.abs(dy) >= Math.abs(dx)) ? dy : dx;

                                                            // Ignore tiny noise
                                                            if (!delta || Math.abs(delta) < 1) return;

                                                            e.preventDefault();

                                                            const dir = delta > 0 ? 1 : -1;
                                                            const size = 9;

                                                            const cur = (Number.isFinite(g.player.selectedSlot) ? g.player.selectedSlot : 0) | 0;
                                                            const next = (cur + dir + size) % size;
                                                            try { g.ui.selectSlot(next); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        };

                                                        if (game && game.canvas && !game.canvas.__tuWheelBound) {
                                                            game.canvas.__tuWheelBound = true;
                                                            game.canvas.addEventListener('wheel', onWheel, { passive: false });
                                                        }
                                                    };
                                                }

                                                // ───────────────────────── 3) Low-power CSS: reduce expensive UI effects ─────────────────────────
                                                const ensureLowPowerCSS = () => {
                                                    if (document.getElementById('tu-low-power-css')) return;
                                                    const style = document.createElement('style');
                                                    style.id = 'tu-low-power-css';
                                                    style.textContent = `
            /* Low power mode: reduce expensive backdrop-filter / shadows / animations */
            html.low-power *, html.low-power *::before, html.low-power *::after {
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            html.low-power .shimmer,
            html.low-power .pulse,
            html.low-power .sparkle,
            html.low-power .floating,
            html.low-power .glow {
              animation: none !important;
            }
            html.low-power #ambient-particles {
              opacity: 0.5 !important;
              filter: none !important;
            }
          `;
                                                    document.head.appendChild(style);
                                                };

                                                if (Game && Game.prototype && !Game.prototype.__tuLowPowerCssHook) {
                                                    Game.prototype.__tuLowPowerCssHook = true;
                                                    ensureLowPowerCSS();

                                                    const _setQuality = Game.prototype._setQuality;
                                                    if (typeof _setQuality === 'function') {
                                                        Game.prototype._setQuality = function (level) {
                                                            const r = _setQuality.call(this, level);
                                                            try {
                                                                document.documentElement.classList.toggle('low-power', level === 'low');
                                                            } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            return r;
                                                        };
                                                    }
                                                }

                                                // ───────────────────────── 4) Weather ambience audio: enable flag fix + suspend on hidden ─────────────────────────
                                                if (AudioManager && AudioManager.prototype && !AudioManager.prototype.__tuAudioVisPatch) {
                                                    AudioManager.prototype.__tuAudioVisPatch = true;

                                                    // Fix: updateWeatherAmbience uses this.enabled, but base AudioManager doesn't define it
                                                    if (typeof AudioManager.prototype.updateWeatherAmbience === 'function') {
                                                        const _ua = AudioManager.prototype.updateWeatherAmbience;
                                                        AudioManager.prototype.updateWeatherAmbience = function (dtMs, weather) {
                                                            if (typeof this.enabled === 'undefined') this.enabled = true;
                                                            return _ua.call(this, dtMs, weather);
                                                        };
                                                    }

                                                    // Battery saver: suspend audio context when hidden
                                                    const suspendAudio = () => {
                                                        const g = window.__GAME_INSTANCE__;
                                                        const audio = g && g.audio;
                                                        const ctx = audio && audio.ctx;
                                                        if (!ctx) return;
                                                        try { if (ctx.state === 'running') ctx.suspend().catch(() => { }); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    };
                                                    const resumeAudio = () => {
                                                        const g = window.__GAME_INSTANCE__;
                                                        const audio = g && g.audio;
                                                        const ctx = audio && audio.ctx;
                                                        if (!ctx) return;
                                                        try { if (ctx.state === 'suspended') ctx.resume().catch(() => { }); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    };

                                                    document.addEventListener('visibilitychange', () => {
                                                        if (document.hidden) suspendAudio();
                                                        else resumeAudio();
                                                    }, { passive: true });

                                                    // pagehide: always suspend (best-effort)
                                                    window.addEventListener('pagehide', suspendAudio, { passive: true });
                                                }
                                            }
                                        }); try { __p && __p.apply && __p.apply(); } catch (e) { console.warn('[TU merge] patch apply failed', __p && __p.id, e); }
                                    })();
                                })();
