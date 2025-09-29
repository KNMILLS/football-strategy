import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
import path from 'node:path';

function createLCG(seed){ let s=seed%2147483647; if(s<=0) s+=2147483646; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }

async function loadDom(){
  const html = await fs.readFile(path.resolve(process.cwd(),'index.html'),'utf8');
  return new JSDOM(html,{ url:'http://localhost/', runScripts:'outside-only', pretendToBeVisual:true, resources:'usable' });
}

async function evalMainJs(dom){
  const js = await fs.readFile(path.resolve(process.cwd(),'main.js'),'utf8');
  dom.window.eval(js);
}

async function main(){
  const dom = await loadDom();
  const rng = createLCG(1);
  dom.window.Math.random = rng;
  // Stub WebAudio
  dom.window.AudioContext = function Fake(){};
  dom.window.webkitAudioContext = dom.window.AudioContext;
  await evalMainJs(dom);
  // Run a single full game to populate the log
  dom.window.simulateOneGame({ playerPAT:'kick' });
  const logEl = dom.window.document.getElementById('log');
  const text = (logEl && logEl.textContent) || '';
  const outDir = path.resolve(process.cwd(),'tests','golden','baselines');
  await fs.mkdir(outDir,{ recursive:true });
  const out = path.join(outDir,'log_seed1.txt');
  await fs.writeFile(out, text);
  console.log('Wrote', out);
}

main().catch(e=>{ console.error(e); process.exit(1); });


