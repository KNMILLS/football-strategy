import type { HandUpdatePayload } from '../utils/EventBus';
import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

export function registerHand(bus: EventBus): void {
  const handElement = $('hand');
  const cardPreview = $('card-preview');
  if (!handElement) return;

  bus.on('handUpdate', (payload: HandUpdatePayload) => {
    handElement.innerHTML = '';
    for (const card of payload.cards) {
      const div = document.createElement('div');
      div.className = 'card';
      div.draggable = false;
      (div as any).dataset.id = card.id;
      div.innerHTML = `<img src="${card.art}" alt="${card.label}"><div class="label">${card.label}</div>`;
      const imgEl = div.querySelector('img') as HTMLImageElement | null;
      if (imgEl) {
        imgEl.onerror = () => {
          imgEl.remove();
          div.classList.add('no-image');
        };
      }
      div.addEventListener('click', () => {
        try {
          (window as any).playCard && (window as any).playCard(card.id);
        } catch {}
      });
      div.addEventListener('mouseenter', () => {
        if (!cardPreview) return;
        cardPreview.style.backgroundImage = `url('${card.art}')`;
        cardPreview.innerHTML = `<div class='label'>${card.label}</div>`;
        cardPreview.style.display = 'block';
        (cardPreview as HTMLElement).style.zIndex = '9999';
        (cardPreview as HTMLElement).style.pointerEvents = 'none';
      });
      div.addEventListener('mouseleave', () => {
        if (!cardPreview) return;
        cardPreview.style.display = 'none';
        cardPreview.innerHTML = '';
      });
      handElement.appendChild(div);
    }
  });
}


