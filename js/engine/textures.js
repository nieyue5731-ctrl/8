// Module: textures
// Source: lines 5732-6351 of original file
// Category: engine
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
        //                                纹理生成器 (像素艺术大师版)
        // ═══════════════════════════════════════════════════════════════════════════════
        class TextureGenerator {
            constructor() {
                this.cache = []; // Array cache: blockId -> canvas|null，比 Map 更快
                this.glowCache = []; // 发光贴图缓存：blockId -> canvas|null
                // 预定义调色板
                this.palette = {
                    dirt: ['#5d4037', '#4e342e', '#3e2723', '#795548'],
                    grass: ['#4caf50', '#388e3c', '#2e7d32', '#81c784'],
                    stone: ['#9e9e9e', '#757575', '#616161', '#424242'],
                    wood: ['#8d6e63', '#6d4c41', '#5d4037', '#4e342e'],
                    sand: ['#fff176', '#fdd835', '#fbc02d', '#f9a825']
                };
            }

            get(blockId) {
                // Array 索引比 Map.has/get 更快；用 undefined 作为“未缓存”哨兵
                const cached = this.cache[blockId];
                if (cached !== undefined) return cached;

                const data = BLOCK_DATA[blockId];
                if (!data?.color) {
                    this.cache[blockId] = null;
                    return null;
                }

                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = CONFIG.TILE_SIZE;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                // 禁用平滑以获得清脆的像素感
                ctx.imageSmoothingEnabled = false;

                this._drawPixelArt(ctx, blockId, data);
                this.cache[blockId] = canvas;
                return canvas;
            }

            getGlow(blockId) {
                // 仅对发光方块生成“预烘焙辉光贴图”，避免每格 ctx.save/shadowBlur 的高开销
                const cached = this.glowCache[blockId];
                if (cached !== undefined) return cached;

                const base = this.get(blockId);
                if (!base) {
                    this.glowCache[blockId] = null;
                    return null;
                }

                // BLOCK_LIGHT / BLOCK_COLOR 在后续常量区定义；方法执行时已就绪即可
                const bl = (typeof BLOCK_LIGHT !== 'undefined' && BLOCK_LIGHT[blockId]) ? BLOCK_LIGHT[blockId] : 0;
                if (bl <= 5) {
                    this.glowCache[blockId] = null;
                    return null;
                }

                const pad = Math.max(2, Math.min(24, Math.ceil(bl * 1.6)));
                const size = CONFIG.TILE_SIZE + pad * 2;

                const glow = document.createElement('canvas');
                glow.width = glow.height = size;
                const gctx = glow.getContext('2d', { alpha: true });
                gctx.imageSmoothingEnabled = false;

                gctx.clearRect(0, 0, size, size);
                gctx.save();
                gctx.shadowColor = (typeof BLOCK_COLOR !== 'undefined' && BLOCK_COLOR[blockId]) ? BLOCK_COLOR[blockId] : (BLOCK_DATA[blockId]?.color || '#ffffff');
                gctx.shadowBlur = bl * 2;
                gctx.drawImage(base, pad, pad);
                gctx.restore();

                // 给渲染端一个 pad 信息（用于绘制时回退偏移）
                glow.__pad = pad;

                this.glowCache[blockId] = glow;
                return glow;
            }

            _drawPixel(ctx, x, y, color) {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, 1, 1);
            }

            // 使用像素矩阵绘制
            _drawMatrix(ctx, matrix, colors) {
                for (let y = 0; y < 16; y++) {
                    for (let x = 0; x < 16; x++) {
                        const char = matrix[y] ? matrix[y][x] : '.';
                        if (colors[char]) {
                            this._drawPixel(ctx, x, y, colors[char]);
                        }
                    }
                }
            }

            _drawPixelArt(ctx, id, data) {
                const s = CONFIG.TILE_SIZE;
                const p = this.palette;

                // 基础底色填充
                const baseColor = data.color || '#F0F';

                // 生成随机像素纹理的辅助函数
                const fillNoise = (colors, density = 0.3) => {
                    for (let x = 0; x < s; x++) {
                        for (let y = 0; y < s; y++) {
                            if (Math.random() < density) {
                                const c = colors[Math.floor(Math.random() * colors.length)];
                                this._drawPixel(ctx, x, y, c);
                            }
                        }
                    }
                };

                switch (id) {
                    case BLOCK.DIRT:
                        // 土块：深浅不一的噪点
                        ctx.fillStyle = p.dirt[0]; ctx.fillRect(0, 0, s, s);
                        fillNoise(p.dirt, 0.5);
                        break;

                    case BLOCK.GRASS:
                    case BLOCK.SNOW_GRASS:
                    case BLOCK.JUNGLE_GRASS:
                        // 侧面草方块：顶部是草，下面是土
                        const isSnow = id === BLOCK.SNOW_GRASS;
                        const topColors = isSnow ? ['#fff', '#eee', '#ddd'] :
                            (id === BLOCK.JUNGLE_GRASS ? ['#66bb6a', '#43a047', '#2e7d32'] : p.grass);
                        const soilColors = id === BLOCK.JUNGLE_GRASS ? ['#5d4037', '#4e342e'] : p.dirt;

                        // 土壤部分
                        ctx.fillStyle = soilColors[0]; ctx.fillRect(0, 0, s, s);
                        fillNoise(soilColors, 0.4);

                        // 草顶 (3-5像素厚)
                        ctx.fillStyle = topColors[1];
                        ctx.fillRect(0, 0, s, 4);

                        // 草的边缘（垂下的像素）
                        for (let x = 0; x < s; x++) {
                            const drop = Math.floor(Math.random() * 3) + 1;
                            ctx.fillStyle = topColors[Math.floor(Math.random() * topColors.length)];
                            ctx.fillRect(x, 0, 1, 4 + drop);
                            // 偶尔的高光
                            if (Math.random() > 0.8) {
                                ctx.fillStyle = topColors[0];
                                ctx.fillRect(x, 1, 1, 1);
                            }
                        }
                        break;

                    case BLOCK.STONE:
                    case BLOCK.COBBLESTONE:
                    case BLOCK.MOSSY_STONE:
                    case BLOCK.GRANITE:
                    case BLOCK.MARBLE:
                        // 石头纹理：不规则的层状或块状
                        const stoneBase = id === BLOCK.GRANITE ? '#4e342e' : (id === BLOCK.MARBLE ? '#f5f5f5' : '#757575');
                        const stoneDark = id === BLOCK.GRANITE ? '#3e2723' : (id === BLOCK.MARBLE ? '#e0e0e0' : '#616161');

                        ctx.fillStyle = stoneBase; ctx.fillRect(0, 0, s, s);

                        if (id === BLOCK.COBBLESTONE) {
                            // 圆石：画几个圆圈轮廓
                            ctx.fillStyle = '#00000033'; // 阴影缝隙
                            ctx.fillRect(2, 1, 10, 1); ctx.fillRect(1, 2, 1, 4); ctx.fillRect(12, 2, 1, 4); ctx.fillRect(2, 6, 10, 1);
                            ctx.fillRect(0, 8, 6, 1); ctx.fillRect(5, 9, 1, 4); ctx.fillRect(0, 13, 6, 1);
                            ctx.fillRect(7, 8, 9, 1); ctx.fillRect(7, 9, 1, 5); ctx.fillRect(15, 9, 1, 5);
                        } else {
                            // 天然石：横向裂纹
                            for (let i = 0; i < 8; i++) {
                                const sx = Math.floor(Math.random() * s);
                                const sy = Math.floor(Math.random() * s);
                                const len = Math.floor(Math.random() * 5) + 2;
                                ctx.fillStyle = stoneDark;
                                ctx.fillRect(sx, sy, len, 1);
                            }
                            fillNoise([stoneBase, stoneDark], 0.2);
                        }

                        if (id === BLOCK.MOSSY_STONE) {
                            fillNoise(p.grass, 0.2); // 苔藓斑点
                        }
                        break;

                    case BLOCK.WOOD:
                    case BLOCK.LOG:
                        // 原木：树皮纹理（垂直）
                        ctx.fillStyle = '#5d4037'; ctx.fillRect(0, 0, s, s);
                        for (let x = 1; x < s; x += 2) {
                            ctx.fillStyle = Math.random() > 0.5 ? '#4e342e' : '#3e2723';
                            ctx.fillRect(x, 0, 1, s);
                            if (Math.random() > 0.7) ctx.fillRect(x + 1, Math.random() * s, 1, 2); // 树节
                        }
                        break;

                    case BLOCK.PLANKS:
                        // 木板：水平条纹
                        ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, s, s);
                        // 分隔线
                        ctx.fillStyle = '#4e342e';
                        ctx.fillRect(0, 4, s, 1);
                        ctx.fillRect(0, 9, s, 1);
                        ctx.fillRect(0, 14, s, 1);
                        // 随机噪点模拟木纹
                        fillNoise(['#795548', '#a1887f'], 0.1);
                        break;

                    case BLOCK.BRICK:
                        // 砖块：交错排列
                        ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, s, s); // 灰缝
                        const bCol = '#d32f2f';
                        const bLit = '#ef5350';
                        const bDrk = '#b71c1c';

                        const drawOneBrick = (x, y, w, h) => {
                            ctx.fillStyle = bCol; ctx.fillRect(x, y, w, h);
                            ctx.fillStyle = bLit; ctx.fillRect(x, y, w - 1, 1); ctx.fillRect(x, y, 1, h - 1);
                            ctx.fillStyle = bDrk; ctx.fillRect(x + w - 1, y, 1, h); ctx.fillRect(x, y + h - 1, w, 1);
                        };

                        drawOneBrick(0, 0, 7, 7);
                        drawOneBrick(8, 0, 8, 7);
                        drawOneBrick(0, 8, 3, 7);
                        drawOneBrick(4, 8, 8, 7);
                        drawOneBrick(13, 8, 3, 7);
                        break;

                    case BLOCK.LEAVES:
                        // 树叶：通透的像素点簇
                        // 不清除背景，让它透明
                        const leafColors = ['#2e7d32', '#388e3c', '#43a047'];
                        for (let x = 0; x < s; x += 2) {
                            for (let y = 0; y < s; y += 2) {
                                if (Math.random() > 0.3) {
                                    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
                                    ctx.fillRect(x, y, 2, 2);
                                    // 阴影
                                    if (Math.random() > 0.5) {
                                        ctx.fillStyle = '#1b5e20';
                                        ctx.fillRect(x + 1, y + 1, 1, 1);
                                    }
                                }
                            }
                        }
                        break;

                    case BLOCK.GLASS:
                        // 玻璃：边框 + 反光
                        ctx.fillStyle = 'rgba(225, 245, 254, 0.2)'; ctx.fillRect(1, 1, 14, 14);
                        ctx.strokeStyle = '#81d4fa'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, 15, 15);
                        // 反光条
                        ctx.fillStyle = 'rgba(255,255,255,0.6)';
                        ctx.fillRect(3, 3, 2, 2);
                        ctx.fillRect(5, 5, 2, 2);
                        ctx.fillRect(10, 10, 3, 3);
                        break;

                    case BLOCK.ORE_COPPER:
                    case BLOCK.ORE_IRON:
                    case BLOCK.ORE_SILVER:
                    case BLOCK.ORE_GOLD:
                    case BLOCK.ORE_DIAMOND:
                    case BLOCK.COPPER_ORE: case BLOCK.IRON_ORE: case BLOCK.SILVER_ORE:
                    case BLOCK.GOLD_ORE: case BLOCK.DIAMOND_ORE:
                        // 矿石：石头背景 + 宝石镶嵌
                        this._drawPixelArt(ctx, BLOCK.STONE, BLOCK_DATA[BLOCK.STONE]);

                        let oreC = '#FFF';
                        if (id === BLOCK.COPPER_ORE) oreC = '#e67e22';
                        if (id === BLOCK.IRON_ORE) oreC = '#d7ccc8';
                        if (id === BLOCK.SILVER_ORE) oreC = '#e0e0e0';
                        if (id === BLOCK.GOLD_ORE) oreC = '#ffd700';
                        if (id === BLOCK.DIAMOND_ORE) oreC = '#29b6f6';
                        if (data.color) oreC = data.color;

                        for (let i = 0; i < 4; i++) {
                            const ox = Math.floor(Math.random() * 12) + 2;
                            const oy = Math.floor(Math.random() * 12) + 2;
                            // 矿石形状
                            ctx.fillStyle = oreC;
                            ctx.fillRect(ox, oy, 2, 2);
                            ctx.fillRect(ox - 1, oy, 1, 1);
                            ctx.fillRect(ox, oy - 1, 1, 1);
                            // 高光
                            ctx.fillStyle = '#ffffffaa';
                            ctx.fillRect(ox, oy, 1, 1);
                        }
                        break;

                    case BLOCK.TORCH:
                        // 火把
                        ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 6, 2, 10); // 柄
                        // 火焰中心
                        ctx.fillStyle = '#ffeb3b'; ctx.fillRect(6, 4, 4, 4);
                        ctx.fillStyle = '#fff'; ctx.fillRect(7, 5, 2, 2);
                        // 外焰
                        ctx.fillStyle = '#ff5722';
                        ctx.fillRect(7, 2, 2, 2);
                        ctx.fillRect(6, 4, 1, 1); ctx.fillRect(9, 4, 1, 1);
                        break;

                    case BLOCK.SAND:
                        ctx.fillStyle = '#fff59d'; ctx.fillRect(0, 0, s, s);
                        // 波浪纹理
                        ctx.fillStyle = '#fdd835';
                        for (let y = 2; y < s; y += 4) {
                            for (let x = 0; x < s; x++) {
                                if ((x + y) % 4 === 0) ctx.fillRect(x, y, 1, 1);
                            }
                        }
                        fillNoise(['#fbc02d'], 0.1);
                        break;

                    case BLOCK.MUSHROOM:
                        // 蘑菇
                        ctx.fillStyle = '#fff'; ctx.fillRect(7, 10, 2, 6); // 茎
                        // 伞盖
                        ctx.fillStyle = '#e91e63';
                        ctx.fillRect(4, 7, 8, 3);
                        ctx.fillRect(5, 6, 6, 1);
                        // 斑点
                        ctx.fillStyle = '#f8bbd0';
                        ctx.fillRect(5, 8, 1, 1); ctx.fillRect(9, 7, 1, 1);
                        break;

                    case BLOCK.FLOWER_RED:
                    case BLOCK.FLOWER_YELLOW:
                    case BLOCK.PINK_FLOWER:
                    case BLOCK.BLUE_FLOWER:
                        const stemC = '#4caf50';
                        ctx.fillStyle = stemC; ctx.fillRect(7, 8, 2, 8); // 茎
                        // 叶
                        ctx.fillRect(5, 12, 2, 1); ctx.fillRect(9, 11, 2, 1);
                        // 花瓣
                        let petalC = '#f44336';
                        if (id === BLOCK.FLOWER_YELLOW) petalC = '#ffeb3b';
                        if (id === BLOCK.PINK_FLOWER) petalC = '#f48fb1';
                        if (id === BLOCK.BLUE_FLOWER) petalC = '#64b5f6';
                        ctx.fillStyle = petalC;
                        ctx.fillRect(6, 6, 4, 4);
                        ctx.fillRect(7, 5, 2, 6);
                        ctx.fillRect(5, 7, 6, 2);
                        // 花蕊
                        ctx.fillStyle = '#fff'; ctx.fillRect(7, 7, 2, 2);
                        break;

                    case BLOCK.SUNFLOWER:
                        ctx.fillStyle = '#4caf50'; ctx.fillRect(7, 6, 2, 10); // 茎
                        ctx.fillRect(5, 10, 2, 1); ctx.fillRect(9, 9, 2, 1);
                        // 花瓣 - 向日葵
                        ctx.fillStyle = '#ffeb3b';
                        for (let i = 0; i < 8; i++) {
                            const angle = (i / 8) * Math.PI * 2;
                            const px = 8 + Math.cos(angle) * 4;
                            const py = 4 + Math.sin(angle) * 4;
                            ctx.fillRect(Math.floor(px) - 1, Math.floor(py) - 1, 3, 3);
                        }
                        ctx.fillStyle = '#8d6e63'; ctx.fillRect(6, 2, 4, 4); // 中心
                        break;

                    case BLOCK.FERN:
                        ctx.fillStyle = '#2e7d32';
                        ctx.fillRect(7, 6, 2, 10);
                        // 蕨类叶片
                        for (let i = 0; i < 5; i++) {
                            const y = 6 + i * 2;
                            ctx.fillRect(4, y, 3, 1);
                            ctx.fillRect(9, y + 1, 3, 1);
                        }
                        break;

                    case BLOCK.VINE:
                        ctx.fillStyle = '#388e3c';
                        ctx.fillRect(7, 0, 2, 16);
                        ctx.fillRect(5, 3, 2, 1);
                        ctx.fillRect(9, 6, 2, 1);
                        ctx.fillRect(4, 10, 2, 1);
                        ctx.fillRect(10, 13, 2, 1);
                        break;

                    case BLOCK.BAMBOO:
                        ctx.fillStyle = '#7cb342'; ctx.fillRect(6, 0, 4, 16);
                        ctx.fillStyle = '#689f38';
                        ctx.fillRect(6, 3, 4, 1);
                        ctx.fillRect(6, 8, 4, 1);
                        ctx.fillRect(6, 13, 4, 1);
                        ctx.fillStyle = '#8bc34a';
                        ctx.fillRect(7, 0, 2, 16);
                        break;

                    case BLOCK.CHERRY_LEAVES:
                        const cherryColors = ['#f48fb1', '#f8bbd9', '#fce4ec', '#ec407a'];
                        for (let x = 0; x < s; x += 2) {
                            for (let y = 0; y < s; y += 2) {
                                if (Math.random() > 0.25) {
                                    ctx.fillStyle = cherryColors[Math.floor(Math.random() * cherryColors.length)];
                                    ctx.fillRect(x, y, 2, 2);
                                }
                            }
                        }
                        break;

                    case BLOCK.PINE_LEAVES:
                        const pineColors = ['#1b5e20', '#2e7d32', '#388e3c'];
                        for (let x = 0; x < s; x++) {
                            for (let y = 0; y < s; y++) {
                                if (Math.random() > 0.2) {
                                    ctx.fillStyle = pineColors[Math.floor(Math.random() * pineColors.length)];
                                    ctx.fillRect(x, y, 1, 1);
                                }
                            }
                        }
                        break;

                    case BLOCK.PALM_LEAVES:
                        const palmColors = ['#7cb342', '#8bc34a', '#9ccc65'];
                        for (let x = 0; x < s; x += 2) {
                            for (let y = 0; y < s; y += 2) {
                                if (Math.random() > 0.3) {
                                    ctx.fillStyle = palmColors[Math.floor(Math.random() * palmColors.length)];
                                    ctx.fillRect(x, y, 2, 2);
                                }
                            }
                        }
                        break;

                    case BLOCK.SANDSTONE:
                        ctx.fillStyle = '#d4a574'; ctx.fillRect(0, 0, s, s);
                        ctx.fillStyle = '#c9956c';
                        ctx.fillRect(0, 4, s, 1);
                        ctx.fillRect(0, 10, s, 1);
                        fillNoise(['#deb887', '#c9956c'], 0.2);
                        break;

                    case BLOCK.RED_SAND:
                        ctx.fillStyle = '#c75b39'; ctx.fillRect(0, 0, s, s);
                        fillNoise(['#b74a2a', '#d96c4a'], 0.4);
                        break;

                    case BLOCK.GRAVEL:
                        ctx.fillStyle = '#757575'; ctx.fillRect(0, 0, s, s);
                        for (let i = 0; i < 20; i++) {
                            const gx = Math.floor(Math.random() * 14) + 1;
                            const gy = Math.floor(Math.random() * 14) + 1;
                            ctx.fillStyle = Math.random() > 0.5 ? '#616161' : '#9e9e9e';
                            ctx.fillRect(gx, gy, 2, 2);
                        }
                        break;

                    case BLOCK.LIMESTONE:
                        ctx.fillStyle = '#e8dcc4'; ctx.fillRect(0, 0, s, s);
                        fillNoise(['#d7c9a8', '#f5f0e0'], 0.25);
                        break;

                    case BLOCK.SLATE:
                        ctx.fillStyle = '#546e7a'; ctx.fillRect(0, 0, s, s);
                        for (let y = 2; y < s; y += 3) {
                            ctx.fillStyle = '#455a64';
                            ctx.fillRect(0, y, s, 1);
                        }
                        break;

                    case BLOCK.BASALT:
                        ctx.fillStyle = '#37474f'; ctx.fillRect(0, 0, s, s);
                        fillNoise(['#263238', '#455a64'], 0.3);
                        break;

                    case BLOCK.FROZEN_STONE:
                        ctx.fillStyle = '#b3e5fc'; ctx.fillRect(0, 0, s, s);
                        fillNoise(['#81d4fa', '#e1f5fe'], 0.3);
                        // 冰晶效果
                        ctx.fillStyle = 'rgba(255,255,255,0.5)';
                        ctx.fillRect(3, 3, 2, 2);
                        ctx.fillRect(10, 8, 2, 2);
                        break;

                    case BLOCK.GLOWSTONE:
                        ctx.fillStyle = '#ffc107'; ctx.fillRect(0, 0, s, s);
                        fillNoise(['#ffeb3b', '#ff9800', '#fff176'], 0.5);
                        // 发光效果
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(4, 4, 2, 2);
                        ctx.fillRect(10, 10, 2, 2);
                        break;

                    case BLOCK.AMETHYST:
                        ctx.fillStyle = '#9c27b0'; ctx.fillRect(0, 0, s, s);
                        // 晶体纹理
                        ctx.fillStyle = '#ba68c8';
                        ctx.fillRect(3, 2, 2, 6);
                        ctx.fillRect(8, 4, 3, 8);
                        ctx.fillStyle = '#e1bee7';
                        ctx.fillRect(4, 3, 1, 4);
                        ctx.fillRect(9, 5, 1, 6);
                        break;

                    case BLOCK.MUSHROOM_GIANT:
                        ctx.fillStyle = '#8e24aa'; ctx.fillRect(0, 0, s, s);
                        fillNoise(['#7b1fa2', '#9c27b0', '#ab47bc'], 0.4);
                        // 斑点
                        ctx.fillStyle = '#e1bee7';
                        ctx.fillRect(3, 4, 2, 2);
                        ctx.fillRect(10, 8, 2, 2);
                        ctx.fillRect(6, 12, 2, 2);
                        break;

                    case BLOCK.UNDERGROUND_MUSHROOM:
                        ctx.fillStyle = '#7e57c2'; ctx.fillRect(7, 10, 2, 6);
                        ctx.fillStyle = '#5e35b1';
                        ctx.fillRect(4, 7, 8, 3);
                        ctx.fillRect(5, 6, 6, 1);
                        // 发光点
                        ctx.fillStyle = '#b39ddb';
                        ctx.fillRect(5, 8, 1, 1);
                        ctx.fillRect(9, 7, 1, 1);
                        break;

                    case BLOCK.GLOWING_MOSS:
                        ctx.fillStyle = '#00e676';
                        for (let x = 0; x < s; x += 2) {
                            for (let y = 0; y < s; y += 2) {
                                if (Math.random() > 0.4) {
                                    ctx.fillStyle = Math.random() > 0.5 ? '#00e676' : '#69f0ae';
                                    ctx.fillRect(x, y, 2, 2);
                                }
                            }
                        }
                        break;

                    case BLOCK.STALAGMITE:
                    case BLOCK.STALACTITE:
                        const isUp = id === BLOCK.STALACTITE;
                        ctx.fillStyle = '#8d6e63';
                        if (isUp) {
                            ctx.fillRect(6, 0, 4, 8);
                            ctx.fillRect(7, 8, 2, 6);
                            ctx.fillRect(7, 14, 2, 2);
                        } else {
                            ctx.fillRect(7, 0, 2, 2);
                            ctx.fillRect(7, 2, 2, 6);
                            ctx.fillRect(6, 8, 4, 8);
                        }
                        break;

                    case BLOCK.SPIDER_WEB:
                        ctx.strokeStyle = '#eeeeee';
                        ctx.lineWidth = 1;
                        // 放射线
                        for (let i = 0; i < 8; i++) {
                            const angle = (i / 8) * Math.PI * 2;
                            ctx.beginPath();
                            ctx.moveTo(8, 8);
                            ctx.lineTo(8 + Math.cos(angle) * 7, 8 + Math.sin(angle) * 7);
                            ctx.stroke();
                        }
                        // 同心环
                        for (let r = 2; r <= 6; r += 2) {
                            ctx.beginPath();
                            ctx.arc(8, 8, r, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        break;

                    case BLOCK.BONE:
                        ctx.fillStyle = '#efebe9'; ctx.fillRect(0, 0, s, s);
                        ctx.fillStyle = '#d7ccc8';
                        ctx.fillRect(2, 6, 12, 4);
                        ctx.fillRect(0, 5, 3, 6);
                        ctx.fillRect(13, 5, 3, 6);
                        break;

                    case BLOCK.TREASURE_CHEST:
                        ctx.fillStyle = '#8d6e63'; ctx.fillRect(2, 4, 12, 10);
                        ctx.fillStyle = '#5d4037';
                        ctx.fillRect(2, 4, 12, 2);
                        ctx.fillStyle = '#ffd700';
                        ctx.fillRect(6, 8, 4, 3);
                        ctx.fillRect(7, 7, 2, 1);
                        break;

                    case BLOCK.LANTERN:
                        ctx.fillStyle = '#5d4037'; ctx.fillRect(6, 0, 4, 2);
                        ctx.fillStyle = '#ff9800'; ctx.fillRect(5, 2, 6, 8);
                        ctx.fillStyle = '#ffeb3b'; ctx.fillRect(6, 3, 4, 6);
                        ctx.fillStyle = '#fff'; ctx.fillRect(7, 4, 2, 4);
                        ctx.fillStyle = '#5d4037';
                        ctx.fillRect(5, 10, 6, 2);
                        ctx.fillRect(6, 12, 4, 2);
                        break;

                    case BLOCK.MOSS:
                        for (let x = 0; x < s; x++) {
                            for (let y = 0; y < s; y++) {
                                if (Math.random() > 0.5) {
                                    ctx.fillStyle = Math.random() > 0.5 ? '#558b2f' : '#689f38';
                                    ctx.fillRect(x, y, 1, 1);
                                }
                            }
                        }
                        break;

                    default:
                        // 默认降级处理
                        ctx.fillStyle = baseColor;
                        ctx.fillRect(0, 0, s, s);
                        ctx.fillStyle = '#00000022';
                        ctx.strokeRect(0, 0, s, s);
                        fillNoise(['#ffffff33', '#00000033'], 0.2);
                }
            }
        }

        // ───────────────────────── Exports ─────────────────────────
        window.TU = window.TU || {};
        Object.assign(window.TU, { TextureGenerator });
