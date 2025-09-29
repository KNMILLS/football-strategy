import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';
import { emitHandUpdate } from '../../src/deck/HandBus';

const sampleCards = [
	{ id: 'id1', deck: 'Pro Style', label: 'Power Up Middle', type: 'run', art: 'assets/cards/Pro Style/Power Up Middle.jpg' },
	{ id: 'id2', deck: 'Pro Style', label: 'Flair Pass', type: 'pass', art: 'assets/cards/Pro Style/Flair Pass.jpg' },
] as const;

describe('HandBus', () => {
	it('emitHandUpdate emits with expected payload and flags', () => {
		const bus = new EventBus();
		const spy = vi.fn();
		bus.on('handUpdate', spy as any);
		emitHandUpdate(bus, sampleCards as any, true);
		expect(spy).toHaveBeenCalledTimes(1);
		const payload = spy.mock.calls[0][0];
		expect(payload.isPlayerOffense).toBe(true);
		expect(payload.cards.length).toBe(2);
		expect(payload.cards[0]).toMatchObject({ id: 'id1', label: 'Power Up Middle', art: expect.any(String), type: 'run' });
	});
});
