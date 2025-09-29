import { EventBus } from '../utils/EventBus';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

export function registerLog(bus: EventBus): void {
  const logElement = $('log');
  if (!logElement) return;

  bus.on('log', ({ message }) => {
    logElement.textContent = (logElement.textContent || '') + message + '\n';
    (logElement as HTMLElement).scrollTop = (logElement as HTMLElement).scrollHeight;
  });
}


