import { describe, it, expect } from 'vitest';

function minimalDom() {
  document.body.innerHTML = '';
  document.body.innerHTML = `
    <div id="game">
      <header id="scoreboard"><div id="score">You 0 — AI 0</div><div id="hud"><span id="quarter"></span><span id="clock"></span><span id="downDistance"></span><span id="ballSpot"></span><span id="possession"></span></div></header>
      <main id="main">
        <aside><div id="log" role="log" aria-live="polite"></div></aside>
        <section><div id="field-display"></div></section>
      </main>
      <footer><div id="hand"></div></footer>
    </div>
  `;
}

async function waitFor(selector: string, timeoutMs = 500): Promise<Element> {
  const start = Date.now();
  // simple polling loop suitable for jsdom
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const el = document.querySelector(selector);
    if (el) return el;
    if (Date.now() - start > timeoutMs) throw new Error(`UI watchdog failed: missing ${selector}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('runtime smoke: no black screen', () => {
  it('renders core UI elements within timeout', async () => {
    minimalDom();
    await import('../../src/index.ts');
    await (window as any).GS.start();

    await waitFor('#scoreboard');
    await waitFor('#log');
    await waitFor('#field-display');
  });
});


