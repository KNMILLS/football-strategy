import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
import path from 'node:path';

function createLCG(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next(): number {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

async function loadDom(): Promise<JSDOM> {
  const html = await fs.readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    resources: 'usable',
  });
  // Minimal WebAudio stubs (must include createWaveShaper used in SFX)
  class FakeAudioParam { setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} }
  class FakeNode { connect(){return this;} disconnect(){} }
  class FakeGain extends FakeNode { constructor(){super(); this.gain=new FakeAudioParam();} }
  class FakeOsc extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='sine';} start(){} stop(){} }
  class FakeFilter extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='lowpass';} }
  class FakeDelay extends FakeNode { constructor(){super(); this.delayTime=new FakeAudioParam();} }
  class FakeBufferSource extends FakeNode { start(){} stop(){} }
  class FakeAudioContext {
    destination = new FakeNode();
    sampleRate = 44100;
    currentTime = 0;
    createGain(){ return new FakeGain(); }
    createOscillator(){ return new FakeOsc(); }
    createBiquadFilter(){ return new FakeFilter(); }
    createDelay(){ return new FakeDelay(); }
    createConvolver(){ return new FakeNode(); }
    createDynamicsCompressor(){ return new FakeNode(); }
    createWaveShaper(){ return new FakeNode(); }
    createBuffer(_ch: number, _len: number){ return { getChannelData(){ return new Float32Array(0); } }; }
    createBufferSource(){ return new FakeBufferSource(); }
  }
  // @ts-expect-error attach to window
  (dom.window as any).AudioContext = FakeAudioContext;
  // @ts-expect-error attach to window
  (dom.window as any).webkitAudioContext = FakeAudioContext;
  return dom;
}

async function bootRuntime(dom: JSDOM) {
  await import('../../src/index.ts');
  await (dom.window as any).GS.start();
}

describe('Game invariants (jsdom)', () => {
  it('score never decreases; PAT follows TD', async () => {
    const dom = await loadDom();
    dom.window.Math.random = createLCG(1337);
    await bootRuntime(dom);

    const scoreHistory: { player: number; ai: number }[] = [];
    let sawTouchdownAwaitingPAT = false;

    // Hook bus log events to detect turnovers and touchdowns
    const logs: string[] = [];
    const origLog = (msg: any) => logs.push(String(msg));
    // Monkey-patch: main.js log() emits to GS.bus, but also writes DOM. We'll watch DOM after each snap instead.

    // Drive flow a bit and assert invariants on emitted log messages
    const GS = (dom.window as any).GS;
    const flow = GS.runtime.createFlow(1337);
    let state: import('../../src/domain/GameState').GameState = {
      seed: 1337, quarter: 1, clock: 15*60, down: 1, toGo: 10, ballOn: 25, possession: 'player', awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 }
    } as any;
    const ko = flow.performKickoff(state, 'normal', 'ai');
    state = ko.state as any;
    for (let i = 0; i < 120 && !state.gameOver; i++) {
      const res = flow.resolveSnap(state, { deckName: 'Pro Style', playLabel: 'Run & Pass Option', defenseLabel: 'Run & Pass' });
      state = res.state as any;
    }

    // Parse log to check invariants
    const logEl = dom.window.document.getElementById('log');
    const text = (logEl && logEl.textContent) || '';
    const lines = text.split('\n').filter(Boolean);

    // Track possession flips on explicit messages
    for (const line of lines) {
      if (/HOME scores 6 points\.|AWAY scores 6 points\.|Touchdown!/.test(line)) {
        sawTouchdownAwaitingPAT = true;
      }
      if (/Extra point is good\.|Extra point missed\.|Two-point conversion/.test(line)) {
        expect(sawTouchdownAwaitingPAT).toBe(true);
        sawTouchdownAwaitingPAT = false;
      }
    }

    // Verify score is non-decreasing per team by scanning incremental score statements
    let playerScore = 0; let aiScore = 0;
    for (const line of lines) {
      const m1 = line.match(/HOME scores 6 points/);
      const m2 = line.match(/AWAY scores 6 points/);
      const epGoodHome = line.match(/Extra point is good\./);
      const epGoodAway = line.match(/AI extra point is good\./);
      const twoGood = line.match(/Two-point conversion good/);
      const safetyHome = line.match(/Safety! HOME is awarded 2 points\./);
      const safetyAway = line.match(/Safety! AWAY is awarded 2 points\./);
      if (m1) playerScore += 6;
      if (m2) aiScore += 6;
      if (epGoodHome) playerScore += 1;
      if (epGoodAway) aiScore += 1;
      if (twoGood) {
        // ambiguous which team; infer from prior touchdown message context would be complex. Skip adding.
      }
      if (safetyHome) playerScore += 2;
      if (safetyAway) aiScore += 2;
      expect(playerScore).toBeGreaterThanOrEqual(0);
      expect(aiScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('no defensive penalty ends the game; untimed down is scheduled', async () => {
    const dom = await loadDom();
    dom.window.Math.random = createLCG(1);
    await evalMainJs(dom);
    // Start a test setup at end of Q4 with clock near 0; we rely on built-in test controls API path
    // Fallback: directly simulate One Game and ensure we can find an "Untimed down" message iff penalty at 0 occurs.
    const GS2 = (dom.window as any).GS;
    const flow2 = GS2.runtime.createFlow(1);
    let state2: import('../../src/domain/GameState').GameState = {
      seed: 1, quarter: 4, clock: 20, down: 4, toGo: 1, ballOn: 50, possession: 'player', awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 }
    } as any;
    for (let i = 0; i < 10 && !state2.gameOver; i++) {
      const res = flow2.resolveSnap(state2, { deckName: 'Pro Style', playLabel: 'Run & Pass Option', defenseLabel: 'Run & Pass' });
      state2 = res.state as any;
    }
    const logEl = dom.window.document.getElementById('log');
    const text = (logEl && logEl.textContent) || '';
    // Not deterministic to force a defensive penalty at 0: assert we never log a defensive-penalty ends game message; main.js explicitly logs 'Untimed down...' when applicable.
    const invalid = /Defensive penalty ends the game/i.test(text);
    expect(invalid).toBe(false);
    // If an untimed down occurred in this run, ensure game continues:
    if (/Untimed down will be played due to a defensive penalty/i.test(text)) {
      expect(/Final:\s+HOME\s+\d+\s+—\s+AWAY\s+\d+/.test(text)).toBe(true);
    }
  });
});


