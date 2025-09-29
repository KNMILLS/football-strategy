import { describe, it, expect } from 'vitest';

function loadDom() {
  document.body.innerHTML = '';
  // Minimal DOM similar to index.html critical IDs
  document.body.innerHTML = `
    <div id="game">
      <header id="scoreboard">
        <div id="score">You 0 — AI 0</div>
        <div id="hud">
          <span id="quarter">Q1</span>
          <span id="clock">15:00</span>
          <span id="downDistance">1st &amp; 10</span>
          <span id="ballSpot">Ball on 25</span>
          <span id="possession">You</span>
        </div>
      </header>
      <main id="main">
        <aside id="sidebar-left" class="sidebar">
          <div id="log" role="log" aria-live="polite"></div>
        </aside>
        <section id="play-area" class="play-area">
          <div id="field-display" class="field-display"></div>
        </section>
      </main>
      <footer id="footer">
        <div id="hand" class="hand"></div>
      </footer>
    </div>
    <div id="vfx-overlay"></div>
  `;
}

describe('runtime bootstrap', () => {
  it('exposes window.GS with typed API and updates HUD via EventBus', async () => {
    loadDom();
    const mod = await import('../../src/index.ts');
    expect(mod).toBeTruthy();

    const GS = (window as any).GS;
    expect(GS).toBeTruthy();
    expect(GS).toHaveProperty('bus');
    expect(GS).toHaveProperty('rules');
    expect(GS).toHaveProperty('ai');
    expect(GS).toHaveProperty('tables');
    expect(GS).toHaveProperty('start');
    expect(GS).toHaveProperty('dispose');
    expect(GS).toHaveProperty('setTheme');
    expect(GS).toHaveProperty('runtime');

    await GS.start({ theme: 'modern' });
    expect(document.body.dataset.theme).toBe('modern');

    GS.bus.emit('hudUpdate', {
      quarter: 2,
      clock: 14 * 60 + 5,
      down: 3,
      toGo: 7,
      ballOn: 33,
      possession: 'ai',
      score: { player: 10, ai: 13 },
    });

    expect(document.getElementById('quarter')!.textContent).toBe('Q2');
    expect(document.getElementById('clock')!.textContent).toBe('14:05');
    expect(document.getElementById('downDistance')!.textContent).toContain('3rd');
    expect(document.getElementById('ballSpot')!.textContent).toContain('33');
    expect(document.getElementById('possession')!.textContent).toBe('AWAY');
    expect(document.getElementById('score')!.textContent).toContain('HOME 10');
    expect(document.getElementById('score')!.textContent).toContain('AWAY 13');

    const t = GS.tables;
    expect(t).toHaveProperty('offenseCharts');
    expect(t).toHaveProperty('placeKicking');
    expect(t).toHaveProperty('timeKeeping');
    expect(t).toHaveProperty('longGain');
  });
});


