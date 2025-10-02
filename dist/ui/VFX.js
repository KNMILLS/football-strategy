import { EventBus } from '../utils/EventBus';
const registeredBuses = new WeakSet();
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
function setAriaHidden(el) {
    el.setAttribute('aria-hidden', 'true');
    el.style.pointerEvents = 'none';
}
function getOverlayRoot() {
    if (typeof document === 'undefined')
        return null;
    let root = $('vfx-overlay');
    if (!root)
        return null;
    return root;
}
function removeAfter(el, ms) {
    setTimeout(() => { el.remove(); }, ms);
}
function banner(text, gold) {
    const root = getOverlayRoot();
    if (!root)
        return;
    const el = document.createElement('div');
    el.className = 'vfx-banner' + (gold ? ' vfx-banner--gold' : '');
    el.textContent = text;
    setAriaHidden(el);
    root.appendChild(el);
    removeAfter(el, 1200);
}
function flash() {
    const root = getOverlayRoot();
    if (!root)
        return;
    const el = document.createElement('div');
    el.className = 'vfx-flash';
    setAriaHidden(el);
    root.appendChild(el);
    removeAfter(el, 420);
}
function clampPercent(v, min = 5, max = 95) {
    return Math.max(min, Math.min(max, v));
}
function particles(count, gold) {
    const root = getOverlayRoot();
    if (!root)
        return;
    const n = typeof count === 'number' && count > 0 ? Math.min(count, 200) : 12;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
        const p = document.createElement('div');
        p.className = 'vfx-particle' + (gold ? ' gold' : '');
        // Pseudo-randomize position within viewport area deterministically based on index
        const leftPct = clampPercent(10 + ((i * 37) % 80));
        const topPct = clampPercent(10 + ((i * 53) % 60));
        p.style.left = `${leftPct}%`;
        p.style.top = `${topPct}%`;
        setAriaHidden(p);
        frag.appendChild(p);
    }
    root.appendChild(frag);
    // Remove all particles after animation duration (~900ms)
    setTimeout(() => {
        const nodes = Array.from(root.querySelectorAll('.vfx-particle'));
        nodes.forEach(n => n.remove());
    }, 950);
}
function shake(selector) {
    const target = (typeof document === 'undefined') ? null : (selector ? document.querySelector(selector) : document.body);
    if (!target)
        return;
    if (!target.classList.contains('shake')) {
        target.classList.add('shake');
        setTimeout(() => { target.classList.remove('shake'); }, 300);
    }
}
function scorePop() {
    const el = $('score');
    if (!el)
        return;
    // Deduplicate: restart animation if already present
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
    setTimeout(() => { el.classList.remove('score-pop'); }, 500);
}
export function registerVFX(bus) {
    if (registeredBuses.has(bus))
        return;
    registeredBuses.add(bus);
    // Main unified VFX channel
    bus.on('vfx', ({ type, payload }) => {
        try {
            if (type === 'banner')
                banner(String(payload?.text || ''), !!payload?.gold);
            else if (type === 'flash')
                flash();
            else if (type === 'particles')
                particles(payload?.count, !!payload?.gold);
            else if (type === 'shake')
                shake(payload?.selector);
            else if (type === 'scorePop')
                scorePop();
        }
        catch { }
    });
    // Optional namespaced direct events for convenience/tests
    const anyBus = bus;
    if (anyBus.on) {
        anyBus.on('vfx:banner', (p) => { try {
            banner(p?.text || '', !!p?.gold);
        }
        catch { } });
        anyBus.on('vfx:flash', () => { try {
            flash();
        }
        catch { } });
        anyBus.on('vfx:particles', (p) => { try {
            particles(p?.count, !!p?.gold);
        }
        catch { } });
        anyBus.on('vfx:shake', (p) => { try {
            shake(p?.selector);
        }
        catch { } });
        anyBus.on('vfx:scorePop', () => { try {
            scorePop();
        }
        catch { } });
    }
}
//# sourceMappingURL=VFX.js.map