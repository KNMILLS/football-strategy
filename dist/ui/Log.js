import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
export function registerLog(bus) {
    const logElement = $('log');
    if (!logElement)
        return;
    bus.on('log', ({ message }) => {
        logElement.textContent = (logElement.textContent || '') + message + '\n';
        logElement.scrollTop = logElement.scrollHeight;
    });
}
//# sourceMappingURL=Log.js.map