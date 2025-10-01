import type { EventBus } from '../utils/EventBus';
import { startTestGame } from './runners/startTestGame';
import { runAutoGame } from './runners/runAutoGame';
import { runBatch } from './runners/runBatch';
import { runValidatedBatch } from './validation/workerClient';
import { copyLogToClipboard } from './dev/clipboard';
import { downloadDebug } from './dev/downloadDebug';
import { pushDebugEntry } from './debug/buffer';

export function registerQAHarness(bus: EventBus): void {
  bus.on('qa:debug', ({ text }) => {
    try { pushDebugEntry(String(text)); } catch {}
  });

  bus.on('qa:startTestGame', async (p) => { await startTestGame(bus, p as any); });
  bus.on('qa:runAutoGame', async (p) => { await runAutoGame(bus, p as any); });
  bus.on('qa:runBatch', async (p) => { await runBatch(bus, p as any); });
  bus.on('qa:runValidatedBatch', async (p: any) => { await runValidatedBatch(bus, p as any); });

  bus.on('qa:copyLog', async () => { await copyLogToClipboard(bus); });
  bus.on('qa:downloadDebug', async () => {
    const getVersion = () => {
      try { return (globalThis as any).__APP_VERSION__ || 'dev'; } catch { return 'dev'; }
    };
    await downloadDebug(bus, getVersion);
  });
}


