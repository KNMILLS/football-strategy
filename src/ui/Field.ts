import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function yardToPercent(absYard: number): number {
  return 5 + (absYard / 100) * 90;
}

function selectField(container?: HTMLElement | null): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  if (container) return container;
  return $('field-display');
}

function setAriaHidden(el: HTMLElement): void {
  el.setAttribute('aria-hidden', 'true');
}

function createYardLines(wrapper: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (let i = 0; i <= 10; i++) {
    const line = document.createElement('div');
    line.className = 'yard-line';
    (line as HTMLElement).style.left = `${i * 10}%`;
    setAriaHidden(line);
    (frag as any).appendChild(line);
  }
  wrapper.appendChild(frag);
}

function createLabels(wrapper: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (let pct = 10; pct <= 90; pct += 10) {
    const labelValue = pct <= 50 ? pct : 100 - pct;
    const topLabel = document.createElement('div');
    topLabel.className = 'yard-label-top';
    topLabel.textContent = String(labelValue);
    (topLabel as HTMLElement).style.left = `${pct}%`;
    setAriaHidden(topLabel);
    (frag as any).appendChild(topLabel);

    const bottomLabel = document.createElement('div');
    bottomLabel.className = 'yard-label-bottom';
    bottomLabel.textContent = String(labelValue);
    (bottomLabel as HTMLElement).style.left = `${pct}%`;
    setAriaHidden(bottomLabel);
    (frag as any).appendChild(bottomLabel);
  }
  wrapper.appendChild(frag);
}

function createHashes(wrapper: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (let i = 0; i <= 100; i++) {
    const left = `${i}%`;
    const markBottom = document.createElement('div');
    markBottom.className = 'hash-mark';
    if (i % 5 === 0) markBottom.classList.add('five');
    (markBottom as HTMLElement).style.left = left;
    setAriaHidden(markBottom);
    (frag as any).appendChild(markBottom);

    const markTop = document.createElement('div');
    markTop.className = 'hash-mark top';
    if (i % 5 === 0) markTop.classList.add('five');
    (markTop as HTMLElement).style.left = left;
    setAriaHidden(markTop);
    (frag as any).appendChild(markTop);
  }
  wrapper.appendChild(frag);
}

function createEndZones(wrapper: HTMLElement): void {
  if (!document.querySelector('.end-zone.home')) {
    const homeZone = document.createElement('div');
    homeZone.className = 'end-zone home';
    const homeSpan = document.createElement('span');
    homeSpan.className = 'end-zone-text';
    homeSpan.textContent = 'HOME';
    homeZone.appendChild(homeSpan);
    wrapper.appendChild(homeZone);
  }
  if (!document.querySelector('.end-zone.visitor')) {
    const visitorZone = document.createElement('div');
    visitorZone.className = 'end-zone visitor';
    const visitorSpan = document.createElement('span');
    visitorSpan.className = 'end-zone-text';
    visitorSpan.textContent = 'VISITORS';
    visitorZone.appendChild(visitorSpan);
    wrapper.appendChild(visitorZone);
  }
}

function createMidLogo(wrapper: HTMLElement): void {
  if (!document.querySelector('.mid-logo')) {
    const midLogo = document.createElement('div');
    midLogo.className = 'mid-logo';
    midLogo.textContent = 'GS';
    setAriaHidden(midLogo);
    wrapper.appendChild(midLogo);
  }
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

export function buildFieldChrome(container?: HTMLElement): void {
  const field = selectField(container);
  if (!field) return;
  // Idempotency: wrap everything in a single container
  let chrome = field.querySelector('.field-chrome') as HTMLElement | null;
  if (chrome) return;
  chrome = document.createElement('div');
  chrome.className = 'field-chrome';
  (chrome as any).dataset.built = '1';

  // Build pieces into chrome wrapper
  createYardLines(chrome);
  createLabels(chrome);
  createHashes(chrome);
  createEndZones(chrome);
  createMidLogo(chrome);

  field.appendChild(chrome);
}

export function destroyFieldChrome(container?: HTMLElement): void {
  const field = selectField(container);
  if (!field) return;
  const chrome = field.querySelector('.field-chrome');
  if (chrome) chrome.remove();
}

export function ensureFieldChrome(container?: HTMLElement): void {
  const field = selectField(container);
  if (!field) return;
  if (!field.querySelector('.field-chrome')) buildFieldChrome(field);
}

type OverlayOpts = { art: string; label: string; xPercent: number; yPercent: number; ttlMs?: number };

function clampPercent(v: number, min = 5, max = 95): number {
  return Math.max(min, Math.min(max, v));
}

export function renderOverlayCard(opts: OverlayOpts): HTMLElement {
  const field = selectField();
  if (!field) throw new Error('field-display not found');
  const card = document.createElement('div');
  card.className = 'overlay-card';
  (card as HTMLElement).style.left = `${clampPercent(opts.xPercent)}%`;
  (card as HTMLElement).style.top = `${clampPercent(opts.yPercent)}%`;
  (card as HTMLElement).style.backgroundImage = `url('${opts.art}')`;
  if (opts.label) (card as HTMLElement).title = opts.label;
  setAriaHidden(card);
  field.appendChild(card);
  const ttl = typeof opts.ttlMs === 'number' ? opts.ttlMs : 1500;
  if (ttl && ttl > 0) setTimeout(() => { card.remove(); }, ttl);
  return card;
}

export function clearOverlayCards(): void {
  const field = selectField();
  if (!field) return;
  const overlays = Array.from(field.querySelectorAll('.overlay-card')) as HTMLElement[];
  overlays.forEach(n => n.remove());
}

export function registerField(bus: EventBus): void {
  // Ensure overlays and chrome exist
  ensureFieldOverlays();
  ensureFieldChrome();

  // VFX toast passthrough
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

  // Optional overlay card event (cast to support extended event map in typed bus)
  (bus as any).on('field:overlayCard', (p: OverlayOpts) => {
    try { renderOverlayCard(p); } catch {}
  });
}

