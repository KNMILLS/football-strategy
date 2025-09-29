import { describe, it, expect } from 'vitest';

function setupDom() {
  document.body.innerHTML = `
    <div id="controls">
      <button id="new-game">New Game</button>
      <select id="deck-select"><option value="Pro">Pro</option><option value="College">College</option></select>
      <select id="opponent-select"><option value="AI-1">AI-1</option><option value="AI-2">AI-2</option></select>
      <input type="checkbox" id="dev-mode" />
      <select id="theme-select"><option value="modern">modern</option><option value="retro">retro</option></select>
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

describe('controls actions', () => {
  it('emits newGame, devModeChanged, themeChanged, PAT and FG via keyboard', async () => {
    setupDom();
    const { registerControls } = await import('../../src/ui/Controls');
    const { EventBus } = await import('../../src/utils/EventBus');
    const bus = new EventBus();
    const events: Array<{ type: string; payload: any }> = [];
    bus.on('ui:newGame', (p: any) => events.push({ type: 'ui:newGame', payload: p }));
    bus.on('ui:devModeChanged', (p: any) => events.push({ type: 'ui:devModeChanged', payload: p }));
    bus.on('ui:themeChanged', (p: any) => events.push({ type: 'ui:themeChanged', payload: p }));
    bus.on('ui:choosePAT', (p: any) => events.push({ type: 'ui:choosePAT', payload: p }));
    bus.on('ui:attemptFieldGoal', (p: any) => events.push({ type: 'ui:attemptFieldGoal', payload: p }));
    registerControls(bus);

    // Click New Game
    (document.getElementById('deck-select') as HTMLSelectElement).value = 'College';
    (document.getElementById('opponent-select') as HTMLSelectElement).value = 'AI-2';
    (document.getElementById('new-game') as HTMLButtonElement).click();

    // Toggle dev mode
    const dev = document.getElementById('dev-mode') as HTMLInputElement;
    dev.checked = true;
    dev.dispatchEvent(new Event('change'));

    // Change theme
    const theme = document.getElementById('theme-select') as HTMLSelectElement;
    theme.value = 'retro';
    theme.dispatchEvent(new Event('change'));

    // Show PAT options and press 1 & 2
    const patGroup = document.getElementById('pat-options')! as any;
    patGroup.hidden = false;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

    // Hide PAT, show FG and press 3
    patGroup.hidden = true;
    const fgGroup = document.getElementById('fg-options')! as any;
    fgGroup.hidden = false;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));

    // Assertions
    const ng = events.find(e => e.type === 'ui:newGame')!;
    expect(ng.payload.deckName).toBe('College');
    expect(ng.payload.opponentName).toBe('AI-2');

    const devEvt = events.find(e => e.type === 'ui:devModeChanged')!;
    expect(devEvt.payload.enabled).toBe(true);
    expect(typeof localStorage.getItem('gs_dev_mode')).toBeTypeOf('string');

    const themeEvt = events.find(e => e.type === 'ui:themeChanged')!;
    expect(themeEvt.payload.theme).toBe('retro');

    const patKick = events.find(e => e.type === 'ui:choosePAT' && e.payload.choice === 'kick');
    const patTwo = events.find(e => e.type === 'ui:choosePAT' && e.payload.choice === 'two');
    expect(patKick).toBeTruthy();
    expect(patTwo).toBeTruthy();

    const fg = events.find(e => e.type === 'ui:attemptFieldGoal');
    expect(fg).toBeTruthy();
  });
});


