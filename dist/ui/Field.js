import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
function yardToPercent(absYard) {
    return 5 + (absYard / 100) * 90;
}
function selectField(container) {
    if (typeof document === 'undefined')
        return null;
    if (container)
        return container;
    return $('field-display');
}
function setAriaHidden(el) {
    el.setAttribute('aria-hidden', 'true');
}
function createYardLines(wrapper) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i <= 10; i++) {
        const line = document.createElement('div');
        line.className = 'yard-line';
        line.style.left = `${i * 10}%`;
        setAriaHidden(line);
        frag.appendChild(line);
    }
    wrapper.appendChild(frag);
}
function createLabels(wrapper) {
    const frag = document.createDocumentFragment();
    for (let pct = 10; pct <= 90; pct += 10) {
        const labelValue = pct <= 50 ? pct : 100 - pct;
        const topLabel = document.createElement('div');
        topLabel.className = 'yard-label-top';
        topLabel.textContent = String(labelValue);
        topLabel.style.left = `${pct}%`;
        setAriaHidden(topLabel);
        frag.appendChild(topLabel);
        const bottomLabel = document.createElement('div');
        bottomLabel.className = 'yard-label-bottom';
        bottomLabel.textContent = String(labelValue);
        bottomLabel.style.left = `${pct}%`;
        setAriaHidden(bottomLabel);
        frag.appendChild(bottomLabel);
    }
    wrapper.appendChild(frag);
}
function createHashes(wrapper) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i <= 100; i++) {
        const left = `${i}%`;
        const markBottom = document.createElement('div');
        markBottom.className = 'hash-mark';
        if (i % 5 === 0)
            markBottom.classList.add('five');
        markBottom.style.left = left;
        setAriaHidden(markBottom);
        frag.appendChild(markBottom);
        const markTop = document.createElement('div');
        markTop.className = 'hash-mark top';
        if (i % 5 === 0)
            markTop.classList.add('five');
        markTop.style.left = left;
        setAriaHidden(markTop);
        frag.appendChild(markTop);
    }
    wrapper.appendChild(frag);
}
function createEndZones(wrapper) {
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
function createMidLogo(wrapper) {
    if (!document.querySelector('.mid-logo')) {
        const midLogo = document.createElement('div');
        midLogo.className = 'mid-logo';
        midLogo.textContent = 'GS';
        setAriaHidden(midLogo);
        wrapper.appendChild(midLogo);
    }
}
function ensureFieldOverlays() {
    if (typeof document === 'undefined')
        return;
    const field = $('field-display');
    if (!field)
        return;
    // Scrimmage line
    if (!document.querySelector('.scrimmage-line')) {
        const el = document.createElement('div');
        el.className = 'scrimmage-line';
        field.appendChild(el);
    }
    // First down line
    if (!document.querySelector('.firstdown-line')) {
        const el = document.createElement('div');
        el.className = 'firstdown-line';
        field.appendChild(el);
    }
    // Red zone overlay
    if (!document.getElementById('red-zone')) {
        const el = document.createElement('div');
        el.className = 'red-zone';
        el.id = 'red-zone';
        el.style.display = 'none';
        field.appendChild(el);
    }
    // Chain marker
    if (!document.querySelector('.chain-marker')) {
        const el = document.createElement('div');
        el.className = 'chain-marker';
        el.id = 'chain-marker';
        el.style.display = 'none';
        field.appendChild(el);
    }
}
export function buildFieldChrome(container) {
    const field = selectField(container);
    if (!field)
        return;
    // Idempotency: wrap everything in a single container
    let chrome = field.querySelector('.field-chrome');
    if (chrome)
        return;
    chrome = document.createElement('div');
    chrome.className = 'field-chrome';
    chrome.dataset.built = '1';
    // Build pieces into chrome wrapper
    createYardLines(chrome);
    createLabels(chrome);
    createHashes(chrome);
    createEndZones(chrome);
    createMidLogo(chrome);
    field.appendChild(chrome);
}
export function destroyFieldChrome(container) {
    const field = selectField(container);
    if (!field)
        return;
    const chrome = field.querySelector('.field-chrome');
    if (chrome)
        chrome.remove();
}
export function ensureFieldChrome(container) {
    const field = selectField(container);
    if (!field)
        return;
    if (!field.querySelector('.field-chrome'))
        buildFieldChrome(field);
}
function clampPercent(v, min = 5, max = 95) {
    return Math.max(min, Math.min(max, v));
}
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
export function registerField(bus) {
    // Ensure overlays and chrome exist
    ensureFieldOverlays();
    ensureFieldChrome();
    // VFX toast passthrough
    bus.on('vfx', ({ type, payload }) => {
        if (type === 'toast') {
            const overlay = $('vfx-overlay');
            if (!overlay)
                return;
            const d = document.createElement('div');
            d.className = 'vfx-toast';
            d.textContent = payload && payload.text ? String(payload.text) : '';
            overlay.appendChild(d);
            setTimeout(() => { d.remove(); }, 1500);
        }
    });
    // Optional overlay card event (cast to support extended event map in typed bus)
    bus.on('field:overlayCard', (p) => {
        try {
            renderOverlayCard(p);
        }
        catch { }
    });
}
//# sourceMappingURL=Field.js.map