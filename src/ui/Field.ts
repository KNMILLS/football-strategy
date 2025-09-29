import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function ensureFieldOverlays(): void {
  if (typeof document === 'undefined') return;
  const field = $('field-display');
  if (!field) return;
  // Scrimmage line
  if (!document.querySelector('.scrimmage-line')) {
    const el = document.createElement('div');
    el.className = 'scrimmage-line';
    (field as HTMLElement).appendChild(el);
  }
  // First down line
  if (!document.querySelector('.firstdown-line')) {
    const el = document.createElement('div');
    el.className = 'firstdown-line';
    (field as HTMLElement).appendChild(el);
  }
  // Red zone overlay
  if (!document.getElementById('red-zone')) {
    const el = document.createElement('div');
    el.className = 'red-zone';
    el.id = 'red-zone';
    el.style.display = 'none';
    (field as HTMLElement).appendChild(el);
  }
  // Chain marker
  if (!document.querySelector('.chain-marker')) {
    const el = document.createElement('div');
    el.className = 'chain-marker';
    el.id = 'chain-marker';
    el.style.display = 'none';
    (field as HTMLElement).appendChild(el);
  }
}

export function registerField(bus: EventBus): void {
  // Ensure overlays exist even if legacy initField didn't run yet
  ensureFieldOverlays();

  // Keep field construction in main.js for now; UI events only here
  bus.on('vfx', ({ type, payload }) => {
    if (type === 'toast') {
      const overlay = $('vfx-overlay');
      if (!overlay) return;
      const d = document.createElement('div');
      d.className = 'vfx-toast';
      d.textContent = payload && payload.text ? String(payload.text) : '';
      overlay.appendChild(d);
      setTimeout(() => { d.remove(); }, 1500);
    }
  });
}


