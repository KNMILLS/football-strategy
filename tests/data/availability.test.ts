import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function minimalDom() {
  document.body.innerHTML = '';
  document.body.innerHTML = `
    <div id="game">
      <header id="scoreboard"><div id="score"></div><div id="hud"><span id="quarter"></span><span id="clock"></span><span id="downDistance"></span><span id="ballSpot"></span><span id="possession"></span></div></header>
      <main><aside><div id="log" role="log" aria-live="polite"></div></aside><section><div id="field-display"></div></section></main>
      <footer><div id="hand"></div></footer>
    </div>
  `;
}

async function waitFor(selector: string, timeoutMs = 500): Promise<Element> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const el = document.querySelector(selector);
    if (el) return el;
    if (Date.now() - start > timeoutMs) throw new Error(`UI watchdog failed: missing ${selector}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('data availability', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    minimalDom();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('boots with missing data and logs concise message', async () => {
    // Stub fetch to fail for all data URLs
    global.fetch = vi.fn(async (url: any) => {
      if (typeof url === 'string' && url.startsWith('data/')) {
        return new Response('', { status: 404 });
      }
      return new Response('', { status: 200 });
    }) as any;

    await import('../../src/index.ts');
    const GS = (window as any).GS;
    await GS.start();

    await waitFor('#scoreboard');
    await waitFor('#field-display');
    await waitFor('#log');

    // Tables should be null when unavailable
    const t = GS.tables;
    expect(t.offenseCharts).toBeNull();
    expect(t.placeKicking).toBeNull();
    expect(t.timeKeeping).toBeNull();
    expect(t.longGain).toBeNull();

    // Log should include summary line with failures
    const logEl = document.getElementById('log')!;
    const text = logEl.textContent || '';
    expect(text).toMatch(/Loaded offense charts .*✕/);
  });
});


