// Module: save-system
// Source: lines 4532-4840 of original file
// Category: systems
// ═══════════════════════════════════════════════════════════

class SaveSystem {
            static KEY = 'terraria_ultra_save_v1';
            constructor(game) {
                this.game = game;
                this.seed = null;
                this.diff = new Map(); // key "x,y" -> blockId
                this._autosaveAcc = 0;
                this._disabled = false;
            }

            static hasSave() {
                try { return !!localStorage.getItem(SaveSystem.KEY); } catch { return false; }
            }
            static clear() {
                try { localStorage.removeItem(SaveSystem.KEY); } catch { }
            }
            static load() {
                try {
                    const raw = localStorage.getItem(SaveSystem.KEY);
                    if (!raw) return null;
                    
                    // 检查数据大小
                    if (raw.length > 10 * 1024 * 1024) { // 10MB限制
                        console.error('[SaveSystem] Save data too large');
                        return null;
                    }
                    
                    const data = JSON.parse(raw);
                    
                    // 验证基本结构
                    if (!data || typeof data !== 'object' || data.v !== 1) {
                        console.warn('[SaveSystem] Invalid save format');
                        return null;
                    }
                    
                    // 验证必需字段
                    const requiredFields = ['ts', 'seed', 'player', 'w', 'h'];
                    for (const field of requiredFields) {
                        if (!(field in data)) {
                            console.warn('[SaveSystem] Missing required field:', field);
                            return null;
                        }
                    }
                    
                    // 解码 diffs（支持旧版数组 & 新版 RLE）
                    const diff = new Map();
                    const diffs = data.diffs;

                    // 旧版：["x_y_id", ...]
                    if (Array.isArray(diffs)) {
                        for (const s of diffs) {
                            if (typeof s !== 'string') continue;
                            const parts = s.split('_');
                            if (parts.length !== 3) continue;
                            const x = parseInt(parts[0], 36);
                            const y = parseInt(parts[1], 36);
                            const id = parseInt(parts[2], 36);
                            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(id)) continue;
                            diff.set(x + ',' + y, id);
                        }
                    }
                    // 新版：{ fmt:'rle1', w, data:[ 'r<start>_<len>_<id>', ... ] }
                    else if (diffs && typeof diffs === 'object' && diffs.fmt === 'rle1' && Array.isArray(diffs.data)) {
                        const fallbackW = (Number.isFinite(data.w) ? (data.w | 0) : ((typeof CONFIG !== 'undefined' && CONFIG && Number.isFinite(CONFIG.WORLD_WIDTH)) ? (CONFIG.WORLD_WIDTH | 0) : 0));
                        const w = Number.isFinite(diffs.w) ? (diffs.w | 0) : fallbackW;
                        if (!Number.isFinite(w) || w <= 0) return null;
                        
                        // 限制diff条目数
                        let totalEntries = 0;
                        const MAX_DIFF_ENTRIES = 100000;
                        
                        for (const token of diffs.data) {
                            if (typeof token !== 'string') continue;
                            const t = token.charAt(0) === 'r' ? token.slice(1) : token;
                            const parts = t.split('_');
                            if (parts.length !== 3) continue;
                            const start = parseInt(parts[0], 36);
                            const len = parseInt(parts[1], 36);
                            const id = parseInt(parts[2], 36);
                            if (!Number.isFinite(start) || !Number.isFinite(len) || !Number.isFinite(id) || len <= 0) continue;

                            // 防御：避免异常存档导致长循环
                            const maxLen = Math.min(len, 20000);
                            for (let i = 0; i < maxLen; i++) {
                                if (totalEntries >= MAX_DIFF_ENTRIES) {
                                    console.warn('[SaveSystem] Diff entries limit reached');
                                    break;
                                }
                                const idx = start + i;
                                const x = idx % w;
                                const y = (idx / w) | 0;
                                diff.set(x + ',' + y, id);
                                totalEntries++;
                            }
                        }
                    }

                    data._diffMap = diff;
                    return data;
                } catch (e) {
                    console.error('[SaveSystem] Load error:', e);
                    return null;
                }
            }
            static _encodeDiff(diffMap, worldW) {
                const fallbackW = (typeof CONFIG !== 'undefined' && CONFIG && Number.isFinite(CONFIG.WORLD_WIDTH)) ? (CONFIG.WORLD_WIDTH | 0) : 0;
                const w = Number.isFinite(worldW) ? (worldW | 0) : fallbackW;
                if (!Number.isFinite(w) || w <= 0) return { fmt: 'rle1', w: (fallbackW || 0), data: [] };

                // RLE：按线性索引排序，将连续且相同的 blockId 合并为一条记录
                const entries = [];
                for (const [k, id] of diffMap.entries()) {
                    const [x, y] = k.split(',').map(n => parseInt(n, 10));
                    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(id)) continue;
                    entries.push([y * w + x, id]);
                }
                entries.sort((a, b) => a[0] - b[0]);

                const out = [];
                for (let i = 0; i < entries.length;) {
                    const start = entries[i][0];
                    const id = entries[i][1];
                    let len = 1;
                    while (i + len < entries.length && entries[i + len][1] === id && entries[i + len][0] === start + len) len++;
                    out.push('r' + start.toString(36) + '_' + len.toString(36) + '_' + id.toString(36));
                    i += len;
                }

                return { fmt: 'rle1', w, data: out };
            }

            static async promptStartIfNeeded() {
                const has = SaveSystem.hasSave();
                if (!has) return { mode: 'new', save: null };
                const overlay = document.getElementById('save-prompt-overlay');
                const btnC = document.getElementById('save-prompt-continue');
                const btnN = document.getElementById('save-prompt-new');
                const btnX = document.getElementById('save-prompt-close');

                if (!overlay || !btnC || !btnN) return { mode: 'new', save: null };

                return await new Promise((resolve) => {
                    const done = (mode) => {
                        overlay.classList.remove('show');
                        overlay.setAttribute('aria-hidden', 'true');
                        btnC.removeEventListener('click', onC);
                        btnN.removeEventListener('click', onN);
                        btnX && btnX.removeEventListener('click', onX);
                        let loaded = null;
                        if (mode === 'continue') {
                            loaded = SaveSystem.load();
                            if (!loaded) {
                                try { if (typeof Toast !== 'undefined' && Toast && Toast.show) Toast.show('⚠️ 存档损坏或不兼容：已开始新世界', 2600); } catch { }
                                try { SaveSystem.clear(); } catch { }
                                mode = 'new';
                            }
                        }
                        resolve({ mode, save: loaded });
                    };
                    const onC = () => done('continue');
                    const onN = () => done('new');
                    const onX = () => done('new');
                    overlay.classList.add('show');
                    overlay.setAttribute('aria-hidden', 'false');
                    btnC.addEventListener('click', onC);
                    btnN.addEventListener('click', onN);
                    if (btnX) btnX.addEventListener('click', onX);
                });
            }

            importLoaded(save) {
                if (!save) return;
                this.seed = save.seed;
                this.diff = save._diffMap || new Map();
            }

            markTile(x, y, newId) {
                if (this._disabled) return;
                this.diff.set(x + ',' + y, newId);
            }

            tickAutosave(dt) {
                if (this._disabled) return;
                this._autosaveAcc += dt;
                if (this._autosaveAcc >= (this.game.settings.autosaveMs || 30000)) {
                    this._autosaveAcc = 0;
                    this.save('autosave');
                }
            }

            save(reason = 'manual') {
                if (this._disabled) return;
                const g = this.game;
                if (!g || !g.world || !g.player) {
                    console.warn('[SaveSystem] Cannot save: invalid game state');
                    return;
                }

                // diff大小限制
                if (this.diff.size > 50000) {
                    this._disabled = true;
                    Toast.show('⚠️ 改动过多：自动保存已停用（可手动保存/清理存档）', 2800);
                    return;
                }

                // 验证玩家数据
                if (!Number.isFinite(g.player.x) || !Number.isFinite(g.player.y)) {
                    console.warn('[SaveSystem] Invalid player position');
                    return;
                }

                const payload = {
                    v: 1,
                    ts: Date.now(),
                    seed: g.seed || this.seed || Date.now(),
                    timeOfDay: Math.max(0, Math.min(1, g.timeOfDay || 0.35)),
                    player: {
                        x: g.player.x, 
                        y: g.player.y,
                        health: Math.max(0, Math.min(1000, g.player.health || 100)), 
                        mana: Math.max(0, Math.min(1000, g.player.mana || 100)),
                        inventory: Array.isArray(g.player.inventory) ? g.player.inventory.slice(0, 36) : [],
                        selectedSlot: Math.max(0, Math.min(35, g.player.selectedSlot || 0))
                    },
                    w: g.world.w, 
                    h: g.world.h,
                    diffs: SaveSystem._encodeDiff(this.diff, g.world.w),
                };

                // 检查序列化后的大小
                let serialized;
                try {
                    serialized = JSON.stringify(payload);
                } catch (e) {
                    console.error('[SaveSystem] Serialization error:', e);
                    Toast.show('⚠️ 存档序列化失败', 2600);
                    return;
                }
                
                if (serialized.length > 4 * 1024 * 1024) { // 4MB限制
                    this._disabled = true;
                    Toast.show('⚠️ 存档过大：自动保存已停用', 2800);
                    return;
                }

                try {
                    localStorage.setItem(SaveSystem.KEY, serialized);
                    if (reason === 'manual') Toast.show('💾 已保存');
                    if (reason === 'autosave') Toast.show('✅ 自动保存', 1100);
                } catch (e) {
                    this._disabled = true;
                    Toast.show('⚠️ 存档失败：空间不足，已停用自动保存', 2600);
                }
            }

            applyToWorld(world, save) {
                if (!world || !save || !save._diffMap) {
                    console.warn('[SaveSystem] Cannot apply to world: invalid parameters');
                    return;
                }
                
                let appliedCount = 0;
                const MAX_APPLY = 100000;
                
                for (const [k, id] of save._diffMap.entries()) {
                    if (appliedCount >= MAX_APPLY) {
                        console.warn('[SaveSystem] Apply limit reached');
                        break;
                    }
                    
                    const parts = String(k).split(',');
                    if (parts.length !== 2) continue;
                    
                    const x = parseInt(parts[0], 10);
                    const y = parseInt(parts[1], 10);
                    
                    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
                    if (!Number.isFinite(id)) continue;
                    
                    if (x >= 0 && x < world.w && y >= 0 && y < world.h) {
                        if (Array.isArray(world.tiles) && Array.isArray(world.tiles[x])) {
                            world.tiles[x][y] = id;
                            appliedCount++;
                        }
                    }
                }
                
                console.log('[SaveSystem] Applied', appliedCount, 'tiles to world');
            }

            applyToPlayer(player, ui, save) {
                if (!player || !save || !save.player) return;
                const p = save.player;
                if (Number.isFinite(p.x)) player.x = p.x;
                if (Number.isFinite(p.y)) player.y = p.y;
                if (Number.isFinite(p.health)) player.health = p.health;
                if (Number.isFinite(p.mana)) player.mana = p.mana;
                if (Array.isArray(p.inventory)) { try { const maxSize = (typeof INVENTORY_LIMITS !== 'undefined' && INVENTORY_LIMITS && INVENTORY_LIMITS.MAX_SIZE) ? INVENTORY_LIMITS.MAX_SIZE : 36; const maxStack = (typeof INVENTORY_LIMITS !== 'undefined' && INVENTORY_LIMITS && INVENTORY_LIMITS.MAX_STACK) ? INVENTORY_LIMITS.MAX_STACK : 999; const inv = []; for (let i = 0; i < p.inventory.length && inv.length < maxSize; i++) { const it = p.inventory[i]; if (!it) continue; const id = (it.id != null) ? String(it.id) : ''; if (!id) continue; const bd = (typeof BLOCK_DATA !== 'undefined' && BLOCK_DATA) ? BLOCK_DATA[id] : null; if (!bd) continue; let c = Math.floor(+it.count || 0); if (!Number.isFinite(c) || c <= 0) continue; if (c > maxStack) c = maxStack; inv.push({ id: id, name: (it.name && typeof it.name === 'string') ? it.name : (bd.name || id), count: c }); } if (inv.length) player.inventory = inv; } catch (_) { player.inventory = p.inventory; } }
                if (Number.isFinite(p.selectedSlot)) { try { const maxHot = 8; const maxIdx = Math.min(maxHot, (player.inventory && player.inventory.length > 0) ? (player.inventory.length - 1) : maxHot); const s = Math.floor(p.selectedSlot); player.selectedSlot = Math.max(0, Math.min(maxIdx, s)); } catch (_) { player.selectedSlot = p.selectedSlot; } }
                if (ui) ui.buildHotbar();
            }
        }

        // ───────────────────────── Exports ─────────────────────────
        window.TU = window.TU || {};
        Object.assign(window.TU, { SaveSystem });
