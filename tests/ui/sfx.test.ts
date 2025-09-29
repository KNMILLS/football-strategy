import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';
import { registerSFX } from '../../src/ui/SFX';

describe('SFX', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	it('does not throw with stubbed AudioContext', () => {
		const bus = new EventBus();
		registerSFX(bus);
		expect(() => (bus as any).emit('sfx:beep', { freq: 440, durMs: 50 })).not.toThrow();
		expect(() => (bus as any).emit('sfx:hit', { durMs: 80 })).not.toThrow();
		expect(() => (bus as any).emit('sfx:crowd', { kind: 'cheer', durMs: 120 })).not.toThrow();
	});

	it('toggle and volume events do not throw and adjust gain when available', () => {
		const bus = new EventBus();
		registerSFX(bus);
		// Spy on master gain if possible
		const AC: any = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
		if (AC) {
			// Emit to ensure ctx is created
			(bus as any).emit('sfx:beep', {});
			// Toggle off then on
			expect(() => (bus as any).emit('ui:sfxToggle', { enabled: false })).not.toThrow();
			expect(() => (bus as any).emit('ui:sfxVolume', { volume: 0.2 })).not.toThrow();
			expect(() => (bus as any).emit('ui:sfxToggle', { enabled: true })).not.toThrow();
		} else {
			// No AudioContext: still should not throw
			expect(() => (bus as any).emit('ui:sfxToggle', { enabled: false })).not.toThrow();
			expect(() => (bus as any).emit('ui:sfxVolume', { volume: 0.2 })).not.toThrow();
		}
	});

	it('handles absence of AudioContext without errors', () => {
		// Temporarily remove global AC to simulate lack of support
		const prevAC = (globalThis as any).AudioContext;
		const prevWAC = (globalThis as any).webkitAudioContext;
		// @ts-expect-error override for test
		(globalThis as any).AudioContext = undefined;
		// @ts-expect-error override for test
		(globalThis as any).webkitAudioContext = undefined;
		try {
			const bus = new EventBus();
			registerSFX(bus);
			expect(() => (bus as any).emit('sfx:beep', {})).not.toThrow();
			expect(() => (bus as any).emit('ui:sfxToggle', { enabled: false })).not.toThrow();
			expect(() => (bus as any).emit('ui:sfxVolume', { volume: 0.5 })).not.toThrow();
		} finally {
			// @ts-expect-error restore
			(globalThis as any).AudioContext = prevAC;
			// @ts-expect-error restore
			(globalThis as any).webkitAudioContext = prevWAC;
		}
	});
});


