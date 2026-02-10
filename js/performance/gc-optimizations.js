// Module: gc-optimizations
// Source: lines 24122-24438 of original file
// Category: performance
// ═══════════════════════════════════════════════════════════

(() => {
                                    'use strict';

                                    const TU = window.TU = window.TU || {};

                                    // ─────────────────────────────────────────────────────────────
                                    // 1) Toast：对象池 + 并发上限，降低 DOM churn（频繁提示时更稳）
                                    // ─────────────────────────────────────────────────────────────
                                    try {
                                        if (typeof Toast !== 'undefined' && Toast && !Toast.__tuPoolV1) {
                                            Toast.__tuPoolV1 = true;

                                            const _getHost = Toast.el ? Toast.el.bind(Toast) : (() => document.getElementById('toast-container'));

                                            const pool = [];
                                            const active = [];
                                            const MAX_ACTIVE = 4;

                                            const clearTimers = (t) => {
                                                try { if (t._hideTimer) { clearTimeout(t._hideTimer); t._hideTimer = 0; } } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                try { if (t._rmTimer) { clearTimeout(t._rmTimer); t._rmTimer = 0; } } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                            };

                                            const detach = (t) => {
                                                try {
                                                    const idx = active.indexOf(t);
                                                    if (idx >= 0) active.splice(idx, 1);
                                                } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                try { if (t && t.parentNode) t.parentNode.removeChild(t); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                            };

                                            const recycle = (t) => {
                                                if (!t) return;
                                                clearTimers(t);
                                                try { t.classList.remove('show'); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                detach(t);
                                                pool.push(t);
                                            };

                                            const make = () => {
                                                const t = document.createElement('div');
                                                t.className = 'toast';
                                                t._hideTimer = 0;
                                                t._rmTimer = 0;
                                                return t;
                                            };

                                            Toast.show = function (msg, ms = 1600) {
                                                const host = _getHost();
                                                if (!host) return;

                                                // 并发上限：超出则先回收最旧的 toast
                                                while (active.length >= MAX_ACTIVE) {
                                                    recycle(active[0]);
                                                }

                                                const t = pool.pop() || make();
                                                clearTimers(t);

                                                try { t.textContent = String(msg ?? ''); } catch (_) { t.textContent = '' + msg; }
                                                try { t.classList.remove('show'); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                host.appendChild(t);
                                                active.push(t);

                                                requestAnimationFrame(() => { try { t.classList.add('show'); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); } });

                                                t._hideTimer = setTimeout(() => {
                                                    try { t.classList.remove('show'); } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                                    t._rmTimer = setTimeout(() => recycle(t), 220);
                                                }, ms);
                                            };
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                    // ─────────────────────────────────────────────────────────────
                                    // 2) 机器逻辑：压力板 + 抽水泵（减少每帧/每 tick 的小对象分配）
                                    // ─────────────────────────────────────────────────────────────
                                    try {
                                        if (typeof Game !== 'undefined' && Game.prototype) {
                                            const GP = Game.prototype;

                                            // 2.1 压力板：用 int key 代替 "x,y" 字符串；复用 Set/Array
                                            if (typeof GP._updatePressurePlates === 'function' && !GP.__tuPlateGcOptV1) {
                                                GP.__tuPlateGcOptV1 = true;

                                                const _old = GP._updatePressurePlates;

                                                GP._updatePressurePlates = function () {
                                                    const world = this.world;
                                                    const m = this._machines;
                                                    if (!world || !m || !m.plates || !m.plates.length) return;

                                                    const IDS = (TU && TU.LOGIC_BLOCKS) ? TU.LOGIC_BLOCKS : {};
                                                    const PL_OFF = IDS.PLATE_OFF;
                                                    const PL_ON = IDS.PLATE_ON;

                                                    // 兜底：若缺少依赖，走旧实现
                                                    if (PL_OFF == null || PL_ON == null || typeof this._writeTileFast !== 'function') {
                                                        return _old.call(this);
                                                    }

                                                    const CFG = (typeof CONFIG !== 'undefined') ? CONFIG : (TU.CONFIG || { TILE_SIZE: 16 });
                                                    const ts = (CFG && CFG.TILE_SIZE) ? CFG.TILE_SIZE : 16;
                                                    const w = world.w | 0;
                                                    const h = world.h | 0;
                                                    const tiles = world.tiles;

                                                    const pressed = this._platePressed || (this._platePressed = new Set());
                                                    const next = this._plateNext || (this._plateNext = new Set());
                                                    next.clear();

                                                    const markPlateUnder = (ent) => {
                                                        if (!ent) return;
                                                        const cx = (ent.x + ent.w * 0.5);
                                                        const fy = (ent.y + ent.h + 1);
                                                        const tx = (cx / ts) | 0;
                                                        const ty = (fy / ts) | 0;
                                                        if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
                                                        const id = tiles[tx][ty];
                                                        if (id === PL_OFF || id === PL_ON) {
                                                            next.add(tx + ty * w);
                                                        }
                                                    };

                                                    // player
                                                    markPlateUnder(this.player);

                                                    // mobs/enemies if present
                                                    try {
                                                        const ents = this.entities || this.mobs || this.enemies;
                                                        if (Array.isArray(ents)) {
                                                            for (let i = 0; i < ents.length; i++) markPlateUnder(ents[i]);
                                                        }
                                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }

                                                    // Apply state changes (ON for pressed, OFF for released)
                                                    for (const k of next) {
                                                        if (pressed.has(k)) continue;
                                                        pressed.add(k);
                                                        const y = (k / w) | 0;
                                                        const x = (k - y * w) | 0;
                                                        this._writeTileFast(x, y, PL_ON, false);
                                                    }

                                                    if (pressed.size) {
                                                        // 收集释放列表：避免在迭代 Set 时 delete 的边缘行为
                                                        const toOff = this._plateToOff || (this._plateToOff = []);
                                                        toOff.length = 0;
                                                        for (const k of pressed) {
                                                            if (!next.has(k)) toOff.push(k);
                                                        }
                                                        for (let i = 0; i < toOff.length; i++) {
                                                            const k = toOff[i] | 0;
                                                            pressed.delete(k);
                                                            const y = (k / w) | 0;
                                                            const x = (k - y * w) | 0;
                                                            this._writeTileFast(x, y, PL_OFF, false);
                                                        }
                                                    }
                                                };
                                            }

                                            // 2.2 抽水泵：复用 BFS 数组；邻居选择不再分配小数组
                                            if (typeof GP._pumpSim === 'function' && !GP.__tuPumpGcOptV1) {
                                                GP.__tuPumpGcOptV1 = true;

                                                const _oldPump = GP._pumpSim;

                                                GP._pumpSim = function (dtMs) {
                                                    const world = this.world;
                                                    if (!world || !world.tiles) return;

                                                    const m = this._machines;
                                                    if (!m || !m.pumpsIn || !m.pumpsOut) return;
                                                    if (!m.pumpsIn.length || !m.pumpsOut.length) return;

                                                    this._pumpAcc = (this._pumpAcc || 0) + (dtMs || 0);
                                                    if (this._pumpAcc < 220) return;
                                                    this._pumpAcc = 0;

                                                    const IDS = (TU && TU.LOGIC_BLOCKS) ? TU.LOGIC_BLOCKS : {};
                                                    const B = (typeof BLOCK !== 'undefined') ? BLOCK : (TU.BLOCK || {});

                                                    // 兜底：关键 ID/常量不全则走旧实现
                                                    if (!IDS || IDS.PUMP_IN == null || IDS.PUMP_OUT == null || IDS.WIRE_OFF == null || IDS.WIRE_ON == null || B.AIR == null || B.WATER == null) {
                                                        return _oldPump.call(this, dtMs);
                                                    }

                                                    const w = world.w | 0, h = world.h | 0;
                                                    const tiles = world.tiles;

                                                    // Visited marks for BFS
                                                    if (!this._pumpVisited || this._pumpVisited.length !== w * h) {
                                                        this._pumpVisited = new Uint32Array(w * h);
                                                        this._pumpStamp = 1;
                                                    }
                                                    let stamp = (this._pumpStamp + 1) >>> 0;
                                                    if (stamp === 0) { this._pumpVisited.fill(0); stamp = 1; }
                                                    this._pumpStamp = stamp;
                                                    const vis = this._pumpVisited;

                                                    const isWire = (id) => (id === IDS.WIRE_OFF || id === IDS.WIRE_ON);
                                                    const isSwitch = (id) => (id === IDS.SWITCH_OFF || id === IDS.SWITCH_ON || id === IDS.PLATE_OFF || id === IDS.PLATE_ON);
                                                    const isPump = (id) => (id === IDS.PUMP_IN || id === IDS.PUMP_OUT);
                                                    const isConductor = (id) => isWire(id) || isSwitch(id) || isPump(id);
                                                    const isPoweredSource = (id) => (id === IDS.SWITCH_ON || id === IDS.PLATE_ON);

                                                    const tmpIn = this._pumpTmpIn || (this._pumpTmpIn = new Int32Array(2));
                                                    const tmpOut = this._pumpTmpOut || (this._pumpTmpOut = new Int32Array(2));

                                                    const pickNeighborWater = (x, y, outXY) => {
                                                        // prefer below
                                                        let nx = x, ny = y + 1;
                                                        if (ny >= 0 && ny < h && tiles[nx][ny] === B.WATER) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        nx = x - 1; ny = y;
                                                        if (nx >= 0 && nx < w && tiles[nx][ny] === B.WATER) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        nx = x + 1;
                                                        if (nx >= 0 && nx < w && tiles[nx][ny] === B.WATER) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        nx = x; ny = y - 1;
                                                        if (ny >= 0 && ny < h && tiles[nx][ny] === B.WATER) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        return false;
                                                    };

                                                    const pickNeighborOutput = (x, y, outXY) => {
                                                        let nx = x, ny = y - 1;
                                                        if (ny >= 0 && ny < h && tiles[nx][ny] === B.AIR) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        nx = x + 1; ny = y;
                                                        if (nx >= 0 && nx < w && tiles[nx][ny] === B.AIR) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        nx = x - 1;
                                                        if (nx >= 0 && nx < w && tiles[nx][ny] === B.AIR) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        nx = x; ny = y + 1;
                                                        if (ny >= 0 && ny < h && tiles[nx][ny] === B.AIR) { outXY[0] = nx; outXY[1] = ny; return true; }
                                                        return false;
                                                    };

                                                    // Process a small number of pumps per tick to keep fps stable
                                                    const budget = (this._perf && this._perf.level === 'low') ? 1 : 3;

                                                    const qx = this._pumpQX || (this._pumpQX = []);
                                                    const qy = this._pumpQY || (this._pumpQY = []);
                                                    const outList = this._pumpOutList || (this._pumpOutList = []);

                                                    let done = 0;

                                                    for (let pi = 0; pi < m.pumpsIn.length && done < budget; pi++) {
                                                        const pIn = m.pumpsIn[pi];
                                                        if (!pIn) continue;

                                                        const sx = pIn[0] | 0;
                                                        const sy = pIn[1] | 0;

                                                        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
                                                        if (tiles[sx][sy] !== IDS.PUMP_IN) continue;

                                                        // BFS wire network
                                                        qx.length = 0; qy.length = 0;
                                                        outList.length = 0;
                                                        qx.push(sx); qy.push(sy);

                                                        let powered = false;
                                                        let nodes = 0;

                                                        vis[sx + sy * w] = stamp;

                                                        while (qx.length && nodes < 24000) {
                                                            const x = qx.pop() | 0;
                                                            const y = qy.pop() | 0;
                                                            nodes++;

                                                            const id = tiles[x][y];
                                                            if (isPoweredSource(id)) powered = true;
                                                            if (id === IDS.PUMP_OUT) outList.push(x + y * w);

                                                            const push = (nx, ny) => {
                                                                if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
                                                                const k = nx + ny * w;
                                                                if (vis[k] === stamp) return;
                                                                const tid = tiles[nx][ny];
                                                                if (!isConductor(tid)) return;
                                                                vis[k] = stamp;
                                                                qx.push(nx); qy.push(ny);
                                                            };

                                                            push(x - 1, y);
                                                            push(x + 1, y);
                                                            push(x, y - 1);
                                                            push(x, y + 1);
                                                        }

                                                        if (!powered || !outList.length) continue;

                                                        // intake -> output water teleport
                                                        if (!pickNeighborWater(sx, sy, tmpIn)) continue;

                                                        // pick a deterministic output (round-robin)
                                                        const rr = (this._pumpRR || 0) % outList.length;
                                                        this._pumpRR = (rr + 1) | 0;
                                                        const outK = outList[rr] | 0;
                                                        const oy = (outK / w) | 0;
                                                        const ox = (outK - oy * w) | 0;

                                                        if (!pickNeighborOutput(ox, oy, tmpOut)) continue;

                                                        // move one tile of water (coarse, region independent)
                                                        this._writeTileFast(tmpIn[0], tmpIn[1], B.AIR, false);
                                                        this._writeTileFast(tmpOut[0], tmpOut[1], B.WATER, false);

                                                        done++;
                                                    }
                                                };
                                            }
                                        }
                                    } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                })();
