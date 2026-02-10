// Module: perf-monitor
// Source: lines 2673-2681 of original file
// Category: performance
// ═══════════════════════════════════════════════════════════

/**
 * Performance Monitor - delegates to PerfMonitor (defined later) to avoid duplication
 */
window.PERF_MONITOR = {
    record(ft) { if (window.PerfMonitor) window.PerfMonitor.frame(performance.now()); },
    getAverageFPS() { return window.PerfMonitor ? window.PerfMonitor.getAverageFPS() : 60; }
};
