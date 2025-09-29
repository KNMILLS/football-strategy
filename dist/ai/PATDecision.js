export function shouldGoForTwo(ctx) {
    const late = ctx.quarter === 4 && ctx.clock <= 5 * 60;
    // Go for two when trailing by 1 or 2
    let go = (ctx.diff > 0 && ctx.diff <= 2);
    // Aggressive coaches may go when leading by 1 very late (diff < 0 means AI leads)
    if (ctx.coach.twoPointAggressiveLate && ctx.diff < 0 && ctx.diff === -1 && late)
        go = true;
    return go;
}
export function performPAT(ctx, rng) {
    if (shouldGoForTwo(ctx)) {
        const success = rng() < 0.5;
        return { aiPoints: success ? 2 : 0 };
    }
    // XP success heuristic aligned with legacy behavior; 98% success when abstracted
    const success = rng() < 0.98;
    return { aiPoints: success ? 1 : 0 };
}
//# sourceMappingURL=PATDecision.js.map