export function validateEvents(events) {
    const issues = [];
    let hudCount = 0;
    let logCount = 0;
    let scoreEvents = 0;
    let kickoffEvents = 0;
    // Basic presence checks
    const hasFinal = events.some(e => e.type === 'final');
    const hasKickoff = events.some(e => e.type === 'kickoff');
    if (!hasFinal)
        issues.push('No final event emitted.');
    if (!hasKickoff)
        issues.push('No kickoff event observed.');
    // Track quarter/clock monotonicity and yardline bounds
    const lastClockByQuarter = {};
    let lastQuarter = 1;
    for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.type === 'hud') {
            hudCount += 1;
            const q = Number(ev.payload?.quarter ?? 0);
            const clock = Number(ev.payload?.clock ?? 0);
            const ballOn = Number(ev.payload?.ballOn ?? 0);
            if (q < lastQuarter) {
                issues.push(`Quarter decreased from ${lastQuarter} to ${q} at hud #${hudCount}.`);
            }
            if (!(q in lastClockByQuarter)) {
                lastClockByQuarter[q] = clock;
            }
            else {
                const last = lastClockByQuarter[q] ?? clock;
                if (clock > last) {
                    issues.push(`Clock increased within Q${q}: ${lastClockByQuarter[q]} -> ${clock}.`);
                }
                lastClockByQuarter[q] = Math.min(last, clock);
            }
            lastQuarter = Math.max(lastQuarter, q);
            if (!(ballOn >= 0 && ballOn <= 100)) {
                issues.push(`ballOn out of bounds: ${ballOn} at Q${q} clock ${clock}.`);
            }
        }
        else if (ev.type === 'log') {
            logCount += 1;
        }
        else if (ev.type === 'score') {
            scoreEvents += 1;
            // After any scoring, a kickoff should appear within next N events
            const window = events.slice(i + 1, i + 1 + 15);
            const hasFollowKick = window.some(w => w.type === 'kickoff');
            if (!hasFollowKick) {
                issues.push(`No kickoff event within 15 events after score (${ev.payload.kind}).`);
            }
        }
        else if (ev.type === 'kickoff') {
            kickoffEvents += 1;
        }
    }
    // Black-screen proxy: require at least one hud and at least a few logs
    if (hudCount === 0)
        issues.push('No HUD updates observed (black-screen risk).');
    if (logCount < 1)
        issues.push('Too few log lines emitted.');
    return {
        ok: issues.length === 0,
        issues,
        stats: { hudCount, logCount, scoreEvents, kickoffEvents },
    };
}
//# sourceMappingURL=Validation.js.map