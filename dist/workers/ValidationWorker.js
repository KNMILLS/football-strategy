/// <reference lib="webworker" />
// Run chunked, off-main-thread game simulations with validation and progress updates.
import { loadOffenseCharts, loadTimeKeeping } from '../data/loaders/tables';
import { runChunk } from './validation/runChunk';
let cancelRequested = false;
self.onmessage = async (ev) => {
    const data = ev.data;
    if (!data)
        return;
    if (data.type === 'cancel') {
        cancelRequested = true;
        return;
    }
    if (data.type !== 'run')
        return;
    try {
        const seeds = Array.isArray(data.seeds) ? data.seeds.slice() : [];
        const chunkSize = (typeof data.chunkSize === 'number' && data.chunkSize > 0) ? Math.floor(data.chunkSize) : 50;
        const total = seeds.length;
        if (!total) {
            self.postMessage({ kind: 'done', summary: { total: 0, passed: 0, failed: 0, avgHome: 0, avgAway: 0 }, failures: [] });
            return;
        }
        const charts = (data.charts ?? null) || await loadOffenseCharts();
        const tk = (data.tk ?? null) || (await loadTimeKeeping()) || null;
        if (!charts) {
            self.postMessage({ kind: 'done', summary: { total, passed: 0, failed: total, avgHome: 0, avgAway: 0 }, failures: seeds.map(s => ({ seed: s, issues: ['Offense charts unavailable.'] })) });
            return;
        }
        const cancelRef = { get value() { return cancelRequested; } };
        const res = await runChunk({
            seeds,
            total,
            playerPAT: data.playerPAT,
            chunkSize,
            charts,
            tk,
            playerDeck: data.playerDeck,
            aiDeck: data.aiDeck,
            playerCoach: data.playerCoach,
            aiCoach: data.aiCoach,
            cancelRequestedRef: cancelRef,
        }, ({ done, total, passed, failed }) => {
            self.postMessage({ kind: 'progress', done, total, passed, failed });
        });
        const avgHome = total ? +(res.sumHome / total).toFixed(2) : 0;
        const avgAway = total ? +(res.sumAway / total).toFixed(2) : 0;
        self.postMessage({ kind: 'done', summary: { total, passed: res.passed, failed: res.failed, avgHome, avgAway }, failures: res.failures });
    }
    catch (e) {
        self.postMessage({ kind: 'done', summary: { total: 0, passed: 0, failed: 0, avgHome: 0, avgAway: 0 }, failures: [{ seed: -1, issues: [String(e?.message || e)] }] });
    }
    finally {
        cancelRequested = false;
    }
};
//# sourceMappingURL=ValidationWorker.js.map