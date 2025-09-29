import { describe, it, expect, beforeAll } from 'vitest';
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
  // Minimal WebAudio stubs in this JSDOM window
  class FakeAudioParam { setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} }
  class FakeNode { connect(){return this;} disconnect(){} }
  class FakeGain extends FakeNode { constructor(){super(); this.gain=new FakeAudioParam();} }
  class FakeOsc extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='sine';} start(){} stop(){} }
  class FakeFilter extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='lowpass';} }
  class FakeDelay extends FakeNode { constructor(){super(); this.delayTime=new FakeAudioParam();} }
  class FakeBuf { constructor(len?: number){ this._len = (len||0)|0; this._ch0 = new Float32Array(this._len);} _len: number; _ch0: Float32Array; getChannelData(){ return this._ch0; } }
  class FakeBufSrc extends FakeNode { buffer: any = null; start(){} stop(){} }
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
    createBuffer(_ch: number, len: number){ return new FakeBuf(len); }
    createBufferSource(){ return new FakeBufSrc(); }
  }
  // @ts-expect-error attach to window
  (dom.window as any).AudioContext = FakeAudioContext;
  // @ts-expect-error attach to window
  (dom.window as any).webkitAudioContext = FakeAudioContext;
  return dom;
}

async function evalMainJs(dom: JSDOM) {
  const mainJs = await fs.readFile(path.resolve(process.cwd(), 'main.js'), 'utf8');
  dom.window.eval(mainJs);
  // Bootstrap GS by importing actual rule modules so simulateOneGame matches golden baselines
  if (!(dom.window as any).GS) {
    const [KickoffMod, PuntMod, PlaceKickingMod, ResultParsingMod, TimekeepingMod, ChartsMod, LongGainMod, PATDecisionMod, CoachProfilesMod] = await Promise.all([
      import('../../src/rules/special/Kickoff'),
      import('../../src/rules/special/Punt'),
      import('../../src/rules/special/PlaceKicking'),
      import('../../src/rules/ResultParsing'),
      import('../../src/rules/Timekeeping'),
      import('../../src/rules/Charts'),
      import('../../src/rules/LongGain'),
      import('../../src/ai/PATDecision'),
      import('../../src/ai/CoachProfiles'),
    ]);
    (dom.window as any).GS = {
      rules: { Kickoff: KickoffMod, Punt: PuntMod, PlaceKicking: PlaceKickingMod, ResultParsing: ResultParsingMod, Timekeeping: TimekeepingMod, Charts: ChartsMod, LongGain: LongGainMod },
      ai: { PATDecision: PATDecisionMod, CoachProfiles: CoachProfilesMod },
      bus: { emit(){} },
    };
  }
}

let baseline: any;

beforeAll(async () => {
  const p = path.resolve(process.cwd(), 'tests', 'golden', 'baselines', 'sim_one_game.json');
  baseline = JSON.parse(await fs.readFile(p, 'utf8'));
});

describe('simulateOneGame golden master', () => {
  for (const c of [
    { seed: 1, playerPAT: 'kick' },
    { seed: 42, playerPAT: 'two' },
    { seed: 1337, playerPAT: 'auto' },
    { seed: 2025, playerPAT: 'kick' },
  ]) {
    it(`seed=${c.seed} PAT=${c.playerPAT}`, async () => {
      const dom = await loadDom();
      dom.window.Math.random = createLCG(c.seed);
      await evalMainJs(dom);
      const out = dom.window.simulateOneGame({ playerPAT: c.playerPAT });
      const expected = baseline.cases.find((x: any) => x.seed === c.seed && x.playerPAT === c.playerPAT)?.result;
      expect(out).toEqual(expected);
    });
  }
});


