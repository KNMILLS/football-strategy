import { clampPercent, selectField, setAriaHidden } from './utils';

export type OverlayOpts = { art: string; label: string; xPercent: number; yPercent: number; ttlMs?: number };

export function renderOverlayCard(opts: OverlayOpts): HTMLElement {
  const field = selectField();
  if (!field) throw new Error('field-display not found');
  const card = document.createElement('div');
  card.className = 'overlay-card';
  (card as HTMLElement).style.left = `${clampPercent(opts.xPercent)}%`;
  (card as HTMLElement).style.top = `${clampPercent(opts.yPercent)}%`;
  (card as HTMLElement).style.backgroundImage = `url('${opts.art}')`;
  if (opts.label) (card as HTMLElement).title = opts.label;
  setAriaHidden(card as HTMLElement);
  field.appendChild(card);
  const ttl = typeof opts.ttlMs === 'number' ? opts.ttlMs : 1500;
  if (ttl && ttl > 0) setTimeout(() => { (card as HTMLElement).remove(); }, ttl);
  return card;
}

export function clearOverlayCards(): void {
  const field = selectField();
  if (!field) return;
  const overlays = Array.from(field.querySelectorAll('.overlay-card')) as HTMLElement[];
  overlays.forEach(n => n.remove());
}


