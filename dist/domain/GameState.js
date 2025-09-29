export function createInitialGameState(seed) {
    return {
        seed,
        quarter: 1,
        clock: 15 * 60,
        down: 1,
        toGo: 10,
        ballOn: 25,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 },
    };
}
//# sourceMappingURL=GameState.js.map