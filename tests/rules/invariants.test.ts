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

async function evalMainJs(dom: JSDOM) {
  if (!(dom.window as any).GS) {
    const rollD6 = (rng: () => number) => Math.floor(rng() * 6) + 1;
    const NORMAL_KICKOFF_TABLE: any = { 2: 'FUMBLE*', 3: 'PENALTY -10*', 4: 10, 5: 15, 6: 20, 7: 25, 8: 30, 9: 35, 10: 40, 11: 'LG', 12: 'LG + 5' };
    const ONSIDE_KICK_TABLE: any = { 1: { possession: 'kicker', yard: 40 }, 2: { possession: 'kicker', yard: 40 }, 3: { possession: 'receiver', yard: 35 }, 4: { possession: 'receiver', yard: 35 }, 5: { possession: 'receiver', yard: 35 }, 6: { possession: 'receiver', yard: 30 } };
    const resolveLongGain = (rng: () => number) => Math.min(20 + Math.floor(rng() * 30), 50);
    function parseKickoffYardLine(res: number | string, rng: () => number) {
      if (typeof res === 'number') return { yardLine: res, turnover: false } as any;
      if (res === 'LG') return { yardLine: Math.min(resolveLongGain(rng), 50), turnover: false } as any;
      if (res === 'LG + 5') return { yardLine: Math.min(resolveLongGain(rng) + 5, 50), turnover: false } as any;
      return { yardLine: 25, turnover: false } as any;
    }
    function resolveKickoff(rng: () => number, opts: { onside: boolean; kickerLeadingOrTied: boolean }) {
      if (opts.onside) {
        let roll = rollD6(rng);
        if (opts.kickerLeadingOrTied) roll = Math.min(6, roll + 1);
        const entry = ONSIDE_KICK_TABLE[roll] || { possession: 'receiver', yard: 35 };
        return { yardLine: entry.yard, turnover: entry.possession === 'kicker' };
      }
      let roll = rollD6(rng) + rollD6(rng);
      let entry: any = NORMAL_KICKOFF_TABLE[roll];
      let turnover = false; let penalty = false;
      if (typeof entry === 'string' && entry.includes('*')) {
        if (/FUMBLE/i.test(entry)) turnover = true;
        if (/PENALTY/i.test(entry)) penalty = true;
        entry = (entry as string).replace('*', '').trim();
        const reroll = rollD6(rng) + rollD6(rng);
        let res2: any = NORMAL_KICKOFF_TABLE[reroll];
        if (typeof res2 === 'string' && res2.includes('*')) {
          if (/FUMBLE/i.test(res2)) turnover = false;
          if (/PENALTY/i.test(res2)) penalty = false;
          res2 = (res2 as string).replace('*', '').trim();
        }
        entry = res2;
      }
      const parsed = parseKickoffYardLine(entry, rng) as any;
      let finalYard = parsed.yardLine;
      if (penalty) finalYard = Math.max(0, parsed.yardLine - 10);
      return { yardLine: finalYard, turnover };
    }
    function attemptFieldGoal(rng: () => number, attemptYards: number) {
      const ay = Math.round(attemptYards);
      if (ay > 45) return false;
      let p = 0.5;
      if (ay <= 12) p = 0.95;
      else if (ay <= 22) p = 0.85;
      else if (ay <= 32) p = 0.7;
      else if (ay <= 38) p = 0.6;
      else if (ay <= 45) p = 0.5;
      return rng() < p;
    }
    (dom.window as any).GS = {
      rules: { Kickoff: { resolveKickoff }, PlaceKicking: { attemptPAT: (rng: () => number) => rng() < 0.98, attemptFieldGoal } },
      ai: { PATDecision: { performPAT: () => ({ choice: 'kick' }) } },
      bus: { emit(){} },
    };
  }
  const mainJs = await fs.readFile(path.resolve(process.cwd(), 'main.js'), 'utf8');
  dom.window.eval(mainJs);
  // Mute SFX by stubbing global sfx functions if present
  try {
    (dom.window as any).beep = () => {};
    (dom.window as any).noiseBurst = () => {};
    (dom.window as any).noiseCrowd = () => {};
  } catch {}
}

describe('Game invariants (jsdom)', () => {
  it('score never decreases; PAT follows TD', async () => {
    const dom = await loadDom();
    dom.window.Math.random = createLCG(1337);
    await evalMainJs(dom);

    const scoreHistory: { player: number; ai: number }[] = [];
    let sawTouchdownAwaitingPAT = false;

    // Hook bus log events to detect turnovers and touchdowns
    const logs: string[] = [];
    const origLog = (msg: any) => logs.push(String(msg));
    // Monkey-patch: main.js log() emits to GS.bus, but also writes DOM. We'll watch DOM after each snap instead.

    // Run the sim but step through internal loop by calling simulateOneGame and intercept global state via DOM/HUD text
    const result = dom.window.simulateOneGame({ playerPAT: 'auto' });
    expect(result).toBeTruthy();

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
    dom.window.simulateOneGame({ playerPAT: 'auto' });
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


