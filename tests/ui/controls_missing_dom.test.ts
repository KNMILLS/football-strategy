import { describe, it, expect } from 'vitest';

describe('Controls - missing DOM elements', () => {
  it('registerControls does not throw when optional elements are absent', async () => {
    document.body.innerHTML = `<div id="controls"></div>`;
    const { registerControls } = await import('../../src/ui/Controls');
    const { EventBus } = await import('../../src/utils/EventBus');
    const bus = new EventBus();
    expect(() => registerControls(bus)).not.toThrow();
  });
});


