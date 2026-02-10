// Module: minimap
// Source: lines 12142-12258 of original file
// Category: ui
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
        class Minimap {
            constructor(world) {
                this.canvas = document.getElementById('minimap-canvas');
                this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
                this.ctx.imageSmoothingEnabled = false;
                this._lastBuildAt = 0;
                this.buildIntervalMs = 120; // 可由 QualityManager 动态下发

                this.world = world;
                this.canvas.width = 160;
                this.canvas.height = 100;

                // 静态底图：OffscreenCanvas（支持时）/ 内存 canvas（回退）
                const off = (typeof OffscreenCanvas !== 'undefined')
                    ? new OffscreenCanvas(160, 100)
                    : document.createElement('canvas');
                off.width = 160;
                off.height = 100;
                this._mapCanvas = off;
                this._mapCtx = off.getContext('2d', { willReadFrequently: true });
                this._mapCtx.imageSmoothingEnabled = false;

                this.imageData = this._mapCtx.createImageData(160, 100);
                this.dirty = true;
            }

            update() {
                if (!this.dirty) return;

                // 史诗级优化：小地图重建节流（挖掘/放置连发时避免频繁 putImageData）
                const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                const interval = (typeof this.buildIntervalMs === 'number' && isFinite(this.buildIntervalMs))
                    ? Math.max(30, this.buildIntervalMs)
                    : 120;
                if (this._lastBuildAt && (now - this._lastBuildAt) < interval) return;
                this._lastBuildAt = now;

                const tiles = this.world.tiles;
                const w = this.world.w;
                const h = this.world.h;

                const sx = w / 160;
                const sy = h / 100;
                const surfaceY = h * CONFIG.SURFACE_LEVEL;

                const data = this.imageData.data;
                let idx = 0;

                // 改为 y 外层 / x 内层，按内存顺序写入 ImageData，更快且不改变效果
                for (let y = 0; y < 100; y++) {
                    const wy = Math.floor(y * sy);
                    const isSky = wy < surfaceY;

                    for (let x = 0; x < 160; x++) {
                        const wx = Math.floor(x * sx);
                        const b = tiles[wx][wy];

                        let r, g, bl;
                        if (b === BLOCK.AIR) {
                            if (isSky) { r = 116; g = 185; bl = 255; }
                            else { r = 30; g = 25; bl = 40; }
                        } else {
                            const packed = BLOCK_COLOR_PACKED[b];
                            r = (packed >> 16) & 255;
                            g = (packed >> 8) & 255;
                            bl = packed & 255;
                        }

                        data[idx++] = r;
                        data[idx++] = g;
                        data[idx++] = bl;
                        data[idx++] = 255;
                    }
                }

                // 写入离屏底图（静态）
                this._mapCtx.putImageData(this.imageData, 0, 0);
                this.dirty = false;
            }

            render(px, py) {
                // 每帧仅做一次 drawImage + 画玩家点，避免玩家点“拖尾”
                this.ctx.drawImage(this._mapCanvas, 0, 0);
                this.renderPlayer(px, py);
            }

            renderPlayer(px, py) {
                const mx = (px / CONFIG.TILE_SIZE / this.world.w) * 160;
                const my = (py / CONFIG.TILE_SIZE / this.world.h) * 100;

                // 发光玩家点
                this.ctx.shadowColor = '#ffeaa7';
                this.ctx.shadowBlur = 6;
                this.ctx.fillStyle = '#ffeaa7';
                this.ctx.beginPath();
                this.ctx.arc(mx, my, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }

            invalidate() { this.dirty = true; }
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        //                                    游戏主类
        // ═══════════════════════════════════════════════════════════════════════════════

        // ═══════════════════════════════════════════════════════════════════════════════
        //                               系统分层（可维护性）

        // ───────────────────────── Exports ─────────────────────────
        window.TU = window.TU || {};
        Object.assign(window.TU, { Minimap });
