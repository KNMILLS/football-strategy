import { EventBus } from '../utils/EventBus';

type CtxBundle = { ctx: AudioContext; master: GainNode } | null;

const registeredBuses: WeakSet<EventBus> = new WeakSet();
let bundle: CtxBundle = null;
let sfxEnabled = true;
let masterVolume = 1;

function now(ctx: AudioContext): number {
	return (ctx && typeof ctx.currentTime === 'number') ? ctx.currentTime : 0;
}

function ensureContext(): CtxBundle {
	if (bundle) return bundle;
	const AC: any = (typeof window !== 'undefined' ? ((window as any).AudioContext || (window as any).webkitAudioContext) : (globalThis as any).AudioContext);
	if (!AC) return null;
	try {
		const ctx: AudioContext = new AC();
		const master = ctx.createGain();
		master.gain.setValueAtTime(sfxEnabled ? masterVolume : 0, now(ctx));
		master.connect(ctx.destination as any);
		bundle = { ctx, master };
		return bundle;
	} catch {
		return null;
	}
}

function applyMaster(): void {
	if (!bundle) return;
	const t = now(bundle.ctx);
	bundle.master.gain.setValueAtTime(sfxEnabled ? masterVolume : 0, t);
}

function quickGainEnv(ctx: AudioContext, startGain: number, peak: number, durMs: number): GainNode {
	const g = ctx.createGain();
	const t0 = now(ctx);
	g.gain.setValueAtTime(startGain, t0);
	const attack = Math.min(0.02, durMs / 1000 * 0.2);
	const decay = Math.max(0.0, (durMs / 1000) - attack);
	g.gain.linearRampToValueAtTime(peak, t0 + attack);
	g.gain.linearRampToValueAtTime(0.0001, t0 + attack + decay);
	return g;
}

function playBeep(opts?: { freq?: number; durMs?: number; type?: OscillatorType }): void {
	const b = ensureContext();
	if (!b) return;
	const { ctx, master } = b;
	const durMs = (opts && typeof opts.durMs === 'number') ? opts.durMs : 140;
	const osc = ctx.createOscillator();
	osc.type = (opts && opts.type) ? opts.type : 'sine';
	osc.frequency.setValueAtTime((opts && typeof opts.freq === 'number') ? opts.freq : 440, now(ctx));
	const env = quickGainEnv(ctx, 0.0001, 0.6, durMs);
	osc.connect(env).connect(master);
	try { osc.start(); } catch {}
	setTimeout(() => { try { osc.stop(); } catch {} }, Math.max(10, durMs + 10));
}

function playHit(opts?: { durMs?: number }): void {
	const b = ensureContext();
	if (!b) return;
	const { ctx, master } = b;
	const durMs = (opts && typeof opts.durMs === 'number') ? opts.durMs : 200;
	// Use a noisy timbre approximation with detuned oscillators instead of buffers (safer for jsdom stubs)
	const osc1 = ctx.createOscillator();
	const osc2 = ctx.createOscillator();
	osc1.type = 'square';
	osc2.type = 'sawtooth';
	osc1.frequency.setValueAtTime(200, now(ctx));
	osc2.frequency.setValueAtTime(220, now(ctx));
	const env = quickGainEnv(ctx, 0.0001, 0.7, durMs);
	let node: AudioNode = env;
	try { const comp = ctx.createDynamicsCompressor(); node = env.connect(comp); } catch {}
	(osc1 as any).connect(env);
	(osc2 as any).connect(env);
	(node as any).connect(master);
	try { osc1.start(); osc2.start(); } catch {}
	setTimeout(() => { try { osc1.stop(); osc2.stop(); } catch {} }, Math.max(10, durMs + 10));
}

function playCrowd(opts?: { kind?: 'cheer'|'groan'; durMs?: number }): void {
	const b = ensureContext();
	if (!b) return;
	const { ctx, master } = b;
	const durMs = (opts && typeof opts.durMs === 'number') ? opts.durMs : 1200;
	const kind = (opts && opts.kind) ? opts.kind : 'cheer';
	// Pink-ish noise approximation using multiple detuned saws through lowpass
	const oscA = ctx.createOscillator();
	const oscB = ctx.createOscillator();
	const oscC = ctx.createOscillator();
	oscA.type = 'sawtooth'; oscB.type = 'sawtooth'; oscC.type = 'sawtooth';
	oscA.frequency.setValueAtTime(60, now(ctx));
	oscB.frequency.setValueAtTime(90, now(ctx));
	oscC.frequency.setValueAtTime(120, now(ctx));
	const lp = ctx.createBiquadFilter();
	lp.type = 'lowpass';
	lp.frequency.setValueAtTime(800, now(ctx));
	const env = ctx.createGain();
	const t0 = now(ctx);
	const peak = 0.35;
	if (kind === 'cheer') {
		env.gain.setValueAtTime(0.01, t0);
		env.gain.linearRampToValueAtTime(peak, t0 + 0.2);
		env.gain.linearRampToValueAtTime(0.01, t0 + durMs / 1000);
	} else {
		env.gain.setValueAtTime(peak, t0);
		env.gain.linearRampToValueAtTime(0.01, t0 + durMs / 1000);
	}
	(oscA as any).connect(lp);
	(oscB as any).connect(lp);
	(oscC as any).connect(lp);
	(lp as any).connect(env).connect(master);
	try { oscA.start(); oscB.start(); oscC.start(); } catch {}
	setTimeout(() => { try { oscA.stop(); oscB.stop(); oscC.stop(); } catch {} }, Math.max(10, durMs + 10));
}

export function registerSFX(bus: EventBus): void {
	if (registeredBuses.has(bus)) return;
	registeredBuses.add(bus);

	bus.on('sfx', ({ type, payload }) => {
		try {
			if (type === 'beep') playBeep(payload);
			else if (type === 'hit') playHit(payload);
			else if (type === 'crowd') playCrowd(payload);
		} catch {}
	});

	const anyBus = bus as any;
	if (anyBus.on) {
		anyBus.on('sfx:beep', (p: any) => { try { playBeep(p); } catch {} });
		anyBus.on('sfx:hit', (p: any) => { try { playHit(p); } catch {} });
		anyBus.on('sfx:crowd', (p: any) => { try { playCrowd(p); } catch {} });
		anyBus.on('ui:sfxToggle', (p: { enabled: boolean }) => {
			sfxEnabled = !!(p && p.enabled);
			applyMaster();
		});
		anyBus.on('ui:sfxVolume', (p: { volume: number }) => {
			const v = p && typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : 1;
			masterVolume = v;
			applyMaster();
		});
	}
}


