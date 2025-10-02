import { EventBus } from '../utils/EventBus';

const registeredBuses: WeakSet<EventBus> = new WeakSet();

function $(id: string): HTMLElement | null {
	return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function setAriaHidden(el: HTMLElement): void {
	el.setAttribute('aria-hidden', 'true');
	(el as HTMLElement).style.pointerEvents = 'none';
}

function getOverlayRoot(): HTMLElement | null {
	if (typeof document === 'undefined') return null;
	let root = $('vfx-overlay');
	if (!root) return null;
	return root;
}

function removeAfter(el: HTMLElement, ms: number): void {
	setTimeout(() => { el.remove(); }, ms);
}

function banner(text: string, gold: boolean | undefined): void {
	const root = getOverlayRoot();
	if (!root) return;
	const el = document.createElement('div');
	el.className = 'vfx-banner' + (gold ? ' vfx-banner--gold' : '');
	el.textContent = text;
	setAriaHidden(el);
	root.appendChild(el);
	removeAfter(el, 1200);
}

function flash(): void {
	const root = getOverlayRoot();
	if (!root) return;
	const el = document.createElement('div');
	el.className = 'vfx-flash';
	setAriaHidden(el);
	root.appendChild(el);
	removeAfter(el, 420);
}

function clampPercent(v: number, min = 5, max = 95): number {
	return Math.max(min, Math.min(max, v));
}

function particles(count?: number, gold?: boolean): void {
	const root = getOverlayRoot();
	if (!root) return;
	const n = typeof count === 'number' && count > 0 ? Math.min(count, 200) : 12;
	const frag = document.createDocumentFragment();
	for (let i = 0; i < n; i++) {
		const p = document.createElement('div');
		p.className = 'vfx-particle' + (gold ? ' gold' : '');
		// Pseudo-randomize position within viewport area deterministically based on index
		const leftPct = clampPercent(10 + ((i * 37) % 80));
		const topPct = clampPercent(10 + ((i * 53) % 60));
		(p as HTMLElement).style.left = `${leftPct}%`;
		(p as HTMLElement).style.top = `${topPct}%`;
		setAriaHidden(p);
		(frag as any).appendChild(p);
	}
	root.appendChild(frag);
	// Remove all particles after animation duration (~900ms)
	setTimeout(() => {
		const nodes = Array.from(root.querySelectorAll('.vfx-particle')) as HTMLElement[];
		nodes.forEach(n => n.remove());
	}, 950);
}

function shake(selector?: string): void {
	const target: HTMLElement | null = (typeof document === 'undefined') ? null : (selector ? document.querySelector(selector) as HTMLElement | null : document.body as any);
	if (!target) return;
	if (!target.classList.contains('shake')) {
		target.classList.add('shake');
		setTimeout(() => { target.classList.remove('shake'); }, 300);
	}
}

function scorePop(): void {
	const el = $('score');
	if (!el) return;
	// Deduplicate: restart animation if already present
	el.classList.remove('score-pop');
	void (el as any).offsetWidth;
	el.classList.add('score-pop');
	setTimeout(() => { el.classList.remove('score-pop'); }, 500);
}

export function registerVFX(bus: EventBus): void {
	if (registeredBuses.has(bus)) return;
	registeredBuses.add(bus);

	// Main unified VFX channel
	bus.on('vfx', ({ type, payload }) => {
		try {
			if (type === 'banner') banner(String(payload?.text || ''), !!payload?.gold);
			else if (type === 'flash') flash();
			else if (type === 'particles') particles(payload?.count, !!payload?.gold);
			else if (type === 'shake') shake(payload?.selector);
			else if (type === 'scorePop') scorePop();
		} catch {}
	});

	// Optional namespaced direct events for convenience/tests
	const anyBus = bus as any;
	if (anyBus.on) {
		anyBus.on('vfx:banner', (p: { text: string; gold?: boolean }) => { try { banner(p?.text || '', !!p?.gold); } catch {} });
		anyBus.on('vfx:flash', () => { try { flash(); } catch {} });
		anyBus.on('vfx:particles', (p: { count?: number; gold?: boolean }) => { try { particles(p?.count, !!p?.gold); } catch {} });
		anyBus.on('vfx:shake', (p: { selector?: string }) => { try { shake(p?.selector); } catch {} });
		anyBus.on('vfx:scorePop', () => { try { scorePop(); } catch {} });
	}
}


