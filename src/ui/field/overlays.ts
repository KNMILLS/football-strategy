import { $ } from './utils';

export function ensureFieldOverlays(): void {
  if (typeof document === 'undefined') return;
  const field = $('field-display');
  if (!field) return;
  if (!document.querySelector('.scrimmage-line')) {
    const el = document.createElement('div');
    el.className = 'scrimmage-line';
    (field as HTMLElement).appendChild(el);
  }
  if (!document.querySelector('.firstdown-line')) {
    const el = document.createElement('div');
    el.className = 'firstdown-line';
    (field as HTMLElement).appendChild(el);
  }
  if (!document.getElementById('red-zone')) {
    const el = document.createElement('div');
    el.className = 'red-zone';
    el.id = 'red-zone';
    (el as HTMLElement).style.display = 'none';
    (field as HTMLElement).appendChild(el);
  }
  if (!document.querySelector('.chain-marker')) {
    const el = document.createElement('div');
    el.className = 'chain-marker';
    el.id = 'chain-marker';
    (el as HTMLElement).style.display = 'none';
    (field as HTMLElement).appendChild(el);
  }
}


