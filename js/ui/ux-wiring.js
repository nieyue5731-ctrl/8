// Module: ux-wiring
// Source: lines 4845-5313 of original file
// Category: ui
// ═══════════════════════════════════════════════════════════

/** 让 UI 文案自动适配设备 */
        function applyInfoHintText(isMobile) {
            const el = document.getElementById('info');
            if (!el) return;

            // SECURITY: avoid innerHTML. Build DOM nodes to prevent XSS surface area.
            if (!isMobile) return;

            try {
                // Clear existing nodes
                while (el.firstChild) el.removeChild(el.firstChild);

                const parts = [
                    ['摇杆', ' 移动'],
                    ['⬆️', ' 跳跃'],
                    ['⛏️', ' 挖掘'],
                    ['🧱', ' 放置'],
                    ['⚒️', ' 合成'],
                    ['🎒', ' 背包'],
                ];

                for (let i = 0; i < parts.length; i++) {
                    const [label, text] = parts[i];

                    const span = document.createElement('span');
                    span.className = 'highlight';
                    span.textContent = String(label);

                    el.appendChild(span);
                    el.appendChild(document.createTextNode(String(text)));

                    if (i < parts.length - 1) {
                        el.appendChild(document.createTextNode(' | '));
                    }
                }
            } catch (e) {
                // Fall back to plain text if DOM ops fail for any reason
                try {
                    el.textContent = '摇杆 移动 | ⬆️ 跳跃 | ⛏️ 挖掘 | 🧱 放置 | ⚒️ 合成 | 🎒 背包';
                } catch (_) {}
            }
        }

        function wireUXUI(game) {
            // 顶部按钮
            const btnPause = document.getElementById('btn-pause');
            const btnSettings = document.getElementById('btn-settings');
            const btnSave = document.getElementById('btn-save');
            const btnHelp = document.getElementById('btn-help');

            const pauseOverlay = document.getElementById('pause-overlay');
            const settingsOverlay = document.getElementById('settings-overlay');
            const helpOverlay = document.getElementById('help-overlay');

            const _overlayStack = [];
            const _overlayFocusStack = [];
            const _firstFocusable = (root) => {
                if (!root) return null;
                return root.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            };

            const showOverlay = (el) => {
                if (!el) return;

                // 已经打开：只把焦点拉回面板内，避免重复入栈导致焦点/状态错乱
                try {
                    if (el.classList && el.classList.contains('show')) {
                        queueMicrotask(() => {
                            const t = _firstFocusable(el) || el;
                            try { t.focus({ preventScroll: true }); } catch { }
                        });
                        return;
                    }
                } catch { }

                // 记录焦点：关闭时尽可能回到原控件
                const prev = (document.activeElement instanceof HTMLElement) ? document.activeElement : null;
                _overlayStack.push(el);
                _overlayFocusStack.push(prev);

                el.classList.add('show');
                el.setAttribute('aria-hidden', 'false');
                el.setAttribute('role', 'dialog');
                el.setAttribute('aria-modal', 'true');

                document.body.classList.add('tu-modal-open');
                game._inputBlocked = true;
                if (Utils && Utils.resetGameInput) Utils.resetGameInput(game);

                // 自动聚焦面板内第一个可交互控件，键盘/手柄更友好
                queueMicrotask(() => {
                    const t = _firstFocusable(el) || el;
                    try { t.focus({ preventScroll: true }); } catch { }
                });
            };

            const hideOverlay = (el) => {
                if (!el) return;

                el.classList.remove('show');
                el.setAttribute('aria-hidden', 'true');
                el.removeAttribute('aria-modal');

                // 从栈中移除（支持“嵌套”弹窗：帮助 -> 设置 等）
                const idx = _overlayStack.lastIndexOf(el);
                let prev = null;
                if (idx !== -1) {
                    _overlayStack.splice(idx, 1);
                    prev = _overlayFocusStack.splice(idx, 1)[0] || null;
                }

                // 只有当所有 overlay 都关闭时才解除屏蔽
                const anyOpen =
                    (pauseOverlay && pauseOverlay.classList.contains('show')) ||
                    (settingsOverlay && settingsOverlay.classList.contains('show')) ||
                    (helpOverlay && helpOverlay.classList.contains('show')) ||
                    (game.inventoryUI && game.inventoryUI.isOpen) ||
                    (game.crafting && game.crafting.isOpen);

                game._inputBlocked = anyOpen;
                if (!anyOpen) document.body.classList.remove('tu-modal-open');

                // 还原焦点
                if (prev && document.contains(prev)) {
                    queueMicrotask(() => {
                        try { prev.focus({ preventScroll: true }); } catch { }
                    });
                }
            };

            const setPaused = (v) => {
                game.paused = !!v;
                if (game.paused) showOverlay(pauseOverlay);
                else hideOverlay(pauseOverlay);
            };

            // 交给 InputManager 统一处理键盘（Esc/H 等），避免多个 keydown 监听相互“抢键”
            game._ux = {
                pauseOverlay,
                settingsOverlay,
                helpOverlay,
                showOverlay,
                hideOverlay,
                setPaused,
                isHelpOpen: () => !!(helpOverlay && helpOverlay.classList.contains('show')),
                isSettingsOpen: () => !!(settingsOverlay && settingsOverlay.classList.contains('show')),
                closeSettings: () => {
                    // 统一关闭逻辑：根据进入前状态决定返回暂停菜单或继续游戏
                    hideOverlay(settingsOverlay);
                    if (game._settingsReturnToPause) {
                        showOverlay(pauseOverlay);
                        game.paused = true;
                    } else {
                        game.paused = false;
                        hideOverlay(pauseOverlay);
                    }
                },
                isPauseOpen: () => !!(pauseOverlay && pauseOverlay.classList.contains('show')),
                toggleHelp: () => {
                    if (!helpOverlay) return;
                    if (helpOverlay.classList.contains('show')) {
                        hideOverlay(helpOverlay);
                    } else {
                        showOverlay(helpOverlay);
                    }
                    try { localStorage.setItem('terraria_ultra_help_seen_v1', '1'); } catch { }
                }
            };

            if (btnPause) btnPause.addEventListener('click', () => { game.audio && game.audio.play('ui'); setPaused(!game.paused); });
            if (btnSettings) btnSettings.addEventListener('click', () => {
                game.audio && game.audio.play('ui');

                // 记录：进入设置前是否已处于暂停（用于返回逻辑）
                game._settingsReturnToPause = !!game.paused;

                // 同步控件值
                syncSettingsControls(game.settings);

                // 设置面板打开时：暂停游戏、隐藏暂停菜单（避免叠层）
                game.paused = true;
                hideOverlay(pauseOverlay);
                showOverlay(settingsOverlay);
            });
            if (btnSave) btnSave.addEventListener('click', () => {
                game.audio && game.audio.play('ui');
                game.saveSystem.save('manual');
            });
            if (btnHelp) btnHelp.addEventListener('click', () => {
                game.audio && game.audio.play('ui');
                if (helpOverlay) showOverlay(helpOverlay);
                try { localStorage.setItem('terraria_ultra_help_seen_v1', '1'); } catch { }
            });

            // 暂停面板按钮
            const pauseClose = document.getElementById('pause-close');
            const pauseResume = document.getElementById('pause-resume');
            const pauseSave = document.getElementById('pause-save');
            const pauseNew = document.getElementById('pause-newworld');
            const pauseFullscreen = document.getElementById('pause-fullscreen');

            const resume = () => { game.audio && game.audio.play('ui'); game.paused = false; hideOverlay(pauseOverlay); };
            if (pauseClose) pauseClose.addEventListener('click', resume);
            if (pauseResume) pauseResume.addEventListener('click', resume);
            if (pauseSave) pauseSave.addEventListener('click', () => { game.audio && game.audio.play('ui'); game.saveSystem.save('manual'); });
            if (pauseNew) pauseNew.addEventListener('click', () => {
                game.audio && game.audio.play('ui');
                if (confirm('确定要开启新世界吗？这会清除当前存档。')) {
                    SaveSystem.clear();
                    location.reload();
                }
            });

            const toggleFullscreen = async () => {
                const fm = window.TU && window.TU.FullscreenManager;
                if (fm && typeof fm.toggle === 'function') return fm.toggle();
                // fallback（极简）
                try {
                    const doc = document;
                    if (doc.fullscreenElement && doc.exitFullscreen) await doc.exitFullscreen();
                    else if (doc.documentElement && doc.documentElement.requestFullscreen) await doc.documentElement.requestFullscreen();
                } catch { }
            };
            if (pauseFullscreen) pauseFullscreen.addEventListener('click', () => { game.audio && game.audio.play('ui'); toggleFullscreen(); });

            // 设置面板按钮
            const settingsClose = document.getElementById('settings-close');
            const settingsApply = document.getElementById('settings-apply');
            const settingsReset = document.getElementById('settings-reset');
            const settingsClear = document.getElementById('settings-clear-save');

            if (settingsClose) settingsClose.addEventListener('click', () => {
                game.audio && game.audio.play('ui');
                // 关闭设置：若原本在暂停菜单中进入，则返回暂停菜单；否则继续游戏
                hideOverlay(settingsOverlay);
                if (game._settingsReturnToPause) {
                    showOverlay(pauseOverlay);
                    game.paused = true;
                } else {
                    game.paused = false;
                    hideOverlay(pauseOverlay);
                }
            });
            if (settingsReset) settingsReset.addEventListener('click', () => {
                game.audio && game.audio.play('ui');
                game.settings = GameSettings.applyToDocument(GameSettings.defaults());
                if (game.quality && typeof game.quality.onSettingsChanged === 'function') game.quality.onSettingsChanged();
                GameSettings.save(game.settings);
                syncSettingsControls(game.settings);

                // 体验参数即时生效
                game._placeIntervalMs = game.settings.placeIntervalMs || game._placeIntervalMs;

                // reset 后回到高特效
                try { game._setQuality && game._setQuality('high'); } catch { }
                if (game._perf) { game._perf.lowForMs = 0; game._perf.highForMs = 0; }

                // resize 让 DPR 立即生效
                if (game.renderer) game.renderer.resize();
                if (game.audio) game.audio.setVolume(game.settings.sfxVolume);
                Toast.show('↩ 已恢复默认');
            });
            if (settingsClear) settingsClear.addEventListener('click', () => {
                game.audio && game.audio.play('ui');
                if (confirm('确定删除存档吗？')) {
                    SaveSystem.clear();
                    Toast.show('🗑 已删除存档');
                }
            });

            if (settingsApply) settingsApply.addEventListener('click', () => {
                game.audio && game.audio.play('ui');
                const prevAuto = !!(game.settings && game.settings.autoQuality);
                const s = readSettingsControls(game.settings);
                game.settings = GameSettings.applyToDocument(s);
                if (game.quality && typeof game.quality.onSettingsChanged === 'function') game.quality.onSettingsChanged();
                GameSettings.save(game.settings);

                // 体验参数即时生效
                game._placeIntervalMs = game.settings.placeIntervalMs || game._placeIntervalMs;

                // 自动性能调节：如果用户关闭，则立即恢复高特效并停止自动切档
                if (prevAuto && game.settings.autoQuality === false) {
                    try { game._setQuality && game._setQuality('high'); } catch { }
                    if (game._perf) { game._perf.lowForMs = 0; game._perf.highForMs = 0; }
                }

                if (game.audio) game.audio.setVolume(game.settings.sfxVolume);
                if (game.renderer) game.renderer.resize(); // DPR 立即生效
                Toast.show('✅ 已应用设置');
                hideOverlay(settingsOverlay);
                if (game._settingsReturnToPause) {
                    showOverlay(pauseOverlay);
                    game.paused = true;
                } else {
                    game.paused = false;
                    hideOverlay(pauseOverlay);
                }
            });

            // 设置面板：滑块实时显示数值
            const $ = (id) => document.getElementById(id);
            const bindRange = (rangeId, valId, fmt) => {
                const r = $(rangeId);
                const v = $(valId);
                if (!r || !v) return;
                const update = () => { v.textContent = fmt(r.value); };
                r.addEventListener('input', update, { passive: true });
                r.addEventListener('change', update, { passive: true });
                update();
            };
            bindRange('opt-joy', 'val-joy', (x) => x + 'px');
            bindRange('opt-btn', 'val-btn', (x) => x + 'px');
            bindRange('opt-sfx', 'val-sfx', (x) => x + '%');
            bindRange('opt-camsmooth', 'val-camsmooth', (x) => (Number(x) / 100).toFixed(2));
            bindRange('opt-lookahead', 'val-lookahead', (x) => (Number(x) / 100).toFixed(2) + 'x');
            bindRange('opt-placeinterval', 'val-placeinterval', (x) => x + 'ms');

            // 帮助面板按钮 + 首次进入自动弹出
            const helpClose = document.getElementById('help-close');
            const helpOk = document.getElementById('help-ok');
            const helpDont = document.getElementById('help-dontshow');
            const markHelpSeen = () => { try { localStorage.setItem('terraria_ultra_help_seen_v1', '1'); } catch { } };

            const closeHelp = () => { game.audio && game.audio.play('ui'); hideOverlay(helpOverlay); markHelpSeen(); };
            if (helpClose) helpClose.addEventListener('click', closeHelp);
            if (helpOk) helpOk.addEventListener('click', closeHelp);
            if (helpDont) helpDont.addEventListener('click', () => { markHelpSeen(); closeHelp(); });

            try {
                const seen = localStorage.getItem('terraria_ultra_help_seen_v1');
                if (!seen && helpOverlay) {
                    // 不抢占加载提示：延迟一点点
                    setTimeout(() => {
                        try {
                            const savePrompt = document.getElementById('save-prompt-overlay');
                            if (savePrompt && savePrompt.classList.contains('show')) return;
                            showOverlay(helpOverlay);
                        } catch { }
                    }, 800);
                }
            } catch { }

            // 页面失焦/切后台：自动保存 + 自动暂停（移动端更友好）
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    try { game.saveSystem.save('autosave'); } catch { }
                    try { if (game._stopRafForHidden) game._stopRafForHidden(); } catch { }
                    game.paused = true;
                    if (pauseOverlay) showOverlay(pauseOverlay);
                } else {
                    // 回到前台：仅恢复 RAF（仍保持暂停，避免误操作）
                    try { if (game._resumeRafIfNeeded) game._resumeRafIfNeeded(); } catch { }
                }
            }, { passive: true });

            window.addEventListener('beforeunload', () => {
                try { game.saveSystem.save('autosave'); } catch { }
            });

            // 点击空白遮罩关闭（暂停/设置/帮助），体验更像“HUD面板”
            const _bindBackdropClose = (overlayEl, onClose) => {
                if (!overlayEl) return;
                // 防重复绑定：避免重复监听导致多次触发
                if (overlayEl.__tuBackdropBound) return;
                overlayEl.__tuBackdropBound = true;
                // pointerdown：比 click 更及时；passive:false 允许 preventDefault
                overlayEl.addEventListener('pointerdown', (e) => {
                    if (e.target !== overlayEl) return;
                    e.preventDefault();
                    e.stopPropagation();
                    try { onClose && onClose(); } catch { }
                }, { passive: false });
            };

            // 注意：pauseOverlay 的关闭逻辑就是“继续游戏”
            _bindBackdropClose(pauseOverlay, () => {
                if (!game.paused) return;
                game.audio && game.audio.play('ui');
                game.paused = false;
                hideOverlay(pauseOverlay);
            });

            _bindBackdropClose(helpOverlay, () => {
                if (!helpOverlay || !helpOverlay.classList.contains('show')) return;
                game.audio && game.audio.play('ui');
                hideOverlay(helpOverlay);
                try { localStorage.setItem('terraria_ultra_help_seen_v1', '1'); } catch { }
            });

            _bindBackdropClose(settingsOverlay, () => {
                if (!settingsOverlay || !settingsOverlay.classList.contains('show')) return;
                game.audio && game.audio.play('ui');
                if (game._ux && typeof game._ux.closeSettings === 'function') game._ux.closeSettings();
                else hideOverlay(settingsOverlay);
            });
        }

        function syncSettingsControls(settings) {
            const s = GameSettings.sanitize(settings);
            const $ = (id) => document.getElementById(id);

            const dpr = $('opt-dpr'); if (dpr) dpr.value = String(s.dprCap);
            const p = $('opt-particles'); if (p) p.value = s.particles ? '1' : '0';
            const a = $('opt-ambient'); if (a) a.value = s.ambient ? '1' : '0';
            const m = $('opt-minimap'); if (m) m.value = s.minimap ? '1' : '0';
            const bm = $('opt-bgmountains'); if (bm) bm.value = s.bgMountains ? '1' : '0';
            const fx = $('opt-postfx'); if (fx) fx.value = String(s.postFxMode);

            const aim = $('opt-aimassist'); if (aim) aim.value = s.aimAssist ? '1' : '0';
            const vib = $('opt-vibration'); if (vib) vib.value = s.vibration ? '1' : '0';
            const aq = $('opt-autoquality'); if (aq) aq.value = s.autoQuality ? '1' : '0';
            const sf = $('opt-showfps'); if (sf) sf.value = s.showFps ? '1' : '0';

            const cam = $('opt-camsmooth'); if (cam) cam.value = String(Math.round(s.cameraSmooth * 100));
            const look = $('opt-lookahead'); if (look) look.value = String(Math.round(s.lookAhead * 100));
            const pi = $('opt-placeinterval'); if (pi) pi.value = String(Math.round(s.placeIntervalMs));

            const joy = $('opt-joy'); if (joy) joy.value = String(s.joystickSize);
            const btn = $('opt-btn'); if (btn) btn.value = String(s.buttonSize);
            const sfx = $('opt-sfx'); if (sfx) sfx.value = String(Math.round(s.sfxVolume * 100));
            const rm = $('opt-reduce-motion'); if (rm) rm.value = s.reducedMotion ? '1' : '0';

            // 更新数值标签（打开设置时立即同步）
            const setVal = (id, text) => { const el = $(id); if (el) el.textContent = text; };
            if (joy) setVal('val-joy', joy.value + 'px');
            if (btn) setVal('val-btn', btn.value + 'px');
            if (sfx) setVal('val-sfx', sfx.value + '%');
            if (cam) setVal('val-camsmooth', (Number(cam.value) / 100).toFixed(2));
            if (look) setVal('val-lookahead', (Number(look.value) / 100).toFixed(2) + 'x');
            if (pi) setVal('val-placeinterval', pi.value + 'ms');
        }

        function readSettingsControls(current) {
            const base = GameSettings.sanitize(current);
            const $ = (id) => document.getElementById(id);
            const num = (el, fallback) => el ? parseFloat(el.value) : fallback;

            return Object.assign({}, base, {
                dprCap: num($('opt-dpr'), base.dprCap),
                particles: ($('opt-particles') ? $('opt-particles').value === '1' : base.particles),
                ambient: ($('opt-ambient') ? $('opt-ambient').value === '1' : base.ambient),
                minimap: ($('opt-minimap') ? $('opt-minimap').value === '1' : base.minimap),
                bgMountains: ($('opt-bgmountains') ? $('opt-bgmountains').value === '1' : base.bgMountains),

                postFxMode: num($('opt-postfx'), base.postFxMode),

                aimAssist: ($('opt-aimassist') ? $('opt-aimassist').value === '1' : base.aimAssist),
                vibration: ($('opt-vibration') ? $('opt-vibration').value === '1' : base.vibration),
                autoQuality: ($('opt-autoquality') ? $('opt-autoquality').value === '1' : base.autoQuality),
                showFps: ($('opt-showfps') ? $('opt-showfps').value === '1' : base.showFps),

                cameraSmooth: num($('opt-camsmooth'), base.cameraSmooth * 100) / 100,
                lookAhead: num($('opt-lookahead'), base.lookAhead * 100) / 100,
                placeIntervalMs: num($('opt-placeinterval'), base.placeIntervalMs),

                joystickSize: num($('opt-joy'), base.joystickSize),
                buttonSize: num($('opt-btn'), base.buttonSize),
                sfxVolume: num($('opt-sfx'), base.sfxVolume * 100) / 100,
                reducedMotion: ($('opt-reduce-motion') ? $('opt-reduce-motion').value === '1' : base.reducedMotion),
            });
        }

        // ───────────────────────── Exports ─────────────────────────
        window.TU = window.TU || {};
        Object.assign(window.TU, { applyInfoHintText, wireUXUI, syncSettingsControls, readSettingsControls });
