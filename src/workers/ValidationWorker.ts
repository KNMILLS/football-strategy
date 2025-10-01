/// <reference lib="webworker" />

// Run chunked, off-main-thread game simulations with validation and progress updates.

import { loadOffenseCharts, loadTimeKeeping } from '../data/loaders/tables';
import type { DeckName } from '../data/decks';
import { runChunk } from './validation/runChunk';
import type { DoneMessage, InMessage, ProgressMessage } from './validation/messages';

let cancelRequested = false;

self.onmessage = async (ev: MessageEvent<InMessage>) => {
  const data = ev.data;
  if (!data) return;
  if (data.type === 'cancel') { cancelRequested = true; return; }
  if (data.type !== 'run') return;

  try {
    const seeds = Array.isArray(data.seeds) ? data.seeds.slice() : [];
    const chunkSize = (typeof data.chunkSize === 'number' && data.chunkSize > 0) ? Math.floor(data.chunkSize) : 50;
    const total = seeds.length;
    if (!total) {
      (self as any).postMessage({ kind: 'done', summary: { total: 0, passed: 0, failed: 0, avgHome: 0, avgAway: 0 }, failures: [] } as DoneMessage);
      return;
    }

    const charts = (data.charts ?? null) || await loadOffenseCharts();
    const tk = (data.tk ?? null) || (await loadTimeKeeping()) || null;
    if (!charts) {
      (self as any).postMessage({ kind: 'done', summary: { total, passed: 0, failed: total, avgHome: 0, avgAway: 0 }, failures: seeds.map(s => ({ seed: s, issues: ['Offense charts unavailable.'] })) } as DoneMessage);
      return;
    }

    const cancelRef = { get value() { return cancelRequested; } } as { readonly value: boolean } as any;
    const res = await runChunk({
      seeds,
      total,
      playerPAT: data.playerPAT,
      chunkSize,
      charts,
      tk,
      playerDeck: data.playerDeck as DeckName | undefined,
      aiDeck: data.aiDeck as DeckName | undefined,
      playerCoach: data.playerCoach as any,
      aiCoach: data.aiCoach as any,
      cancelRequestedRef: cancelRef,
    }, ({ done, total, passed, failed }) => {
      (self as any).postMessage({ kind: 'progress', done, total, passed, failed } as ProgressMessage);
    });

    const avgHome = total ? +(res.sumHome / total).toFixed(2) : 0;
    const avgAway = total ? +(res.sumAway / total).toFixed(2) : 0;
    (self as any).postMessage({ kind: 'done', summary: { total, passed: res.passed, failed: res.failed, avgHome, avgAway }, failures: res.failures } as DoneMessage);
  } catch (e) {
    (self as any).postMessage({ kind: 'done', summary: { total: 0, passed: 0, failed: 0, avgHome: 0, avgAway: 0 }, failures: [{ seed: -1, issues: [String((e as any)?.message || e)] }] } as DoneMessage);
  } finally {
    cancelRequested = false;
  }
};


