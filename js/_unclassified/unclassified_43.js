// Module: unclassified_43
// Source: lines 20878-20898 of original file
// Category: _unclassified
// ═══════════════════════════════════════════════════════════

(() => {
                                    const TU = window.TU || {};
                                    const IDS = TU.LOGIC_BLOCKS || {};
                                    const Dim = window.DroppedItemManager || TU.DroppedItemManager;
                                    if (!Dim || !Dim.prototype || Dim.prototype.__logicDropNormalizeV9) return;
                                    Dim.prototype.__logicDropNormalizeV9 = true;

                                    const prev = Dim.prototype.spawn;
                                    if (typeof prev !== 'function') return;
                                    Dim.prototype.spawn = function (x, y, blockId, count) {
                                        try {
                                            if (blockId === IDS.WIRE_ON) blockId = IDS.WIRE_OFF;
                                            if (blockId === IDS.SWITCH_ON) blockId = IDS.SWITCH_OFF;
                                            if (blockId === IDS.LAMP_ON) blockId = IDS.LAMP_OFF;
                                            if (blockId === IDS.PLATE_ON) blockId = IDS.PLATE_OFF;
                                        } catch { }
                                        return prev.call(this, x, y, blockId, count);
                                    };
                                })();
