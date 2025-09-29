import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
export function registerHand(bus) {
    const handElement = $('hand');
    const cardPreview = $('card-preview');
    if (!handElement)
        return;
    bus.on('handUpdate', (payload) => {
        handElement.innerHTML = '';
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
                try {
                    window.playCard && window.playCard(card.id);
                }
                catch { }
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
    });
}
//# sourceMappingURL=Hand.js.map