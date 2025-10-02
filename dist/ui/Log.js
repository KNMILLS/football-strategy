import { EventBus } from '../utils/EventBus';
function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
}
export function registerLog(bus) {
    console.log('Log component registering...');
    // Wait for DOM elements to be available
    const waitForElements = () => {
        const logElement = $('log');
        console.log('Log element found:', !!logElement);
        if (!logElement) {
            console.log('Log element not found, waiting...');
            setTimeout(waitForElements, 100);
            return;
        }
        console.log('Log element found, setting up event listeners...');
        bus.on('log', ({ message }) => {
            logElement.textContent = (logElement.textContent || '') + message + '\n';
            logElement.scrollTop = logElement.scrollHeight;
        });
    };
    // Start waiting for elements
    waitForElements();
}
//# sourceMappingURL=Log.js.map