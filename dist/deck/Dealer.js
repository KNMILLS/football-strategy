const DEFAULT_CFG = { handSize: 5, reshuffleOnEmpty: true };
export function createShuffledPile(deck, rng) {
    const ids = deck.map((c) => c.id);
    const arr = ids.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}
export function initialHand(pile, cfg) {
    const { handSize } = { ...DEFAULT_CFG, ...cfg };
    const hand = pile.slice(0, handSize);
    const drawPile = pile.slice(handSize);
    return { state: { drawPile, discardPile: [], hand }, dealtIds: hand.slice() };
}
export function drawToFull(state, cfg, rng) {
    const { handSize, reshuffleOnEmpty } = { ...DEFAULT_CFG, ...cfg };
    let drawPile = state.drawPile.slice();
    let discardPile = state.discardPile.slice();
    let hand = state.hand.slice();
    const drew = [];
    while (hand.length < handSize) {
        if (drawPile.length === 0) {
            if (!reshuffleOnEmpty || discardPile.length === 0)
                break;
            // reshuffle discard into new drawPile
            const all = discardPile.slice();
            discardPile = [];
            for (let i = all.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                const tmp = all[i];
                all[i] = all[j];
                all[j] = tmp;
            }
            drawPile = all;
        }
        const next = drawPile[0];
        drawPile = drawPile.slice(1);
        hand = hand.concat([next]);
        drew.push(next);
    }
    return { state: { drawPile, discardPile, hand }, drewIds: drew };
}
export function playCard(state, cardId) {
    const idx = state.hand.indexOf(cardId);
    if (idx < 0)
        return state;
    const newHand = state.hand.slice(0, idx).concat(state.hand.slice(idx + 1));
    const newDiscard = state.discardPile.concat([cardId]);
    return { drawPile: state.drawPile.slice(), discardPile: newDiscard, hand: newHand };
}
export function recycleIfNeeded(state, cfg, rng, deck) {
    const { reshuffleOnEmpty, handSize } = { ...DEFAULT_CFG, ...cfg };
    if (!reshuffleOnEmpty)
        return { drawPile: state.drawPile.slice(), discardPile: state.discardPile.slice(), hand: state.hand.slice() };
    // If draw pile is empty and discard has cards, reshuffle discard into new draw pile
    if (state.drawPile.length > 0) {
        return { drawPile: state.drawPile.slice(), discardPile: state.discardPile.slice(), hand: state.hand.slice() };
    }
    // If draw is empty and discard is empty but hand has more than handSize, trim extras back into draw
    if (state.discardPile.length === 0 && state.hand.length > handSize) {
        const keep = state.hand.slice(0, handSize);
        let extras = state.hand.slice(handSize);
        for (let i = extras.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = extras[i];
            extras[i] = extras[j];
            extras[j] = tmp;
        }
        return { drawPile: extras, discardPile: [], hand: keep };
    }
    if (state.discardPile.length === 0) {
        return { drawPile: state.drawPile.slice(), discardPile: state.discardPile.slice(), hand: state.hand.slice() };
    }
    // shuffle discard into new draw
    const ids = state.discardPile.slice();
    for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = ids[i];
        ids[i] = ids[j];
        ids[j] = tmp;
    }
    return { drawPile: ids, discardPile: [], hand: state.hand.slice() };
}
export function lookupCards(ids, deck) {
    const byId = Object.create(null);
    for (const c of deck)
        byId[c.id] = c;
    return ids.map((id) => byId[id]).filter((c) => Boolean(c));
}
//# sourceMappingURL=Dealer.js.map