import { clampPercent, selectField, setAriaHidden } from './utils';
export function renderOverlayCard(opts) {
    const field = selectField();
    if (!field)
        throw new Error('field-display not found');
    const card = document.createElement('div');
    card.className = 'overlay-card';
    card.style.left = `${clampPercent(opts.xPercent)}%`;
    card.style.top = `${clampPercent(opts.yPercent)}%`;
    card.style.backgroundImage = `url('${opts.art}')`;
    if (opts.label)
        card.title = opts.label;
    setAriaHidden(card);
    field.appendChild(card);
    const ttl = typeof opts.ttlMs === 'number' ? opts.ttlMs : 1500;
    if (ttl && ttl > 0)
        setTimeout(() => { card.remove(); }, ttl);
    return card;
}
export function clearOverlayCards() {
    const field = selectField();
    if (!field)
        return;
    const overlays = Array.from(field.querySelectorAll('.overlay-card'));
    overlays.forEach(n => n.remove());
}
//# sourceMappingURL=overlayCards.js.map