import { EventBus } from '../utils/EventBus';

export function appendLog(bus: EventBus, message: string): void {
  bus.emit('log', { message });
}


