import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';
import { registerVFX } from '../../src/ui/VFX';

function ensureDom(): void {
	if (typeof document === 'undefined') return;
	document.body.innerHTML = '';
	const overlay = document.createElement('div');
	overlay.id = 'vfx-overlay';
	overlay.className = 'vfx-overlay';
	document.body.appendChild(overlay);
	const score = document.createElement('div');
	score.id = 'score';
	document.body.appendChild(score);
}

describe('VFX', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		ensureDom();
	});

	it('shows and removes banner', () => {
		const bus = new EventBus();
		registerVFX(bus);
		(bus as any).emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
		const overlay = document.getElementById('vfx-overlay')!;
		const el = overlay.querySelector('.vfx-banner') as HTMLElement | null;
		expect(el).toBeTruthy();
		expect(el!.classList.contains('vfx-banner--gold')).toBe(true);
		expect(el!.textContent).toBe('TOUCHDOWN!');
		vi.advanceTimersByTime(1205);
		expect(overlay.querySelector('.vfx-banner')).toBeNull();
	});

	it('shows and removes flash', () => {
		const bus = new EventBus();
		registerVFX(bus);
		(bus as any).emit('vfx:flash', {});
		const overlay = document.getElementById('vfx-overlay')!;
		expect(overlay.querySelector('.vfx-flash')).toBeTruthy();
		vi.advanceTimersByTime(450);
		expect(overlay.querySelector('.vfx-flash')).toBeNull();
	});

	it('spawns particles deterministically and removes them', () => {
		const randSpy = vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
		const bus = new EventBus();
		registerVFX(bus);
		(bus as any).emit('vfx:particles', { count: 7, gold: true });
		const overlay = document.getElementById('vfx-overlay')!;
		const nodes = overlay.querySelectorAll('.vfx-particle');
		expect(nodes.length).toBe(7);
		for (const n of Array.from(nodes)) expect((n as HTMLElement).classList.contains('gold')).toBe(true);
		vi.advanceTimersByTime(960);
		expect(overlay.querySelectorAll('.vfx-particle').length).toBe(0);
		randSpy.mockRestore();
	});

	it('applies shake to body and removes it', () => {
		const bus = new EventBus();
		registerVFX(bus);
		(bus as any).emit('vfx:shake', {});
		expect(document.body.classList.contains('shake')).toBe(true);
		vi.advanceTimersByTime(320);
		expect(document.body.classList.contains('shake')).toBe(false);
	});

	it('toggles score-pop on #score', () => {
		const bus = new EventBus();
		registerVFX(bus);
		(bus as any).emit('vfx:scorePop', {});
		const score = document.getElementById('score')!;
		expect(score.classList.contains('score-pop')).toBe(true);
		vi.advanceTimersByTime(520);
		expect(score.classList.contains('score-pop')).toBe(false);
	});
});


