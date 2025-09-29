import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import index to get window.GS
import '../setup/jsdom-audio';

describe('integration: index uses fetch* loaders and populates window.GS.tables', () => {
  const g: any = globalThis as any;
  const origFetch = g.fetch;
  let mod: typeof import('../../src/index');

  beforeEach(async () => {
    vi.resetModules();
    g.fetch = origFetch;
    // Stub all data endpoints to succeed by default
    g.fetch = vi.fn((url: string) => {
      if (url.includes('football_strategy_all_mappings.json')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ OffenseCharts: { ProStyle: {}, BallControl: {}, AerialStyle: {} } }) } as any);
      }
      if (url.includes('place_kicking.json')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ name: 'Place Kicking', dice: '2d6', columns: [{ range: 'PAT' }], results: [{ roll: 2, PAT: 'NG' }] }) } as any);
      }
      if (url.includes('time_keeping.json')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ name: 'Time', units: 'seconds', rules: [{ event: 'gain_in_bounds_0_to_20', duration: 30 }] }) } as any);
      }
      if (url.includes('long_gain.json')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ results: { '1': { baseYards: 10 }, '2': { baseYards: 15 }, '3': { baseYards: 20 }, '4': { baseYards: 25 }, '5': { baseYards: 30 }, '6': { baseYards: 35 } } }) } as any);
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as any);
    });
    mod = await import('../../src/index');
  });

  afterEach(() => {
    g.fetch = origFetch;
  });

  it('populates tables on success', async () => {
    expect(window.GS).toBeTruthy();
    await window.GS!.start();
    expect(window.GS!.tables.offenseCharts).not.toBeNull();
    expect(window.GS!.tables.placeKicking).not.toBeNull();
    expect(window.GS!.tables.timeKeeping).not.toBeNull();
    expect(window.GS!.tables.longGain).not.toBeNull();
  });

  it('sets specific failures to null without throwing', async () => {
    const g: any = globalThis as any;
    (g.fetch as any).mockImplementation((url: string) => {
      if (url.includes('football_strategy_all_mappings.json')) return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as any);
      return (g.fetch as any).mock.calls[0]?.[0] ? Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as any) : Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as any);
    });
    await window.GS!.start();
    expect(window.GS!.tables.offenseCharts).toBeNull();
  });
});


