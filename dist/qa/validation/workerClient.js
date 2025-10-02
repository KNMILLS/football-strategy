export async function runValidatedBatch(bus, p) {
    try {
        const seeds = (p && Array.isArray(p.seeds) && p.seeds.length > 0) ? p.seeds.slice() : Array.from({ length: 100 }, (_, i) => i + 1);
        const playerPAT = (p && (p.playerPAT === 'kick' || p.playerPAT === 'two' || p.playerPAT === 'auto')) ? p.playerPAT : 'auto';
        const chunkSize = (p && typeof p.chunkSize === 'number' && p.chunkSize > 0) ? Math.floor(p.chunkSize) : 50;
        if (typeof window === 'undefined') {
            bus.emit('log', { message: 'VALIDATION — worker mode requires browser environment.' });
            return;
        }
        const workerUrl = new URL('../../workers/ValidationWorker.ts', import.meta.url);
        const worker = new Worker(workerUrl, { type: 'module' });
        bus.emit('log', { message: `VALIDATION — starting worker (chunks of ${chunkSize}) for ${seeds.length} seeds…` });
        worker.onmessage = (ev) => {
            const msg = ev.data || {};
            if (msg.kind === 'progress') {
                bus.emit('log', { message: `VALIDATION — progress ${msg.done}/${msg.total} (passed:${msg.passed} failed:${msg.failed})` });
            }
            else if (msg.kind === 'done') {
                const { total, passed, failed, avgHome, avgAway } = msg.summary || { total: 0, passed: 0, failed: 0, avgHome: 0, avgAway: 0 };
                bus.emit('log', { message: `VALIDATION — total:${total} passed:${passed} failed:${failed} avg(H/A):${avgHome}/${avgAway}` });
                const failures = Array.isArray(msg.failures) ? msg.failures : [];
                for (const f of failures) {
                    bus.emit('log', { message: `VALIDATION-FAIL seed=${f.seed}` });
                    for (const issue of f.issues)
                        bus.emit('log', { message: `  • ${issue}` });
                }
                try {
                    worker.terminate();
                }
                catch { }
            }
        };
        worker.onerror = (err) => {
            bus.emit('log', { message: `VALIDATION — worker error: ${String(err?.message || err)}` });
            try {
                worker.terminate();
            }
            catch { }
        };
        const charts = globalThis.GS?.tables?.offenseCharts || null;
        const tk = globalThis.GS?.tables?.timeKeeping || null;
        worker.postMessage({ type: 'run', seeds, playerPAT, chunkSize, charts, tk });
    }
    catch (e) {
        bus.emit('log', { message: `DEV: Error in runValidatedBatch: ${e?.message || e}` });
    }
}
//# sourceMappingURL=workerClient.js.map