import { $ } from './utils';
export function ensureFieldOverlays() {
    if (typeof document === 'undefined')
        return;
    const field = $('field-display');
    if (!field)
        return;
    if (!document.querySelector('.scrimmage-line')) {
        const el = document.createElement('div');
        el.className = 'scrimmage-line';
        field.appendChild(el);
    }
    if (!document.querySelector('.firstdown-line')) {
        const el = document.createElement('div');
        el.className = 'firstdown-line';
        field.appendChild(el);
    }
    if (!document.getElementById('red-zone')) {
        const el = document.createElement('div');
        el.className = 'red-zone';
        el.id = 'red-zone';
        el.style.display = 'none';
        field.appendChild(el);
    }
    if (!document.querySelector('.chain-marker')) {
        const el = document.createElement('div');
        el.className = 'chain-marker';
        el.id = 'chain-marker';
        el.style.display = 'none';
        field.appendChild(el);
    }
}
//# sourceMappingURL=overlays.js.map