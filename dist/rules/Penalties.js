export function maybePenalty(rng) {
    if (rng() < 0.1) {
        const on = rng() < 0.5 ? 'offense' : 'defense';
        const yards = rng() < 0.5 ? 5 : 10;
        return { on, yards };
    }
    return null;
}
//# sourceMappingURL=Penalties.js.map