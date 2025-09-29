import type { HudUpdatePayload } from '../utils/EventBus';
import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function yardToPercent(absYard: number): number {
  return 5 + (absYard / 100) * 90;
}

export function registerHUD(bus: EventBus): void {
  const scoreDisplay = $('score');
  const hudQuarter = $('quarter');
  const hudClock = $('clock');
  const hudDownDistance = $('downDistance');
  const hudBallSpot = $('ballSpot');
  const hudPossession = $('possession');

  const downNames = ['1st', '2nd', '3rd', '4th'];

  bus.on('hudUpdate', (p: HudUpdatePayload) => {
    // Query overlay elements at event time to allow late construction
    const scrimmageLineEl = typeof document !== 'undefined' ? document.querySelector('.scrimmage-line') as HTMLElement | null : null;
    const firstDownLineEl = typeof document !== 'undefined' ? document.querySelector('.firstdown-line') as HTMLElement | null : null;
    const redZoneEl = typeof document !== 'undefined' ? document.getElementById('red-zone') : null;
    const chainMarkerEl = typeof document !== 'undefined' ? document.querySelector('.chain-marker') as HTMLElement | null : null;
    if (scoreDisplay) {
      const prev = scoreDisplay.textContent || '';
      const next = `HOME ${p.score.player} — AWAY ${p.score.ai}`;
      scoreDisplay.textContent = next;
      if (prev !== next) {
        scoreDisplay.classList.remove('score-pop');
        void (scoreDisplay as any).offsetWidth;
        scoreDisplay.classList.add('score-pop');
      }
    }
    if (hudQuarter) hudQuarter.textContent = `Q${p.quarter}`;
    if (hudClock) {
      const m = Math.floor(Math.max(p.clock, 0) / 60);
      const s = Math.max(p.clock, 0) % 60;
      hudClock.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (hudDownDistance) {
      const downIdx = Math.min(p.down, 4) - 1;
      const downStr = downNames[downIdx] || `${p.down}th`;
      const firstDownAbs = p.possession === 'player' ? (p.ballOn + p.toGo) : (p.ballOn - p.toGo);
      const isG2G = p.possession === 'player' ? (firstDownAbs >= 100) : (firstDownAbs <= 0);
      const toGoLabel = isG2G ? 'Goal' : String(p.toGo);
      hudDownDistance.textContent = `${downStr} & ${toGoLabel}`;
    }
    if (hudBallSpot) {
      const displaySpot = p.ballOn <= 50 ? p.ballOn : 100 - p.ballOn;
      hudBallSpot.textContent = `Ball on ${Math.round(displaySpot)}`;
    }
    if (hudPossession) hudPossession.textContent = p.possession === 'player' ? 'HOME' : 'AWAY';

    // Update field overlay lines
    if (scrimmageLineEl && firstDownLineEl) {
      let firstDownAbsolute = p.possession === 'player' ? (p.ballOn + p.toGo) : (p.ballOn - p.toGo);
      firstDownAbsolute = Math.max(0, Math.min(100, firstDownAbsolute));
      const scrimmagePercent = yardToPercent(p.ballOn);
      const firstDownPercent = yardToPercent(firstDownAbsolute);
      const clamp = (val: number) => Math.max(5.5, Math.min(94.5, val));
      (scrimmageLineEl as HTMLElement).style.left = `${clamp(scrimmagePercent)}%`;
      (firstDownLineEl as HTMLElement).style.left = `${clamp(firstDownPercent)}%`;
      // Red zone shading
      if (redZoneEl) {
        if (p.ballOn <= 20) {
          redZoneEl.style.display = 'block';
          redZoneEl.style.left = '0%';
          redZoneEl.style.width = '20%';
        } else if (p.ballOn >= 80) {
          redZoneEl.style.display = 'block';
          redZoneEl.style.left = '80%';
          redZoneEl.style.width = '20%';
        } else {
          redZoneEl.style.display = 'none';
        }
      }
      if (chainMarkerEl) {
        const clamp2 = (val: number) => Math.max(5.5, Math.min(94.5, val));
        chainMarkerEl.style.display = 'block';
        chainMarkerEl.style.left = `${clamp2(firstDownPercent)}%`;
      }
      (scrimmageLineEl as HTMLElement).style.display = 'block';
      (firstDownLineEl as HTMLElement).style.display = 'block';
    }
  });
}


