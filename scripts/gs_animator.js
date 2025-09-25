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
  const widthPx = rect.width;
  const heightPx = rect.height;
  // SVG-local coordinates: origin at (0,0) top-left of the field element
  // Playable between 5% and 95% horizontally (end zones 5% each)
  const leftGoalLinePx = widthPx * 0.05;
  const rightGoalLinePx = widthPx * 0.95;
  const innerWidthPx = widthPx * 0.90;
  const midlineYPx = heightPx / 2;
  const pxPerYardX = innerWidthPx / 100; // 100 yards across
  const pxPerYardY = heightPx / 53.333; // 53.333 yards tall
  return {
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
  if (!fieldRoot) {
    try { fieldRoot = document.getElementById('field-display'); } catch {}
  }
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
    if (isDevEnabled()) drawDevDot(p.x, p.y, '#7ae9ff');
  }
  for (const d of defense) {
    actorStart.set(d.id, { ...d.start });
    const node = makeDefenseNode();
    const p = yardToScreen({ x_yd: d.start.x || 0, y_yd: d.start.y || 0, ballOnYard, dir });
    setNodePosition(node, p.x, p.y);
    groupActors.appendChild(node);
    actorNode.set(d.id, node);
    if (isDevEnabled()) drawDevDot(p.x, p.y, '#ff7a7a');
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
    if (isDevEnabled()) {
      const ptsPx = hbPathPoints.map(pt => yardToScreen({ x_yd: pt.x, y_yd: pt.y, ballOnYard, dir }));
      drawDevPath(ptsPx, '#ffa500', true);
    }
  }

  // FB insert path (optional visual)
  let fbPathPoints = null;
  const fbCtl = offControllers.find((c) => c.id === 'FB' && c.controller && Array.isArray(c.controller.path));
  if (fbCtl) {
    fbPathPoints = (fbCtl.controller.path || []).map((pt) => ({ x: Number(pt.x || 0), y: Number(pt.y || 0) }));
    if (isDevEnabled()) {
      const ptsPx = fbPathPoints.map(pt => yardToScreen({ x_yd: pt.x, y_yd: pt.y, ballOnYard, dir }));
      drawDevPath(ptsPx, '#00e5ff', true);
    }
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
  try { console.info('[GSAnimator] animate start', { chartKey, dir, ballOnYard, resultYards }); } catch {}
  const immediate = step();
  return immediate || { yards: resultYards, newBallOn: ballOnYard, turnover: false, possessionSwap: false };
}

// Optional: expose granular helper for dev hash (#granular60) without implementing heavy logic
export function makeGranularCombo(json) {
  return json; // passthrough for now
}

// Default export compatibility (some loaders may expect default)
export default { initField, loadCombo, animate, stop, replayLast, on, makeGranularCombo };

