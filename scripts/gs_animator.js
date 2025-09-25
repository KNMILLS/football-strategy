// Gridiron Strategy — Minimal Combo Animator (v2 simul JSON)
// Exports: initField, loadCombo, animate, stop, replayLast, on
// Consumes expanded JSON at data/combo_ProStyle_PowerUpMiddle_InsideBlitz_scripts.expanded.json

/* eslint-disable */

// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------

let fieldRoot = null;
let overlaySvg = null;
let groupActors = null;
let groupBall = null;
let groupDev = null;
let listeners = new Map(); // event -> Set<fn>
let comboData = null;
let rafId = 0;
let playing = false;
let lastRunParams = null;
let clampCount = 0;

// -----------------------------------------------------------------------------
// Event emitter helpers
// -----------------------------------------------------------------------------

function emit(eventName, payload) {
  const set = listeners.get(eventName);
  if (set && set.size) {
    for (const fn of set) {
      try { fn(payload); } catch {}
    }
  }
}

export function on(eventName, handler) {
  if (!listeners.has(eventName)) listeners.set(eventName, new Set());
  listeners.get(eventName).add(handler);
  return () => { try { listeners.get(eventName).delete(handler); } catch {} };
}

// -----------------------------------------------------------------------------
// Field metrics and transforms (yards <-> pixels)
// -----------------------------------------------------------------------------

function getFieldMetrics() {
  if (!fieldRoot) throw new Error('initField not called');
  const rect = fieldRoot.getBoundingClientRect();
  const leftPx = rect.left;
  const topPx = rect.top;
  const widthPx = rect.width;
  const heightPx = rect.height;
  // Playable between 5% and 95% horizontally (end zones 5% each)
  const leftGoalLinePx = leftPx + widthPx * 0.05;
  const rightGoalLinePx = leftPx + widthPx * 0.95;
  const innerWidthPx = widthPx * 0.90;
  const midlineYPx = topPx + heightPx / 2;
  const pxPerYardX = innerWidthPx / 100; // 100 yards across
  const pxPerYardY = heightPx / 53.333; // 53.333 yards tall
  return {
    leftPx,
    topPx,
    widthPx,
    heightPx,
    leftGoalLinePx,
    rightGoalLinePx,
    innerWidthPx,
    midlineYPx,
    pxPerYardX,
    pxPerYardY
  };
}

function clampYardY(y_yd) {
  // Keep at least 2 yards from sidelines
  const half = 53.333 / 2;
  const minY = -half + 2.0;
  const maxY = half - 2.0;
  if (y_yd < minY) { clampCount++; return minY; }
  if (y_yd > maxY) { clampCount++; return maxY; }
  return y_yd;
}

function clampAbsYardX(absYard) {
  // Keep at least 0.5 yard from goal lines
  const minX = 0.5;
  const maxX = 99.5;
  if (absYard < minX) { clampCount++; return minX; }
  if (absYard > maxX) { clampCount++; return maxX; }
  return absYard;
}

function yardToScreen({ x_yd, y_yd, ballOnYard, dir }) {
  const m = getFieldMetrics();
  const clampedY = clampYardY(y_yd);
  const absX = clampAbsYardX(ballOnYard + (dir === 'L' ? -x_yd : +x_yd));
  const screenX = m.leftGoalLinePx + absX * m.pxPerYardX;
  const screenY = m.midlineYPx + clampedY * m.pxPerYardY;
  return { x: screenX, y: screenY };
}

// -----------------------------------------------------------------------------
// SVG helpers
// -----------------------------------------------------------------------------

function ensureOverlaySvg() {
  if (overlaySvg && overlaySvg.parentNode === fieldRoot) return;
  // Create SVG overlay
  overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlaySvg.setAttribute('class', 'play-art');
  overlaySvg.setAttribute('width', '100%');
  overlaySvg.setAttribute('height', '100%');
  // Groups
  groupActors = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  groupBall = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  groupDev = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  groupDev.setAttribute('opacity', '0.8');
  overlaySvg.appendChild(groupActors);
  overlaySvg.appendChild(groupBall);
  overlaySvg.appendChild(groupDev);
  fieldRoot.appendChild(overlaySvg);
}

function clearOverlay() {
  clampCount = 0;
  if (groupActors) while (groupActors.firstChild) groupActors.removeChild(groupActors.firstChild);
  if (groupBall) while (groupBall.firstChild) groupBall.removeChild(groupBall.firstChild);
  if (groupDev) while (groupDev.firstChild) groupDev.removeChild(groupDev.firstChild);
}

function makeOffenseNode(label2) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('r', '10');
  c.setAttribute('class', 'playart-offense');
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.setAttribute('font-size', '10');
  t.setAttribute('fill', '#001a33');
  t.textContent = label2 || '';
  g.appendChild(c);
  g.appendChild(t);
  return g;
}

function makeDefenseNode() {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'playart-defense');
  const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l1.setAttribute('x1', '-8'); l1.setAttribute('y1', '-8'); l1.setAttribute('x2', '8'); l1.setAttribute('y2', '8');
  l2.setAttribute('x1', '-8'); l2.setAttribute('y1', '8'); l2.setAttribute('x2', '8'); l2.setAttribute('y2', '-8');
  l1.setAttribute('stroke', '#cc3333'); l2.setAttribute('stroke', '#cc3333');
  l1.setAttribute('stroke-width', '2'); l2.setAttribute('stroke-width', '2');
  g.appendChild(l1); g.appendChild(l2);
  return g;
}

function makeBallNode() {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const o = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  o.setAttribute('rx', '7');
  o.setAttribute('ry', '4');
  o.setAttribute('class', 'playart-ball');
  g.appendChild(o);
  return g;
}

function setNodePosition(g, x, y) {
  g.setAttribute('transform', `translate(${Math.round(x)}, ${Math.round(y)})`);
}

function isDevEnabled() {
  try {
    const cb = document.getElementById('dev-mode-checkbox');
    return !!(cb && cb.checked);
  } catch { return false; }
}

function drawDevDot(px, py, color = '#ffffff') {
  if (!groupDev) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', String(Math.round(px)));
  c.setAttribute('cy', String(Math.round(py)));
  c.setAttribute('r', '2');
  c.setAttribute('fill', color);
  c.setAttribute('opacity', '0.9');
  groupDev.appendChild(c);
}

function drawDevPath(pointsPx, color = '#ffa500', dashed = true) {
  if (!groupDev || !pointsPx || pointsPx.length < 2) return null;
  const d = pointsPx.map((p, i) => (i === 0 ? `M ${Math.round(p.x)} ${Math.round(p.y)}` : `L ${Math.round(p.x)} ${Math.round(p.y)}`)).join(' ');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '2');
  if (dashed) path.setAttribute('stroke-dasharray', '4 4');
  groupDev.appendChild(path);
  return path;
}

function screenToYards(px, py, ballOnYard, dir) {
  const m = getFieldMetrics();
  const absX = (px - m.leftGoalLinePx) / m.pxPerYardX;
  const x_yd = (dir === 'R') ? (absX - ballOnYard) : (ballOnYard - absX);
  const y_yd = (py - m.midlineYPx) / m.pxPerYardY;
  return { x: x_yd, y: y_yd, absX };
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function initField(rootEl) {
  fieldRoot = rootEl;
  if (!fieldRoot) return;
  ensureOverlaySvg();
  // If LOS/first-down lines not present (unlikely since main.js adds them), we could add here
  // but we avoid duplication and limit to overlay creation.
  const ro = new ResizeObserver(() => {
    // Reposition on resize
    if (lastRunParams && playing === false) {
      // Redraw static placement when idle
      try { animate({ ...lastRunParams, speed: 0, noRun: true }); } catch {}
    }
  });
  try { ro.observe(fieldRoot); } catch {}
}

export function loadCombo(json) {
  if (!json || typeof json !== 'object') throw new Error('Invalid combo JSON');
  // Accept v2 simul schema
  if (json.schema !== 'gs_combo_anim_v2_simul') throw new Error(`Unsupported schema ${json.schema}`);
  if (json.units !== 'yards') throw new Error('Units must be yards');
  if (!json.actors || !json.actors.offense || !json.actors.defense) throw new Error('Missing actors');
  if (!Array.isArray(json.actors.offense) || !Array.isArray(json.actors.defense)) throw new Error('Actors must be arrays');
  if (!json.ball || !Array.isArray(json.ball.events)) throw new Error('Missing ball events');
  comboData = json;
  return true;
}

export function stop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  playing = false;
}

export function replayLast(seconds = 3, speed = 0.5) {
  if (!lastRunParams) return null;
  const recent = { ...lastRunParams, speed };
  return animate(recent);
}

// options: { chartKey, dir, ballOnYard, speed, seed, noRun }
export function animate(options = {}) {
  if (!fieldRoot) throw new Error('Call initField first');
  if (!comboData) throw new Error('No combo loaded');
  const {
    chartKey = 'F',
    dir: dirOverride,
    ballOnYard = 25,
    speed = 1,
    seed = 1,
    noRun = false
  } = options;

  stop();
  ensureOverlaySvg();
  clearOverlay();

  // Determine direction
  const jsonDir = comboData.dir === 'L' ? 'L' : 'R';
  const dir = dirOverride === 'L' || dirOverride === 'R' ? dirOverride : jsonDir;

  // Determine result yards
  let resultYards = 0;
  if (comboData.result_table && chartKey in comboData.result_table) {
    resultYards = Number(comboData.result_table[chartKey]) || 0;
  } else if (comboData.outcome && typeof comboData.outcome.yards === 'number') {
    resultYards = comboData.outcome.yards;
  }

  // Build actor map and nodes
  const actorStart = new Map();
  const actorNode = new Map();
  const offense = comboData.actors.offense || [];
  const defense = comboData.actors.defense || [];
  for (const a of offense) {
    actorStart.set(a.id, { ...a.start });
    const label = (a.id || '').slice(0, 2).toUpperCase();
    const node = makeOffenseNode(label);
    const p = yardToScreen({ x_yd: a.start.x || 0, y_yd: a.start.y || 0, ballOnYard, dir });
    setNodePosition(node, p.x, p.y);
    groupActors.appendChild(node);
    actorNode.set(a.id, node);
  }
  for (const d of defense) {
    actorStart.set(d.id, { ...d.start });
    const node = makeDefenseNode();
    const p = yardToScreen({ x_yd: d.start.x || 0, y_yd: d.start.y || 0, ballOnYard, dir });
    setNodePosition(node, p.x, p.y);
    groupActors.appendChild(node);
    actorNode.set(d.id, node);
  }

  // Ball
  const ballNode = makeBallNode();
  groupBall.appendChild(ballNode);
  // Default ball at Center, else QB
  const cStart = actorStart.get('C') || { x: 0, y: 0 };
  const qbStart = actorStart.get('QB') || { x: -1, y: 0 };
  const hbStart = actorStart.get('HB') || { x: -5.5, y: 0 };
  const ballAtC = yardToScreen({ x_yd: cStart.x, y_yd: cStart.y, ballOnYard, dir });
  setNodePosition(ballNode, ballAtC.x, ballAtC.y);

  // Precompute HB path from controllers if available
  let hbPathPoints = null;
  const offControllers = comboData.controllers && comboData.controllers.offense || [];
  const hbCtl = offControllers.find((c) => c.id === 'HB' && c.controller && Array.isArray(c.controller.path));
  if (hbCtl) {
    hbPathPoints = (hbCtl.controller.path || []).map((pt) => {
      const x = typeof pt.x === 'string' && pt.x === 'RESULT_YARDS' ? resultYards : Number(pt.x || 0);
      const y = Number(pt.y || 0);
      const t = typeof pt.t === 'number' ? pt.t : null; // absolute seconds (optional hint)
      return { x, y, t };
    });
  }

  // FB insert path (optional visual)
  let fbPathPoints = null;
  const fbCtl = offControllers.find((c) => c.id === 'FB' && c.controller && Array.isArray(c.controller.path));
  if (fbCtl) {
    fbPathPoints = (fbCtl.controller.path || []).map((pt) => ({ x: Number(pt.x || 0), y: Number(pt.y || 0) }));
  }

  // Timeline key events (snap, handoff)
  const ballEvents = Array.isArray(comboData.ball.events) ? comboData.ball.events : [];
  const snapEvt = ballEvents.find((e) => e.action === 'snap' && e.from === 'C' && e.to === 'QB');
  const handoffEvt = ballEvents.find((e) => e.action === 'handoff' && e.from === 'QB' && e.to === 'HB');
  const tSnap = snapEvt ? Number(snapEvt.t) : 0.15;
  const tHandoff = handoffEvt ? Number(handoffEvt.t) : 0.28;

  // Build simple keyframes for HB: start -> optional pre-mesh point -> to result
  // If hbPathPoints missing, fallback to straight line to result at y from hbStart
  let hbTrack = [];
  if (hbPathPoints && hbPathPoints.length > 0) {
    hbTrack = hbPathPoints.slice();
  } else {
    hbTrack = [
      { x: -0.3, y: hbStart.y, t: tHandoff },
      { x: resultYards, y: hbStart.y }
    ];
  }

  // Animation loop
  const startMs = performance.now();
  const speedMul = Math.max(0, Number(speed) || 1);
  const endPoint = hbTrack[hbTrack.length - 1];
  let handedToHB = false;
  let snapped = false;
  let ended = false;

  // Place FB static at first insert point if available (minimal visual)
  if (fbPathPoints && actorNode.get('FB')) {
    const fbFirst = fbPathPoints[0] || { x: 0.5, y: 0 };
    const p = yardToScreen({ x_yd: fbFirst.x, y_yd: fbFirst.y, ballOnYard, dir });
    setNodePosition(actorNode.get('FB'), p.x, p.y);
  }

  function getElapsed() {
    if (speedMul === 0 || noRun) return 0;
    return (performance.now() - startMs) / 1000 * speedMul;
  }

  function moveBallAlongArc(fromYd, toYd, alpha) {
    // Simple quadratic arc for visual only (alpha 0..1)
    const p0 = yardToScreen({ x_yd: fromYd.x, y_yd: fromYd.y, ballOnYard, dir });
    const p1 = yardToScreen({ x_yd: toYd.x, y_yd: toYd.y, ballOnYard, dir });
    const cx = (p0.x + p1.x) / 2;
    const cy = Math.min(p0.y, p1.y) - 60; // arc height
    const qx = (1 - alpha) * (1 - alpha) * p0.x + 2 * (1 - alpha) * alpha * cx + alpha * alpha * p1.x;
    const qy = (1 - alpha) * (1 - alpha) * p0.y + 2 * (1 - alpha) * alpha * cy + alpha * alpha * p1.y;
    setNodePosition(ballNode, qx, qy);
  }

  function step() {
    const t = getElapsed();
    if (!snapped && t >= tSnap) {
      snapped = true;
      emit('snap', { t: tSnap });
    }
    // Snap: C -> QB over 120ms visual
    if (!handedToHB && snapped && t < tSnap + 0.12) {
      const a = Math.min(1, Math.max(0, (t - tSnap) / 0.12));
      moveBallAlongArc(cStart, qbStart, a);
    }
    if (!handedToHB && t >= tHandoff) {
      handedToHB = true;
      emit('handoff', { t: tHandoff });
    }
    if (handedToHB && t < tHandoff + 0.12) {
      const a = Math.min(1, Math.max(0, (t - tHandoff) / 0.12));
      moveBallAlongArc(qbStart, hbStart, a);
    }
    // After handoff, ball follows HB
    // Compute HB current position along hbTrack from tHandoff onward.
    let hbX = hbStart.x;
    let hbY = hbStart.y;
    if (handedToHB) {
      // Build times for segments using simple speed model: 6 yd/s baseline
      const baseSpeed = 6; // yards per second (minimal deterministic)
      let cursorT = tHandoff;
      let prev = { x: hbStart.x, y: hbStart.y };
      for (let i = 0; i < hbTrack.length; i++) {
        const next = hbTrack[i];
        const dx = (next.x - prev.x);
        const dy = (next.y - prev.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dur = Math.max(0.01, dist / baseSpeed);
        const segStart = cursorT;
        const segEnd = cursorT + dur;
        if (t <= segStart) { hbX = prev.x; hbY = prev.y; break; }
        if (t >= segEnd) { hbX = next.x; hbY = next.y; cursorT = segEnd; prev = next; continue; }
        const a = (t - segStart) / (segEnd - segStart);
        hbX = prev.x + a * dx;
        hbY = prev.y + a * dy;
        break;
      }
      // Follow position
      const hbScreen = yardToScreen({ x_yd: hbX, y_yd: hbY, ballOnYard, dir });
      const hbNode = actorNode.get('HB');
      if (hbNode) setNodePosition(hbNode, hbScreen.x, hbScreen.y);
      setNodePosition(ballNode, hbScreen.x, hbScreen.y);
    }

    // Update QB static at start for minimal visual
    const qbP = yardToScreen({ x_yd: qbStart.x, y_yd: qbStart.y, ballOnYard, dir });
    const qbNode = actorNode.get('QB');
    if (qbNode) setNodePosition(qbNode, qbP.x, qbP.y);

    // End condition: when HB reaches end point (approx)
    if (!ended && handedToHB) {
      const dxEnd = Math.abs(hbX - endPoint.x);
      const dyEnd = Math.abs(hbY - (endPoint.y ?? hbY));
      if (dxEnd < 0.05 && dyEnd < 0.1) {
        ended = true;
        emit('tackle', { yards: resultYards });
        emit('whistle', {});
        const newBallOn = dir === 'R' ? clampAbsYardX(ballOnYard + resultYards) : clampAbsYardX(ballOnYard - resultYards);
        const res = { yards: resultYards, newBallOn, turnover: false, possessionSwap: false };
        emit('result', res);
        playing = false;
        return res;
      }
    }

    if (!ended && !noRun) {
      rafId = requestAnimationFrame(step);
    }
    return null;
  }

  playing = !noRun;
  lastRunParams = { chartKey, dir, ballOnYard, speed, seed };
  const immediate = step();
  return immediate || { yards: resultYards, newBallOn: ballOnYard, turnover: false, possessionSwap: false };
}

// Optional: expose granular helper for dev hash (#granular60) without implementing heavy logic
export function makeGranularCombo(json) {
  return json; // passthrough for now
}

// Default export compatibility (some loaders may expect default)
export default { initField, loadCombo, animate, stop, replayLast, on, makeGranularCombo };

// Minimal deterministic combo animator for Gridiron Strategy
// API: initField, loadCombo, animate, stop, replayLast, on
// Renders an SVG overlay inside #field-display and executes scripted timelines.

/* eslint-disable */
"use strict";

// ---------------- Module state ----------------

const state = {
	rootEl: null,
	svgEl: null,
	layers: {},
	metrics: null,
	combo: null,
	actors: new Map(), // id -> { side, id, role, start:{x,y}, yard:{x,y}, px:{x,y}, el, labelEl }
	ball: { holderId: null, yard: { x: 0, y: 0 }, px: { x: 0, y: 0 }, el: null, spinning: false },
	listeners: new Map(), // event -> Set(handlers)
	tweens: [],
	locks: new Set(), // actor ids locked by collision/tackle
	rAF: 0,
	clock: { startMs: 0, nowMs: 0, speed: 1 },
	dir: "R",
	ballOnYard: 25,
	lastRun: null, // { scriptKey, dir, ballOnYard, frames }
	clampCount: 0,
	warnedClamp: false,
	assignments: new Map(), // defenderId -> blockerId
	pursuitStart: new Map(), // defenderId -> { start:{x,y}, d0:number }
	smoothMode: true,
    playStartMs: 0,
    playEndMs: 0,
    pursuitStarted: false,
    shieldStarted: false,
	isGranular: false,
};

// ---------------- Events ----------------

function emit(event, payload) {
	const set = state.listeners.get(event);
	if (set) for (const fn of set) try { fn(payload); } catch {}
}

export function on(event, handler) {
	if (!state.listeners.has(event)) state.listeners.set(event, new Set());
	state.listeners.get(event).add(handler);
	return () => state.listeners.get(event).delete(handler);
}

// ---------------- DOM / SVG setup ----------------

export function initField(rootEl) {
	state.rootEl = rootEl || document.getElementById("field-display");
	if (!state.rootEl) return;
	// Create SVG overlay if missing
	let svg = state.rootEl.querySelector("svg.play-art");
	if (!svg) {
		svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.classList.add("play-art");
		state.rootEl.appendChild(svg);
	}
	state.svgEl = svg;
	// Clear and create layers
	while (state.svgEl.firstChild) state.svgEl.removeChild(state.svgEl.firstChild);
	state.layers.bg = createSvgGroup("bg");
	state.layers.routes = createSvgGroup("routes");
	state.layers.actors = createSvgGroup("actors");
	state.layers.ball = createSvgGroup("ball");
	state.layers.dev = createSvgGroup("dev");
	// Metrics
	updateMetrics();
	window.addEventListener("resize", updateMetrics, { passive: true });
	// Ensure LOS and first down bars exist (main.js usually creates them)
	ensureOverlayBars();
	// Optional DEV start dots will be drawn during loadCombo/animate when dev is on
}

function createSvgGroup(cls) {
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	g.setAttribute("data-layer", cls);
	state.svgEl.appendChild(g);
	return g;
}

function updateMetrics() {
	if (!state.rootEl || !state.svgEl) return;
	const rect = state.rootEl.getBoundingClientRect();
	state.svgEl.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
	state.svgEl.setAttribute("width", `${rect.width}`);
	state.svgEl.setAttribute("height", `${rect.height}`);
	const leftGoalLinePx = rect.left + rect.width * 0.05;
	const rightGoalLinePx = rect.left + rect.width * 0.95;
	const midlineYPx = rect.top + rect.height * 0.5;
	const pxPerYardX = (rightGoalLinePx - leftGoalLinePx) / 100;
	const pxPerYardY = rect.height / 53.333;
	const ballOnYard = state.ballOnYard ?? 25;
	const losXPx = leftGoalLinePx + ballOnYard * pxPerYardX;
	state.metrics = { rect, leftGoalLinePx, rightGoalLinePx, midlineYPx, pxPerYardX, pxPerYardY, losXPx };
}

function ensureOverlayBars() {
	if (!state.rootEl) return;
	// Only create if missing; styles are provided by style.css
	if (!state.rootEl.querySelector(".scrimmage-line")) {
		const s = document.createElement("div");
		s.className = "scrimmage-line";
		state.rootEl.appendChild(s);
	}
	if (!state.rootEl.querySelector(".firstdown-line")) {
		const f = document.createElement("div");
		f.className = "firstdown-line";
		state.rootEl.appendChild(f);
	}
}

// ---------------- Validation ----------------

export function loadCombo(json) {
	const errors = [];
	if (!json || typeof json !== "object") errors.push("combo: not an object");
	if (json.schema !== "gs_combo_animation_v1") errors.push("schema must be gs_combo_animation_v1");
	if (json.units !== "yards") errors.push("units must be yards");
	if (!json.bounds) errors.push("bounds missing");
	const b = json.bounds || {};
	for (const k of ["field_width_yd","field_length_yd","sideline_margin_yd","end_margin_yd"]) {
		if (typeof b[k] !== "number") errors.push(`bounds.${k} must be number`);
	}
	if (!json.entities || !json.entities.offense || !json.entities.defense) errors.push("entities.offense/defense missing");
	const off = (json.entities && json.entities.offense) || [];
	const def = (json.entities && json.entities.defense) || [];
	if (off.length !== 11) errors.push("offense must contain exactly 11 entities");
	if (def.length !== 11) errors.push("defense must contain exactly 11 entities");
	const ids = new Set();
	for (const e of [...off, ...def]) {
		if (!e.id) errors.push("entity missing id");
		if (ids.has(e.id)) errors.push(`duplicate entity id: ${e.id}`); else ids.add(e.id);
		if (!e.start || typeof e.start.x !== "number" || typeof e.start.y !== "number") errors.push(`entity ${e.id} missing start{x,y}`);
	}
	if (!json.scripts || typeof json.scripts !== "object") errors.push("scripts missing");
	if (json.scripts) {
		for (const key of Object.keys(json.scripts)) {
			const s = json.scripts[key];
			if (!s || !Array.isArray(s.timeline)) { errors.push(`script ${key} timeline missing`); continue; }
			let lastT = -Infinity;
			for (const step of s.timeline) {
				const t = step.t === "WHISTLE" ? Infinity : Number(step.t);
				if (!Number.isFinite(t) && step.t !== "WHISTLE") errors.push(`script ${key} has invalid t`);
				if (t < lastT) errors.push(`script ${key} timeline not monotonic`);
				lastT = t;
			}
			const last = s.timeline[s.timeline.length - 1];
			if (!last || last.t !== "WHISTLE") errors.push(`script ${key} must end with WHISTLE`);
			const hasSpot = (last.actions || []).some(a => a.type === "spot_ball");
			if (!hasSpot) errors.push(`script ${key} WHISTLE must include spot_ball`);
		}
	}
	if (errors.length) {
		const err = new Error(`Combo validation failed: \n- ${errors.join("\n- ")}`);
		err.errors = errors;
		throw err;
	}
    state.combo = json; // accept prepared combo as-is; callers may pass granular/expanded
    // Detect granular expanded file by size or tick count to enable end-snap correction
    try {
        const anyScript = Object.values(state.combo.scripts||{})[0];
        const tl = anyScript && anyScript.timeline || [];
        state.isGranular = tl.length > 200; // heuristic
    } catch { state.isGranular = false; }
	return true;
}

// ---------------- Coordinate transforms ----------------

function yardToPxX(xYards, dir) {
	const m = state.metrics; if (!m) return 0;
	return m.losXPx + xYards * (dir === "R" ? +m.pxPerYardX : -m.pxPerYardX);
}

function yardToPxY(yYards) {
	const m = state.metrics; if (!m) return 0;
	return m.midlineYPx + yYards * m.pxPerYardY;
}

function clampScreen(x, y) {
	const m = state.metrics; if (!m) return { x, y };
	const minX = Math.max(m.leftGoalLinePx + 2 * m.pxPerYardX, m.leftGoalLinePx + 0.5 * m.pxPerYardX);
	const maxX = Math.min(m.rightGoalLinePx - 2 * m.pxPerYardX, m.rightGoalLinePx - 0.5 * m.pxPerYardX);
	const minY = state.metrics.rect.top + 2 * m.pxPerYardY;
	const maxY = state.metrics.rect.bottom - 2 * m.pxPerYardY;
	const cx = Math.max(minX, Math.min(maxX, x));
	const cy = Math.max(minY, Math.min(maxY, y));
	if (cx !== x || cy !== y) state.clampCount++;
	return { x: cx, y: cy };
}

// ---------------- Actor rendering ----------------

function clearActors() {
	state.actors.clear();
	while (state.layers.actors.firstChild) state.layers.actors.removeChild(state.layers.actors.firstChild);
	while (state.layers.ball.firstChild) state.layers.ball.removeChild(state.layers.ball.firstChild);
}

function makeOffenseEl(id) {
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	c.setAttribute("r", "10");
	c.setAttribute("fill", "#ffffff");
	c.setAttribute("stroke", "#001a33");
	c.setAttribute("stroke-width", "2");
	const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
	t.setAttribute("text-anchor", "middle");
	t.setAttribute("dominant-baseline", "central");
	t.setAttribute("font-size", "10");
	t.setAttribute("font-family", "Oxanium, sans-serif");
	t.textContent = id.slice(0, 2).toUpperCase();
	g.appendChild(c); g.appendChild(t);
	state.layers.actors.appendChild(g);
	return { g, c, t };
}

function makeDefenseEl() {
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
	const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
	l1.setAttribute("stroke", "#cc3333"); l1.setAttribute("stroke-width", "3");
	l2.setAttribute("stroke", "#cc3333"); l2.setAttribute("stroke-width", "3");
	g.appendChild(l1); g.appendChild(l2);
	state.layers.actors.appendChild(g);
	return { g, l1, l2 };
}

function makeBallEl() {
	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	const e = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
	e.setAttribute("rx", "6");
	e.setAttribute("ry", "4");
	e.setAttribute("fill", "#a0522d");
	e.setAttribute("stroke", "#5c2f1b");
	e.setAttribute("stroke-width", "1");
	g.appendChild(e);
	state.layers.ball.appendChild(g);
	return { g, e };
}

function positionOffenseEl(el, x, y) {
	el.g.setAttribute("transform", `translate(${x},${y})`);
}

function positionDefenseEl(el, x, y) {
	el.g.setAttribute("transform", `translate(${x},${y})`);
	// X shape size
	el.l1.setAttribute("x1", -8); el.l1.setAttribute("y1", -8); el.l1.setAttribute("x2", 8); el.l1.setAttribute("y2", 8);
	el.l2.setAttribute("x1", -8); el.l2.setAttribute("y1", 8); el.l2.setAttribute("x2", 8); el.l2.setAttribute("y2", -8);
}

function positionBallEl(el, x, y, spin=false, tMs=0) {
	el.g.setAttribute("transform", `translate(${x},${y}) rotate(${spin ? (tMs % 360) : 0})`);
}

// ---------------- Timeline / Tweens ----------------

function scheduleTweenAbsolute(targetId, toYard, tStart, tEnd, easing = 'io') {
    state.tweens.push({ targetId, mode: 'abs', from: null, to: toYard, tStart, tEnd, init: false, easing, recompute: typeof toYard === 'function', snap: false });
}

function scheduleTweenRelative(targetId, dx, dy, tStart, tEnd, easing = 'io') {
	state.tweens.push({ targetId, mode: 'rel', from: null, dx, dy, tStart, tEnd, init: false, easing });
}

function scheduleSnapAbsolute(targetId, toYard, tAt) {
    state.tweens.push({ targetId, mode: 'abs', from: null, to: toYard, tStart: tAt, tEnd: tAt, init: false, easing: 'io', recompute: false, snap: true });
}

function setActorYard(id, yard) {
	const a = state.actors.get(id); if (!a) return;
	a.yard.x = yard.x; a.yard.y = yard.y;
	const px = clampScreen(yardToPxX(a.yard.x, state.dir), yardToPxY(a.yard.y));
	a.px = px;
	if (a.side === "offense") positionOffenseEl(a.el, px.x - state.metrics.rect.left, px.y - state.metrics.rect.top);
	else positionDefenseEl(a.el, px.x - state.metrics.rect.left, px.y - state.metrics.rect.top);
}

function setBallYard(yard) {
	state.ball.yard.x = yard.x; state.ball.yard.y = yard.y;
	const px = clampScreen(yardToPxX(yard.x, state.dir), yardToPxY(yard.y));
	state.ball.px = px;
	positionBallEl(state.ball.el, px.x - state.metrics.rect.left, px.y - state.metrics.rect.top, state.ball.spinning, performance.now());
}

function lerp(a, b, t) { return a + (b - a) * t; }

function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function resolveTweenInit(tw) {
	if (tw.init) return;
	const a = state.actors.get(tw.targetId); if (!a) return;
	const current = { x: a.yard.x, y: a.yard.y };
	tw.from = current;
	if (tw.mode === 'rel') {
		tw.to = { x: current.x + (tw.dx || 0), y: current.y + (tw.dy || 0) };
	} else if (tw.mode === 'abs') {
		// If to is a function, we'll recompute each frame; leave as-is
		if (typeof tw.to !== 'function') {
			// static destination
		}
	}
	tw.init = true;
}

function stepTweens(tMs) {
	for (const tw of state.tweens) {
		if (tMs < tw.tStart) continue;
		const a = state.actors.get(tw.targetId); if (!a) continue;
		if (!tw.init) resolveTweenInit(tw);
		const denom = (tw.tEnd - tw.tStart) || 1;
		const lin = Math.max(0, Math.min(1, (tMs - tw.tStart) / denom));
		const tt = (tw.easing === 'io') ? easeInOutCubic(lin) : lin;
		let dest = tw.to;
		if (tw.mode === 'abs' && typeof tw.to === 'function') {
			try { dest = tw.to(a); } catch { dest = { x: a.yard.x, y: a.yard.y }; }
		}
		let x = lerp(tw.from.x, dest.x, tt);
		let y = lerp(tw.from.y, dest.y, tt);
		// On granular timelines, ensure last tick hits destination exactly
        if (state.isGranular && (lin >= 0.999 || tw.snap)) { x = dest.x; y = dest.y; }
		setActorYard(tw.targetId, { x, y });
		if (state.ball.holderId === tw.targetId) setBallYard({ x, y });
	}
}

// ---------------- Action helpers ----------------

function forwardSign() { return state.dir === "R" ? 1 : -1; }

function gapLateralY(gap) {
	if (!gap) return 0;
	if (gap.includes("right_A")) return +2.0;
	if (gap.includes("left_A")) return -2.0;
	if (gap.includes("right_B")) return +4.0;
	if (gap.includes("left_B")) return -4.0;
	return 0;
}

function actorYard(id) { const a = state.actors.get(id); return a ? { x: a.yard.x, y: a.yard.y } : { x: 0, y: 0 }; }

function lineOfSightBlocked(defId, carrierId) {
    const d = state.actors.get(defId);
    const c = state.actors.get(carrierId);
    if (!d || !c) return false;
    // Vector from defender to carrier
    const vx = c.yard.x - d.yard.x;
    const vy = c.yard.y - d.yard.y;
    const len2 = vx*vx + vy*vy;
    if (len2 === 0) return false;
    // Check each offensive actor for being near the segment (simple LOS block)
    for (const a of state.actors.values()) {
        if (a.side !== 'offense') continue;
        if (a.id === c.id) continue;
        // Project offensive player onto segment
        const wx = a.yard.x - d.yard.x;
        const wy = a.yard.y - d.yard.y;
        const t = Math.max(0, Math.min(1, (wx*vx + wy*vy) / len2));
        const px = d.yard.x + t*vx;
        const py = d.yard.y + t*vy;
        const dist = Math.hypot(a.yard.x - px, a.yard.y - py);
        // Treat within ~0.9 yards as a block (shoulder width + engagement)
        if (dist < 0.9) return true;
    }
    return false;
}

function startDefenderPursuit(tStartMs, tEndMs) {
    const speedScale = 0.85; // slightly slower pursuit
    for (const a of state.actors.values()) {
        if (a.side !== 'defense') continue;
        const defId = a.id;
        scheduleTweenAbsolute(defId, () => {
            const carrier = state.actors.get(state.ball.holderId);
            if (!carrier) return { x: a.yard.x, y: a.yard.y };
            // If engaged by a blocker, orbit around the engaged point to simulate shed attempts
            const blkId = state.assignments.get(defId);
            if (blkId && state.actors.has(blkId)) {
                const b = state.actors.get(blkId);
                const dx = b.yard.x - a.yard.x; const dy = b.yard.y - a.yard.y; const mag = Math.hypot(dx, dy) || 1;
                // small tangential move around blocker plus slight forward leak toward carrier
                const tx = -dy / mag; const ty = dx / mag;
                const leak = 0.35; const orbit = 0.45;
                return { x: a.yard.x + tx * orbit + (carrier.yard.x - a.yard.x) * 0.12 * speedScale,
                         y: a.yard.y + ty * orbit + (carrier.yard.y - a.yard.y) * 0.12 * speedScale };
            }
            // If line of sight blocked by any offense, bias pursuit to a side to run around
            if (lineOfSightBlocked(defId, carrier.id)) {
                const hash = Array.from(defId).reduce((h,ch)=>h+ch.charCodeAt(0),0);
                const sign = (hash % 2 === 0) ? 1 : -1;
                return { x: a.yard.x + (carrier.yard.x - a.yard.x) * 0.6 * speedScale,
                         y: a.yard.y + (carrier.yard.y - a.yard.y) * 0.6 * speedScale + sign * 0.6 };
            }
            // Direct pursuit slightly lagged to avoid over-convergence
            let dx = carrier.yard.x - a.yard.x;
            let dy = carrier.yard.y - a.yard.y;
            const mag = Math.hypot(dx, dy) || 1;
            const step = Math.min(1.0, mag) * speedScale;
            let target = { x: a.yard.x + (dx / mag) * step, y: a.yard.y + (dy / mag) * step };
            // Cap total travel for far/coverage defenders so they only drift
            const ps = state.pursuitStart.get(defId);
            if (ps) {
                const roleCap = (defId.startsWith('CB') ? 3.0 : (defId === 'FS' || defId === 'SS' ? 5.0 : Infinity));
                const distCapByD0 = ps.d0 > 10 ? 3.0 : (ps.d0 > 6 ? 5.0 : Infinity);
                const cap = Math.min(roleCap, distCapByD0);
                if (cap < Infinity) {
                    const mx = target.x - ps.start.x; const my = target.y - ps.start.y; const mm = Math.hypot(mx,my) || 1;
                    if (mm > cap) {
                        target = { x: ps.start.x + mx * (cap / mm), y: ps.start.y + my * (cap / mm) };
                    }
                }
            }
            return target;
        }, tStartMs, tEndMs, 'io');
    }
}

function startDefenderPursuitStatic(tStartMs, tEndMs) {
    // Precompute a single end position per defender and tween toward it for monotonic drift
    const targets = new Map();
    const carrier = state.actors.get(state.ball.holderId);
    for (const a of state.actors.values()) {
        if (a.side !== 'defense') continue;
        const defId = a.id;
        let end = { x: a.yard.x, y: a.yard.y };
        if (carrier) {
            // base toward carrier
            let dx = carrier.yard.x - a.yard.x; let dy = carrier.yard.y - a.yard.y; const mag = Math.hypot(dx,dy)||1;
            const step = Math.min(4.0, mag) * 0.6; // total drift magnitude
            end = { x: a.yard.x + (dx/mag)*step, y: a.yard.y + (dy/mag)*step };
            // apply block-aware offset and role caps as before
            const blkId = state.assignments.get(defId);
            if (blkId && state.actors.has(blkId)) {
                const b = state.actors.get(blkId);
                const tx = -(b.yard.y - a.yard.y) / (Math.hypot(b.yard.x - a.yard.x, b.yard.y - a.yard.y)||1);
                const ty =  (b.yard.x - a.yard.x) / (Math.hypot(b.yard.x - a.yard.x, b.yard.y - a.yard.y)||1);
                end = { x: end.x + tx * 0.6, y: end.y + ty * 0.6 };
            } else if (lineOfSightBlocked(defId, carrier.id)) {
                const hash = Array.from(defId).reduce((h,ch)=>h+ch.charCodeAt(0),0);
                const sign = (hash % 2 === 0) ? 1 : -1;
                end = { x: end.x, y: end.y + sign * 0.8 };
            }
            const ps = state.pursuitStart.get(defId);
            if (ps) {
                const roleCap = (defId.startsWith('CB') ? 3.0 : (defId === 'FS' || defId === 'SS' ? 5.0 : Infinity));
                const distCapByD0 = ps.d0 > 10 ? 3.0 : (ps.d0 > 6 ? 5.0 : Infinity);
                const cap = Math.min(roleCap, distCapByD0);
                if (cap < Infinity) {
                    const mx = end.x - ps.start.x; const my = end.y - ps.start.y; const mm = Math.hypot(mx,my)||1;
                    if (mm > cap) end = { x: ps.start.x + mx*(cap/mm), y: ps.start.y + my*(cap/mm) };
                }
            }
        }
        targets.set(defId, end);
    }
    for (const [defId, end] of targets) {
        scheduleTweenAbsolute(defId, end, tStartMs, tEndMs, 'io');
    }
}

function startBlockerShield(tStartMs, tEndMs) {
	for (const [defId, blkId] of state.assignments) {
		const b = state.actors.get(blkId); const d = state.actors.get(defId);
		if (!b || !d) continue;
		scheduleTweenAbsolute(blkId, () => {
			const carrier = state.actors.get(state.ball.holderId);
			if (!carrier) return { x: b.yard.x, y: b.yard.y };
			// Place blocker between defender and carrier at a small offset from defender (shield point)
			const dx = carrier.yard.x - d.yard.x; const dy = carrier.yard.y - d.yard.y;
			const mag = Math.hypot(dx, dy) || 1;
			const ux = dx / mag; const uy = dy / mag;
			const shieldDist = 0.9; // yards from defender toward carrier
			return { x: d.yard.x + ux * shieldDist, y: d.yard.y + uy * shieldDist };
		}, tStartMs, tEndMs, 'io');
	}
}

function startBlockerShieldStatic(tStartMs, tEndMs) {
    const targets = new Map();
    for (const [defId, blkId] of state.assignments) {
        const b = state.actors.get(blkId); const d = state.actors.get(defId);
        if (!b || !d) continue;
        const carrier = state.actors.get(state.ball.holderId);
        let end = { x: b.yard.x, y: b.yard.y };
        if (carrier) {
            const dx = carrier.yard.x - d.yard.x; const dy = carrier.yard.y - d.yard.y;
            const mag = Math.hypot(dx, dy) || 1;
            const ux = dx / mag; const uy = dy / mag;
            const shieldDist = 0.9;
            end = { x: d.yard.x + ux * shieldDist, y: d.yard.y + uy * shieldDist };
        }
        targets.set(blkId, end);
    }
    for (const [blkId, end] of targets) scheduleTweenAbsolute(blkId, end, tStartMs, tEndMs, 'io');
}

function computeInitialAssignments() {
	state.assignments.clear();
	// Prefer script-driven targets will be set during handleActionsAt (down_block, drive, seal)
	// Fallback heuristic: map nearest trench defenders to nearest OL/TE/FB
	const blockerIds = Array.from(state.actors.values()).filter(a => a.side==='offense' && ['LT','LG','C','RG','RT','TE','FB'].includes(a.id)).map(a=>a.id);
	const defFront = ['LE','LDT','RDT','RE','SAM','MIKE','WILL'];
	for (const did of defFront) {
		if (!state.actors.has(did)) continue;
		let best=null, bd=1e9;
		for (const bid of blockerIds) {
			const d = actorYard(did); const b = actorYard(bid);
			const dist = Math.hypot(d.x-b.x, d.y-b.y);
			if (dist < bd) { bd=dist; best=bid; }
		}
		if (best) state.assignments.set(did, best);
	}
}

function handleActionsAt(step, tStartMs, tEndMs) {
	const actions = step.actions || [];
	for (const act of actions) {
		switch (act.type) {
            case "micro_move": {
                const id = act.actor; const from = actorYard(id);
                const dx = (typeof act.dx === 'number' ? act.dx : 0);
                const dy = (typeof act.dy === 'number' ? act.dy : 0);
                scheduleTweenRelative(id, dx, dy, tStartMs, tEndMs);
                if (act.snap && typeof act.snap.x === 'number' && typeof act.snap.y === 'number') {
                    // Ensure final snap at whistle or interval end
                    scheduleSnapAbsolute(id, { x: act.snap.x, y: act.snap.y }, tEndMs);
                }
                break;
            }
			case "idle": {
				// no-op
				break;
			}
			case "snap": {
				const from = actorYard(act.from);
				const to = actorYard(act.to);
				// Arc duration
				const dur = Math.min((act.ms||120), Math.max(60, (act.ms||120)));
				const arcEnd = state.clock.startMs + (tStartMs - state.clock.startMs) + dur;
				// Move ball to QB
				state.ball.spinning = true;
				// simple linear tween for ball position (yard space)
				const start = { ...state.ball.yard };
				const end = { x: to.x, y: to.y };
				// store as a pseudo tween by updating at each frame in stepTweensBall
				state._ballTween = { start, end, tStart: tStartMs, tEnd: tStartMs + dur };
				emit("snap", { from: act.from, to: act.to });
				break;
			}
			case "handoff": {
				const pt = act.point || { x: 0, y: 0 };
				setBallYard(pt);
				state.ball.holderId = act.to;
				state.ball.spinning = false;
				// Snap the receiving back to the handoff point if slightly off
				const hb = actorYard(act.to);
                if (Math.abs(hb.x - pt.x) > 0.05 || Math.abs(hb.y - pt.y) > 0.05) {
                    scheduleTweenAbsolute(act.to, { x: pt.x, y: pt.y }, tStartMs, tStartMs + 60);
                }
            // Begin pursuit and shield with fixed end positions to ensure smooth, monotonic drift
            if (!state.isGranular && !state.pursuitStarted) {
                const totalPlaySeconds = computeTotalPlaySeconds();
                const playEndMs = state.clock.startMs + totalPlaySeconds * 1600 / state.clock.speed;
                state.playEndMs = playEndMs;
                startDefenderPursuitStatic(tStartMs, playEndMs);
                state.pursuitStarted = true;
            }
            if (!state.isGranular && !state.shieldStarted) {
                startBlockerShieldStatic(tStartMs, state.playEndMs || (tEndMs + 1600));
                state.shieldStarted = true;
            }
				emit("handoff", { from: act.from, to: act.to });
				break;
			}
			case "carryout_fake": {
				// small move by QB to sell fake
				const qb = actorYard(act.actor);
				scheduleTweenRelative(act.actor, (act.offset?.x||0), (act.offset?.y||0), tStartMs, tEndMs);
				break;
			}
			case "first_step": {
				const ids = Array.isArray(act.actors) ? act.actors : [];
				const d = (act.yd || 0.5) * forwardSign();
				for (const id of ids) scheduleTweenRelative(id, d, 0, tStartMs, tEndMs);
				break;
			}
			case "insert": {
				const id = act.actor;
				const from = actorYard(id);
				scheduleTweenAbsolute(id, { x: from.x + (act.depth_yd||1) * forwardSign(), y: gapLateralY(act.gap) }, tStartMs, tEndMs);
				break;
			}
			case "lead_insert": {
				const id = act.actor;
				const from = actorYard(id);
				const path = Array.isArray(act.path) && act.path.length ? act.path : [from];
				let segStart = tStartMs; let prev = from;
				const segDur = (tEndMs - tStartMs) / Math.max(1, path.length);
				for (const p of path) {
					scheduleTweenAbsolute(id, { x: p.x, y: p.y }, segStart, segStart + segDur);
					prev = { x: p.x, y: p.y }; segStart += segDur;
				}
				break;
			}
			case "follow": {
				// Approximate: align follower x trail_yd behind leader along x-axis
				const follower = act.actor;
				const leader = state.actors.get(act.leader);
				if (leader) {
					scheduleTweenAbsolute(follower, () => ({ x: leader.yard.x - (act.trail_yd||0.8) * forwardSign(), y: leader.yard.y }), tStartMs, tEndMs);
				}
				break;
			}
			case "down_block": {
				// Drive down to target and seal inside/outside (approximate lateral step)
				const id = act.actor;
				const tgt = actorYard(act.target);
				const lateral = (act.seal === "inside" ? -1 : 1) * (state.dir === "R" ? 1 : -1) * 0.8;
				scheduleTweenAbsolute(id, { x: tgt.x, y: tgt.y + lateral }, tStartMs, tEndMs);
				// Record assignment: target defender is engaged by this blocker
				if (state.actors.has(act.target)) state.assignments.set(act.target, id);
				break;
			}
			case "hinge": {
				const id = act.actor;
				scheduleTweenRelative(id, -0.3 * forwardSign(), (state.dir === "R" ? -1 : 1) * 0.5, tStartMs, tEndMs);
				break;
			}
			case "drive": {
				const id = act.actor; const dx = (act.dir?.x || 0) * 1.0; const dy = (act.dir?.y || 0) * 1.0;
				scheduleTweenRelative(id, dx, dy, tStartMs, tEndMs);
				break;
			}
			case "climb": {
				const id = act.actor; const lm = actorYard(act.landmark);
				scheduleTweenAbsolute(id, { x: lm.x - 0.2 * forwardSign(), y: lm.y }, tStartMs, tEndMs);
				break;
			}
			case "seal": {
				// Small lateral adjust to wall a gap landmark
				const id = act.actor; const from = actorYard(id);
				scheduleTweenRelative(id, 0, (act.landmark?.includes("left") ? -0.7 : 0.7), tStartMs, tEndMs);
				break;
			}
			case "collision": {
				// Lock pairs briefly (no movement enforcement beyond existing tweens)
				const pairs = act.pairs || [];
				for (const [a,b] of pairs) { state.locks.add(a); state.locks.add(b); }
				break;
			}
			case "tackle": {
				const carrier = act.carrier; const at = act.at || { x: actorYard(carrier).x, y: actorYard(carrier).y };
				const from = actorYard(carrier);
				scheduleTweenAbsolute(carrier, at, tStartMs, tEndMs);
				// Ensure exact snap at the end of the tackle interval
				scheduleSnapAbsolute(carrier, { x: at.x, y: at.y }, tEndMs);
				// Pin carrier at end time
				// Move tacklers to the tackle point with slight offsets
				const by = Array.isArray(act.by) ? act.by : [];
				const radius = 0.4; // yards around the spot to avoid perfect overlap
				by.forEach((defId, idx) => {
					const angle = (idx / Math.max(1, by.length)) * Math.PI * 2;
					const dest = { x: at.x + radius * Math.cos(angle), y: at.y + radius * Math.sin(angle) };
					scheduleTweenAbsolute(defId, dest, tStartMs, tEndMs);
					scheduleSnapAbsolute(defId, dest, tEndMs);
				});
				setTimeout(() => {
					state.locks.add(carrier);
					for (const defId of (act.by || [])) state.locks.add(defId);
					emit("tackle", { by: act.by || [], carrier });
					// Force final exact positions before freezing
					setActorYard(carrier, { x: at.x, y: at.y });
					for (const defId of by) {
						const idx = by.indexOf(defId);
						const angle = (idx / Math.max(1, by.length)) * Math.PI * 2;
						const dx = radius * Math.cos(angle), dy = radius * Math.sin(angle);
						setActorYard(defId, { x: at.x + dx, y: at.y + dy });
					}
					// Keep ball attached to carrier
					if (state.ball.holderId === carrier) setBallYard({ x: at.x, y: at.y });
					// Freeze all motion
					state.tweens.length = 0;
				}, Math.max(0, tEndMs - performance.now()));
				break;
			}
			case "spot_ball": {
				// handled at WHISTLE processing
				break;
			}
			case "turnover":
			case "turnover_template": {
				const name = act.template || act.name;
				if (name) applyTurnoverTemplate(name, tStartMs);
				break;
			}
			default: {
				// Unknown/unsupported action types are ignored for now
				break;
			}
		}
	}
}

function stepBallTween(nowMs) {
	const bt = state._ballTween;
	if (!bt) return;
	const tt = Math.max(0, Math.min(1, (nowMs - bt.tStart) / (bt.tEnd - bt.tStart || 1)));
	const yard = { x: lerp(bt.start.x, bt.end.x, tt), y: lerp(bt.start.y, bt.end.y, tt) };
	setBallYard(yard);
	if (nowMs >= bt.tEnd) { delete state._ballTween; state.ball.spinning = false; state.ball.holderId = state.ball.holderId || "QB"; }
}

// ---------------- Animator ----------------

function inferDir() {
	try {
		const poss = window?.game?.possession; // 'player' or 'ai'
		if (poss === 'player') return 'R';
		if (poss === 'ai') return 'L';
	} catch {}
	return 'R';
}

function computeTotalPlaySeconds() {
    // Use the active script's last numeric t (up to WHISTLE) or fallback to 1.6s
    try {
        const scripts = state.combo?.scripts || {};
        // Prefer the current script key if we can track it
        let maxT = 0;
        for (const key of Object.keys(scripts)) {
            const tl = scripts[key]?.timeline || [];
            for (const step of tl) {
                if (typeof step.t === 'number') maxT = Math.max(maxT, step.t);
            }
        }
        return maxT || 1.6;
    } catch { return 1.6; }
}

function inferBallOn() {
	try { const b = window?.game?.ballOn; if (typeof b === 'number') return b; } catch {}
	return 25;
}

export function animate({ chartKey = 'F', dir, ballOnYard, speed = 0.6, seed = 12345 } = {}) {
	if (!state.combo) throw new Error("No combo loaded. Call loadCombo(json) first.");
	// Setup run context
    state.dir = (dir === 'L' || dir === 'R') ? dir : inferDir();
	state.ballOnYard = typeof ballOnYard === 'number' ? ballOnYard : inferBallOn();
	updateMetrics();
	state.clock.speed = Math.max(0.01, Number(speed) || 1);
	state.tweens = []; state.locks.clear(); state.clampCount = 0; state.warnedClamp = false;
	clearActors();
	// Build initial actors
	const mk = (side, ent) => {
		const yard = { x: ent.start.x, y: ent.start.y };
		const px = clampScreen(yardToPxX(yard.x, state.dir), yardToPxY(yard.y));
		let el;
		if (side === 'offense') el = makeOffenseEl(ent.id); else el = makeDefenseEl(ent.id);
		const actor = { side, id: ent.id, role: ent.role, start: { ...yard }, yard: { ...yard }, px, el };
		state.actors.set(ent.id, actor);
		// Initial draw
		if (side === 'offense') positionOffenseEl(el, px.x - state.metrics.rect.left, px.y - state.metrics.rect.top);
		else positionDefenseEl(el, px.x - state.metrics.rect.left, px.y - state.metrics.rect.top);
	};
	for (const e of state.combo.entities.offense) mk('offense', e);
	for (const e of state.combo.entities.defense) mk('defense', e);
	// Ball element
	state.ball.el = makeBallEl();
	state.ball.holderId = 'C';
	setBallYard(actorYard('C'));
	// DEV: draw start dots if dev mode
	try {
		const devOn = !!document.getElementById('dev-mode-checkbox')?.checked;
		if (devOn) drawDevStartDots(); else clearDevLayer();
	} catch {}
	// Build and run timeline
	const script = state.combo.scripts[chartKey];
	if (!script) throw new Error(`Script ${chartKey} not found in combo`);
	const t0 = performance.now();
	state.clock.startMs = t0;
    state.playStartMs = t0;
	// Schedule actions between timeline keyframes
	for (let i = 0; i < script.timeline.length; i++) {
		const cur = script.timeline[i];
		const next = script.timeline[i+1];
		const tStartMs = cur.t === 'WHISTLE' ? Infinity : t0 + (Number(cur.t)||0) * 1200 / state.clock.speed; // slow down baseline
		const tEndMs = !next ? tStartMs : (next.t === 'WHISTLE' ? t0 + (Number(cur.t)||0) * 1200 / state.clock.speed + 240 : t0 + (Number(next.t)||0) * 1200 / state.clock.speed);
		handleActionsAt(cur, tStartMs, tEndMs);
	}
	// Compute initial assignments after actors exist
	computeInitialAssignments();
	// Record pursuit start positions and initial distances for all defenders
	state.pursuitStart.clear();
	for (const a of state.actors.values()) {
		if (a.side !== 'defense') continue;
		const carrier = state.actors.get(state.ball.holderId);
		const d0 = carrier ? Math.hypot(carrier.yard.x - a.yard.x, carrier.yard.y - a.yard.y) : 0;
		state.pursuitStart.set(a.id, { start: { x: a.yard.x, y: a.yard.y }, d0 });
	}
	// Main RAF loop
	function frame(now) {
		state.clock.nowMs = now;
		stepTweens(now);
		stepBallTween(now);
		// Collect frames for replay (coarse)
		if (!state.lastRun) state.lastRun = { scriptKey: chartKey, dir: state.dir, ballOnYard: state.ballOnYard, frames: [] };
		if (state.lastRun.frames.length < 600) state.lastRun.frames.push(snapshotFrame());
		state.rAF = requestAnimationFrame(frame);
	}
	state.rAF = requestAnimationFrame(frame);
	// Handle WHISTLE spot_ball immediately at end to compute result
	const last = script.timeline[script.timeline.length - 1];
	const spot = (last.actions || []).find(a => a.type === 'spot_ball');
	let yards = Number(spot?.yards || 0);
	let turnover = false;
	let possessionSwap = false;
	if (state._turnover && state._turnover.yardsDelta != null) {
		turnover = true;
		possessionSwap = !!state._turnover.swap;
		yards = state._turnover.yardsDelta;
	}
	const newBallOn = clampBallOn(state.ballOnYard + (state.dir === 'R' ? yards : -yards));
	const result = { yards, newBallOn, turnover, possessionSwap };
	setTimeout(() => {
		if (state.clampCount > 0 && !state.warnedClamp) { console.warn(`[GSAnimator] Clamp applied ${state.clampCount} times`); state.warnedClamp = true; }
		emit('whistle', {});
		emit('result', result);
		// Granular determinism validator: compare final yards to script.end_targets if provided
		try {
			const s = state.combo?.scripts?.[chartKey];
			const targets = s && s.end_targets;
			if (state.isGranular && targets && typeof console !== 'undefined') {
				const rows = [];
				let ok = true;
				for (const [id, actor] of state.actors) {
					const t = targets[id];
					if (!t) continue;
					const dx = Math.abs((actor.yard.x||0) - (t.x||0));
					const dy = Math.abs((actor.yard.y||0) - (t.y||0));
					rows.push({ id, x: Number(actor.yard.x.toFixed(2)), y: Number(actor.yard.y.toFixed(2)), tx: t.x, ty: t.y, ex: Number(dx.toFixed(3)), ey: Number(dy.toFixed(3)) });
					if (dx > 0.11 || dy > 0.11) ok = false;
				}
				try { console.table(rows); } catch { console.log(rows); }
				if (!ok) console.warn('[GSAnimator] Determinism validator failed: final yards deviate from end_targets > 0.11 yd');
			}
		} catch {}
		state._turnover = null;
	}, 0);
	return result;
}

export function stop() {
	if (state.rAF) cancelAnimationFrame(state.rAF);
	state.rAF = 0; state.tweens = []; state.locks.clear();
}

export function replayLast(seconds = 3, speed = 0.5) {
	if (!state.lastRun) return;
	// For simplicity, just re-run the same script at reduced speed
	stop();
	animate({ chartKey: state.lastRun.scriptKey, dir: state.lastRun.dir, ballOnYard: state.lastRun.ballOnYard, speed });
}

// ---------------- Utilities / DEV ----------------

function drawDevStartDots() {
	clearDevLayer();
	for (const a of state.actors.values()) {
		const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		dot.setAttribute("r", "2.5");
		dot.setAttribute("fill", a.side === 'offense' ? '#00ffff' : '#ff66ff');
		const px0 = clampScreen(yardToPxX(a.start.x, state.dir), yardToPxY(a.start.y));
		dot.setAttribute("cx", px0.x - state.metrics.rect.left);
		dot.setAttribute("cy", px0.y - state.metrics.rect.top);
		state.layers.dev.appendChild(dot);
	}
}

function clearDevLayer() { while (state.layers.dev && state.layers.dev.firstChild) state.layers.dev.removeChild(state.layers.dev.firstChild); }

function snapshotFrame() {
	const actors = {};
	for (const [id, a] of state.actors) actors[id] = { x: a.yard.x, y: a.yard.y };
	return { t: state.clock.nowMs - state.clock.startMs, actors, ball: { ...state.ball.yard } };
}

function clampBallOn(v) { return Math.max(0, Math.min(100, v)); }

// Named exports listed at top

// ---------------- Dense timeline expansion ----------------

function expandComboToDense(combo) {
    const out = JSON.parse(JSON.stringify(combo));
    const offenseIds = out.entities.offense.map(e => e.id);
    const defenseIds = out.entities.defense.map(e => e.id);
    const allIds = [...offenseIds, ...defenseIds];
    for (const key of Object.keys(out.scripts||{})) {
        const s = out.scripts[key];
        const tl = s.timeline || [];
        const dense = [];
        for (let i = 0; i < tl.length; i++) {
            const step = tl[i];
            const next = tl[i+1];
            // Copy existing actions
            const actions = Array.isArray(step.actions) ? step.actions.slice() : [];
            if (step.t !== 'WHISTLE') {
                // Track which actors already have directed actions in this step
                const targeted = new Set();
                for (const a of actions) {
                    if (a.actors === 'ALL') { allIds.forEach(id=>targeted.add(id)); continue; }
                    if (typeof a.actor === 'string') targeted.add(a.actor);
                    if (Array.isArray(a.actors)) a.actors.forEach(id=>targeted.add(id));
                    if (Array.isArray(a.pairs)) a.pairs.flat().forEach(id=>targeted.add(id));
                    if (a.from) targeted.add(a.from);
                    if (a.to) targeted.add(a.to);
                    if (a.by) (Array.isArray(a.by) ? a.by : [a.by]).forEach(id=>targeted.add(id));
                }
                const intervalSec = Number(next && typeof next.t === 'number' ? (next.t - (Number(step.t)||0)) : 0.2);
                // For every non-targeted actor, add a micro-move appropriate to role
                for (const id of allIds) {
                    if (targeted.has(id)) continue;
                    const isOff = offenseIds.includes(id);
                    const roleNudge = isOff ? 0.15 : 0.22; // yards per interval
                    const lateralBias = (id.startsWith('WR') || id === 'TE') ? 0.08 : 0.0;
                    actions.push({ type: 'micro_move', actor: id, dx: roleNudge, dy: lateralBias, duration: intervalSec });
                }
            }
            dense.push({ t: step.t, actions });
        }
        s.timeline = dense;
    }
    return out;
}

export function makeGranularCombo(combo, stepSec = 0.05) {
    const out = JSON.parse(JSON.stringify(combo));
    const offenseIds = out.entities.offense.map(e => e.id);
    const defenseIds = out.entities.defense.map(e => e.id);
    const allIds = [...offenseIds, ...defenseIds];
    for (const key of Object.keys(out.scripts||{})) {
        const s = out.scripts[key];
        const tl = s.timeline || [];
        // Determine tEnd (max numeric t) and tackle info
        let tEnd = 1.6;
        let tackleAt = { x: 0, y: 0 };
        let carrierId = 'HB';
        let tacklers = [];
        for (const st of tl) {
            if (typeof st.t === 'number') tEnd = Math.max(tEnd, st.t);
            if (Array.isArray(st.actions)) {
                for (const a of st.actions) {
                    if (a.type === 'tackle') {
                        tackleAt = a.at || tackleAt;
                        carrierId = a.carrier || carrierId;
                        tacklers = Array.isArray(a.by) ? a.by.slice() : (a.by ? [a.by] : []);
                    }
                }
            }
        }
        // Build per-actor end targets
        const idToStart = new Map();
        for (const e of [...out.entities.offense, ...out.entities.defense]) idToStart.set(e.id, { x: e.start.x, y: e.start.y });
        const idToEnd = new Map();
        for (const id of allIds) {
            const st = idToStart.get(id) || { x: 0, y: 0 };
            let end = { ...st };
            const v = { x: tackleAt.x - st.x, y: tackleAt.y - st.y };
            const d = Math.hypot(v.x, v.y) || 1;
            const ux = v.x / d, uy = v.y / d;
            if (id === carrierId) {
                end = { x: tackleAt.x, y: tackleAt.y };
            } else if (tacklers.includes(id)) {
                // Tacklers converge to a small ring around the tackle point
                const idx = tacklers.indexOf(id);
                const angle = (idx / Math.max(1, tacklers.length)) * Math.PI * 2;
                const r = 0.35;
                end = { x: tackleAt.x + Math.cos(angle) * r, y: tackleAt.y + Math.sin(angle) * r };
            } else if (['LT','LG','C','RG','RT','TE','FB'].includes(id)) {
                // Blockers form a wedge just short of the tackle, biased laterally by starting y
                const dist = Math.min(2.6, Math.max(1.3, d * 0.6));
                const lateral = Math.sign(st.y - tackleAt.y) * 0.5;
                end = { x: st.x + ux * dist, y: st.y + uy * dist + lateral };
            } else if (id === 'QB') {
                const dist = 1.0;
                end = { x: st.x + ux * dist, y: st.y + uy * 0.4 };
            } else if (id.startsWith('WR')) {
                const dist = 1.5;
                end = { x: st.x + ux * 0.85, y: st.y + uy * 0.45 };
            } else if (['LE','LDT','RDT','RE','SAM','MIKE','WILL'].includes(id)) {
                const dist = Math.min(5.0, Math.max(1.8, d * 1.0));
                end = { x: st.x + ux * dist, y: st.y + uy * Math.min(2.4, Math.abs(uy) * dist) };
            } else if (['CBL','CBR'].includes(id)) {
                const dist = Math.min(3.0, d * 0.45);
                end = { x: st.x + ux * dist, y: st.y + uy * 0.7 };
            } else if (['FS','SS'].includes(id)) {
                const dist = Math.min(5.5, d * 0.85);
                end = { x: st.x + ux * dist, y: st.y + uy * 1.2 };
            }
            idToEnd.set(id, end);
        }
        // Persist end_targets on the script for deterministic validation/export
        s.end_targets = {};
        for (const id of allIds) {
            s.end_targets[id] = idToEnd.get(id) || idToStart.get(id) || { x: 0, y: 0 };
        }
        // Build tick times from 0..tEnd at stepSec and copy original actions on exact times
        const timeSet = new Set();
        for (let t = 0; t <= tEnd + 1e-6; t += stepSec) timeSet.add(Number(t.toFixed(3)));
        for (const st of tl) if (typeof st.t === 'number') timeSet.add(Number(st.t.toFixed(3)));
        const times = Array.from(timeSet.values()).sort((a,b)=>a-b);
        // Build a map of time->original actions
        const timeToActs = new Map();
        for (const st of tl) {
            if (st.t === 'WHISTLE') continue;
            const tt = Number((st.t||0).toFixed(3));
            const arr = timeToActs.get(tt) || [];
            (st.actions||[]).forEach(a=>arr.push(a));
            timeToActs.set(tt, arr);
        }
        // Compute per-actor per-tick deltas (absolute deltas, not direction-flipped; animator will mirror)
        const numTicks = Math.max(1, times.length - 1);
        const dense = [];
        for (let i = 0; i < times.length; i++) {
            const t = times[i];
            const actions = [];
            // original actions at this tick
            const orig = timeToActs.get(Number(t.toFixed(3))) || [];
            actions.push(...orig);
            if (i > 0) {
                // micro step for each actor
                for (const id of allIds) {
                    const st = idToStart.get(id);
                    const en = idToEnd.get(id) || st;
                    const dx = (en.x - st.x) / numTicks;
                    const dy = (en.y - st.y) / numTicks;
                    actions.push({ type: 'micro_move', actor: id, dx, dy });
                }
            }
            dense.push({ t, actions });
        }
        // Append a final numeric tick just before WHISTLE to snap all actors to exact end targets.
        // Keep the original WHISTLE with spot_ball as a separate terminator step.
        const lastWhistle = tl.find(st => st.t === 'WHISTLE');
        const whistleActs = lastWhistle ? (lastWhistle.actions || []).slice() : [];
        const lastNumericT = times.length > 0 ? times[times.length - 1] : tEnd;
        const finalTickT = Number((lastNumericT + stepSec).toFixed(3));
        const snapActions = [];
        for (const id of allIds) {
            const en = idToEnd.get(id) || idToStart.get(id);
            snapActions.push({ type: 'micro_move', actor: id, dx: 0, dy: 0, snap: { x: en.x, y: en.y } });
        }
        dense.push({ t: finalTickT, actions: snapActions });
        dense.push({ t: 'WHISTLE', actions: whistleActs });
        s.timeline = dense;
    }
    return out;
}

// ---------------- Turnover templates (scripted) ----------------

function applyTurnoverTemplate(name, tStartMs) {
	const tpls = (state.combo && state.combo.turnover_templates) || {};
	const tpl = tpls[name];
	if (!tpl || !Array.isArray(tpl)) return;
	// We execute a minimal subset deterministically. No RNG.
	let eventPos = null;
	let newHolder = null;
	let yardsReturn = 0;
	let flipDir = false;
	for (const step of tpl) {
		if (step.t === 'EVENT') {
			if (name === 'fumble') {
				eventPos = state.ball.yard;
				newHolder = null; // loose for a moment
				emit('drop', { at: { ...eventPos } });
			}
			if (name === 'interception') {
				eventPos = state.ball.yard;
				// choose nearest DB deterministically: pick first of [FS, SS, CBR, CBL] that exists
				const candidates = ['FS','SS','CBR','CBL'];
				for (const id of candidates) { if (state.actors.has(id)) { newHolder = id; break; } }
				if (newHolder) { state.ball.holderId = newHolder; emit('intercept', { by: newHolder }); }
			}
			continue;
		}
		// relative timings like '+0.05' could be processed; here we ignore timing and apply final positioning
		const acts = step.actions || [];
		for (const a of acts) {
			if (a.type === 'recover_nearest') {
				// choose nearest side's actor; here we pick defense if auto
				const defIds = Array.from(state.actors.values()).filter(x => x.side === 'defense').map(x => x.id);
				newHolder = defIds[0] || null;
				if (newHolder) { state.ball.holderId = newHolder; emit('catch', { by: newHolder }); }
			}
			if (a.type === 'secure_ball' && a.actor === 'DB' && newHolder) {
				state.ball.holderId = newHolder;
			}
			if (a.type === 'return') {
				flipDir = a.dir === 'flip' || a.dir === 'flip_if_defense';
				// compute a modest return distance under max_yd when provided
				const max = Math.max(0, Number(a.max_yd || 10));
				yardsReturn = Math.min(10, max);
			}
		}
	}
	if (newHolder) {
		// Move ball carrier forward/back depending on flip
		const sign = (flipDir ? -forwardSign() : forwardSign());
        const from = actorYard(newHolder);
        const to = { x: from.x + sign * Math.max(0, yardsReturn), y: from.y };
        scheduleTweenAbsolute(newHolder, to, tStartMs, tStartMs + 600);
		state._turnover = { yardsDelta: (flipDir ? -yardsReturn : yardsReturn), swap: true };
	}
}

// ---------------- Debug helpers ----------------

export function logStartTable() {
	if (!state.metrics || state.actors.size === 0) return;
	const rows = [];
	for (const a of state.actors.values()) {
		const px = clampScreen(yardToPxX(a.start.x, state.dir), yardToPxY(a.start.y));
		rows.push({ id: a.id, side: a.side, x_yd: a.start.x, y_yd: a.start.y, x_px: Math.round(px.x - state.metrics.rect.left), y_px: Math.round(px.y - state.metrics.rect.top) });
	}
	try { console.table(rows); } catch { console.log(rows); }
}


