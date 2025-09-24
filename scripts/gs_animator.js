/*
 * Gridiron Strategy – Play Animation Module
 * Public API (ES module):
 *   - initField(rootEl, { showDebug=false })
 *   - loadPlays(jsonOrUrl)
 *   - animatePlay({ offensePlayId, defenseCard, ballOnYard, yardsToGo, down, seed=1, speed=1 })
 *   - stop()
 *   - replayLast(seconds=3, speed=0.5)
 *   - on(eventName, handler)
 */

// Internal module state
let fieldRoot = null;
let svg = null;
let scrimmageLine = null;
let firstDownLine = null;
let resizeObs = null;
let dpr = Math.max(1, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));

const offenseOrder = ['LT','LG','C','RG','RT','TE','WRL','WRR','QB','FB','HB'];
const offenseNodes = new Map(); // id -> { g, circle, label }
const defenseNodes = []; // array of groups (each has 2 lines)
let ballNode = null; // ellipse
let ballTrail = null; // path

let playsMap = new Map(); // NORMALIZED_ID -> blueprint
let eventHandlers = new Map(); // name -> Set<fn>

let rafId = 0;
let schedulerStart = 0;
let schedulerSpeed = 1;
let tweens = [];
let lastContext = null; // for replay

function emit(name, detail) {
  const set = eventHandlers.get(name);
  if (!set) return;
  for (const fn of set) {
    try { fn(detail); } catch {}
  }
}

export function on(name, handler) {
  if (!eventHandlers.has(name)) eventHandlers.set(name, new Set());
  eventHandlers.get(name).add(handler);
  return () => eventHandlers.get(name).delete(handler);
}

export async function loadPlays(jsonOrUrl) {
  let data;
  if (typeof jsonOrUrl === 'string') {
    const res = await fetch(jsonOrUrl, { cache: 'force-cache' });
    data = await res.json();
  } else {
    data = jsonOrUrl;
  }
  playsMap.clear();
  const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
  for (const item of arr) {
    const key = normalizeId(item.id || item.label || '');
    if (key) playsMap.set(key, item.play_art && item.play_art.animation_blueprint ? item.play_art.animation_blueprint : item);
  }
  return playsMap.size;
}

export function initField(rootEl, { showDebug = false } = {}) {
  fieldRoot = rootEl;
  if (!fieldRoot) return;
  // Ensure overlay SVG exists
  svg = fieldRoot.querySelector('svg.play-art');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('play-art');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    fieldRoot.appendChild(svg);
  }
  // Ensure scrimmage and first down lines exist (on the field container)
  const container = fieldRoot;
  scrimmageLine = container.querySelector('.scrimmage-line');
  if (!scrimmageLine) {
    scrimmageLine = document.createElement('div');
    scrimmageLine.className = 'scrimmage-line';
    container.appendChild(scrimmageLine);
  }
  firstDownLine = container.querySelector('.firstdown-line');
  if (!firstDownLine) {
    firstDownLine = document.createElement('div');
    firstDownLine.className = 'firstdown-line';
    container.appendChild(firstDownLine);
  }

  // Build pools (once)
  if (!ballNode) {
    ballNode = createSvg('ellipse', { class: 'playart-ball', cx: 0, cy: 0, rx: 6, ry: 4 });
    ballTrail = createSvg('path', { class: 'playart-ball-trail', d: '' });
    svg.appendChild(ballTrail);
    svg.appendChild(ballNode);
  }
  if (offenseNodes.size === 0) {
    for (const id of offenseOrder) {
      const g = createSvg('g', {});
      const c = createSvg('circle', { class: 'playart-offense', cx: 0, cy: 0, r: 12 });
      const t = createSvg('text', { x: 0, y: 4, 'text-anchor': 'middle', 'font-size': '10', 'font-weight': 'bold', fill: '#001a33' });
      t.textContent = shortLabel(id);
      g.appendChild(c);
      g.appendChild(t);
      svg.appendChild(g);
      offenseNodes.set(id, { g, c, t });
    }
  }
  if (defenseNodes.length === 0) {
    for (let i = 0; i < 11; i++) {
      const g = createSvg('g', { class: 'playart-defense' });
      const l1 = createSvg('line', { x1: -10, y1: -10, x2: 10, y2: 10 });
      const l2 = createSvg('line', { x1: -10, y1: 10, x2: 10, y2: -10 });
      g.appendChild(l1);
      g.appendChild(l2);
      svg.appendChild(g);
      defenseNodes.push({ g, l1, l2 });
    }
  }

  // Resize handling
  if (resizeObs) resizeObs.disconnect();
  resizeObs = new ResizeObserver(() => layoutSvg());
  resizeObs.observe(fieldRoot);
  layoutSvg();

  // Debug routes toggle controlled by consumers via showDebug flag
  svg.dataset.showDebug = showDebug ? '1' : '0';
}

export function stop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  tweens = [];
}

export function replayLast(seconds = 3, speed = 0.5) {
  if (!lastContext) return Promise.resolve(null);
  const ctx = { ...lastContext, speed };
  return animatePlay(ctx);
}

export function animatePlay(options) {
  const { offensePlayId, defenseCard = 'Running', ballOnYard = 25, yardsToGo = 10, down = 1, seed = 1, speed = 1 } = options || {};
  if (!fieldRoot || !svg) return Promise.resolve(null);
  stop();
  schedulerSpeed = Math.max(0.25, Math.min(4, speed));
  const rng = mulberry32(seed >>> 0);
  const blueprint = playsMap.get(normalizeId(offensePlayId)) || null;
  const frame = getFieldFrame();

  // Position lines
  positionLines(ballOnYard, yardsToGo);

  // Spawn and place offense at start positions (normalized coordinates)
  const entities = (blueprint && blueprint.entities) || [];
  const idToStart = new Map();
  for (const ent of entities) {
    idToStart.set(ent.id, ent.start);
  }
  // Default starts if missing
  for (const id of offenseOrder) {
    const start = idToStart.get(id) || { x: 0.5, y: 0 };
    const p = toScreen(frame, start.x, start.y, ballOnYard);
    const node = offenseNodes.get(id);
    setTransform(node.g, p.x, p.y);
  }

  // Place basic defense template relative to LOS
  placeDefenseTemplate(frame, ballOnYard, normalizeDefense(defenseCard), rng);

  // Ball starts at center
  const cStart = idToStart.get('C') || { x: 0.5, y: 0 };
  const b0 = toScreen(frame, cStart.x, cStart.y, ballOnYard);
  setAttrs(ballNode, { cx: b0.x, cy: b0.y });
  setAttrs(ballTrail, { d: '' });

  // Build tweens from timeline
  const timeline = (blueprint && blueprint.timeline) || [];
  const t0 = performance.now();
  schedulerStart = t0;
  tweens = [];

  // Helper: schedule movement along path for an actor
  function scheduleActorPath(actorId, pointsNorm, startMs, durMs, ease = easeInOutQuad) {
    const pts = pointsNorm.map((pt) => toScreen(frame, pt.x, pt.y, ballOnYard));
    const node = offenseNodes.get(actorId);
    if (!node) return;
    tweens.push(makePathTween(node.g, pts, startMs, durMs, ease));
    if (svg.dataset.showDebug === '1') {
      const d = 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ');
      const path = createSvg('path', { class: 'playart-route', d });
      svg.appendChild(path);
      // auto-remove
      setTimeout(() => { if (path.parentNode) path.parentNode.removeChild(path); }, Math.max(1200, startMs + durMs + 500));
    }
  }

  // Parse minimal action subset: snap, handoff, drop (QB), throw, path
  for (const seg of timeline) {
    const segStartMs = Math.round((seg.t || 0) * 1000);
    if (Array.isArray(seg.actions)) {
      for (const act of seg.actions) {
        if (act.type === 'snap' && act.from === 'C' && act.to === 'QB') {
          // Ball C -> QB arc (~120ms)
          const qb = idToStart.get('QB') || { x: 0.5, y: -0.03 };
          const pFrom = toScreen(frame, cStart.x, cStart.y, ballOnYard);
          const pTo = toScreen(frame, qb.x, qb.y, ballOnYard);
          tweens.push(makeBallArcTween(pFrom, pTo, segStartMs, 120));
          tweens.push(makeEventTween('snap', segStartMs));
        } else if (act.type === 'handoff' && act.from === 'QB' && act.to === 'HB') {
          const qb = idToStart.get('QB') || { x: 0.5, y: -0.03 };
          const hb = idToStart.get('HB') || { x: 0.5, y: -0.12 };
          const mesh = act.handoff_point || hb;
          const pFrom = toScreen(frame, qb.x, qb.y, ballOnYard);
          const pTo = toScreen(frame, mesh.x, mesh.y, ballOnYard);
          tweens.push(makeBallLineTween(pFrom, pTo, segStartMs, 160));
          tweens.push(makeEventTween('handoff', segStartMs + 160));
        } else if (act.type === 'drop' && act.actor === 'QB') {
          // QB drop: offset back by 5 steps
          const qb = idToStart.get('QB') || { x: 0.5, y: -0.03 };
          const start = toScreen(frame, qb.x, qb.y, ballOnYard);
          const normEnd = { x: qb.x, y: qb.y - 0.05 };
          const end = toScreen(frame, normEnd.x, normEnd.y, ballOnYard);
          const node = offenseNodes.get('QB');
          tweens.push(makePathTween(node.g, [start, end], segStartMs, 300));
          tweens.push(makeEventTween('drop', segStartMs));
        } else if ((act.type === 'path' || act.type === 'route') && act.actor && Array.isArray(act.path || act.route)) {
          const arr = act.path || act.route;
          scheduleActorPath(act.actor, arr, segStartMs, Math.max(500, Math.round((arr.length - 1) * 400)));
        } else if (act.type === 'throw' && act.from === 'QB' && act.target_point) {
          const qb = idToStart.get('QB') || { x: 0.5, y: -0.03 };
          const pFrom = toScreen(frame, qb.x, qb.y, ballOnYard);
          const pTo = toScreen(frame, act.target_point.x, act.target_point.y, ballOnYard);
          tweens.push(makeBallArcTween(pFrom, pTo, segStartMs + 120, 500));
          tweens.push(makeEventTween('throw', segStartMs + 120));
          // naive catch at end
          tweens.push(makeEventTween('catch', segStartMs + 120 + 500));
        }
      }
    }
  }

  // If no HB path, create a simple downhill insert for runs
  const hbStart = idToStart.get('HB') || { x: 0.5, y: -0.12 };
  const hbPath = ensureHBPathIfMissing(blueprint, hbStart);
  if (hbPath) {
    scheduleActorPath('HB', hbPath, 220, 900);
  }

  // Very simple tackle/whistle and result estimation from HB net Y delta
  const hbEndNorm = hbPath && hbPath[hbPath.length - 1];
  const gainedYards = hbEndNorm ? Math.max(0, Math.round((hbEndNorm.y - 0) * (100 - ballOnYard))) : 0;
  const whistleAt = 1500;
  tweens.push(makeEventTween('tackle', whistleAt - 50));
  tweens.push(makeEventTween('whistle', whistleAt));
  const result = {
    gainedYards,
    newBallOn: Math.max(0, Math.min(100, ballOnYard + gainedYards)),
    achievedFirstDown: gainedYards >= yardsToGo,
    turnover: { type: null },
    spottedAtPx: toScreen(frame, 0, Math.min(1, gainedYards / Math.max(1, (100 - ballOnYard))), ballOnYard).x,
    spottedAtYd: Math.max(0, Math.min(100, ballOnYard + gainedYards))
  };
  tweens.push(makeEventTween('result', whistleAt, result));

  // Run scheduler
  lastContext = { offensePlayId, defenseCard, ballOnYard, yardsToGo, down, seed, speed };
  return new Promise((resolve) => {
    let resolved = false;
    const off = on('result', (r) => { if (!resolved) { resolved = true; resolve(r); } });
    runScheduler(() => { off(); if (!resolved) { resolved = true; resolve(result); } });
  });
}

// ---------- Internals ----------

function layoutSvg() {
  if (!svg || !fieldRoot) return;
  const rect = fieldRoot.getBoundingClientRect();
  svg.setAttribute('width', String(Math.round(rect.width * dpr)));
  svg.setAttribute('height', String(Math.round(rect.height * dpr)));
  svg.setAttribute('viewBox', `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);
}

function createSvg(name, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  if (attrs) setAttrs(el, attrs);
  return el;
}

function setAttrs(el, attrs) {
  for (const k of Object.keys(attrs)) el.setAttribute(k, String(attrs[k]));
}

function setTransform(el, x, y) {
  el.setAttribute('transform', `translate(${x},${y})`);
}

function shortLabel(id) {
  if (id === 'WRL') return 'WR';
  if (id === 'WRR') return 'WR';
  return (id || '').slice(0, 2);
}

function normalizeId(str) {
  return String(str || '')
    .toUpperCase()
    .replace(/[\s&()]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeDefense(defStr) {
  const s = String(defStr || '').toLowerCase();
  if (s.includes('inside')) return 'Inside Blitz';
  if (s.includes('outside')) return 'Outside Blitz';
  if (s.includes('prevent deep')) return 'Prevent Deep';
  if (s.includes('prevent')) return 'Prevent';
  if (s.includes('short') || s.includes('goal')) return 'Short Yardage';
  if (s.includes('pass')) return 'Passing';
  if (s.includes('run')) return 'Running';
  return 'Running';
}

function getFieldFrame() {
  const rect = fieldRoot.getBoundingClientRect();
  const topBoundY = rect.height * 0.1;
  const bottomBoundY = rect.height * 0.9;
  const innerLeft = 0;
  const innerRight = rect.width;
  return { rect, topBoundY, bottomBoundY, innerLeft, innerRight };
}

function positionLines(ballOnYard, yardsToGo) {
  if (!scrimmageLine || !firstDownLine || !fieldRoot) return;
  const rect = fieldRoot.getBoundingClientRect();
  const losX = rect.width * (ballOnYard / 100);
  const firstAbs = Math.max(0, Math.min(100, ballOnYard + Math.max(1, yardsToGo)));
  const fdX = rect.width * (firstAbs / 100);
  const clamp = (x) => Math.max(rect.width * 0.055, Math.min(rect.width * 0.945, x));
  scrimmageLine.style.left = `${clamp(losX)}px`;
  firstDownLine.style.left = `${clamp(fdX)}px`;
  scrimmageLine.style.display = 'block';
  firstDownLine.style.display = 'block';
}

function toScreen(frame, px, py, ballOnYard) {
  // Broadcast: offense moves right; normalized (x=left/right across field height, y=downfield)
  const losX = frame.rect.width * (ballOnYard / 100);
  const usableWidth = frame.rect.width - losX;
  const sx = lerp(py, 0, 1, losX, losX + usableWidth);
  const sy = lerp(1 - px, 0, 1, frame.topBoundY, frame.bottomBoundY);
  return { x: sx, y: sy };
}

function lerp(v, a, b, c, d) { return c + (v - a) * (d - c) / (b - a); }

// ---------- Tweens ----------

function makePathTween(node, pts, startMs, durMs, ease = easeInOutQuad) {
  const len = pts.length;
  return {
    start: startMs,
    end: startMs + durMs,
    update: (t) => {
      const u = ease(t);
      // map u to a position along polyline
      if (len === 0) return;
      if (len === 1) { setTransform(node, pts[0].x, pts[0].y); return; }
      const segs = len - 1;
      const s = Math.min(segs - 0.0001, u * segs);
      const i = Math.floor(s);
      const v = s - i;
      const a = pts[i], b = pts[i + 1];
      const x = a.x + (b.x - a.x) * v;
      const y = a.y + (b.y - a.y) * v;
      setTransform(node, x, y);
    }
  };
}

function makeBallArcTween(pFrom, pTo, startMs, durMs) {
  const ctrl = { x: (pFrom.x + pTo.x) / 2, y: Math.min(pFrom.y, pTo.y) - 120 };
  return {
    start: startMs,
    end: startMs + durMs,
    update: (t) => {
      const u = easeInOutQuad(t);
      // Quadratic Bezier
      const x = (1 - u) * (1 - u) * pFrom.x + 2 * (1 - u) * u * ctrl.x + u * u * pTo.x;
      const y = (1 - u) * (1 - u) * pFrom.y + 2 * (1 - u) * u * ctrl.y + u * u * pTo.y;
      setAttrs(ballNode, { cx: x, cy: y });
      // trail
      const d = ballTrail.getAttribute('d') || '';
      const seg = ` L ${Math.round(x)} ${Math.round(y)}`;
      ballTrail.setAttribute('d', d ? d + seg : `M ${Math.round(x)} ${Math.round(y)}`);
    }
  };
}

function makeBallLineTween(pFrom, pTo, startMs, durMs) {
  return {
    start: startMs,
    end: startMs + durMs,
    update: (t) => {
      const u = easeInOutQuad(t);
      const x = pFrom.x + (pTo.x - pFrom.x) * u;
      const y = pFrom.y + (pTo.y - pFrom.y) * u;
      setAttrs(ballNode, { cx: x, cy: y });
    }
  };
}

function makeEventTween(name, atMs, payload) {
  return { start: atMs, end: atMs, update: () => emit(name, payload) };
}

function runScheduler(onDone) {
  const start = performance.now();
  schedulerStart = start;
  function frame(now) {
    const elapsed = (now - schedulerStart) * schedulerSpeed;
    let active = 0;
    for (const tw of tweens) {
      if (elapsed < tw.start) { active++; continue; }
      const span = Math.max(1, tw.end - tw.start);
      const t = Math.max(0, Math.min(1, (elapsed - tw.start) / span));
      tw.update(t);
      if (elapsed < tw.end) active++;
    }
    if (active > 0) {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = 0;
      if (typeof onDone === 'function') onDone();
    }
  }
  rafId = requestAnimationFrame(frame);
}

function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

function placeDefenseTemplate(frame, ballOnYard, kind, rng) {
  const baseY = lerp(0.5, 0, 1, frame.topBoundY, frame.bottomBoundY); // mid hash
  const losX = frame.rect.width * (ballOnYard / 100);
  // DL positions near LOS
  const positions = [];
  // 4 DL
  for (let i = -1.5; i <= 1.5; i += 1) positions.push({ x: losX + 12, y: baseY + i * 22 });
  // 3 LB
  for (let i = -1; i <= 1; i += 1) positions.push({ x: losX - 34, y: baseY + i * 36 });
  // 4 DB
  let depth = 120;
  if (kind === 'Prevent Deep') depth = 200; else if (kind === 'Prevent') depth = 160; else if (kind === 'Short Yardage') depth = 64; else if (kind === 'Passing') depth = 140; else if (kind === 'Running') depth = 100; else if (kind.includes('Blitz')) depth = 80;
  for (let i = -1.5; i <= 1.5; i += 1) positions.push({ x: losX - depth, y: baseY + i * 40 });
  // Clamp to 11
  while (positions.length < 11) positions.push({ x: losX - 80 - rng() * 40, y: baseY + (rng() - 0.5) * 180 });
  positions.length = 11;
  for (let i = 0; i < 11; i++) {
    const p = positions[i];
    const node = defenseNodes[i];
    setTransform(node.g, p.x, p.y);
  }
}

function ensureHBPathIfMissing(blueprint, hbStart) {
  if (!blueprint || !Array.isArray(blueprint.timeline)) return [ hbStart, { x: hbStart.x, y: Math.min(1, hbStart.y + 0.25) } ];
  for (const seg of blueprint.timeline) {
    if (!Array.isArray(seg.actions)) continue;
    for (const a of seg.actions) {
      if ((a.type === 'path' || a.type === 'route') && a.actor === 'HB' && Array.isArray(a.path || a.route)) {
        return (a.path || a.route);
      }
    }
  }
  return [ hbStart, { x: hbStart.x, y: Math.min(1, hbStart.y + 0.25) } ];
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


