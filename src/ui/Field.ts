import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function yardToPercent(absYard: number): number {
  return 5 + (absYard / 100) * 90;
}

function ensureFieldOverlays(): void {
  if (typeof document === 'undefined') return;
  const field = $('field-display');
  if (!field) return;
  // Scrimmage line
  if (!document.querySelector('.scrimmage-line')) {
    const el = document.createElement('div');
    el.className = 'scrimmage-line';
    (field as HTMLElement).appendChild(el);
  }
  // First down line
  if (!document.querySelector('.firstdown-line')) {
    const el = document.createElement('div');
    el.className = 'firstdown-line';
    (field as HTMLElement).appendChild(el);
  }
  // Red zone overlay
  if (!document.getElementById('red-zone')) {
    const el = document.createElement('div');
    el.className = 'red-zone';
    el.id = 'red-zone';
    el.style.display = 'none';
    (field as HTMLElement).appendChild(el);
  }
  // Chain marker
  if (!document.querySelector('.chain-marker')) {
    const el = document.createElement('div');
    el.className = 'chain-marker';
    el.id = 'chain-marker';
    el.style.display = 'none';
    (field as HTMLElement).appendChild(el);
  }
}

function ensureFieldDecorations(): void {
  if (typeof document === 'undefined') return;
  const field = $('field-display');
  if (!field) return;

  // Yard lines at each 10 yards (10..90)
  if (!document.querySelector('.yard-line')) {
    for (let i = 1; i < 10; i++) {
      const line = document.createElement('div');
      line.className = 'yard-line';
      (line as HTMLElement).style.left = `${yardToPercent(i * 10)}%`;
      (field as HTMLElement).appendChild(line);
    }
  }

  // Yard number labels (top and bottom) at 10,20,30,40,50
  if (!document.querySelector('.yard-label-top') && !document.querySelector('.yard-label-bottom')) {
    const labelValues = [10, 20, 30, 40, 50];
    for (const value of labelValues) {
      const pos = value;
      const topLabel = document.createElement('div');
      topLabel.className = 'yard-label-top';
      topLabel.textContent = String(value);
      (topLabel as HTMLElement).style.left = `${yardToPercent(pos)}%`;
      (field as HTMLElement).appendChild(topLabel);

      const bottomLabel = document.createElement('div');
      bottomLabel.className = 'yard-label-bottom';
      bottomLabel.textContent = String(value);
      (bottomLabel as HTMLElement).style.left = `${yardToPercent(pos)}%`;
      (field as HTMLElement).appendChild(bottomLabel);
    }
  }

  // Hash marks at every yard along top and bottom (thicker every 5 yards)
  // Always regenerate to avoid partial renders; remove any existing first
  {
    const existing = Array.from((field as HTMLElement).querySelectorAll('.hash-mark'));
    for (const el of existing) el.remove();
    const clamp = (val: number) => Math.max(5.5, Math.min(94.5, val));
    for (let i = 1; i < 100; i++) {
      const leftPct = clamp(yardToPercent(i));
      const markBottom = document.createElement('div');
      markBottom.className = 'hash-mark';
      if (i % 5 === 0) markBottom.classList.add('five');
      (markBottom as HTMLElement).style.left = `${leftPct}%`;
      (field as HTMLElement).appendChild(markBottom);

      const markTop = document.createElement('div');
      markTop.className = 'hash-mark top';
      if (i % 5 === 0) markTop.classList.add('five');
      (markTop as HTMLElement).style.left = `${leftPct}%`;
      (field as HTMLElement).appendChild(markTop);
    }
  }

  // End zones and midfield logo
  if (!document.querySelector('.end-zone.home')) {
    const homeZone = document.createElement('div');
    homeZone.className = 'end-zone home';
    const homeSpan = document.createElement('span');
    homeSpan.className = 'end-zone-text';
    homeSpan.textContent = 'HOME';
    homeZone.appendChild(homeSpan);
    (field as HTMLElement).appendChild(homeZone);
  }
  if (!document.querySelector('.end-zone.visitor')) {
    const visitorZone = document.createElement('div');
    visitorZone.className = 'end-zone visitor';
    const visitorSpan = document.createElement('span');
    visitorSpan.className = 'end-zone-text';
    visitorSpan.textContent = 'VISITORS';
    visitorZone.appendChild(visitorSpan);
    (field as HTMLElement).appendChild(visitorZone);
  }
  if (!document.querySelector('.mid-logo')) {
    const midLogo = document.createElement('div');
    midLogo.className = 'mid-logo';
    midLogo.textContent = 'GS';
    (field as HTMLElement).appendChild(midLogo);
  }
}

export function registerField(bus: EventBus): void {
  // Ensure base field visuals and overlays exist even if legacy initField didn't run yet
  ensureFieldDecorations();
  ensureFieldOverlays();

  // Keep field construction in main.js for now; UI events only here
  bus.on('vfx', ({ type, payload }) => {
    if (type === 'toast') {
      const overlay = $('vfx-overlay');
      if (!overlay) return;
      const d = document.createElement('div');
      d.className = 'vfx-toast';
      d.textContent = payload && payload.text ? String(payload.text) : '';
      overlay.appendChild(d);
      setTimeout(() => { d.remove(); }, 1500);
    }
  });
}


