// Module: tile-logic-patches_patch_1
// Source: lines 19008-20875 of original file
// Category: systems
// ═══════════════════════════════════════════════════════════

(() => {
                                    const TU = window.TU || {};
                                    (function () {
                                        const __p = ({
                                            id: 'v9_biomes_mines_dynamic_water_pumps_clouds_reverb',
                                            order: 80,
                                            description: "v9 生物群系/矿洞/动态水泵/云层/混响",
                                            apply: () => {
                                                'use strict';
                                                const TU = window.TU || (window.TU = {});
                                                const CFG = (typeof CONFIG !== 'undefined') ? CONFIG : (TU.CONFIG || { TILE_SIZE: 16 });
                                                const BLOCK = (typeof window.BLOCK !== 'undefined') ? window.BLOCK : (TU.BLOCK || {});
                                                const BD = (typeof window.BLOCK_DATA !== 'undefined') ? window.BLOCK_DATA : (TU.BLOCK_DATA || {});
                                                const SOLID = (typeof window.BLOCK_SOLID !== 'undefined') ? window.BLOCK_SOLID : (TU.BLOCK_SOLID || new Uint8Array(256));
                                                const LIQ = (typeof window.BLOCK_LIQUID !== 'undefined') ? window.BLOCK_LIQUID : (TU.BLOCK_LIQUID || new Uint8Array(256));
                                                const TRANSP = (typeof window.BLOCK_TRANSPARENT !== 'undefined') ? window.BLOCK_TRANSPARENT : (TU.BLOCK_TRANSPARENT || new Uint8Array(256));
                                                const WALK = (typeof window.BLOCK_WALKABLE !== 'undefined') ? window.BLOCK_WALKABLE : (TU.BLOCK_WALKABLE || new Uint8Array(256));
                                                const BL = (typeof window.BLOCK_LIGHT !== 'undefined') ? window.BLOCK_LIGHT : null;
                                                const BH = (typeof window.BLOCK_HARDNESS !== 'undefined') ? window.BLOCK_HARDNESS : null;
                                                const BC = (typeof window.BLOCK_COLOR !== 'undefined') ? window.BLOCK_COLOR : null;
                                                const SD = (typeof window.SUN_DECAY !== 'undefined') ? window.SUN_DECAY : null;

                                                const Game = (typeof window.Game !== 'undefined') ? window.Game : (TU.Game || null);
                                                const Renderer = TU.Renderer || window.Renderer || null;
                                                const AudioManager = TU.AudioManager || window.AudioManager || null;
                                                const WorldGenerator = TU.WorldGenerator || window.WorldGenerator || null;

                                                // ─────────────────────────────────────────────────────────────
                                                // 0) Biome utilities (3 bands: forest/desert/snow)
                                                // ─────────────────────────────────────────────────────────────
                                                const Biomes = TU.Biomes || (TU.Biomes = {});
                                                Biomes.bandAt = function (worldW, x) {
                                                    const t = worldW > 0 ? (x / worldW) : 0.5;
                                                    if (t < 0.34) return 'forest';
                                                    if (t < 0.68) return 'desert';
                                                    return 'snow';
                                                };

                                                // ─────────────────────────────────────────────────────────────
                                                // 1) Add Pump + Pressure Plate blocks (logic compatible)
                                                // ─────────────────────────────────────────────────────────────
                                                const IDS = TU.LOGIC_BLOCKS || (TU.LOGIC_BLOCKS = {});
                                                function allocId(start) {
                                                    try {
                                                        const used = new Set();
                                                        if (BLOCK && typeof BLOCK === 'object') {
                                                            for (const k in BLOCK) used.add(BLOCK[k] | 0);
                                                        }
                                                        for (let id = start; id < 255; id++) {
                                                            if (BD[id] || used.has(id)) continue;
                                                            return id;
                                                        }
                                                    } catch { }
                                                    return start;
                                                }

                                                if (!IDS.PUMP_IN) IDS.PUMP_IN = allocId(206);
                                                if (!IDS.PUMP_OUT) IDS.PUMP_OUT = allocId((IDS.PUMP_IN | 0) + 1);
                                                if (!IDS.PLATE_OFF) IDS.PLATE_OFF = allocId((IDS.PUMP_OUT | 0) + 1);
                                                if (!IDS.PLATE_ON) IDS.PLATE_ON = allocId((IDS.PLATE_OFF | 0) + 1);

                                                function addBlock(id, def) {
                                                    try { BD[id] = def; } catch { }
                                                    try { SOLID[id] = def.solid ? 1 : 0; } catch { }
                                                    try { TRANSP[id] = def.transparent ? 1 : 0; } catch { }
                                                    try { LIQ[id] = def.liquid ? 1 : 0; } catch { }
                                                    try { if (BL) BL[id] = def.light ? (def.light | 0) : 0; } catch { }
                                                    try { if (BH) BH[id] = def.hardness ? +def.hardness : 0; } catch { }
                                                    try { if (BC) BC[id] = def.color; } catch { }
                                                    try { if (WALK) WALK[id] = def.solid ? 0 : 1; } catch { }
                                                    try {
                                                        if (SD) {
                                                            const AIR = (BLOCK && BLOCK.AIR !== undefined) ? BLOCK.AIR : 0;
                                                            let v = 0;
                                                            if (def.solid && !def.transparent) v = 3;
                                                            else if (def.transparent && id !== AIR) v = 1;
                                                            SD[id] = v;
                                                        }
                                                    } catch { }
                                                }

                                                try {
                                                    if (!BD[IDS.PUMP_IN]) {
                                                        addBlock(IDS.PUMP_IN, { name: '泵(入水口)', solid: true, transparent: false, liquid: false, light: 0, hardness: 1.2, color: '#3b3f46' });
                                                        addBlock(IDS.PUMP_OUT, { name: '泵(出水口)', solid: true, transparent: false, liquid: false, light: 0, hardness: 1.2, color: '#3b3f46' });
                                                        addBlock(IDS.PLATE_OFF, { name: '压力板', solid: false, transparent: true, liquid: false, light: 0, hardness: 0.3, color: '#a37c57' });
                                                        addBlock(IDS.PLATE_ON, { name: '压力板(触发)', solid: false, transparent: true, liquid: false, light: 0, hardness: 0.3, color: '#d6a77a' });
                                                    }
                                                } catch (e) { console.warn('pump/plate block register failed', e); }

                                                // Pixel art for pump/plate (optional)
                                                try {
                                                    if (typeof TextureGenerator !== 'undefined' && TextureGenerator.prototype && !TextureGenerator.prototype.__pumpPlatePixV1) {
                                                        TextureGenerator.prototype.__pumpPlatePixV1 = true;
                                                        const _old = TextureGenerator.prototype._drawPixelArt;
                                                        TextureGenerator.prototype._drawPixelArt = function (ctx, id, data) {
                                                            const s = (CFG && CFG.TILE_SIZE) ? CFG.TILE_SIZE : 16;
                                                            if (id === IDS.PUMP_IN || id === IDS.PUMP_OUT) {
                                                                ctx.fillStyle = '#2b2f36'; ctx.fillRect(0, 0, s, s);
                                                                ctx.fillStyle = '#4a4f59'; ctx.fillRect(2, 2, s - 4, s - 4);
                                                                ctx.fillStyle = '#0f1115'; ctx.fillRect(4, 4, s - 8, s - 8);
                                                                ctx.fillStyle = (id === IDS.PUMP_IN) ? '#42a5f5' : '#64dd17';
                                                                ctx.fillRect(6, 6, 4, 4);
                                                                ctx.fillStyle = '#cfd8dc';
                                                                ctx.fillRect(11, 5, 2, 7);
                                                                ctx.fillRect(5, 11, 7, 2);
                                                                return;
                                                            }
                                                            if (id === IDS.PLATE_OFF || id === IDS.PLATE_ON) {
                                                                ctx.fillStyle = '#00000000'; ctx.clearRect(0, 0, s, s);
                                                                ctx.fillStyle = (id === IDS.PLATE_ON) ? '#d6a77a' : '#a37c57';
                                                                ctx.fillRect(2, s - 4, s - 4, 2);
                                                                ctx.fillStyle = '#00000033';
                                                                ctx.fillRect(2, s - 3, s - 4, 1);
                                                                return;
                                                            }
                                                            return _old.call(this, ctx, id, data);
                                                        };
                                                    }
                                                } catch { }

                                                // ─────────────────────────────────────────────────────────────
                                                // 2) WorldGenerator: 3-biome bands + biome sky palette + temple styles + multi-layer mines
                                                // ─────────────────────────────────────────────────────────────
                                                function fillEnclosedWalls(tiles, walls, x0, y0, w, h, wallId) {
                                                    try {
                                                        const WW = tiles.length | 0;
                                                        const HH = (tiles[0] ? tiles[0].length : 0) | 0;
                                                        if (!WW || !HH) return;

                                                        const x1 = Math.min(WW - 1, x0 + w - 1);
                                                        const y1 = Math.min(HH - 1, y0 + h - 1);
                                                        x0 = Math.max(0, x0); y0 = Math.max(0, y0);
                                                        if (x1 <= x0 || y1 <= y0) return;

                                                        const bw = (x1 - x0 + 1) | 0;
                                                        const bh = (y1 - y0 + 1) | 0;
                                                        const mark = new Uint8Array(bw * bh);

                                                        const qx = [];
                                                        const qy = [];
                                                        const push = (xx, yy) => {
                                                            const ix = xx - x0, iy = yy - y0;
                                                            const k = ix + iy * bw;
                                                            if (mark[k]) return;
                                                            if (tiles[xx][yy] !== BLOCK.AIR) return;
                                                            mark[k] = 1;
                                                            qx.push(xx); qy.push(yy);
                                                        };

                                                        // Seed from boundary: "outside air"
                                                        for (let x = x0; x <= x1; x++) { push(x, y0); push(x, y1); }
                                                        for (let y = y0; y <= y1; y++) { push(x0, y); push(x1, y); }

                                                        while (qx.length) {
                                                            const xx = qx.pop();
                                                            const yy = qy.pop();
                                                            if (xx > x0) push(xx - 1, yy);
                                                            if (xx < x1) push(xx + 1, yy);
                                                            if (yy > y0) push(xx, yy - 1);
                                                            if (yy < y1) push(xx, yy + 1);
                                                        }

                                                        // Fill enclosed air that is NOT connected to outside air
                                                        for (let yy = y0; yy <= y1; yy++) {
                                                            for (let xx = x0; xx <= x1; xx++) {
                                                                if (tiles[xx][yy] !== BLOCK.AIR) continue;
                                                                const ix = xx - x0, iy = yy - y0;
                                                                const k = ix + iy * bw;
                                                                if (!mark[k]) walls[xx][yy] = wallId & 255;
                                                            }
                                                        }
                                                    } catch { }
                                                }

                                                if (WorldGenerator && WorldGenerator.prototype) {
                                                    // 2.1 Biome: override to 3 bands, with slightly wavy borders
                                                    WorldGenerator.prototype._biome = function (x) {
                                                        const w = this.w | 0;
                                                        let t = w > 0 ? x / w : 0.5;
                                                        // Wavy boundaries (stable per seed) – keeps bands readable but not "cut by knife"
                                                        let n = 0;
                                                        try { n = this.biomeNoise ? this.biomeNoise.fbm(x * 0.006, 0, 2) : 0; } catch { }
                                                        t += n * 0.03;
                                                        if (t < 0.34) return 'forest';
                                                        if (t < 0.68) return 'desert';
                                                        return 'snow';
                                                    };

                                                    // 2.2 Biome-specific surface & subsurface blocks
                                                    WorldGenerator.prototype._getSurfaceBlock = function (biome) {
                                                        if (biome === 'snow') return BLOCK.SNOW_GRASS;
                                                        if (biome === 'desert') return BLOCK.SAND;
                                                        return BLOCK.GRASS;
                                                    };
                                                    WorldGenerator.prototype._getSubSurfaceBlock = function (biome) {
                                                        if (biome === 'snow') return Math.random() > 0.78 ? BLOCK.ICE : BLOCK.SNOW;
                                                        if (biome === 'desert') return Math.random() > 0.68 ? BLOCK.SANDSTONE : BLOCK.SAND;
                                                        return BLOCK.DIRT;
                                                    };

                                                    // 2.3 Biome-tinted underground composition (keeps original noise but nudges materials)
                                                    const _oldUG = WorldGenerator.prototype._getUndergroundBlock;
                                                    WorldGenerator.prototype._getUndergroundBlock = function (x, y, layer) {
                                                        const biome = this._biome(x);
                                                        const base = _oldUG ? _oldUG.call(this, x, y, layer) : BLOCK.STONE;
                                                        if (biome === 'desert') {
                                                            if (layer === 'upper') return (Math.random() > 0.65) ? BLOCK.SANDSTONE : (Math.random() > 0.8 ? BLOCK.LIMESTONE : base);
                                                            if (layer === 'middle') return (Math.random() > 0.55) ? BLOCK.SANDSTONE : (Math.random() > 0.75 ? BLOCK.GRANITE : base);
                                                            return (Math.random() > 0.6) ? BLOCK.BASALT : base;
                                                        }
                                                        if (biome === 'snow') {
                                                            if (layer === 'upper') return (Math.random() > 0.82) ? BLOCK.ICE : base;
                                                            if (layer === 'middle') return (Math.random() > 0.7) ? BLOCK.GRANITE : (Math.random() > 0.86 ? BLOCK.ICE : base);
                                                            return (Math.random() > 0.78) ? BLOCK.OBSIDIAN : base;
                                                        }
                                                        return base;
                                                    };

                                                    // 2.4 Temple styles by depth (brick / marble / granite / hell)
                                                    WorldGenerator.prototype._placeTemple = function (tiles, walls, x, y) {
                                                        const w = 14 + ((Math.random() * 10) | 0);
                                                        const h = 9 + ((Math.random() * 6) | 0);

                                                        const WW = this.w | 0, HH = this.h | 0;
                                                        const depth01 = HH > 0 ? (y / HH) : 0.6;
                                                        const biome = this._biome(x);

                                                        let shell = BLOCK.BRICK;
                                                        let accent = BLOCK.COBBLESTONE;
                                                        let wallId = 2;

                                                        if (depth01 < 0.58) {
                                                            shell = (biome === 'desert') ? BLOCK.SANDSTONE : (Math.random() > 0.5 ? BLOCK.BRICK : BLOCK.COBBLESTONE);
                                                            accent = BLOCK.PLANKS;
                                                            wallId = 1;
                                                        } else if (depth01 < 0.78) {
                                                            shell = BLOCK.MARBLE;
                                                            accent = (biome === 'desert') ? BLOCK.SANDSTONE : BLOCK.BRICK;
                                                            wallId = 2;
                                                        } else if (depth01 < 0.90) {
                                                            shell = BLOCK.GRANITE;
                                                            accent = BLOCK.SLATE;
                                                            wallId = 2;
                                                        } else {
                                                            shell = BLOCK.OBSIDIAN;
                                                            accent = BLOCK.BASALT;
                                                            wallId = 3;
                                                        }

                                                        const tlx = x, tly = y;
                                                        for (let dx = 0; dx < w; dx++) {
                                                            for (let dy = 0; dy < h; dy++) {
                                                                const tx = tlx + dx, ty = tly + dy;
                                                                if (tx < 1 || tx >= WW - 1 || ty < 1 || ty >= HH - 1) continue;

                                                                const border = (dx === 0 || dx === w - 1 || dy === 0 || dy === h - 1);
                                                                const pillar = ((dx === 3 || dx === w - 4) && dy > 1 && dy < h - 2);
                                                                const cornice = (dy === 1 && (dx % 3 === 0));
                                                                if (border || pillar) tiles[tx][ty] = shell;
                                                                else if (cornice && Math.random() > 0.4) tiles[tx][ty] = accent;
                                                                else { tiles[tx][ty] = BLOCK.AIR; walls[tx][ty] = wallId; }
                                                            }
                                                        }

                                                        // Inner details by style
                                                        const cx = tlx + (w >> 1);
                                                        const cy = tly + h - 2;

                                                        if (cx > 1 && cx < WW - 1 && cy > 1 && cy < HH - 1) {
                                                            tiles[cx][cy] = BLOCK.TREASURE_CHEST;
                                                            if (tly + 1 < HH) tiles[cx][tly + 1] = BLOCK.LANTERN;

                                                            // ornaments
                                                            const gem = (depth01 < 0.78) ? BLOCK.CRYSTAL : (depth01 < 0.90 ? BLOCK.AMETHYST : BLOCK.OBSIDIAN);
                                                            for (let i = 0; i < 6; i++) {
                                                                const ox = cx + ((i % 3) - 1) * 2;
                                                                const oy = cy - 1 - ((i / 3) | 0);
                                                                if (ox > 1 && ox < WW - 1 && oy > 1 && oy < HH - 1 && tiles[ox][oy] === BLOCK.AIR) tiles[ox][oy] = gem;
                                                            }
                                                        }

                                                        // Auto-fill background walls in enclosed interior (for "indoor" checks)
                                                        fillEnclosedWalls(tiles, walls, tlx, tly, w, h, wallId);

                                                        // Light cobwebs near ceiling (only shallow styles)
                                                        if (depth01 < 0.85) {
                                                            const webN = 3 + ((Math.random() * 5) | 0);
                                                            for (let i = 0; i < webN; i++) {
                                                                const wx = tlx + 1 + ((Math.random() * (w - 2)) | 0);
                                                                const wy = tly + 1 + ((Math.random() * 3) | 0);
                                                                if (wx > 0 && wx < WW && wy > 0 && wy < HH && tiles[wx][wy] === BLOCK.AIR) tiles[wx][wy] = BLOCK.SPIDER_WEB;
                                                            }
                                                        }
                                                    };

                                                    // 2.5 Multi-layer mines (connected tunnels, rooms, shafts)
                                                    WorldGenerator.prototype._generateMultiLayerMines = function (tiles, walls) {
                                                        const WW = this.w | 0, HH = this.h | 0;
                                                        const levels = 3 + ((Math.random() * 2) | 0); // 3-4
                                                        const y0 = (HH * 0.42) | 0;
                                                        const yStep = (HH * 0.10) | 0;

                                                        const carve = (x, y, r, wallId) => {
                                                            for (let dx = -r; dx <= r; dx++) {
                                                                for (let dy = -r; dy <= r; dy++) {
                                                                    if ((dx * dx + dy * dy) > (r * r + 0.4)) continue;
                                                                    const xx = x + dx, yy = y + dy;
                                                                    if (xx < 2 || xx >= WW - 2 || yy < 2 || yy >= HH - 2) continue;
                                                                    tiles[xx][yy] = BLOCK.AIR;
                                                                    walls[xx][yy] = wallId & 255;
                                                                }
                                                            }
                                                        };

                                                        const placeSupport = (x, y, wallId) => {
                                                            // 3-high tunnel supports: |-| with occasional torch
                                                            for (let dy = -1; dy <= 1; dy++) {
                                                                const yy = y + dy;
                                                                if (yy < 2 || yy >= HH - 2) continue;
                                                                if (x - 1 > 1) tiles[x - 1][yy] = BLOCK.PLANKS;
                                                                if (x + 1 < WW - 2) tiles[x + 1][yy] = BLOCK.PLANKS;
                                                            }
                                                            if (y - 2 > 1) tiles[x][y - 2] = BLOCK.PLANKS;
                                                            if (Math.random() > 0.6 && x - 2 > 1 && y > 2) tiles[x - 2][y] = BLOCK.TORCH;
                                                            // make interior count as "indoors"
                                                            if (walls[x][y] === 0) walls[x][y] = wallId & 255;
                                                        };

                                                        const placeRoom = (rx, ry, wallId) => {
                                                            const rw = 9 + ((Math.random() * 6) | 0);
                                                            const rh = 6 + ((Math.random() * 4) | 0);
                                                            const tlx = rx - (rw >> 1);
                                                            const tly = ry - (rh >> 1);
                                                            if (tlx < 3 || tly < 3 || tlx + rw >= WW - 3 || tly + rh >= HH - 3) return;
                                                            for (let dx = 0; dx < rw; dx++) {
                                                                for (let dy = 0; dy < rh; dy++) {
                                                                    const x = tlx + dx, y = tly + dy;
                                                                    const border = (dx === 0 || dx === rw - 1 || dy === 0 || dy === rh - 1);
                                                                    if (border) tiles[x][y] = (Math.random() > 0.5) ? BLOCK.PLANKS : BLOCK.COBBLESTONE;
                                                                    else { tiles[x][y] = BLOCK.AIR; walls[x][y] = wallId & 255; }
                                                                }
                                                            }
                                                            fillEnclosedWalls(tiles, walls, tlx, tly, rw, rh, wallId);
                                                            // Decor: lantern + chest by depth
                                                            if (rx > 2 && ry > 2 && rx < WW - 2 && ry < HH - 2) {
                                                                tiles[rx][tly + 1] = BLOCK.LANTERN;
                                                                if (Math.random() > 0.45) tiles[tlx + rw - 2][tly + rh - 2] = BLOCK.TREASURE_CHEST;
                                                            }
                                                        };

                                                        // Build each level as a wiggly horizontal backbone
                                                        const wallId = 1;
                                                        for (let lv = 0; lv < levels; lv++) {
                                                            let y = y0 + lv * yStep + ((Math.random() * 10) | 0) - 5;
                                                            y = Math.max((HH * 0.34) | 0, Math.min((HH * 0.86) | 0, y));

                                                            let x = 20 + ((Math.random() * 20) | 0);
                                                            const xEnd = WW - 20 - ((Math.random() * 20) | 0);

                                                            let seg = 0;
                                                            while (x < xEnd) {
                                                                // carve tunnel
                                                                carve(x, y, 1, wallId);
                                                                carve(x, y - 1, 1, wallId);
                                                                carve(x, y + 1, 1, wallId);

                                                                // gentle vertical drift
                                                                if ((seg % 7) === 0) {
                                                                    const drift = (Math.random() < 0.5 ? -1 : 1);
                                                                    const ny = y + drift;
                                                                    if (ny > (HH * 0.30) && ny < (HH * 0.88)) y = ny;
                                                                }

                                                                // supports
                                                                if ((seg % 10) === 0) placeSupport(x, y, wallId);

                                                                // rooms
                                                                if ((seg % 38) === 0 && Math.random() > 0.35) placeRoom(x + 6, y, wallId);

                                                                x++;
                                                                seg++;
                                                            }
                                                        }

                                                        // Connect levels with shafts (vertical connectors)
                                                        const shaftN = 4 + ((Math.random() * 5) | 0);
                                                        for (let i = 0; i < shaftN; i++) {
                                                            const sx = 30 + ((Math.random() * (WW - 60)) | 0);
                                                            const top = y0 + ((Math.random() * 10) | 0);
                                                            const bot = y0 + (levels - 1) * yStep + ((Math.random() * 10) | 0);
                                                            const yA = Math.min(top, bot), yB = Math.max(top, bot);
                                                            for (let y = yA; y <= yB; y++) {
                                                                carve(sx, y, 1, wallId);
                                                                // platforms every few tiles
                                                                if ((y % 8) === 0) {
                                                                    if (sx - 1 > 1) tiles[sx - 1][y] = BLOCK.PLANKS;
                                                                    if (sx + 1 < WW - 2) tiles[sx + 1][y] = BLOCK.PLANKS;
                                                                }
                                                                if ((y % 12) === 0 && Math.random() > 0.5) tiles[sx][y] = BLOCK.TORCH;
                                                            }
                                                        }
                                                    };

                                                    // 2.6 Hook mines into structure pass
                                                    if (!WorldGenerator.prototype.__mineV9Hooked) {
                                                        WorldGenerator.prototype.__mineV9Hooked = true;
                                                        const _oldStructures = WorldGenerator.prototype._structures;
                                                        WorldGenerator.prototype._structures = function (tiles, walls) {
                                                            if (_oldStructures) _oldStructures.call(this, tiles, walls);
                                                            try { this._generateMultiLayerMines(tiles, walls); } catch (e) { console.warn('mine gen failed', e); }
                                                        };
                                                    }

                                                    // 2.7 Extend StructureLibrary with mine pieces (pattern based, compatible with ruin_shrine descriptor)
                                                    try {
                                                        const lib = TU.Structures;
                                                        if (lib && !TU.__mineDescsAddedV9) {
                                                            TU.__mineDescsAddedV9 = true;
                                                            lib.ensureLoaded && lib.ensureLoaded();
                                                            const extra = [
                                                                {
                                                                    id: 'mine_room_small',
                                                                    tags: ['mine', 'room'],
                                                                    weight: 3,
                                                                    depth: [0.40, 0.82],
                                                                    anchor: [0.5, 0.5],
                                                                    placement: { mode: 'underground', minSolidRatio: 0.40, defaultWall: 1 },
                                                                    pattern: [
                                                                        "###########",
                                                                        "#.........#",
                                                                        "#..t...t..#",
                                                                        "#....C....#",
                                                                        "#.........#",
                                                                        "#..t...t..#",
                                                                        "###########"
                                                                    ],
                                                                    legend: {
                                                                        "#": { tile: "PLANKS", replace: "any" },
                                                                        ".": { tile: "AIR", wall: 1, replace: "any" },
                                                                        "t": { tile: "TORCH", replace: "any" },
                                                                        "C": { tile: "TREASURE_CHEST", replace: "any" }
                                                                    },
                                                                    connectors: [
                                                                        { x: 0, y: 3, dir: "left", len: 14, carve: true, wall: 1 },
                                                                        { x: 10, y: 3, dir: "right", len: 14, carve: true, wall: 1 },
                                                                        { x: 5, y: 6, dir: "down", len: 10, carve: true, wall: 1 }
                                                                    ]
                                                                },
                                                                {
                                                                    id: 'mine_junction',
                                                                    tags: ['mine', 'junction'],
                                                                    weight: 2,
                                                                    depth: [0.45, 0.88],
                                                                    anchor: [0.5, 0.5],
                                                                    placement: { mode: 'underground', minSolidRatio: 0.40, defaultWall: 1 },
                                                                    pattern: [
                                                                        "#####",
                                                                        "#...#",
                                                                        "#...#",
                                                                        "#...#",
                                                                        "#####"
                                                                    ],
                                                                    legend: {
                                                                        "#": { tile: "COBBLESTONE", replace: "any" },
                                                                        ".": { tile: "AIR", wall: 1, replace: "any" }
                                                                    },
                                                                    connectors: [
                                                                        { x: 0, y: 2, dir: "left", len: 18, carve: true, wall: 1 },
                                                                        { x: 4, y: 2, dir: "right", len: 18, carve: true, wall: 1 },
                                                                        { x: 2, y: 0, dir: "up", len: 10, carve: true, wall: 1 },
                                                                        { x: 2, y: 4, dir: "down", len: 10, carve: true, wall: 1 }
                                                                    ]
                                                                }
                                                            ];
                                                            lib.loadFromArray && lib.loadFromArray(extra, { replace: false });
                                                        }
                                                    } catch { }
                                                }

                                                // ─────────────────────────────────────────────────────────────
                                                // 3) Treasure chest: depth-based loot table (on break)
                                                // ─────────────────────────────────────────────────────────────
                                                if (Game && Game.prototype && !Game.prototype.__chestLootV9) {
                                                    Game.prototype.__chestLootV9 = true;

                                                    Game.prototype._rollChestLoot = function (depth01) {
                                                        const d = Math.max(0, Math.min(1, +depth01 || 0));
                                                        const picks = [];
                                                        const add = (id, cMin, cMax, chance = 1) => {
                                                            if (Math.random() > chance) return;
                                                            const c = (cMin === cMax) ? cMin : (cMin + ((Math.random() * (cMax - cMin + 1)) | 0));
                                                            if (c > 0) picks.push([id, c]);
                                                        };

                                                        // Tier thresholds
                                                        if (d < 0.36) {
                                                            add(BLOCK.TORCH, 6, 14, 1);
                                                            add(BLOCK.WOOD, 10, 30, 0.85);
                                                            add(BLOCK.COPPER_ORE || BLOCK.STONE, 6, 18, 0.75);
                                                            add(BLOCK.IRON_ORE || BLOCK.STONE, 4, 12, 0.55);
                                                        } else if (d < 0.62) {
                                                            add(BLOCK.TORCH, 8, 18, 1);
                                                            add(BLOCK.IRON_ORE || BLOCK.STONE, 10, 24, 0.85);
                                                            add(BLOCK.SILVER_ORE || BLOCK.IRON_ORE || BLOCK.STONE, 6, 16, 0.6);
                                                            add(BLOCK.GOLD_ORE || BLOCK.SILVER_ORE || BLOCK.STONE, 3, 10, 0.45);
                                                            add(BLOCK.LIFE_CRYSTAL || BLOCK.CRYSTAL, 1, 1, 0.18);
                                                        } else if (d < 0.86) {
                                                            add(BLOCK.TORCH, 10, 20, 1);
                                                            add(BLOCK.GOLD_ORE || BLOCK.SILVER_ORE || BLOCK.STONE, 8, 22, 0.8);
                                                            add(BLOCK.DIAMOND_ORE || BLOCK.RUBY_ORE || BLOCK.CRYSTAL, 1, 3, 0.35);
                                                            add(BLOCK.MANA_CRYSTAL || BLOCK.AMETHYST || BLOCK.CRYSTAL, 1, 2, 0.25);
                                                            add(BLOCK.CRYSTAL, 2, 6, 0.55);
                                                        } else {
                                                            add(BLOCK.HELLSTONE || BLOCK.BASALT || BLOCK.STONE, 10, 26, 0.85);
                                                            add(BLOCK.OBSIDIAN || BLOCK.BASALT, 8, 20, 0.75);
                                                            add(BLOCK.DIAMOND_ORE || BLOCK.CRYSTAL, 2, 4, 0.35);
                                                            add(BLOCK.LAVA || BLOCK.OBSIDIAN, 1, 1, 0.10);
                                                        }

                                                        // Small bonus: building supplies
                                                        add(BLOCK.PLANKS || BLOCK.WOOD, 6, 16, 0.45);
                                                        add(BLOCK.LANTERN, 1, 1, 0.15);

                                                        // De-dup (merge same ids)
                                                        const m = new Map();
                                                        for (const [id, c] of picks) m.set(id, (m.get(id) || 0) + c);
                                                        return Array.from(m.entries());
                                                    };

                                                    Game.prototype._spawnTreasureChestLoot = function (tileX, tileY, px, py) {
                                                        try {
                                                            const ts = CFG.TILE_SIZE || 16;
                                                            const depth01 = (this.world && this.world.h) ? (tileY / this.world.h) : 0.5;
                                                            const drops = this._rollChestLoot(depth01);

                                                            // Drop the chest itself
                                                            this.droppedItems && this.droppedItems.spawn(px, py, BLOCK.TREASURE_CHEST, 1);

                                                            // Scatter loot a bit so pickups feel good
                                                            for (let i = 0; i < drops.length; i++) {
                                                                const [id, count] = drops[i];
                                                                const sx = px + ((Math.random() * 18) - 9);
                                                                const sy = py + ((Math.random() * 10) - 5);
                                                                this.droppedItems && this.droppedItems.spawn(sx, sy, id, count);
                                                            }

                                                            // Feedback
                                                            try { this.audio && this.audio.play('pickup'); } catch { }
                                                            try { this.particles && this.particles.emit(tileX * ts + 8, tileY * ts + 8, { color: '#ffd166', count: 18, speed: 3.5, up: true, glow: true }); } catch { }
                                                        } catch (e) {
                                                            // Fallback: at least drop chest block
                                                            try { this.droppedItems && this.droppedItems.spawn(px, py, BLOCK.TREASURE_CHEST, 1); } catch { }
                                                        }
                                                    };
                                                }

                                                // ─────────────────────────────────────────────────────────────
                                                // 4) Dynamic Water v2 + U-tube pressure: upgrade TileLogicEngine worker + idle fallback
                                                // ─────────────────────────────────────────────────────────────
                                                function buildTileLogicWorkerSourceV9() {
                                                    // Keep message protocol identical to v12, but improve fluid + add plate/pump awareness in logic scan.
                                                    // NOTE: This string is intentionally "plain JS" (no template interpolations).
                                                    return `/* TileLogic Worker v12+ (v9 fluids) */
      (() => {
        let W = 0, H = 0;
        let tiles = null;
        let water = null;
        let solid = null;

        let AIR = 0, WATER = 27;
        let IDS = null;

        const region = { x0: 0, y0: 0, x1: -1, y1: -1, set: false };
        let lastRegionKey = '';
        let perfLevel = 'high';
        const MAX = 8;

        const waterQ = [];
        let waterMark = null;
        const logicQ = [];
        let logicMark = null;

        function idx(x, y) { return x * H + y; }

        function inRegionIndex(i) {
          if (!region.set) return false;
          const x = (i / H) | 0;
          const y = i - x * H;
          return (x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1);
        }

        function isWire(id)   { return id === IDS.WIRE_OFF || id === IDS.WIRE_ON; }
        function isSwitch(id) { return id === IDS.SWITCH_OFF || id === IDS.SWITCH_ON || id === IDS.PLATE_OFF || id === IDS.PLATE_ON; }
        function isSource(id) { return id === IDS.SWITCH_ON || id === IDS.PLATE_ON; }
        function isLamp(id)   { return id === IDS.LAMP_OFF || id === IDS.LAMP_ON; }
        function isPump(id)   { return id === IDS.PUMP_IN || id === IDS.PUMP_OUT; }
        function isConductor(id) { return isWire(id) || isSwitch(id) || isPump(id); }

        function canWaterEnterTile(id) { return id === AIR || id === WATER; }

        function scheduleWater(i) {
          if (!waterMark) return;
          if (!inRegionIndex(i)) return;
          if (waterMark[i]) return;
          waterMark[i] = 1;
          waterQ.push(i);
        }

        function scheduleWaterAround(x, y) {
          if (x < 0 || y < 0 || x >= W || y >= H) return;
          scheduleWater(idx(x, y));
          if (x > 0) scheduleWater(idx(x - 1, y));
          if (x + 1 < W) scheduleWater(idx(x + 1, y));
          if (y > 0) scheduleWater(idx(x, y - 1));
          if (y + 1 < H) scheduleWater(idx(x, y + 1));
        }

        function scheduleLogic(i) {
          if (!logicMark) return;
          if (!inRegionIndex(i)) return;
          if (logicMark[i]) return;
          logicMark[i] = 1;
          logicQ.push(i);
        }

        function scheduleLogicAround(x, y) {
          if (x < 0 || y < 0 || x >= W || y >= H) return;
          scheduleLogic(idx(x, y));
          if (x > 0) scheduleLogic(idx(x - 1, y));
          if (x + 1 < W) scheduleLogic(idx(x + 1, y));
          if (y > 0) scheduleLogic(idx(x, y - 1));
          if (y + 1 < H) scheduleLogic(idx(x, y + 1));
        }

        function setTile(i, newId, changes) {
          const old = tiles[i];
          if (old === newId) return false;
          tiles[i] = newId;
          changes.push(i, old, newId);
          const x = (i / H) | 0;
          const y = i - x * H;
          scheduleWaterAround(x, y);
          scheduleLogicAround(x, y);
          return true;
        }

        function ensureWaterTile(i, changes) {
          if (water[i] > 0) {
            if (tiles[i] !== WATER) setTile(i, WATER, changes);
          } else {
            if (tiles[i] === WATER) setTile(i, AIR, changes);
          }
        }

        // Dynamic water with smoothing + limited pressure-up (U-tube-ish)
        function waterTick(i, changes) {
          waterMark[i] = 0;
          if (!inRegionIndex(i)) return;

          let a = water[i] | 0;
          if (a <= 0) return;

          const tid = tiles[i];
          if (tid !== WATER && tid !== AIR) { water[i] = 0; return; }

          const x = (i / H) | 0;
          const y = i - x * H;

          // Snapshot neighbors (avoid directional bias)
          const down = (y + 1 < H) ? (i + 1) : -1;
          const up   = (y > 0) ? (i - 1) : -1;
          const left = (x > 0) ? (i - H) : -1;
          const right= (x + 1 < W) ? (i + H) : -1;

          // 1) Down flow (strong)
          if (down !== -1 && canWaterEnterTile(tiles[down])) {
            const b = water[down] | 0;
            const space = MAX - b;
            if (space > 0) {
              const mv = (a < space) ? a : space;
              water[i] = a - mv;
              water[down] = b + mv;
              a = water[i] | 0;

              ensureWaterTile(i, changes);
              ensureWaterTile(down, changes);

              scheduleWater(down);
              scheduleWater(i);
              scheduleWaterAround(x, y);
              scheduleWaterAround(x, y + 1);
            }
          }
          if (a <= 0) return;

          // 2) Horizontal smoothing (simultaneous-ish)
          let a0 = a;
          let mvL = 0, mvR = 0;

          if (left !== -1 && canWaterEnterTile(tiles[left])) {
            const b = water[left] | 0;
            const diff = a0 - b;
            if (diff > 1) {
              mvL = (diff / 3) | 0; // gentler than half, smoother
              if (mvL < 1) mvL = 1;
              const space = MAX - b;
              if (mvL > space) mvL = space;
            }
          }
          if (right !== -1 && canWaterEnterTile(tiles[right])) {
            const b = water[right] | 0;
            const diff = a0 - b;
            if (diff > 1) {
              mvR = (diff / 3) | 0;
              if (mvR < 1) mvR = 1;
              const space = MAX - b;
              if (mvR > space) mvR = space;
            }
          }

          // Cap total move to available water
          const tot = mvL + mvR;
          if (tot > a0) {
            // scale down proportionally
            mvL = ((mvL * a0) / tot) | 0;
            mvR = a0 - mvL;
          }

          if (mvL > 0 && left !== -1) {
            water[i] = (water[i] | 0) - mvL;
            water[left] = (water[left] | 0) + mvL;
            ensureWaterTile(i, changes);
            ensureWaterTile(left, changes);
            scheduleWater(left); scheduleWater(i);
          }
          if (mvR > 0 && right !== -1) {
            water[i] = (water[i] | 0) - mvR;
            water[right] = (water[right] | 0) + mvR;
            ensureWaterTile(i, changes);
            ensureWaterTile(right, changes);
            scheduleWater(right); scheduleWater(i);
          }

          a = water[i] | 0;
          if (a <= 0) return;

          // 3) Pressure-up (limited): if fully pressurized and blocked below, allow a tiny move upward
          if (up !== -1 && canWaterEnterTile(tiles[up])) {
            const ub = water[up] | 0;
            const belowBlocked = (down === -1) || !canWaterEnterTile(tiles[down]) || (water[down] | 0) >= MAX;
            if (belowBlocked && a >= MAX && ub + 1 < a && ub < MAX) {
              water[i] = (water[i] | 0) - 1;
              water[up] = ub + 1;
              ensureWaterTile(i, changes);
              ensureWaterTile(up, changes);
              scheduleWater(up); scheduleWater(i);
            }
          }
        }

        // Logic: same as v12, but treat pressure plate as switch/source and pumps as conductors (for connectivity)
        let vis = null;
        let stamp = 1;
        function ensureVis() {
          const N = W * H;
          if (!vis || vis.length !== N) vis = new Uint32Array(N);
        }

        function lampShouldOn(iLamp) {
          const x = (iLamp / H) | 0;
          const y = iLamp - x * H;
          if (x > 0) { const t = tiles[iLamp - H]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          if (x + 1 < W) { const t = tiles[iLamp + H]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          if (y > 0) { const t = tiles[iLamp - 1]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          if (y + 1 < H) { const t = tiles[iLamp + 1]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          return false;
        }

        function updateLampAt(iLamp, changes) {
          const t = tiles[iLamp];
          if (!(t === IDS.LAMP_OFF || t === IDS.LAMP_ON)) return;
          const want = lampShouldOn(iLamp) ? IDS.LAMP_ON : IDS.LAMP_OFF;
          if (t !== want) setTile(iLamp, want, changes);
        }

        function logicRecomputeFromSeed(seed, changes) {
          logicMark[seed] = 0;

          ensureVis();
          stamp = (stamp + 1) >>> 0;
          if (stamp === 0) { stamp = 1; vis.fill(0); }

          const starts = [];
          const sid = tiles[seed];
          if (isConductor(sid) || isLamp(sid)) starts.push(seed);
          else {
            const x = (seed / H) | 0;
            const y = seed - x * H;
            if (x > 0) { const n = seed - H; if (isConductor(tiles[n]) || isLamp(tiles[n])) starts.push(n); }
            if (x + 1 < W) { const n = seed + H; if (isConductor(tiles[n]) || isLamp(tiles[n])) starts.push(n); }
            if (y > 0) { const n = seed - 1; if (isConductor(tiles[n]) || isLamp(tiles[n])) starts.push(n); }
            if (y + 1 < H) { const n = seed + 1; if (isConductor(tiles[n]) || isLamp(tiles[n])) starts.push(n); }
          }
          if (!starts.length) return;

          const q = [];
          const comp = [];
          let powered = false;

          for (let si = 0; si < starts.length; si++) {
            const s = starts[si];
            if (vis[s] === stamp) continue;
            vis[s] = stamp;
            q.push(s);

            while (q.length) {
              const i = q.pop();
              const t = tiles[i];
              if (!(isConductor(t) || isLamp(t))) continue;

              comp.push(i);
              if (isSource(t)) powered = true;

              const x = (i / H) | 0;
              const y = i - x * H;

              if (x > 0) { const n = i - H; if (vis[n] !== stamp && (isConductor(tiles[n]) || isLamp(tiles[n]))) { vis[n] = stamp; q.push(n); } }
              if (x + 1 < W) { const n = i + H; if (vis[n] !== stamp && (isConductor(tiles[n]) || isLamp(tiles[n]))) { vis[n] = stamp; q.push(n); } }
              if (y > 0) { const n = i - 1; if (vis[n] !== stamp && (isConductor(tiles[n]) || isLamp(tiles[n]))) { vis[n] = stamp; q.push(n); } }
              if (y + 1 < H) { const n = i + 1; if (vis[n] !== stamp && (isConductor(tiles[n]) || isLamp(tiles[n]))) { vis[n] = stamp; q.push(n); } }

              if (comp.length > 14000) break;
            }
            if (comp.length > 14000) break;
          }

          const wantWire = powered ? IDS.WIRE_ON : IDS.WIRE_OFF;
          for (let i = 0; i < comp.length; i++) {
            const p = comp[i];
            const t = tiles[p];
            if (isWire(t) && t !== wantWire) setTile(p, wantWire, changes);
            if (isLamp(t)) updateLampAt(p, changes);
          }
        }

        function primeRegionWork() {
          if (!region.set) return;
          for (let x = region.x0; x <= region.x1; x++) {
            const base = x * H;
            for (let y = region.y0; y <= region.y1; y++) {
              const i = base + y;
              if (water[i] > 0) scheduleWater(i);
              const t = tiles[i];
              if (t === IDS.SWITCH_ON || t === IDS.PLATE_ON || isWire(t) || isLamp(t) || isPump(t)) scheduleLogic(i);
            }
          }
        }

        // Optional: pump tick inside region (small budget), teleports 1 water unit between linked pumps along wires
        const pumpQ = [];
        const pumpMark = new Uint8Array(1);
        let pumpAcc = 0;

        function schedulePumpInRegion() {
          if (!region.set) return;
          pumpQ.length = 0;
          for (let x = region.x0; x <= region.x1; x++) {
            const base = x * H;
            for (let y = region.y0; y <= region.y1; y++) {
              const i = base + y;
              if (tiles[i] === IDS.PUMP_IN) pumpQ.push(i);
            }
          }
        }

        function pumpPowered(iPump) {
          const x = (iPump / H) | 0;
          const y = iPump - x * H;
          if (x > 0) { const t = tiles[iPump - H]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          if (x + 1 < W) { const t = tiles[iPump + H]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          if (y > 0) { const t = tiles[iPump - 1]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          if (y + 1 < H) { const t = tiles[iPump + 1]; if (t === IDS.WIRE_ON || t === IDS.SWITCH_ON || t === IDS.PLATE_ON) return true; }
          return false;
        }

        function findPumpOut(iSeed, maxNodes) {
          ensureVis();
          stamp = (stamp + 1) >>> 0;
          if (stamp === 0) { stamp = 1; vis.fill(0); }

          const q = [iSeed];
          vis[iSeed] = stamp;

          let found = -1;
          let nodes = 0;

          while (q.length && nodes < maxNodes) {
            const i = q.pop();
            nodes++;

            const t = tiles[i];
            if (t === IDS.PUMP_OUT) { found = i; break; }

            const x = (i / H) | 0;
            const y = i - x * H;

            // Traverse conductors (wire/switch/plate/pumps)
            const tryN = (n) => {
              if (n < 0 || n >= W * H) return;
              if (vis[n] === stamp) return;
              const tt = tiles[n];
              if (!isConductor(tt)) return;
              vis[n] = stamp;
              q.push(n);
            };

            if (x > 0) tryN(i - H);
            if (x + 1 < W) tryN(i + H);
            if (y > 0) tryN(i - 1);
            if (y + 1 < H) tryN(i + 1);
          }

          return found;
        }

        function pumpTransfer(iIn, iOut, changes) {
          const xi = (iIn / H) | 0;
          const yi = iIn - xi * H;
          const xo = (iOut / H) | 0;
          const yo = iOut - xo * H;

          // intake neighbor preference: below, left, right, up
          const nIn = [];
          if (yi + 1 < H) nIn.push(iIn + 1);
          if (xi > 0) nIn.push(iIn - H);
          if (xi + 1 < W) nIn.push(iIn + H);
          if (yi > 0) nIn.push(iIn - 1);

          let took = 0;
          for (let k = 0; k < nIn.length && took < 2; k++) {
            const n = nIn[k];
            if (!canWaterEnterTile(tiles[n])) continue;
            const a = water[n] | 0;
            if (a <= 0) continue;
            water[n] = a - 1;
            took++;
            ensureWaterTile(n, changes);
            scheduleWater(n);
          }
          if (took <= 0) return;

          // output neighbor preference: above, right, left, down
          const nOut = [];
          if (yo > 0) nOut.push(iOut - 1);
          if (xo + 1 < W) nOut.push(iOut + H);
          if (xo > 0) nOut.push(iOut - H);
          if (yo + 1 < H) nOut.push(iOut + 1);

          for (let t = 0; t < took; t++) {
            let placed = false;
            for (let k = 0; k < nOut.length; k++) {
              const n = nOut[k];
              if (!canWaterEnterTile(tiles[n])) continue;
              const b = water[n] | 0;
              if (b >= MAX) continue;
              water[n] = b + 1;
              ensureWaterTile(n, changes);
              scheduleWater(n);
              placed = true;
              break;
            }
            if (!placed) break;
          }
        }

        function step() {
          const changes = [];

          const waterBudget = (perfLevel === 'low') ? 420 : 1100;
          for (let ops = 0; ops < waterBudget && waterQ.length; ops++) {
            waterTick(waterQ.pop(), changes);
          }

          const logicBudget = 1;
          for (let ops = 0; ops < logicBudget && logicQ.length; ops++) {
            logicRecomputeFromSeed(logicQ.pop(), changes);
          }

          // Pump budget (light): run once every ~6 ticks
          pumpAcc = (pumpAcc + 1) | 0;
          if ((pumpAcc % 6) === 0) {
            if (!pumpQ.length) schedulePumpInRegion();
            const pumpBudget = (perfLevel === 'low') ? 1 : 2;
            for (let p = 0; p < pumpBudget && pumpQ.length; p++) {
              const iIn = pumpQ.pop();
              if (!pumpPowered(iIn)) continue;
              const out = findPumpOut(iIn, 9000);
              if (out !== -1) pumpTransfer(iIn, out, changes);
            }
          }

          if (changes.length) {
            const buf = new Int32Array(changes);
            postMessage({ type: 'changes', buf: buf.buffer }, [buf.buffer]);
          }

          const tickMs = (perfLevel === 'low') ? 55 : 35;
          setTimeout(step, tickMs);
        }

        onmessage = (e) => {
          const m = e.data;
          if (!m || !m.type) return;

          switch (m.type) {
            case 'init': {
              W = m.w | 0;
              H = m.h | 0;
              IDS = m.ids || {};
              AIR = (m.blocks && (m.blocks.AIR | 0) >= 0) ? (m.blocks.AIR | 0) : 0;
              WATER = (m.blocks && (m.blocks.WATER | 0) >= 0) ? (m.blocks.WATER | 0) : 27;

              tiles = new Uint8Array(m.tiles);
              solid = new Uint8Array(m.solid);

              const N = W * H;
              water = new Uint8Array(N);
              waterMark = new Uint8Array(N);
              logicMark = new Uint8Array(N);
              ensureVis();

              for (let i = 0; i < N; i++) if (tiles[i] === WATER) water[i] = MAX;

              step();
              break;
            }

            case 'tileWrite': {
              if (!tiles) return;
              const x = m.x | 0;
              const y = m.y | 0;
              if (x < 0 || y < 0 || x >= W || y >= H) return;

              const i = idx(x, y);
              const newId = m.id | 0;
              const oldId = tiles[i];
              tiles[i] = newId;

              if (newId === WATER) {
                water[i] = MAX;
                scheduleWaterAround(x, y);
              } else if (oldId === WATER && newId !== WATER) {
                water[i] = 0;
                scheduleWaterAround(x, y);
              }

              scheduleLogicAround(x, y);
              break;
            }

            case 'region': {
              const cx = m.cx | 0, cy = m.cy | 0;
              const rx = m.rx | 0, ry = m.ry | 0;

              const x0 = Math.max(0, cx - rx);
              const x1 = Math.min(W - 1, cx + rx);
              const y0 = Math.max(0, cy - ry);
              const y1 = Math.min(H - 1, cy + ry);

              const key = x0 + ',' + y0 + ',' + x1 + ',' + y1;
              if (key !== lastRegionKey) {
                lastRegionKey = key;
                region.x0 = x0; region.x1 = x1; region.y0 = y0; region.y1 = y1; region.set = true;
                primeRegionWork();
                schedulePumpInRegion();
              } else {
                region.set = true;
              }
              break;
            }

            case 'perf': {
              perfLevel = m.level || 'high';
              break;
            }
          }
        };
      })();`;
                                                }

                                                try {
                                                    const TileLogicEngine = TU.TileLogicEngine;
                                                    if (TileLogicEngine && !TileLogicEngine.__workerV9Installed) {
                                                        TileLogicEngine.__workerV9Installed = true;
                                                        TileLogicEngine._workerSource = buildTileLogicWorkerSourceV9;

                                                        // Upgrade running instance (if any)
                                                        const g = window.__GAME_INSTANCE__;
                                                        if (g && g.tileLogic && g.tileLogic.worker) {
                                                            try { g.tileLogic.worker.terminate(); } catch { }
                                                            g.tileLogic.worker = null;
                                                            try { g.tileLogic._initWorker && g.tileLogic._initWorker(); } catch { }
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.warn('TileLogicEngine upgrade failed', e);
                                                }

                                                // ─────────────────────────────────────────────────────────────
                                                // 5) Light propagation: stronger shadowing for solid opaque blocks
                                                // ─────────────────────────────────────────────────────────────
                                                if (Game && Game.prototype && !Game.prototype.__shadowLightV9) {
                                                    Game.prototype.__shadowLightV9 = true;

                                                    // ═══════════════════ 光照传播优化 ═══════════════════
                                                    // 注意：OptimizedLighting 定义在此但未被实际使用
                                                    // 实际使用的是 Game.prototype._spreadLight 的下方实现
                                                    const OptimizedLighting = {
                                                        MAX_DEPTH: 15,
                                                        _lightQueue: new Int16Array(10000),
                                                        _queueHead: 0,
                                                        _queueTail: 0,

                                                        spreadLight(world, sx, sy, level) {
                                                            if (!world || !world.w || !world.h) return;
                                                            const w = world.w | 0, h = world.h | 0;
                                                            if (level <= 0 || level > this.MAX_DEPTH) return;

                                                            this._queueHead = 0;
                                                            this._queueTail = 0;

                                                            // 使用队列替代递归
                                                            this._enqueue(sx, sy, level);

                                                            let iterations = 0;
                                                            const MAX_ITERATIONS = 5000;

                                                            while (this._queueHead < this._queueTail && iterations < MAX_ITERATIONS) {
                                                                iterations++;

                                                                const x = this._lightQueue[this._queueHead++];
                                                                const y = this._lightQueue[this._queueHead++];
                                                                const l = this._lightQueue[this._queueHead++];

                                                                if (l <= 0 || x < 0 || x >= w || y < 0 || y >= h) continue;

                                                                const colLight = world.light[x];
                                                                if (!colLight) continue;
                                                                const current = colLight[y] || 0;
                                                                if (l <= current) continue;

                                                                colLight[y] = l;

                                                                const nl = l - 1;
                                                                if (nl > 0) {
                                                                    // 检查四个方向
                                                                    const colTiles = world.tiles[x];
                                                                    const block = colTiles ? colTiles[y] : 0;
                                                                    const attenuation = (BLOCK_DATA[block] && BLOCK_DATA[block].lightAttenuation) || 1;
                                                                    const nextLevel = nl - attenuation + 1;

                                                                    if (nextLevel > 0) {
                                                                        this._enqueue(x - 1, y, nextLevel);
                                                                        this._enqueue(x + 1, y, nextLevel);
                                                                        // 防御性边界检查
                                                                        if (y - 1 >= 0 && y - 1 < h) {
                                                                            this._enqueue(x, y - 1, nextLevel);
                                                                        }
                                                                        if (y + 1 >= 0 && y + 1 < h) {
                                                                            this._enqueue(x, y + 1, nextLevel);
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        },

                                                        _enqueue(x, y, l) {
                                                            if (this._queueTail >= this._lightQueue.length - 3) return;
                                                            this._lightQueue[this._queueTail++] = x;
                                                            this._lightQueue[this._queueTail++] = y;
                                                            this._lightQueue[this._queueTail++] = l;
                                                        }
                                                    };

                                                    Game.prototype._spreadLight = function (sx, sy, level) {
                                                        const world = this.world;
                                                        if (!world) return;
                                                        const w = world.w | 0, h = world.h | 0;
                                                        const tiles = world.tiles;
                                                        const light = world.light;

                                                        if (!this._lightVisited || this._lightVisited.length !== w * h) {
                                                            this._lightVisited = new Uint32Array(w * h);
                                                            this._lightVisitMark = 1;
                                                        }

                                                        let mark = (this._lightVisitMark + 1) >>> 0;
                                                        if (mark === 0) { this._lightVisited.fill(0); mark = 1; }
                                                        this._lightVisitMark = mark;

                                                        const visited = this._lightVisited;
                                                        const qx = this._lightQx || (this._lightQx = []); const qy = this._lightQy || (this._lightQy = []); const ql = this._lightQl || (this._lightQl = []);
                                                        qx.length = 0; qy.length = 0; ql.length = 0;
                                                        let head = 0;

                                                        qx.push(sx); qy.push(sy); ql.push(level);

                                                        while (head < qx.length) {
                                                            const x = qx[head];
                                                            const y = qy[head];
                                                            const l = ql[head];
                                                            head++;

                                                            if (l <= 0 || x < 0 || x >= w || y < 0 || y >= h) continue;
                                                            const idx = x + y * w;
                                                            if (visited[idx] === mark) continue;
                                                            visited[idx] = mark;

                                                            const colLight = light[x];
                                                            if (l > colLight[y]) colLight[y] = l;

                                                            const id = tiles[x][y] | 0;
                                                            let decay = 1;
                                                            if (SOLID[id]) decay += (TRANSP[id] ? 1 : 4);         // opaque blocks cast strong shadows
                                                            else if (LIQ[id]) decay += 2;                         // liquids attenuate a bit
                                                            else decay += 0;

                                                            const nl = l - decay;
                                                            if (nl > 0) {
                                                                qx.push(x - 1, x + 1, x, x);
                                                                qy.push(y, y, y - 1, y + 1);
                                                                ql.push(nl, nl, nl, nl);
                                                            }
                                                        }
                                                    };
                                                }

                                                // ─────────────────────────────────────────────────────────────
                                                // 6) Underwater filter + deeper animated fog (applyPostFX)
                                                // ─────────────────────────────────────────────────────────────
                                                if (Renderer && Renderer.prototype && !Renderer.prototype.__underwaterFogV9) {
                                                    Renderer.prototype.__underwaterFogV9 = true;

                                                    const prev = Renderer.prototype.applyPostFX;
                                                    Renderer.prototype._ensureFogNoise = function () {
                                                        const size = 96;
                                                        if (this._fogNoise && this._fogNoise.width === size) return;
                                                        const c = document.createElement('canvas');
                                                        c.width = c.height = size;
                                                        const ctx = c.getContext('2d', { alpha: true });
                                                        const img = ctx.createImageData(size, size);
                                                        for (let i = 0; i < img.data.length; i += 4) {
                                                            const v = (Math.random() * 255) | 0;
                                                            img.data[i] = v;
                                                            img.data[i + 1] = v;
                                                            img.data[i + 2] = v;
                                                            img.data[i + 3] = 255;
                                                        }
                                                        ctx.putImageData(img, 0, 0);
                                                        this._fogNoise = c;
                                                    };

                                                    Renderer.prototype.applyPostFX = function (time, depth01, reducedMotion) {
                                                        if (prev) prev.call(this, time, depth01, reducedMotion);

                                                        const ctx = this.ctx;
                                                        const canvas = this.canvas;
                                                        if (!ctx || !canvas) return;

                                                        const wPx = canvas.width | 0;
                                                        const hPx = canvas.height | 0;

                                                        // Animated deep fog (add motion/noise so it feels alive)
                                                        const d = Math.max(0, Math.min(1, +depth01 || 0));
                                                        const deep = Math.max(0, (d - 0.55) / 0.45);
                                                        if (deep > 0.01) {
                                                            this._ensureFogNoise();
                                                            const n = this._fogNoise;
                                                            const t = performance.now() * 0.00004;
                                                            const ox = ((t * 80) % n.width) | 0;
                                                            const oy = ((t * 55) % n.height) | 0;

                                                            ctx.save();
                                                            ctx.setTransform(1, 0, 0, 1, 0, 0);
                                                            ctx.globalCompositeOperation = 'multiply';
                                                            ctx.globalAlpha = Math.min(0.22, 0.06 + deep * 0.18);

                                                            // tint base
                                                            ctx.fillStyle = `rgba(30, 40, 55, ${Math.min(0.28, 0.08 + deep * 0.20)})`;
                                                            ctx.fillRect(0, 0, wPx, hPx);

                                                            // noise overlay (scaled up)
                                                            ctx.globalCompositeOperation = 'overlay';
                                                            ctx.globalAlpha = Math.min(0.14, 0.04 + deep * 0.10);
                                                            for (let y = -1; y <= 1; y++) {
                                                                for (let x = -1; x <= 1; x++) {
                                                                    ctx.drawImage(n, ox, oy, n.width - ox, n.height - oy, x * (wPx / 2), y * (hPx / 2), wPx / 2, hPx / 2);
                                                                }
                                                            }
                                                            ctx.restore();
                                                        }

                                                        // Underwater overlay
                                                        try {
                                                            const g = window.__GAME_INSTANCE__;
                                                            const p = g && g.player;
                                                            const world = g && g.world;
                                                            const ts = (CFG && CFG.TILE_SIZE) ? CFG.TILE_SIZE : 16;
                                                            if (p && world && world.tiles) {
                                                                const tx = ((p.x + p.w * 0.5) / ts) | 0;
                                                                const ty = ((p.y + p.h * 0.6) / ts) | 0;
                                                                const inW = (tx >= 0 && ty >= 0 && tx < world.w && ty < world.h) ? (world.tiles[tx][ty] === BLOCK.WATER) : false;
                                                                if (inW) {
                                                                    ctx.save();
                                                                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                                                                    ctx.globalCompositeOperation = 'screen';
                                                                    ctx.globalAlpha = 0.14;
                                                                    ctx.fillStyle = 'rgba(90, 170, 255, 1)';
                                                                    ctx.fillRect(0, 0, wPx, hPx);
                                                                    ctx.globalAlpha = 0.08;
                                                                    const g2 = ctx.createLinearGradient(0, 0, 0, hPx);
                                                                    g2.addColorStop(0, 'rgba(120,200,255,0.0)');
                                                                    g2.addColorStop(1, 'rgba(40,110,220,0.9)');
                                                                    ctx.fillStyle = g2;
                                                                    ctx.fillRect(0, 0, wPx, hPx);
                                                                    ctx.restore();
                                                                }
                                                            }
                                                        } catch { }
                                                    };
                                                }

                                                // ─────────────────────────────────────────────────────────────
                                                // 7) Sky: biome-tinted gradients + cloud layer (Renderer.renderSky)
                                                // ─────────────────────────────────────────────────────────────
                                                if (Renderer && Renderer.prototype && !Renderer.prototype.__cloudBiomeSkyV9) {
                                                    Renderer.prototype.__cloudBiomeSkyV9 = true;

                                                    // Palette per biome + time bucket
                                                    const SKY = {
                                                        forest: {
                                                            0: ['#0c0c1e', '#1a1a2e', '#16213e'],
                                                            1: ['#1a1a2e', '#3b2855', '#ff7b7b'],
                                                            2: ['#74b9ff', '#81ecec', '#dfe6e9'],
                                                            3: ['#6c5ce7', '#ff8fab', '#ffeaa7']
                                                        },
                                                        desert: {
                                                            0: ['#0b1022', '#1a1a2e', '#2b2a3a'],
                                                            1: ['#2b1d2f', '#7a3a2d', '#ffb37b'],
                                                            2: ['#ffcc80', '#ffd180', '#fff3e0'],
                                                            3: ['#ff8a65', '#ffb74d', '#ffeaa7']
                                                        },
                                                        snow: {
                                                            0: ['#08131f', '#102a43', '#0b1b2b'],
                                                            1: ['#16213e', '#3a6ea5', '#b3e5fc'],
                                                            2: ['#b3e5fc', '#e3f2fd', '#ffffff'],
                                                            3: ['#4f6d7a', '#9ad1d4', '#fff1c1']
                                                        }
                                                    };

                                                    // Override gradient cache: bucket + biome
                                                    Renderer.prototype._ensureSkyGradient = function (bucket) {
                                                        const biome = this._skyBiome || 'forest';
                                                        const key = biome + '|' + bucket + '|' + (this.h | 0);

                                                        const map = this._skyGradMap || (this._skyGradMap = Object.create(null));
                                                        if (map[key]) { this._skyGrad = map[key]; this._skyBucket = bucket; this._skyGradH = this.h; return; }

                                                        const ctx = this.ctx;
                                                        const colors = (SKY[biome] && SKY[biome][bucket]) ? SKY[biome][bucket] : SKY.forest[bucket];
                                                        const grad = ctx.createLinearGradient(0, 0, 0, this.h * 0.7);
                                                        grad.addColorStop(0, colors[0]);
                                                        grad.addColorStop(0.5, colors[1]);
                                                        grad.addColorStop(1, colors[2]);
                                                        map[key] = grad;
                                                        this._skyGrad = grad;
                                                        this._skyBucket = bucket;
                                                        this._skyGradH = this.h;
                                                    };

                                                    const prevSky = Renderer.prototype.renderSky;
                                                    Renderer.prototype._ensureClouds = function () {
                                                        const want = (this.lowPower ? 8 : 16);
                                                        if (this._clouds && this._clouds.length === want) return;
                                                        const arr = [];
                                                        const w = Math.max(1, this.w | 0);
                                                        const h = Math.max(1, (this.h * 0.55) | 0);

                                                        for (let i = 0; i < want; i++) {
                                                            const seed = i * 9973;
                                                            arr.push({
                                                                x: (seed * 17) % w,
                                                                y: 20 + ((seed * 31) % h),
                                                                s: 0.6 + ((seed % 100) / 100) * 1.2,
                                                                sp: 8 + (seed % 13),
                                                                p: seed * 0.017
                                                            });
                                                        }
                                                        this._clouds = arr;
                                                    };

                                                    function cloudColor(time, biome) {
                                                        // interpolate between day and night-ish tints
                                                        const night = (typeof Utils !== 'undefined' && Utils.nightFactor) ? Utils.nightFactor(time) : ((time < 0.2 || time > 0.8) ? 1 : 0);
                                                        if (biome === 'desert') return night > 0.5 ? 'rgba(140,160,190,0.45)' : 'rgba(255,245,230,0.55)';
                                                        if (biome === 'snow') return night > 0.5 ? 'rgba(120,160,200,0.40)' : 'rgba(255,255,255,0.60)';
                                                        return night > 0.5 ? 'rgba(130,150,190,0.42)' : 'rgba(255,255,255,0.52)';
                                                    }

                                                    Renderer.prototype.renderSky = function (cam, time) {
                                                        // determine biome from camera center tile
                                                        try {
                                                            const g = window.__GAME_INSTANCE__;
                                                            const world = g && g.world;
                                                            const ts = (CFG && CFG.TILE_SIZE) ? CFG.TILE_SIZE : 16;
                                                            if (world && world.w) {
                                                                const centerTileX = ((cam.x + this.w * 0.5) / ts) | 0;
                                                                this._skyBiome = Biomes.bandAt(world.w, centerTileX);
                                                            } else {
                                                                this._skyBiome = 'forest';
                                                            }
                                                        } catch { this._skyBiome = 'forest'; }

                                                        if (prevSky) prevSky.call(this, cam, time);

                                                        // cloud layer
                                                        try {
                                                            this._ensureClouds();
                                                            const ctx = this.ctx;
                                                            const biome = this._skyBiome || 'forest';
                                                            const cCol = cloudColor(time, biome);
                                                            const t = performance.now() * 0.001;

                                                            ctx.save();
                                                            ctx.globalCompositeOperation = 'screen';
                                                            ctx.fillStyle = cCol;

                                                            for (let i = 0; i < this._clouds.length; i++) {
                                                                const c = this._clouds[i];
                                                                const speed = (c.sp * 0.35);
                                                                const px = (c.x + (t * speed) + cam.x * 0.08) % (this.w + 240);
                                                                const x = px - 120;
                                                                const y = c.y + Math.sin(t * 0.2 + c.p) * 6;

                                                                const s = 44 * c.s;
                                                                const h = 18 * c.s;

                                                                ctx.globalAlpha = 0.18 + (i % 3) * 0.06;
                                                                // puffy blobs (cheap: rect+arc)
                                                                ctx.beginPath();
                                                                ctx.ellipse(x, y, s, h, 0, 0, Math.PI * 2);
                                                                ctx.ellipse(x + s * 0.6, y + 3, s * 0.85, h * 0.95, 0, 0, Math.PI * 2);
                                                                ctx.ellipse(x - s * 0.6, y + 2, s * 0.72, h * 0.9, 0, 0, Math.PI * 2);
                                                                ctx.fill();
                                                            }
                                                            ctx.restore();
                                                        } catch { }
                                                    };
                                                }

                                                // ─────────────────────────────────────────────────────────────
                                                // 8) Pressure plates + Pumps (Game logic, cross-region capable)
                                                // ─────────────────────────────────────────────────────────────
                                                if (Game && Game.prototype && !Game.prototype.__machinesV9) {
                                                    Game.prototype.__machinesV9 = true;

                                                    Game.prototype._indexMachines = function () {
                                                        const world = this.world;
                                                        if (!world || !world.tiles) return;
                                                        const w = world.w | 0, h = world.h | 0;
                                                        const pumpsIn = [];
                                                        const pumpsOut = [];
                                                        const plates = [];

                                                        for (let x = 0; x < w; x++) {
                                                            const col = world.tiles[x];
                                                            for (let y = 0; y < h; y++) {
                                                                const id = col[y];
                                                                if (id === IDS.PUMP_IN) pumpsIn.push([x, y]);
                                                                else if (id === IDS.PUMP_OUT) pumpsOut.push([x, y]);
                                                                else if (id === IDS.PLATE_OFF || id === IDS.PLATE_ON) plates.push([x, y]);
                                                            }
                                                        }
                                                        this._machines = { pumpsIn, pumpsOut, plates };
                                                    };

                                                    Game.prototype._writeTileFast = function (x, y, id, persist) {
                                                        const world = this.world;
                                                        if (!world || !world.tiles) return;
                                                        if (x < 0 || y < 0 || x >= world.w || y >= world.h) return;
                                                        const old = world.tiles[x][y];
                                                        if (old === id) return;

                                                        world.tiles[x][y] = id;

                                                        // notify tilelogic worker (fluids + logic)
                                                        try { this.tileLogic && this.tileLogic.notifyTileWrite && this.tileLogic.notifyTileWrite(x, y, id); } catch { }
                                                        try { this.renderer && this.renderer.invalidateTile && this.renderer.invalidateTile(x, y); } catch { }
                                                        try { if (persist && this.saveSystem && this.saveSystem.markTile) this.saveSystem.markTile(x, y, id); } catch { }
                                                    };

                                                    Game.prototype._ensureMachineItems = function () {
                                                        try {
                                                            const inv = this.player && this.player.inventory;
                                                            if (!inv || !inv.push) return;
                                                            const has = (id) => inv.some(it => it && it.id === id);
                                                            if (!has(IDS.PUMP_IN)) inv.push({ id: IDS.PUMP_IN, name: '泵(入水口)', count: 4 });
                                                            if (!has(IDS.PUMP_OUT)) inv.push({ id: IDS.PUMP_OUT, name: '泵(出水口)', count: 4 });
                                                            if (!has(IDS.PLATE_OFF)) inv.push({ id: IDS.PLATE_OFF, name: '压力板', count: 8 });
                                                            this._deferHotbarUpdate && this._deferHotbarUpdate();
                                                        } catch { }
                                                    };

                                                    // Patch init: index machines + starter items
                                                    const _init = Game.prototype.init;
                                                    Game.prototype.init = async function () {
                                                        const r = await _init.call(this);
                                                        try { this._indexMachines(); } catch { }
                                                        try { this._ensureMachineItems(); } catch { }
                                                        return r;
                                                    };

                                                    // Pressure plate collision
                                                    Game.prototype._updatePressurePlates = function () {
                                                        const world = this.world;
                                                        const m = this._machines;
                                                        if (!world || !m || !m.plates || !m.plates.length) return;

                                                        const ts = (CFG && CFG.TILE_SIZE) ? CFG.TILE_SIZE : 16;

                                                        // collect pressed positions this frame
                                                        const pressed = this._platePressed || (this._platePressed = new Set());
                                                        const next = new Set();

                                                        const markPlateUnder = (ent) => {
                                                            if (!ent) return;
                                                            const cx = (ent.x + ent.w * 0.5);
                                                            const fy = (ent.y + ent.h + 1);
                                                            const tx = (cx / ts) | 0;
                                                            const ty = (fy / ts) | 0;
                                                            if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return;
                                                            const id = world.tiles[tx][ty];
                                                            if (id === IDS.PLATE_OFF || id === IDS.PLATE_ON) {
                                                                next.add(tx + ',' + ty);
                                                            }
                                                        };

                                                        // player
                                                        markPlateUnder(this.player);

                                                        // mobs/enemies if present
                                                        try {
                                                            const ents = this.entities || this.mobs || this.enemies;
                                                            if (Array.isArray(ents)) for (let i = 0; i < ents.length; i++) markPlateUnder(ents[i]);
                                                        } catch { }

                                                        // Apply state changes (ON for pressed, OFF for released)
                                                        next.forEach((k) => {
                                                            if (pressed.has(k)) return;
                                                            pressed.add(k);
                                                            const [x, y] = k.split(',').map(n => n | 0);
                                                            this._writeTileFast(x, y, IDS.PLATE_ON, false);
                                                        });

                                                        pressed.forEach((k) => {
                                                            if (next.has(k)) return;
                                                            pressed.delete(k);
                                                            const [x, y] = k.split(',').map(n => n | 0);
                                                            this._writeTileFast(x, y, IDS.PLATE_OFF, false);
                                                        });
                                                    };

                                                    // Pump simulation (cross-region): moves water between PUMP_IN and PUMP_OUT on same wire network
                                                    Game.prototype._pumpSim = function (dtMs) {
                                                        const world = this.world;
                                                        if (!world || !world.tiles) return;
                                                        const ts = (CFG && CFG.TILE_SIZE) ? CFG.TILE_SIZE : 16;
                                                        const m = this._machines;
                                                        if (!m || !m.pumpsIn || !m.pumpsOut) return;
                                                        if (!m.pumpsIn.length || !m.pumpsOut.length) return;

                                                        this._pumpAcc = (this._pumpAcc || 0) + (dtMs || 0);
                                                        if (this._pumpAcc < 220) return;
                                                        this._pumpAcc = 0;

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

                                                        const pickNeighborWater = (x, y) => {
                                                            // prefer below
                                                            const neigh = [[x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]];
                                                            for (let i = 0; i < neigh.length; i++) {
                                                                const nx = neigh[i][0], ny = neigh[i][1];
                                                                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                                                                if (tiles[nx][ny] === BLOCK.WATER) return [nx, ny];
                                                            }
                                                            return null;
                                                        };
                                                        const pickNeighborOutput = (x, y) => {
                                                            const neigh = [[x, y - 1], [x + 1, y], [x - 1, y], [x, y + 1]];
                                                            for (let i = 0; i < neigh.length; i++) {
                                                                const nx = neigh[i][0], ny = neigh[i][1];
                                                                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                                                                const id = tiles[nx][ny];
                                                                if (id === BLOCK.AIR) return [nx, ny];
                                                            }
                                                            return null;
                                                        };

                                                        // Process a small number of pumps per tick to keep fps stable
                                                        const budget = (this._perf && this._perf.level === 'low') ? 1 : 3;

                                                        for (let pi = 0, done = 0; pi < m.pumpsIn.length && done < budget; pi++) {
                                                            const [sx, sy] = m.pumpsIn[pi];
                                                            if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
                                                            if (tiles[sx][sy] !== IDS.PUMP_IN) continue;

                                                            // BFS wire network
                                                            const qx = [sx], qy = [sy];
                                                            const out = [];
                                                            let powered = false;
                                                            let nodes = 0;

                                                            const mark = (x, y) => { vis[x + y * w] = stamp; };

                                                            mark(sx, sy);

                                                            while (qx.length && nodes < 24000) {
                                                                const x = qx.pop();
                                                                const y = qy.pop();
                                                                nodes++;

                                                                const id = tiles[x][y];
                                                                if (isPoweredSource(id)) powered = true;
                                                                if (id === IDS.PUMP_OUT) out.push([x, y]);

                                                                const push = (nx, ny) => {
                                                                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
                                                                    const k = nx + ny * w;
                                                                    if (vis[k] === stamp) return;
                                                                    const tid = tiles[nx][ny];
                                                                    if (!isConductor(tid)) return;
                                                                    vis[k] = stamp;
                                                                    qx.push(nx); qy.push(ny);
                                                                };

                                                                push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
                                                            }

                                                            if (!powered || !out.length) continue;

                                                            // intake -> output water teleport
                                                            const inN = pickNeighborWater(sx, sy);
                                                            if (!inN) continue;

                                                            // pick a deterministic output (round-robin)
                                                            const rr = (this._pumpRR || 0) % out.length;
                                                            this._pumpRR = (rr + 1) | 0;
                                                            const [ox, oy] = out[rr];

                                                            const outN = pickNeighborOutput(ox, oy);
                                                            if (!outN) continue;

                                                            // move one tile of water (coarse, region independent)
                                                            this._writeTileFast(inN[0], inN[1], BLOCK.AIR, false);
                                                            this._writeTileFast(outN[0], outN[1], BLOCK.WATER, false);

                                                            done++;
                                                        }
                                                    };

                                                    const _update = Game.prototype.update;
                                                    Game.prototype.update = function (dt) {
                                                        // 防御性参数检查
                                                        if (typeof dt !== 'number' || dt < 0 || dt > 1000) {
                                                            console.warn(`[Game.update] Invalid dt: ${dt}, using default`);
                                                            dt = 16.67;
                                                        }

                                                        const r = _update.call(this, dt);
                                                        try {
                                                            if (!this._machines) this._indexMachines();
                                                            this._updatePressurePlates();
                                                            this._pumpSim(dt);
                                                            // Cave ambience for audio (depth-based)
                                                            if (this.audio && this.audio.setEnvironment) {
                                                                const ts = (CFG && CFG.TILE_SIZE) ? CFG.TILE_SIZE : 16;
                                                                const d01 = Utils.clamp((this.player.y + this.player.h * 0.6) / (this.world.h * ts), 0, 1);
                                                                // crude enclosure check: solid above head
                                                                const tx = ((this.player.x + this.player.w * 0.5) / ts) | 0;
                                                                const ty = ((this.player.y + 2) / ts) | 0;
                                                                const enclosed = (tx >= 0 && ty >= 0 && tx < this.world.w && ty < this.world.h) ? (SOLID[this.world.tiles[tx][ty]] ? 1 : 0) : 0;
                                                                this.audio.setEnvironment(d01, enclosed);
                                                            }
                                                        } catch { }
                                                        return r;
                                                    };

                                                    // Keep machine index fresh on tile changes (best-effort)
                                                    try {
                                                        const SS = window.SaveSystem;
                                                        if (SS && SS.prototype && !SS.prototype.__machineIndexPatchedV9) {
                                                            SS.prototype.__machineIndexPatchedV9 = true;
                                                            const _mark = SS.prototype.markTile;
                                                            SS.prototype.markTile = function (x, y, newId) {
                                                                const r = _mark.call(this, x, y, newId);
                                                                try {
                                                                    const g = this.game;
                                                                    if (!g) return r;
                                                                    if (!g._machines) return r;
                                                                    // Minimal: invalidate index when machine blocks changed
                                                                    if (newId === IDS.PUMP_IN || newId === IDS.PUMP_OUT || newId === IDS.PLATE_OFF || newId === IDS.PLATE_ON) g._machines = null;
                                                                } catch { }
                                                                return r;
                                                            };
                                                        }
                                                    } catch { }
                                                }

                                                // ─────────────────────────────────────────────────────────────
                                                // 9) Audio: cave reverb/echo for mining and ambience
                                                // ─────────────────────────────────────────────────────────────
                                                if (AudioManager && AudioManager.prototype && !AudioManager.prototype.__caveReverbV9) {
                                                    AudioManager.prototype.__caveReverbV9 = true;

                                                    AudioManager.prototype._ensureCaveFx = function () {
                                                        if (!this.ctx || this._caveFx) return;
                                                        const ctx = this.ctx;

                                                        const inGain = ctx.createGain();
                                                        const dry = ctx.createGain();
                                                        const wet = ctx.createGain();

                                                        const delay = ctx.createDelay(0.35);
                                                        delay.delayTime.value = 0.12;

                                                        const fb = ctx.createGain();
                                                        fb.gain.value = 0.28;

                                                        const lp = ctx.createBiquadFilter();
                                                        lp.type = 'lowpass';
                                                        lp.frequency.value = 1800;

                                                        inGain.connect(dry);
                                                        dry.connect(ctx.destination);

                                                        inGain.connect(delay);
                                                        delay.connect(lp);
                                                        lp.connect(wet);
                                                        wet.connect(ctx.destination);

                                                        lp.connect(fb);
                                                        fb.connect(delay);

                                                        dry.gain.value = 1;
                                                        wet.gain.value = 0;

                                                        this._caveFx = { inGain, dry, wet, delay, fb, lp };
                                                    };

                                                    AudioManager.prototype.setEnvironment = function (depth01, enclosed01) {
                                                        if (!this.ctx) return;
                                                        this._ensureCaveFx();
                                                        const fx = this._caveFx;
                                                        if (!fx) return;

                                                        const d = Math.max(0, Math.min(1, +depth01 || 0));
                                                        const e = Math.max(0, Math.min(1, +enclosed01 || 0));
                                                        const cave = Math.max(0, (d - 0.42) / 0.55) * (0.65 + 0.35 * e);
                                                        this._caveAmt = cave;

                                                        const now = this.ctx.currentTime;
                                                        try { fx.wet.gain.setTargetAtTime(Math.min(0.55, cave * 0.55), now, 0.08); } catch { fx.wet.gain.value = Math.min(0.55, cave * 0.55); }
                                                        try { fx.dry.gain.setTargetAtTime(1 - Math.min(0.25, cave * 0.25), now, 0.08); } catch { fx.dry.gain.value = 1 - Math.min(0.25, cave * 0.25); }
                                                        try { fx.delay.delayTime.setTargetAtTime(0.09 + cave * 0.08, now, 0.08); } catch { fx.delay.delayTime.value = 0.09 + cave * 0.08; }
                                                        try { fx.fb.gain.setTargetAtTime(0.18 + cave * 0.18, now, 0.08); } catch { fx.fb.gain.value = 0.18 + cave * 0.18; }
                                                        try { fx.lp.frequency.setTargetAtTime(2200 - cave * 900, now, 0.08); } catch { fx.lp.frequency.value = 2200 - cave * 900; }
                                                    };

                                                    // Allow beep/noise to route through a destination node
                                                    const _beep = AudioManager.prototype.beep;
                                                    AudioManager.prototype.beep = function (freq, dur, type, vol, dest) {
                                                        if (!this.ctx) return;
                                                        const out = dest || (this._caveFx ? this._caveFx.inGain : null) || this.ctx.destination;
                                                        // re-implement lightly (avoid calling old which always connects destination)
                                                        const v = (this.settings.sfxVolume || 0) * (vol || 1);
                                                        if (v <= 0.0001) return;

                                                        const o = this.ctx.createOscillator();
                                                        o.type = type || 'sine';
                                                        o.frequency.value = freq || 440;

                                                        const g = this.ctx.createGain();
                                                        const now = this.ctx.currentTime;
                                                        g.gain.setValueAtTime(0.0001, now);
                                                        g.gain.exponentialRampToValueAtTime(v, now + 0.01);
                                                        g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.06));

                                                        o.connect(g);
                                                        g.connect(out);

                                                        o.start(now);
                                                        o.stop(now + (dur || 0.06) + 0.02);
                                                    };

                                                    AudioManager.prototype.noise = function (dur, vol, dest) {
                                                        if (!this.ctx || !this._noiseBuf) return;
                                                        const out = dest || (this._caveFx ? this._caveFx.inGain : null) || this.ctx.destination;
                                                        const v = (this.settings.sfxVolume || 0) * (vol || 1);
                                                        if (v <= 0.0001) return;

                                                        const src = this.ctx.createBufferSource();
                                                        src.buffer = this._noiseBuf;

                                                        const g = this.ctx.createGain();
                                                        const now = this.ctx.currentTime;
                                                        g.gain.setValueAtTime(0.0001, now);
                                                        g.gain.exponentialRampToValueAtTime(v, now + 0.01);
                                                        g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.08));

                                                        src.connect(g);
                                                        g.connect(out);

                                                        src.start(now);
                                                        src.stop(now + (dur || 0.08) + 0.02);
                                                    };

                                                    // Patch play: mining gets subtle echo underground
                                                    const _play = AudioManager.prototype.play;
                                                    AudioManager.prototype.play = function (kind) {
                                                        if (!this.ctx) { try { return _play.call(this, kind); } catch { return; } }
                                                        const cave = (this._caveAmt || 0);
                                                        const dest = (cave > 0.05 && this._caveFx) ? this._caveFx.inGain : this.ctx.destination;

                                                        switch (kind) {
                                                            case 'mine':
                                                                this.noise(0.06, 0.9, dest);
                                                                this.beep(220, 0.05, 'triangle', 0.35, dest);
                                                                if (cave > 0.35) this.noise(0.03, 0.28, dest); // extra slapback
                                                                break;
                                                            default:
                                                                try { _play.call(this, kind); } catch { }
                                                        }
                                                    };
                                                }
                                            }
                                        }); try { __p && __p.apply && __p.apply(); } catch (e) { console.warn('[TU merge] patch apply failed', __p && __p.id, e); }
                                    })();
                                })();
