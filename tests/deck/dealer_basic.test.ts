import { describe, it, expect } from 'vitest';
import { createLCG } from '../../src/sim/RNG';
import { OFFENSE_DECKS } from '../../src/data/decks';
import { createShuffledPile, initialHand, drawToFull, playCard, recycleIfNeeded, type HandState } from '../../src/deck/Dealer';

const cfg = { handSize: 5, reshuffleOnEmpty: true } as const;

describe('Dealer basic flow', () => {
	it('Shuffling is deterministic with the same rng', () => {
		const deck = OFFENSE_DECKS['Pro Style'];
		const rng1 = createLCG(123);
		const rng2 = createLCG(123);
		const pile1 = createShuffledPile(deck, rng1);
		const pile2 = createShuffledPile(deck, rng2);
		expect(pile1.slice(0, 8)).toEqual(pile2.slice(0, 8));
	});

	it('initialHand deals handSize cards; drawToFull refills; playCard moves to discard', () => {
		const rng = createLCG(42);
		const deck = OFFENSE_DECKS['Ball Control'];
		const pile = createShuffledPile(deck, rng);
		const { state: s0, dealtIds } = initialHand(pile, cfg);
		expect(dealtIds.length).toBe(cfg.handSize);
		expect(s0.hand.length).toBe(cfg.handSize);
		const playId = s0.hand[0];
		const s1 = playCard(s0, playId);
		expect(s1.hand.includes(playId)).toBe(false);
		expect(s1.discardPile.includes(playId)).toBe(true);
		const { state: s2, drewIds } = drawToFull(s1, cfg, createLCG(7));
		expect(s2.hand.length).toBe(cfg.handSize);
		expect(drewIds.length).toBe(1);
	});

	it('recycleIfNeeded reshuffles discard into draw when empty; immutability preserved', () => {
		const rng = createLCG(99);
		const deck = OFFENSE_DECKS['Aerial Style'];
		let pile = createShuffledPile(deck, rng);
		let { state } = initialHand(pile, cfg);
		// Force consume drawPile to zero
		let current: HandState = state;
		while (current.drawPile.length) {
			const nextId = current.drawPile[0];
			current = { drawPile: current.drawPile.slice(1), discardPile: current.discardPile.slice(), hand: current.hand.concat([nextId]) };
		}
		const before = { ...current, drawPile: current.drawPile.slice(), discardPile: current.discardPile.slice(), hand: current.hand.slice() };
		const after = recycleIfNeeded(current, cfg, createLCG(5), deck);
		expect(after.drawPile.length).toBeGreaterThan(0);
		// Immutability: original state arrays unchanged
		expect(before.drawPile).toEqual(current.drawPile);
		expect(before.discardPile).toEqual(current.discardPile);
		expect(before.hand).toEqual(current.hand);
	});
});
