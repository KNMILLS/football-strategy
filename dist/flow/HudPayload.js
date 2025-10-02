export function hudPayload(s) {
    return {
        quarter: s.quarter,
        clock: s.clock,
        down: s.down,
        toGo: s.toGo,
        ballOn: s.ballOn,
        possession: s.possession,
        score: { player: s.score.player, ai: s.score.ai },
    };
}
//# sourceMappingURL=HudPayload.js.map