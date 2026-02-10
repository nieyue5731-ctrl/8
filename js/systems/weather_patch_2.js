// Module: weather_patch_2
// Source: lines 17786-18088 of original file
// Category: systems
// ═══════════════════════════════════════════════════════════

(() => {
                                    const TU = window.TU || {};
                                    (function () {
                                        const __p = ({
                                            id: 'weather_lighting_audio_sync_v1',
                                            order: 50,
                                            description: "天气-光照-音频同步修复（v1）",
                                            apply: () => {
                                                const TU = window.TU || {};
                                                const AudioManager = TU.AudioManager;
                                                const Renderer = TU.Renderer;

                                                // ───────────────────────── WebAudio: real-time rain synth (sync with weather particles)
                                                if (AudioManager && AudioManager.prototype && !AudioManager.prototype.__rainSynthInstalled) {
                                                    AudioManager.prototype.__rainSynthInstalled = true;

                                                    AudioManager.prototype._makeLoopNoiseBuffer = function (seconds) {
                                                        try {
                                                            if (!this.ctx) return null;
                                                            const ctx = this.ctx;
                                                            const sr = ctx.sampleRate || 44100;
                                                            const len = Math.max(1, (sr * (seconds || 2)) | 0);
                                                            const buf = ctx.createBuffer(1, len, sr);
                                                            const d = buf.getChannelData(0);

                                                            // white noise
                                                            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);

                                                            // fade-in/out to avoid loop clicks
                                                            const fade = Math.min((sr * 0.02) | 0, (len / 2) | 0);
                                                            for (let i = 0; i < fade; i++) {
                                                                const t = i / fade;
                                                                d[i] *= t;
                                                                d[len - 1 - i] *= t;
                                                            }
                                                            return buf;
                                                        } catch (_) {
                                                            return null;
                                                        }
                                                    };

                                                    AudioManager.prototype._startRainSynth = function () {
                                                        if (!this.ctx) return false;
                                                        const ctx = this.ctx;
                                                        if (ctx.state === 'suspended') return false;

                                                        const st = this._rainSynth || (this._rainSynth = { active: false, dropAcc: 0 });
                                                        if (st.active) return true;

                                                        if (!st.buf) st.buf = this._makeLoopNoiseBuffer(2.0);
                                                        if (!st.buf) return false;

                                                        const src = ctx.createBufferSource();
                                                        src.buffer = st.buf;
                                                        src.loop = true;

                                                        const hp = ctx.createBiquadFilter();
                                                        hp.type = 'highpass';
                                                        hp.frequency.value = 140;

                                                        const lp = ctx.createBiquadFilter();
                                                        lp.type = 'lowpass';
                                                        lp.frequency.value = 4200;

                                                        const gain = ctx.createGain();
                                                        gain.gain.value = 0;

                                                        src.connect(hp);
                                                        hp.connect(lp);
                                                        lp.connect(gain);
                                                        gain.connect(ctx.destination);

                                                        try { src.start(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                        st.src = src;
                                                        st.hp = hp;
                                                        st.lp = lp;
                                                        st.gain = gain;
                                                        st.active = true;
                                                        st.dropAcc = 0;

                                                        return true;
                                                    };

                                                    AudioManager.prototype._stopRainSynth = function () {
                                                        const st = this._rainSynth;
                                                        if (!st || !st.active) return;

                                                        st.active = false;

                                                        try {
                                                            const ctx = this.ctx;
                                                            if (ctx && st.gain && st.gain.gain) {
                                                                const now = ctx.currentTime;
                                                                try { st.gain.gain.setTargetAtTime(0, now, 0.08); } catch (_) { st.gain.gain.value = 0; }
                                                            }
                                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                        const src = st.src;
                                                        const hp = st.hp, lp = st.lp, gain = st.gain;

                                                        st.src = null;
                                                        st.hp = null;
                                                        st.lp = null;
                                                        st.gain = null;

                                                        // 延迟 stop，给淡出留时间
                                                        setTimeout(() => {
                                                            try { if (src) src.stop(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            try { if (src) src.disconnect(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            try { if (hp) hp.disconnect(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            try { if (lp) lp.disconnect(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                            try { if (gain) gain.disconnect(); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        }, 520);
                                                    };

                                                    // 主入口：每帧调用（由 Game._updateWeather 驱动）
                                                    AudioManager.prototype.updateWeatherAmbience = function (dtMs, weather) {
                                                        const wType = (weather && weather.type) ? weather.type : 'clear';
                                                        const wInt = (weather && Number.isFinite(weather.intensity)) ? weather.intensity : 0;

                                                        const wantRain = (wInt > 0.06) && (wType === 'rain' || wType === 'thunder');
                                                        const thunder = (wType === 'thunder');

                                                        // 没有交互解锁音频时，ctx 可能不存在；这里不强行创建，等 arm() 的手势触发
                                                        if (!this.ctx || !this.enabled) {
                                                            if (!wantRain) return;
                                                            return;
                                                        }

                                                        const sv = (this.settings && Number.isFinite(this.settings.sfxVolume)) ? this.settings.sfxVolume : 0;
                                                        if (sv <= 0.001) {
                                                            // 音量为 0：确保停掉
                                                            if (this._rainSynth && this._rainSynth.active) this._stopRainSynth();
                                                            return;
                                                        }

                                                        if (!wantRain) {
                                                            if (this._rainSynth && this._rainSynth.active) this._stopRainSynth();
                                                            return;
                                                        }

                                                        if (!this._startRainSynth()) return;

                                                        const st = this._rainSynth;
                                                        if (!st || !st.active || !this.ctx) return;

                                                        const ctx = this.ctx;
                                                        const now = ctx.currentTime;

                                                        // 目标音量：与粒子强度同步（雷雨略更重一些）
                                                        const base = sv * (thunder ? 0.22 : 0.16);
                                                        const targetVol = base * Math.min(1, Math.max(0, wInt));

                                                        try { st.gain.gain.setTargetAtTime(targetVol, now, 0.08); } catch (_) { st.gain.gain.value = targetVol; }

                                                        // 过滤器：雨越大，高频越多；雷雨略加强低频/压抑感
                                                        const hpHz = 110 + wInt * (thunder ? 260 : 200);
                                                        const lpHz = 2600 + wInt * (thunder ? 5200 : 4200);

                                                        try { st.hp.frequency.setTargetAtTime(hpHz, now, 0.08); } catch (_) { st.hp.frequency.value = hpHz; }
                                                        try { st.lp.frequency.setTargetAtTime(lpHz, now, 0.08); } catch (_) { st.lp.frequency.value = lpHz; }

                                                        // 雨点：用短噪声 burst 模拟“打在叶子/地面”的颗粒感（频率与强度同步）
                                                        st.dropAcc = (st.dropAcc || 0) + (dtMs || 0);

                                                        const rate = (thunder ? 3.2 : 2.2) + wInt * (thunder ? 7.0 : 5.0); // 次/秒
                                                        const interval = 1000 / Math.max(0.8, rate);

                                                        let fired = 0;
                                                        while (st.dropAcc >= interval && fired < 4) {
                                                            st.dropAcc -= interval;
                                                            fired++;

                                                            // 避免过“嘈杂”：一定概率跳过
                                                            if (Math.random() < 0.35) continue;

                                                            const dVol = (thunder ? 0.055 : 0.045) + wInt * 0.065;
                                                            const dur = 0.018 + Math.random() * 0.03;
                                                            try { this.noise(dur, dVol); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        }
                                                    };
                                                }

                                                // ───────────────────────── Renderer: postProcess 色偏叠加（血月/雷雨）
                                                if (Renderer && Renderer.prototype && !Renderer.prototype.__weatherPostTintInstalled) {
                                                    Renderer.prototype.__weatherPostTintInstalled = true;

                                                    const _orig = Renderer.prototype.applyPostFX;

                                                    Renderer.prototype.applyPostFX = function (time, depth01, reducedMotion) {
                                                        const gs = (window.GAME_SETTINGS || {});
                                                        let mode = (typeof gs.__postFxModeEffective === 'number') ? gs.__postFxModeEffective : Number(gs.postFxMode);
                                                        if (!Number.isFinite(mode)) mode = 2;
                                                        if (mode <= 0) return;

                                                        // 先跑原有后期（Bloom/雾化/暗角/颗粒等）
                                                        if (_orig) _orig.call(this, time, depth01, reducedMotion);

                                                        const fx = window.TU_WEATHER_FX;
                                                        if (!fx) return;

                                                        const a = Number(fx.postA) || 0;
                                                        const lightning = Number(fx.lightning) || 0;

                                                        if (a <= 0.001 && lightning <= 0.001) return;

                                                        const ctx = this.ctx;
                                                        const canvas = this.canvas;
                                                        if (!ctx || !canvas) return;

                                                        const wPx = canvas.width | 0;
                                                        const hPx = canvas.height | 0;

                                                        ctx.save();
                                                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                                                        ctx.globalAlpha = 1;

                                                        // 1) 色偏（压抑氛围）
                                                        if (a > 0.001) {
                                                            const r = (fx.postR | 0) & 255;
                                                            const g = (fx.postG | 0) & 255;
                                                            const b = (fx.postB | 0) & 255;
                                                            const mode2 = fx.postMode || 'source-over';

                                                            ctx.globalCompositeOperation = mode2;
                                                            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
                                                            ctx.fillRect(0, 0, wPx, hPx);
                                                        }

                                                        // 2) 雷雨闪电：短促 screen 叠加 + 轻微径向高光
                                                        if (lightning > 0.001) {
                                                            const f = Math.min(1, Math.max(0, lightning));

                                                            ctx.globalCompositeOperation = 'screen';
                                                            ctx.fillStyle = `rgba(210,230,255,${(0.10 + 0.34 * f).toFixed(3)})`;
                                                            ctx.fillRect(0, 0, wPx, hPx);

                                                            const cx = wPx * 0.5;
                                                            const cy = hPx * 0.45;
                                                            const r0 = Math.min(wPx, hPx) * 0.06;
                                                            const r1 = Math.max(wPx, hPx) * 0.95;

                                                            const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
                                                            g.addColorStop(0, `rgba(255,255,255,${(0.18 * f).toFixed(3)})`);
                                                            g.addColorStop(1, 'rgba(255,255,255,0)');

                                                            ctx.fillStyle = g;
                                                            ctx.fillRect(0, 0, wPx, hPx);
                                                        }

                                                        // 恢复
                                                        ctx.globalCompositeOperation = 'source-over';
                                                        try { ctx.imageSmoothingEnabled = false; } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                        ctx.restore();
                                                    };
                                                }

                                                // ───────────────────────── Debug helper (Console)
                                                // 用法示例：
                                                //   TU.forceWeather('thunder', 1, 30000)   // 30 秒雷雨
                                                //   TU.forceWeather('bloodmoon', 1, 30000) // 30 秒血月（夜晚效果更明显）
                                                //   TU.forceWeather('clear', 0, 1)        // 清空天气
                                                if (TU && !TU.forceWeather) {
                                                    TU.forceWeather = function (type, intensity, durationMs) {
                                                        try {
                                                            const g = window.__GAME_INSTANCE__;
                                                            if (!g) return;

                                                            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                                                            const dur = Math.max(1, Number(durationMs) || 30000);

                                                            if (!g.weather) {
                                                                g.weather = { type: 'clear', intensity: 0, targetIntensity: 0, nextType: 'clear', nextIntensity: 0, lightning: 0 };
                                                            }

                                                            const w = g.weather;
                                                            const tt = (type || 'clear').toString();
                                                            const ii = (tt === 'clear') ? 0 : Math.min(1, Math.max(0, Number(intensity)));
                                                            w.nextType = tt;
                                                            w.nextIntensity = ii;

                                                            // 若需要换类型：先淡出
                                                            if (w.type !== tt) w.targetIntensity = 0;
                                                            else w.targetIntensity = ii;

                                                            // 延后系统随机决策
                                                            g._weatherNextAt = now + dur;

                                                            // 若强制 clear：直接清空 lightning
                                                            if (tt === 'clear') {
                                                                w.lightning = 0;
                                                                w._lightningNextAt = 0;
                                                            }
                                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    };
                                                }
                                            }
                                        }); try { __p && __p.apply && __p.apply(); } catch (e) { console.warn('[TU merge] patch apply failed', __p && __p.id, e); }
                                    })();
                                })();
