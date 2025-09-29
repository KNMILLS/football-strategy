import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('DevMode visibility and persistence', () => {
  beforeEach(() => {
    // jsdom loads index.html via vite dev; simulate DOM
    document.body.innerHTML = `
      <div id="controls-test" class="hidden"></div>
      <input id="dev-mode-checkbox" type="checkbox" />
    `;
    (globalThis as any).localStorage?.clear?.();
  });

  it('toggles panel on ui:devModeChanged and persists', async () => {
    const { EventBus } = await import('../../src/utils/EventBus');
    const { registerDevMode } = await import('../../src/ui/DevMode');
    const bus = new EventBus();
    registerDevMode(bus);

    const panel = document.getElementById('controls-test') as any;
    expect(panel.hidden).toBe(true);
    bus.emit('ui:devModeChanged', { enabled: true } as any);
    expect(panel.hidden).toBe(false);
    const chk = document.getElementById('dev-mode-checkbox') as HTMLInputElement;
    expect(chk.checked).toBe(true);
    // Simulate user toggling off
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
    expect(panel.hidden).toBe(true);
    expect(localStorage.getItem('gs_dev_mode')).toBe('0');
  });
});


