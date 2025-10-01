import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
export function registerHand(bus) {
    console.log('Hand component registering...');
    // Wait for DOM to be ready if elements aren't found yet
    const waitForElements = () => {
        const handElement = $('hand');
        const cardPreview = $('card-preview');
        console.log('Hand element found:', !!handElement);
        console.log('Card preview element found:', !!cardPreview);
        if (!handElement) {
            console.log('Hand element not found, waiting...');
            setTimeout(waitForElements, 100);
            return;
        }
        console.log('Hand elements found, setting up event listeners...');
        bus.on('handUpdate', (payload) => {
            handElement.innerHTML = '';
            handElement.classList.toggle('disabled', !payload.isPlayerOffense);
            for (const card of payload.cards) {
                const div = document.createElement('div');
                div.className = 'card';
                div.draggable = false;
                div.dataset.id = card.id;
                div.innerHTML = `<img src="${card.art}" alt="${card.label}"><div class="label">${card.label}</div>`;
                const imgEl = div.querySelector('img');
                if (imgEl) {
                    imgEl.onerror = () => {
                        imgEl.remove();
                        div.classList.add('no-image');
                    };
                }
                div.addEventListener('click', () => {
                    // Always allow selection; engine routes as offense or defense based on possession
                    bus.emit('ui:playCard', { cardId: card.id });
                });
                div.addEventListener('mouseenter', () => {
                    if (!cardPreview)
                        return;
                    cardPreview.style.backgroundImage = `url('${card.art}')`;
                    cardPreview.innerHTML = `<div class='label'>${card.label}</div>`;
                    cardPreview.style.display = 'block';
                    cardPreview.style.zIndex = '9999';
                    cardPreview.style.pointerEvents = 'none';
                });
                div.addEventListener('mouseleave', () => {
                    if (!cardPreview)
                        return;
                    cardPreview.style.display = 'none';
                    cardPreview.innerHTML = '';
                });
                handElement.appendChild(div);
            }
            // Fallback: if for some reason no cards rendered, ask runtime to re-emit hand
            try {
                if (!payload.cards.length) {
                    window.GS?.bus?.emit && window.GS.bus.emit('hudUpdate', {
                        quarter: 1, clock: 15 * 60, down: 1, toGo: 10, ballOn: 25, possession: 'player', score: { player: 0, ai: 0 },
                    });
                }
            }
            catch { }
        });
    };
    // Start waiting for elements
    waitForElements();
}
//# sourceMappingURL=Hand.js.map