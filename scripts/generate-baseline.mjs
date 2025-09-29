import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function createLCG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function next() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

async function loadHtml(rootDir) {
  const html = await fs.readFile(path.join(rootDir, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    resources: 'usable',
  });
  return dom;
}

async function bootRuntime(dom, rootDir) {
  await import(path.join(rootDir, 'src', 'index.ts'));
  await (dom.window).GS.start();
}

async function simulateOne(seed, options) {
  const rootDir = process.cwd();
  const dom = await loadHtml(rootDir);
  const rng = createLCG(seed);
  dom.window.Math.random = rng;
  // Stub WebAudio for node
  // Minimal WebAudio stub
  class FakeAudioParam { setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} }
  class FakeNode { connect(){return this;} disconnect(){} }
  class FakeGain extends FakeNode { constructor(){super(); this.gain=new FakeAudioParam();} }
  class FakeOsc extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='sine';} start(){} stop(){} }
  class FakeFilter extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='lowpass';} }
  class FakeDelay extends FakeNode { constructor(){super(); this.delayTime=new FakeAudioParam();} }
  class FakeBuf {
    constructor(len){ this._len = len|0; this._ch0 = new Float32Array(this._len); }
    getChannelData(){ return this._ch0; }
  }
  class FakeBufSrc extends FakeNode { constructor(){super(); this.buffer=null;} start(){} stop(){} }
  class FakeAudioContext {
    constructor(){ this.destination=new FakeNode(); this.sampleRate=44100; this.currentTime=0; }
    createGain(){ return new FakeGain(); }
    createOscillator(){ return new FakeOsc(); }
    createBiquadFilter(){ return new FakeFilter(); }
    createDelay(){ return new FakeDelay(); }
    createConvolver(){ return new FakeNode(); }
    createDynamicsCompressor(){ return new FakeNode(); }
    createWaveShaper(){ return new FakeNode(); }
    createBuffer(_ch, len){ return new FakeBuf(len || 0); }
    createBufferSource(){ return new FakeBufSrc(); }
  }
  dom.window.AudioContext = FakeAudioContext;
  dom.window.webkitAudioContext = FakeAudioContext;
  // Disable SFX if available
  try { if (dom.window.SFX && dom.window.SFX.setEnabled) dom.window.SFX.setEnabled(false); } catch {}
  await bootRuntime(dom, rootDir);
  // After main.js loads, try disabling again
  try { if (dom.window.SFX && dom.window.SFX.setEnabled) dom.window.SFX.setEnabled(false); } catch {}
  // Drive a short simulation via TS flow to produce a deterministic summary
  const GS = (dom.window).GS;
  const flow = GS.runtime.createFlow(seed);
  let state = { seed, quarter: 1, clock: 15*60, down: 1, toGo: 10, ballOn: 25, possession: 'player', awaitingPAT: false, gameOver: false, score: { player: 0, ai: 0 } };
  const ko = flow.performKickoff(state, 'normal', 'ai');
  state = ko.state;
  for (let i = 0; i < 120 && !state.gameOver; i++) {
    const res = flow.resolveSnap(state, { deckName: 'Pro Style', playLabel: 'Run & Pass Option', defenseLabel: 'Run & Pass' });
    state = res.state;
  }
  return { home: state.score.player, away: state.score.ai, winner: state.score.player >= state.score.ai ? 'home' : 'away' };
}

async function main() {
  const plan = [];
  const seeds = [1, 42, 1337, 2025];
  const pats = ['kick', 'two', 'auto'];
  for (const seed of seeds) {
    for (const playerPAT of pats) {
      const res = await simulateOne(seed, { playerPAT });
      plan.push({ seed, playerPAT, result: res });
    }
  }
  const outDir = path.join(process.cwd(), 'tests', 'golden', 'baselines');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sim_one_game.json');
  await fs.writeFile(outPath, JSON.stringify({ cases: plan }, null, 2));
  console.log('Wrote baseline to', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


