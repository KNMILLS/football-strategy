import { describe, it, expect, beforeEach, vi } from 'vitest';

import { buildFieldChrome, destroyFieldChrome, ensureFieldChrome, renderOverlayCard, clearOverlayCards } from '../../src/ui/Field';

function bootstrapDom(): void {
  document.body.innerHTML = `
    <div id="game">
      <main id="main">
        <section id="play-area" class="play-area">
          <div id="field-display" class="field-display"></div>
        </section>
      </main>
    </div>
    <div id="vfx-overlay"></div>
  `;
}

describe('Field chrome', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    bootstrapDom();
  });

  it('builds yard lines, labels, hashes, end zones and mid logo', () => {
    buildFieldChrome();
    const field = document.getElementById('field-display')!;

    // Yard lines: 0..100 every 10 => 11 lines
    const yardLines = field.querySelectorAll('.yard-line');
    expect(yardLines.length).toBe(11);

    // Yard labels: 10..90 => 9 per row (top and bottom)
    const labelsTop = field.querySelectorAll('.yard-label-top');
    const labelsBottom = field.querySelectorAll('.yard-label-bottom');
    expect(labelsTop.length).toBe(9);
    expect(labelsBottom.length).toBe(9);
    // Verify text values include 10..50..10
    const texts = Array.from(labelsTop).map(n => n.textContent);
    expect(texts).toContain('10');
    expect(texts).toContain('20');
    expect(texts).toContain('30');
    expect(texts).toContain('40');
    expect(texts).toContain('50');
    // Check percent positioning
    const firstTop = labelsTop[0] as HTMLElement;
    expect(firstTop.style.left.endsWith('%')).toBe(true);

    // Hash marks: 0..100 bottom + 0..100 top => 202 total
    const hashes = field.querySelectorAll('.hash-mark');
    const hashesTop = field.querySelectorAll('.hash-mark.top');
    expect(hashes.length).toBe(202);
    expect(hashesTop.length).toBe(101);
    // Every 5 yards gets .five: there are 21 positions in 0..100 inclusive
    const five = field.querySelectorAll('.hash-mark.five');
    expect(five.length).toBe(42);

    // End zones
    const home = field.querySelector('.end-zone.home');
    const visitor = field.querySelector('.end-zone.visitor');
    expect(home).toBeTruthy();
    expect(visitor).toBeTruthy();
    expect(home!.querySelector('.end-zone-text')!.textContent).toBe('HOME');
    expect(visitor!.querySelector('.end-zone-text')!.textContent).toBe('VISITORS');

    // Midfield logo
    const mid = field.querySelectorAll('.mid-logo');
    expect(mid.length).toBe(1);

    // Accessibility: decorative nodes should be aria-hidden
    const decoSelectors = ['.yard-line', '.yard-label-top', '.yard-label-bottom', '.hash-mark', '.mid-logo'];
    for (const sel of decoSelectors) {
      const all = Array.from(field.querySelectorAll(sel));
      expect(all.length).toBeGreaterThan(0);
      all.forEach(el => expect((el as HTMLElement).getAttribute('aria-hidden')).toBe('true'));
    }
  });

  it('is idempotent when built twice', () => {
    buildFieldChrome();
    buildFieldChrome();
    const field = document.getElementById('field-display')!;
    expect(field.querySelectorAll('.yard-line').length).toBe(11);
    expect(field.querySelectorAll('.yard-label-top').length).toBe(9);
    expect(field.querySelectorAll('.yard-label-bottom').length).toBe(9);
    expect(field.querySelectorAll('.hash-mark').length).toBe(202);
    expect(field.querySelectorAll('.end-zone').length).toBe(2);
    expect(field.querySelectorAll('.mid-logo').length).toBe(1);
  });

  it('destroy removes chrome but keeps LOS/firstdown/red-zone/chain', () => {
    const field = document.getElementById('field-display')!;
    // Preexisting overlays
    const scrimmage = document.createElement('div'); scrimmage.className = 'scrimmage-line'; field.appendChild(scrimmage);
    const firstdown = document.createElement('div'); firstdown.className = 'firstdown-line'; field.appendChild(firstdown);
    const red = document.createElement('div'); red.className = 'red-zone'; red.id = 'red-zone'; field.appendChild(red);
    const chain = document.createElement('div'); chain.className = 'chain-marker'; field.appendChild(chain);

    buildFieldChrome();
    destroyFieldChrome();

    // Chrome gone
    expect(field.querySelectorAll('.yard-line').length).toBe(0);
    expect(field.querySelectorAll('.yard-label-top').length).toBe(0);
    expect(field.querySelectorAll('.yard-label-bottom').length).toBe(0);
    expect(field.querySelectorAll('.hash-mark').length).toBe(0);
    expect(field.querySelectorAll('.end-zone').length).toBe(0);
    expect(field.querySelectorAll('.mid-logo').length).toBe(0);

    // Overlays remain
    expect(field.querySelectorAll('.scrimmage-line').length).toBe(1);
    expect(field.querySelectorAll('.firstdown-line').length).toBe(1);
    expect(field.querySelectorAll('#red-zone').length).toBe(1);
    expect(field.querySelectorAll('.chain-marker').length).toBe(1);
  });

  it('renderOverlayCard creates and removes via ttl, and clear removes all', () => {
    buildFieldChrome();
    const card = renderOverlayCard({ art: 'assets/cards/Aerial Style/Deep Pass.jpg', label: 'Deep Pass', xPercent: 2, yPercent: 99, ttlMs: 500 });
    expect(card.classList.contains('overlay-card')).toBe(true);
    expect((card as HTMLElement).style.left.endsWith('%')).toBe(true);
    expect((card as HTMLElement).style.top.endsWith('%')).toBe(true);
    expect((card as HTMLElement).style.backgroundImage).toContain('Deep Pass.jpg');
    expect((card as HTMLElement).title).toBe('Deep Pass');

    // Clamp applied to 2 -> 5, 99 -> 95
    expect((card as HTMLElement).style.left).toBe('5%');
    expect((card as HTMLElement).style.top).toBe('95%');

    // TTL removal
    expect(document.querySelectorAll('.overlay-card').length).toBe(1);
    vi.advanceTimersByTime(500);
    expect(document.querySelectorAll('.overlay-card').length).toBe(0);

    // Manual clear
    renderOverlayCard({ art: 'x', label: 'x', xPercent: 50, yPercent: 50, ttlMs: 0 });
    renderOverlayCard({ art: 'y', label: 'y', xPercent: 60, yPercent: 50, ttlMs: 0 });
    expect(document.querySelectorAll('.overlay-card').length).toBe(2);
    clearOverlayCards();
    expect(document.querySelectorAll('.overlay-card').length).toBe(0);
  });
});


