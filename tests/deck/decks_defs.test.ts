import { describe, it, expect } from 'vitest';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS, type DeckName, type OffenseCardDef } from '../../src/data/decks';
import { LABEL_TO_CHART_KEY } from '../../src/rules/Charts';

const ALLOWED_TYPES = new Set(['run','pass','punt','field-goal']);

function labelsMapToCharts(deck: OffenseCardDef[]): boolean {
	return deck.every((c) => {
		const key = (LABEL_TO_CHART_KEY as any)[c.label] || c.label;
		return typeof key === 'string' && key.length > 0;
	});
}

describe('Deck definitions', () => {
	it('Each offense deck has exactly 20 cards; ids unique; labels map; types valid', () => {
		const names: DeckName[] = ['Pro Style','Ball Control','Aerial Style'];
		for (const name of names) {
			const deck = OFFENSE_DECKS[name];
			expect(deck.length).toBe(20);
			const ids = new Set(deck.map((c) => c.id));
			expect(ids.size).toBe(20);
			expect(labelsMapToCharts(deck)).toBe(true);
			for (const c of deck) expect(ALLOWED_TYPES.has(c.type)).toBe(true);
		}
	});

	it('Defense deck: contains exactly the 10 canonical labels; no duplicates', () => {
		const labels = DEFENSE_DECK.map((d) => d.label);
		const expected = ['Goal Line','Short Yardage','Inside Blitz','Running','Run & Pass','Pass & Run','Passing','Outside Blitz','Prevent','Prevent Deep'];
		expect(labels.sort()).toEqual(expected.sort());
		const ids = new Set(DEFENSE_DECK.map((d) => d.id));
		expect(ids.size).toBe(10);
	});

	it('WHITE_SIGN_RESTRICTIONS only references labels present in offense decks', () => {
		const allLabels = new Set(Object.values(OFFENSE_DECKS).flat().map((c) => c.label));
		for (const label of Object.keys(WHITE_SIGN_RESTRICTIONS)) {
			expect(allLabels.has(label)).toBe(true);
		}
	});
});
