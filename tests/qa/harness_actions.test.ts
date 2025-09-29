import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('QA Harness actions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="log"></div>
      <div id="controls-test"></div>
      <input id="dev-mode-checkbox" type="checkbox" />
      <button id="start-test-game"></button>
    `;
    // Ensure charts are unavailable so Harness uses pseudo deterministic path
    (globalThis as any).GS = { tables: { offenseCharts: null } } as any;
  });

  it('startTestGame emits final log', async () => {
    const { EventBus } = await import('../../src/utils/EventBus');
    const { registerQAHarness } = await import('../../src/qa/Harness');
    const { registerLog } = await import('../../src/ui/Log');
    const bus = new EventBus();
    registerLog(bus);
    registerQAHarness(bus);
    bus.emit('qa:startTestGame', { seed: 42, playerDeck: 'Pro Style', aiDeck: 'Pro Style', startingPossession: 'player' } as any);
    await Promise.resolve();
    const text = (document.getElementById('log') as HTMLElement).textContent || '';
    expect(text).toMatch(/Final — HOME .* — AWAY .*/);
  });

  it('runBatch logs summary and handles clipboard/download safety', async () => {
    const { EventBus } = await import('../../src/utils/EventBus');
    const { registerQAHarness } = await import('../../src/qa/Harness');
    const { registerLog } = await import('../../src/ui/Log');
    const bus = new EventBus();
    registerLog(bus);
    registerQAHarness(bus);
    bus.emit('qa:runBatch', { seeds: [1,2,3,4,5], playerPAT: 'auto' } as any);
    await Promise.resolve();
    const text = (document.getElementById('log') as HTMLElement).textContent || '';
    expect(text).toMatch(/DEV: Batch/);

    // Clipboard path
    const writeText = vi.fn();
    (globalThis as any).navigator = { clipboard: { writeText } } as any;
    (document.getElementById('log') as HTMLElement).textContent = 'hello';
    bus.emit('qa:copyLog', {} as any);
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('hello');

    // Download fallback
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:abc');
    const revokeObjectURL = vi.fn();
    (globalThis as any).URL = { createObjectURL, revokeObjectURL } as any;
    const a = document.createElement('a');
    (a as any).click = click;
    document.body.appendChild(a);
    bus.emit('qa:downloadDebug', {} as any);
    await Promise.resolve();
  });
});


