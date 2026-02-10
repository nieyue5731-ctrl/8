// Module: error-guards
// Source: lines 22780-22814 of original file
// Category: core
// ═══════════════════════════════════════════════════════════

(() => {
                                    // 防止 toast 无限刷屏
                                    let lastAt = 0;
                                    let lastMsg = '';
                                    const safeToast = (msg) => {
                                        const now = Date.now();
                                        const m = String(msg || '未知错误');
                                        if (m === lastMsg && (now - lastAt) < 1500) return;
                                        lastAt = now;
                                        lastMsg = m;
                                        try { if (typeof Toast !== 'undefined' && Toast && Toast.show) Toast.show(m, 2600); }
                                        catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                    };

                                    window.addEventListener('error', (ev) => {
                                        try {
                                            const msg = ev && ev.message ? ev.message : '运行时错误';
                                            safeToast('⚠️ ' + msg);
                                            // 打印更完整的堆栈，方便排查
                                            if (ev && ev.error) console.error(ev.error);
                                            else console.error(ev);
                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                    });

                                    window.addEventListener('unhandledrejection', (ev) => {
                                        try {
                                            const r = ev && ev.reason;
                                            const msg = (r && (r.message || r.toString())) || '未处理的异步错误';
                                            safeToast('⚠️ ' + msg);
                                            console.error(r || ev);
                                        } catch (e) { if (typeof console !== 'undefined' && console.debug) console.debug('[Debug] Silently caught:', e); }
                                    });
                                })();
