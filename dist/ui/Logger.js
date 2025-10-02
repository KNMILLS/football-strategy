import { EventBus } from '../utils/EventBus';
export function appendLog(bus, message) {
    bus.emit('log', { message });
}
//# sourceMappingURL=Logger.js.map