import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';

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
  // Ensure modules from src are initialized (exposes window.GS, bus, etc.)
  // index.html already loads /src/index.ts as a module via Vite in dev, but JSDOM won't.
  // We simulate minimal bootstrap expected by main.js by ensuring window.GS exists.
  if (!(dom.window as any).GS) {
    (dom.window as any).GS = { bus: { emit(){} } };
  }
}

describe('full-game log snapshot', () => {
  it('matches baseline for seed=1, PAT kick', async () => {
    const dom = await loadDom();
    dom.window.Math.random = createLCG(1);
    await evalMainJs(dom);
    // Run a full auto game and capture #log content
    dom.window.simulateOneGame({ playerPAT: 'kick' });
    const logEl = dom.window.document.getElementById('log');
    const actual = (logEl && logEl.textContent) || '';

    const baselinePath = path.resolve(process.cwd(), 'tests', 'golden', 'baselines', 'log_seed1.txt');
    const expected = await fs.readFile(baselinePath, 'utf8');
    expect(actual).toEqual(expected);
  });
});


