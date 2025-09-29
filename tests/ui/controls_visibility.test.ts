import { describe, it, expect } from 'vitest';

function setupDom() {
  document.body.innerHTML = `
    <div id="controls">
      <div id="pat-options" hidden>
        <button id="pat-kick">Kick XP</button>
        <button id="pat-two">Go for Two</button>
      </div>
      <div id="fg-options" hidden>
        <button id="fg-kick">Kick FG</button>
      </div>
    </div>
  `;
}

describe('controls visibility via controls:update', () => {
  it('toggles PAT and FG groups and enables/disables buttons', async () => {
    setupDom();
    const { registerControls } = await import('../../src/ui/Controls');
    const { EventBus } = await import('../../src/utils/EventBus');
    const bus = new EventBus();
    registerControls(bus);

    const patGroup = document.getElementById('pat-options')! as any;
    const fgGroup = document.getElementById('fg-options')! as any;
    const patKick = document.getElementById('pat-kick') as HTMLButtonElement;
    const patTwo = document.getElementById('pat-two') as HTMLButtonElement;
    const fgKick = document.getElementById('fg-kick') as HTMLButtonElement;

    // Initially hidden
    expect(patGroup.hidden).toBe(true);
    expect(fgGroup.hidden).toBe(true);

    bus.emit('controls:update', { awaitingPAT: true, showFG: false, enabled: true });
    expect(patGroup.hidden).toBe(false);
    expect(fgGroup.hidden).toBe(true);
    expect(patKick.disabled).toBe(false);
    expect(patTwo.disabled).toBe(false);

    bus.emit('controls:update', { awaitingPAT: false, showFG: true, enabled: false });
    expect(patGroup.hidden).toBe(true);
    expect(fgGroup.hidden).toBe(false);
    expect(fgKick.disabled).toBe(true);

    bus.emit('controls:update', { showFG: false, enabled: true, hints: { patKickHint: '99%', fgHint: '45 yards' } });
    expect(fgGroup.hidden).toBe(true);
    expect(patKick.title).toContain('99%');
  });
});


