import { describe, it, expect } from 'vitest';

function setupDom() {
  document.body.innerHTML = `
    <div id="hand"></div>
    <div id="card-preview"></div>
  `;
}

describe('hand click emits ui:playCard', () => {
  it('clicking a card emits ui:playCard with id', async () => {
    setupDom();
    const { registerHand } = await import('../../src/ui/Hand');
    const { EventBus } = await import('../../src/utils/EventBus');
    const bus = new EventBus();
    const emitted: any[] = [];
    bus.on('ui:playCard', (p: any) => emitted.push(p));
    registerHand(bus);

    // simulate hand update with two cards
    bus.emit('handUpdate', {
      cards: [
        { id: 'c1', label: 'HB Dive', art: 'x.png', type: 'run' },
        { id: 'c2', label: 'PA Pass', art: 'y.png', type: 'pass' },
      ],
      isPlayerOffense: true,
    } as any);

    const firstCard = document.querySelector('#hand .card') as HTMLElement;
    firstCard.click();

    expect(emitted[0]).toEqual({ cardId: 'c1' });
  });
});


