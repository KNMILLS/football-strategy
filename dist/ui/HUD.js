import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
function yardToPercent(absYard) {
    return 5 + (absYard / 100) * 90;
}
export function registerHUD(bus) {
    console.log('HUD component registering...');
    // Wait for DOM elements to be available
    const waitForElements = () => {
        const scoreDisplay = $('score');
        const hudQuarter = $('quarter');
        const hudClock = $('clock');
        const hudDownDistance = $('downDistance');
        const hudBallSpot = $('ballSpot');
        const hudPossession = $('possession');
        console.log('HUD elements found:', {
            scoreDisplay: !!scoreDisplay,
            hudQuarter: !!hudQuarter,
            hudClock: !!hudClock,
            hudDownDistance: !!hudDownDistance,
            hudBallSpot: !!hudBallSpot,
            hudPossession: !!hudPossession
        });
        if (!scoreDisplay || !hudQuarter || !hudClock || !hudDownDistance || !hudBallSpot || !hudPossession) {
            console.log('HUD elements not found, waiting...');
            setTimeout(waitForElements, 100);
            return;
        }
        console.log('HUD elements found, setting up event listeners...');
        const downNames = ['1st', '2nd', '3rd', '4th'];
        bus.on('hudUpdate', (p) => {
            // Query overlay elements at event time to allow late construction
            const scrimmageLineEl = typeof document !== 'undefined' ? document.querySelector('.scrimmage-line') : null;
            const firstDownLineEl = typeof document !== 'undefined' ? document.querySelector('.firstdown-line') : null;
            const redZoneEl = typeof document !== 'undefined' ? document.getElementById('red-zone') : null;
            const chainMarkerEl = typeof document !== 'undefined' ? document.querySelector('.chain-marker') : null;
            if (scoreDisplay) {
                const prev = scoreDisplay.textContent || '';
                const next = `HOME ${p.score.player} — AWAY ${p.score.ai}`;
                scoreDisplay.textContent = next;
                if (prev !== next) {
                    scoreDisplay.classList.remove('score-pop');
                    void scoreDisplay.offsetWidth;
                    scoreDisplay.classList.add('score-pop');
                }
            }
            if (hudQuarter)
                hudQuarter.textContent = `Q${p.quarter}`;
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
            if (hudPossession)
                hudPossession.textContent = p.possession === 'player' ? 'HOME' : 'AWAY';
            // Update field overlay lines
            if (scrimmageLineEl && firstDownLineEl) {
                let firstDownAbsolute = p.possession === 'player' ? (p.ballOn + p.toGo) : (p.ballOn - p.toGo);
                firstDownAbsolute = Math.max(0, Math.min(100, firstDownAbsolute));
                const scrimmagePercent = yardToPercent(p.ballOn);
                const firstDownPercent = yardToPercent(firstDownAbsolute);
                const clamp = (val) => Math.max(5.5, Math.min(94.5, val));
                scrimmageLineEl.style.left = `${clamp(scrimmagePercent)}%`;
                firstDownLineEl.style.left = `${clamp(firstDownPercent)}%`;
                // Red zone shading
                if (redZoneEl) {
                    if (p.ballOn <= 20) {
                        redZoneEl.style.display = 'block';
                        redZoneEl.style.left = '0%';
                        redZoneEl.style.width = '20%';
                    }
                    else if (p.ballOn >= 80) {
                        redZoneEl.style.display = 'block';
                        redZoneEl.style.left = '80%';
                        redZoneEl.style.width = '20%';
                    }
                    else {
                        redZoneEl.style.display = 'none';
                    }
                }
                if (chainMarkerEl) {
                    const clamp2 = (val) => Math.max(5.5, Math.min(94.5, val));
                    chainMarkerEl.style.display = 'block';
                    chainMarkerEl.style.left = `${clamp2(firstDownPercent)}%`;
                }
                scrimmageLineEl.style.display = 'block';
                firstDownLineEl.style.display = 'block';
            }
        });
    };
    // Start waiting for elements
    waitForElements();
}
//# sourceMappingURL=HUD.js.map