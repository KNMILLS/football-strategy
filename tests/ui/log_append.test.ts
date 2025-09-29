import { describe, it, expect } from 'vitest';

function setupDom() {
  document.body.innerHTML = `
    <div id="log" role="log" aria-live="polite" tabindex="0"></div>
  `;
}

describe('log append behavior', () => {
  it('appends messages and autoscrolls; role and focusability intact', async () => {
    setupDom();
    const { registerLog } = await import('../../src/ui/Log');
    const { EventBus } = await import('../../src/utils/EventBus');
    const bus = new EventBus();
    registerLog(bus);

    const logEl = document.getElementById('log') as HTMLElement;
    expect(logEl.getAttribute('role')).toBe('log');
    expect(logEl.getAttribute('aria-live')).toBe('polite');

    bus.emit('log', { message: 'First' });
    bus.emit('log', { message: 'Second' });

    expect(logEl.textContent).toContain('First');
    expect(logEl.textContent).toContain('Second');
    expect(logEl.scrollTop).toBe(logEl.scrollHeight);

    logEl.focus();
    expect(document.activeElement).toBe(logEl);
  });
});


