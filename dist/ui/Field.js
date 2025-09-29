import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
export function registerField(bus) {
    // Keep field construction in main.js for now; UI events only here
    bus.on('vfx', ({ type, payload }) => {
        if (type === 'toast') {
            const overlay = $('vfx-overlay');
            if (!overlay)
                return;
            const d = document.createElement('div');
            d.className = 'vfx-toast';
            d.textContent = payload && payload.text ? String(payload.text) : '';
            overlay.appendChild(d);
            setTimeout(() => { d.remove(); }, 1500);
        }
    });
}
//# sourceMappingURL=Field.js.map