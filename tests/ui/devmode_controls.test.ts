import { describe, it, expect, beforeEach } from 'vitest';

describe('DevMode control events', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="controls-test"></div>
      <select id="theme-select"><option value="arcade">Arcade</option></select>
      <input id="sfx-enabled" type="checkbox" />
      <input id="sfx-volume" type="range" min="0" max="1" step="0.01" value="0.5" />
      <button id="start-test-game"></button>
      <button id="run-auto-game"></button>
      <button id="copy-log"></button>
      <button id="download-debug"></button>
      <input id="dev-mode-checkbox" type="checkbox" checked />
      <div id="log"></div>
    `;
  });

  it('emits theme and sfx events', async () => {
    const { EventBus } = await import('../../src/utils/EventBus');
    const { registerDevMode } = await import('../../src/ui/DevMode');
    const bus = new EventBus();
    registerDevMode(bus);
    let theme: any = null, toggle: any = null, volume: any = null;
    (bus as any).on('ui:themeChanged', (p: any) => { theme = p.theme; });
    (bus as any).on('ui:sfxToggle', (p: any) => { toggle = p.enabled; });
    (bus as any).on('ui:sfxVolume', (p: any) => { volume = p.volume; });

    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    themeSelect.value = 'arcade';
    themeSelect.dispatchEvent(new Event('change'));
    expect(theme).toBe('arcade');

    const sfxEnabled = document.getElementById('sfx-enabled') as HTMLInputElement;
    sfxEnabled.checked = true; sfxEnabled.dispatchEvent(new Event('change'));
    expect(toggle).toBe(true);

    const sfxVolume = document.getElementById('sfx-volume') as HTMLInputElement;
    sfxVolume.value = '0.7';
    sfxVolume.dispatchEvent(new Event('input'));
    expect(volume).toBeCloseTo(0.7, 5);
  });
});


