import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';
import { registerSpecialTeamsUI } from '../../src/ui/SpecialTeamsUI';

function pressKey(key: string) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true });
  document.dispatchEvent(ev);
}

describe('SpecialTeamsUI', () => {
  let bus: EventBus;
  let received: any[];

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    bus = new EventBus();
    received = [];
    registerSpecialTeamsUI(bus);
    (bus as any).on('ui:choice.kickoffType', (p: any) => received.push(['kickoffType', p]));
    (bus as any).on('ui:choice.puntReturn', (p: any) => received.push(['puntReturn', p]));
    (bus as any).on('ui:choice.safetyFreeKick', (p: any) => received.push(['safetyFreeKick', p]));
  });

  it('shows kickoff onside vs normal and emits selection via click', () => {
    (bus as any).emit('flow:choiceRequired', { choice: 'onsideOrNormal', data: { kicking: 'player' } });
    const title = document.querySelector('.gs-modal h2') as HTMLElement | null;
    expect(title?.textContent).toMatch(/Kickoff Type/);
    const buttons = Array.from(document.querySelectorAll('.gs-modal__button')) as HTMLButtonElement[];
    expect(buttons.map(b => b.textContent)).toEqual(['Normal Kickoff (1)', 'Onside Kick (2)']);
    buttons[1].click();
    expect(received).toEqual([['kickoffType', { type: 'onside' }]]);
    // Dialog closed and focus restored
    expect(document.querySelector('.gs-modal__dialog')).toBeNull();
  });

  it('supports hotkeys for kickoff', () => {
    (bus as any).emit('flow:choiceRequired', { choice: 'onsideOrNormal', data: { kicking: 'player' } });
    pressKey('1');
    expect(received.pop()).toEqual(['kickoffType', { type: 'normal' }]);
  });

  it('punt return end zone: Return and Down at 20', () => {
    (bus as any).emit('flow:choiceRequired', { choice: 'puntReturn', data: { receiving: 'player', atYard: 5, inEndZone: true } });
    const buttons = Array.from(document.querySelectorAll('.gs-modal__button')) as HTMLButtonElement[];
    expect(buttons.map(b => b.textContent)).toEqual(['Return (1)', 'Down at 20 (2)']);
    buttons[0].click();
    expect(received.pop()).toEqual(['puntReturn', { action: 'return' }]);
  });

  it('punt return in play: Return and Fair Catch', () => {
    (bus as any).emit('flow:choiceRequired', { choice: 'puntReturn', data: { receiving: 'player', atYard: 35, inEndZone: false } });
    const buttons = Array.from(document.querySelectorAll('.gs-modal__button')) as HTMLButtonElement[];
    expect(buttons.map(b => b.textContent)).toEqual(['Return (1)', 'Fair Catch (2)']);
    pressKey('2');
    expect(received.pop()).toEqual(['puntReturn', { action: 'fairCatch' }]);
  });

  it('safety free-kick options', () => {
    (bus as any).emit('flow:choiceRequired', { choice: 'safetyFreeKick', data: { team: 'player' } });
    const buttons = Array.from(document.querySelectorAll('.gs-modal__button')) as HTMLButtonElement[];
    expect(buttons.map(b => b.textContent)).toEqual(['Kickoff +25 (1)', 'Punt from 20 (2)']);
    buttons[1].click();
    expect(received.pop()).toEqual(['safetyFreeKick', { action: 'puntFrom20' }]);
  });

  it('idempotency: duplicate events do not create multiple dialogs', () => {
    (bus as any).emit('flow:choiceRequired', { choice: 'onsideOrNormal', data: { kicking: 'player' } });
    (bus as any).emit('flow:choiceRequired', { choice: 'onsideOrNormal', data: { kicking: 'player' } });
    const dialogs = document.querySelectorAll('.gs-modal__dialog');
    expect(dialogs.length).toBe(1);
  });
});


