import { EventBus } from '../utils/EventBus';
import type { OffenseCardDef } from '../data/decks';

export function emitHandUpdate(bus: EventBus, cards: OffenseCardDef[], isPlayerOffense: boolean): void {
	bus.emit('handUpdate', {
		cards: cards.map((c) => ({ id: c.id, label: c.label, art: c.art, type: c.type })),
		isPlayerOffense,
	});
}
