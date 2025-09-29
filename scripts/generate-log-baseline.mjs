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


