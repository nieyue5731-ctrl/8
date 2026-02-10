// Module: touch-controller
// Source: lines 9808-9992 of original file
// Category: input
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
        class TouchController {
            constructor(game) {
                this.game = game;
                this.joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
                this.buttons = { jump: false, mine: false, place: false };
                this.crosshair = { x: 0, y: 0, visible: false };
                this.targetTouchId = null;

                this._init();
                // 复用输入对象，避免每帧分配新对象（移动端 GC 压力大）
                this._input = { left: false, right: false, jump: false, sprint: false, mine: false, place: false, targetX: 0, targetY: 0, hasTarget: false };

            }

            _init() {
                const joystickEl = document.getElementById('joystick');
                const thumbEl = document.getElementById('joystick-thumb');
                const crosshairEl = document.getElementById('crosshair');

                // 兜底：若移动端 UI 节点缺失（被裁剪/二次封装），不要直接崩溃
                if (!joystickEl || !thumbEl || !crosshairEl) return;

                joystickEl.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const rect = joystickEl.getBoundingClientRect();
                    this.joystick.active = true;
                    this.joystick.startX = rect.left + rect.width / 2;
                    this.joystick.startY = rect.top + rect.height / 2;
                    this._updateJoystick(touch.clientX, touch.clientY, thumbEl);
                }, { passive: false });
                joystickEl.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    if (!this.joystick.active) return;
                    const touch = e.touches[0];
                    this._updateJoystick(touch.clientX, touch.clientY, thumbEl);
                }, { passive: false });
                joystickEl.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.joystick.active = false;
                    this.joystick.dx = 0;
                    this.joystick.dy = 0;
                    thumbEl.style.transform = 'translate(-50%, -50%)';
                }, { passive: false });
                this._setupButton('btn-jump', 'jump');
                this._setupButton('btn-mine', 'mine');
                this._setupButton('btn-place', 'place');

                const canvas = this.game.canvas;
                canvas.addEventListener('touchstart', (e) => {
                    for (const touch of e.changedTouches) {
                        if (touch.clientX < 200 && touch.clientY > window.innerHeight - 220) continue;
                        if (touch.clientX > window.innerWidth - 200 && touch.clientY > window.innerHeight - 220) continue;

                        this.targetTouchId = touch.identifier;
                        this._updateCrosshair(touch.clientX, touch.clientY, crosshairEl);
                        this.crosshair.visible = true;
                        crosshairEl.style.display = 'block';
                    }
                }, { passive: false });
                canvas.addEventListener('touchmove', (e) => {
                    for (const touch of e.changedTouches) {
                        if (touch.identifier === this.targetTouchId) {
                            this._updateCrosshair(touch.clientX, touch.clientY, crosshairEl);
                        }
                    }
                }, { passive: false });
                canvas.addEventListener('touchend', (e) => {
                    for (const touch of e.changedTouches) {
                        if (touch.identifier === this.targetTouchId) {
                            this.targetTouchId = null;
                        }
                    }
                }, { passive: false });
            }

            _updateJoystick(tx, ty, thumbEl) {
                let dx = tx - this.joystick.startX;
                let dy = ty - this.joystick.startY;

                // 根据设置动态缩放摇杆行程（适配不同摇杆尺寸）
                const size = (this.game && this.game.settings && this.game.settings.joystickSize) ? this.game.settings.joystickSize : 140;
                const maxDist = Math.max(34, size * 0.33);

                const dist = Math.hypot(dx, dy);

                if (dist > maxDist) {
                    dx = dx / dist * maxDist;
                    dy = dy / dist * maxDist;
                }

                // 归一化输入
                let nx = dx / maxDist;
                let ny = dy / maxDist;

                // 死区 + 灵敏度曲线（平方/立方等）
                const dz = (this.game && this.game.settings && typeof this.game.settings.joystickDeadzone === 'number')
                    ? this.game.settings.joystickDeadzone
                    : 0.14;
                const curve = (this.game && this.game.settings && typeof this.game.settings.joystickCurve === 'number')
                    ? this.game.settings.joystickCurve
                    : 2.2;

                let mag = Math.hypot(nx, ny);

                if (mag < dz) {
                    nx = 0; ny = 0; dx = 0; dy = 0;
                } else {
                    const t = (mag - dz) / (1 - dz);
                    const eased = Math.pow(Math.max(0, Math.min(1, t)), curve);
                    const s = (mag > 1e-5) ? (eased / mag) : 0;
                    nx *= s; ny *= s;
                    dx = nx * maxDist;
                    dy = ny * maxDist;
                }

                this.joystick.dx = nx;
                this.joystick.dy = ny;

                thumbEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            }

            _updateCrosshair(x, y, el) {
                this.crosshair.x = x;
                this.crosshair.y = y;
                el.style.left = (x - 20) + 'px';
                el.style.top = (y - 20) + 'px';
            }

            _setupButton(id, action) {
                const btn = document.getElementById(id);
                if (!btn) return;

                const vibrate = (ms) => {
                    try {
                        const s = this.game && this.game.settings;
                        if (s && s.vibration && navigator.vibrate) navigator.vibrate(ms);
                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                };

                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.buttons[action] = true;
                    btn.classList.add('active');
                    vibrate(10);
                }, { passive: false });

                const up = (e) => {
                    e.preventDefault();
                    this.buttons[action] = false;
                    btn.classList.remove('active');
                };
                btn.addEventListener('touchend', up, { passive: false });
                btn.addEventListener('touchcancel', up, { passive: false });
            }

            getInput() {
                const o = this._input;
                o.left = this.joystick.dx < -0.3;
                o.right = this.joystick.dx > 0.3;
                o.jump = this.buttons.jump;
                o.sprint = Math.abs(this.joystick.dx) > 0.85;
                o.mine = this.buttons.mine;
                o.place = this.buttons.place;
                o.targetX = this.crosshair.x;
                o.targetY = this.crosshair.y;
                o.hasTarget = this.crosshair.visible;
                return o;
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        //                                   渲染器 (美化版)
        // ═══════════════════════════════════════════════════════════════════════════════

        // ═══════════════════════════════════════════════════════════════════════
        //                           Render constants (缓存减少分配)

        // ───────────────────────── Exports ─────────────────────────
        window.TU = window.TU || {};
        Object.assign(window.TU, { TouchController });
