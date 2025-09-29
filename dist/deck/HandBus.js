import { EventBus } from '../utils/EventBus';
export function emitHandUpdate(bus, cards, isPlayerOffense) {
    bus.emit('handUpdate', {
        cards: cards.map((c) => ({ id: c.id, label: c.label, art: c.art, type: c.type })),
        isPlayerOffense,
    });
}
//# sourceMappingURL=HandBus.js.map