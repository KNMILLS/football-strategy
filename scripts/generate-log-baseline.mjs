import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function createLCG(seed){ let s=seed%2147483647; if(s<=0) s+=2147483646; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }

async function loadDom(rootDir){
  const html = await fs.readFile(path.join(rootDir,'index.html'),'utf8');
  return new JSDOM(html,{ url:'http://localhost/', runScripts:'outside-only', pretendToBeVisual:true, resources:'usable' });
}

async function evalMainJs(dom, rootDir){
  const js = await fs.readFile(path.join(rootDir,'main.js'),'utf8');
  dom.window.eval(js);
  // Minimal bootstrap for window.GS expected by main.js for rules modules
  if (!(dom.window).GS) {
    // Provide minimal stubs sufficient for kickoff and PAT
    const rollD6 = (rng)=> Math.floor(rng()*6)+1;
    const NORMAL_KICKOFF_TABLE = { 2: 'FUMBLE*', 3: 'PENALTY -10*', 4: 10, 5: 15, 6: 20, 7: 25, 8: 30, 9: 35, 10: 40, 11: 'LG', 12: 'LG + 5' };
    const ONSIDE_KICK_TABLE = { 1: { possession: 'kicker', yard: 40 }, 2: { possession: 'kicker', yard: 40 }, 3: { possession: 'receiver', yard: 35 }, 4: { possession: 'receiver', yard: 35 }, 5: { possession: 'receiver', yard: 35 }, 6: { possession: 'receiver', yard: 30 } };
    const resolveLongGain = (rng)=> Math.min(20 + Math.floor(rng()*30), 50);
    function parseKickoffYardLine(res, rng) {
      if (typeof res === 'number') return { yardLine: res, turnover: false };
      if (res === 'LG') return { yardLine: Math.min(resolveLongGain(rng), 50), turnover: false };
      if (res === 'LG + 5') return { yardLine: Math.min(resolveLongGain(rng) + 5, 50), turnover: false };
      return { yardLine: 25, turnover: false };
    }
    function resolveKickoff(rng, opts) {
      if (opts.onside) {
        let roll = rollD6(rng);
        if (opts.kickerLeadingOrTied) roll = Math.min(6, roll + 1);
        const entry = ONSIDE_KICK_TABLE[roll] || { possession: 'receiver', yard: 35 };
        return { yardLine: entry.yard, turnover: entry.possession === 'kicker' };
      }
      let roll = rollD6(rng) + rollD6(rng);
      let entry = NORMAL_KICKOFF_TABLE[roll];
      let turnover = false; let penalty = false;
      if (typeof entry === 'string' && entry.includes('*')) {
        if (/FUMBLE/i.test(entry)) turnover = true;
        if (/PENALTY/i.test(entry)) penalty = true;
        entry = entry.replace('*','').trim();
        const reroll = rollD6(rng) + rollD6(rng);
        let res2 = NORMAL_KICKOFF_TABLE[reroll];
        if (typeof res2 === 'string' && res2.includes('*')) {
          if (/FUMBLE/i.test(res2)) turnover = false;
          if (/PENALTY/i.test(res2)) penalty = false;
          res2 = res2.replace('*','').trim();
        }
        entry = res2;
      }
      const parsed = parseKickoffYardLine(entry, rng);
      let finalYard = parsed.yardLine;
      if (penalty) finalYard = Math.max(0, parsed.yardLine - 10);
      return { yardLine: finalYard, turnover };
    }
    dom.window.GS = { rules: { Kickoff: { resolveKickoff }, PlaceKicking: { attemptPAT: (rng)=> rng()<0.98 } }, bus: { emit(){} } };
  }
}

async function main(){
  const rootDir = process.cwd();
  const dom = await loadDom(rootDir);
  const rng = createLCG(1);
  dom.window.Math.random = rng;
  // Stub WebAudio
  class FakeAudioParam { setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){} }
  class FakeNode { connect(){return this;} disconnect(){} }
  class FakeGain extends FakeNode { constructor(){super(); this.gain=new FakeAudioParam();} }
  class FakeOsc extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='sine';} start(){} stop(){} }
  class FakeFilter extends FakeNode { constructor(){super(); this.frequency=new FakeAudioParam(); this.type='lowpass';} }
  class FakeDelay extends FakeNode { constructor(){super(); this.delayTime=new FakeAudioParam();} }
  class FakeBuf { constructor(len){ this._len=len|0; this._ch0=new Float32Array(this._len);} getChannelData(){ return this._ch0; } }
  class FakeBufSrc extends FakeNode { constructor(){super(); this.buffer=null;} start(){} stop(){} }
  class FakeAudioContext { constructor(){ this.destination=new FakeNode(); this.sampleRate=44100; this.currentTime=0; } createGain(){return new FakeGain();} createOscillator(){return new FakeOsc();} createBiquadFilter(){return new FakeFilter();} createDelay(){return new FakeDelay();} createConvolver(){return new FakeNode();} createDynamicsCompressor(){return new FakeNode();} createWaveShaper(){return new FakeNode();} createBuffer(_ch,len){ return new FakeBuf(len||0);} createBufferSource(){return new FakeBufSrc();} }
  dom.window.AudioContext = FakeAudioContext;
  dom.window.webkitAudioContext = FakeAudioContext;
  await evalMainJs(dom, rootDir);
  // Run a single full game to populate the log
  dom.window.simulateOneGame({ playerPAT:'kick' });
  const logEl = dom.window.document.getElementById('log');
  const text = (logEl && logEl.textContent) || '';
  const outDir = path.join(rootDir,'tests','golden','baselines');
  await fs.mkdir(outDir,{ recursive:true });
  const out = path.join(outDir,'log_seed1.txt');
  await fs.writeFile(out, text);
  console.log('Wrote', out);
}

main().catch(e=>{ console.error(e); process.exit(1); });


