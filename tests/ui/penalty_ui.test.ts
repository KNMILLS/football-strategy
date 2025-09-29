import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';
import { registerPenaltyUI } from '../../src/ui/PenaltyUI';

function pressKey(key: string) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true });
  document.dispatchEvent(ev);
}

const samplePayload = {
  choice: 'penaltyAcceptDecline',
  data: {
    side: 'player',
    summary: { down: 2, toGo: 8, ballOn: 47, quarter: 2, clock: 300, possession: 'player' },
    prePlay: { down: 2, toGo: 8, ballOn: 47 },
    accepted: { down: 1, toGo: 10, ballOn: 37 },
    declined: { down: 3, toGo: 1, ballOn: 46 },
    penalty: { on: 'defense', yards: 10, firstDown: true },
    meta: { halfDistanceCapped: false, measuredFromMidfieldForLG: false, spotBasis: 'previous', untimedDownScheduled: false },
  },
} as const;

describe('PenaltyUI', () => {
  let bus: EventBus;
  let received: any[];

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    bus = new EventBus();
    received = [];
    registerPenaltyUI(bus);
    (bus as any).on('ui:choice.penalty', (p: any) => received.push(p));
  });

  it('opens dialog with correct title and summary, emits accept via click', () => {
    (bus as any).emit('flow:choiceRequired', samplePayload as any);
    const title = document.querySelector('.gs-modal h2') as HTMLElement | null;
    expect(title?.textContent).toMatch(/Penalty — Accept or Decline/);
    const bodyText = (document.querySelector('.gs-modal') as HTMLElement)?.textContent || '';
    expect(bodyText).toMatch(/Defensive penalty/);
    expect(bodyText).toMatch(/Pre-play: 2nd & 8/);
    expect(bodyText).toMatch(/Accept: 1st & 10/);
    expect(bodyText).toMatch(/Decline: 3rd & 1/);
    const buttons = Array.from(document.querySelectorAll('.gs-modal__button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(received.pop()).toEqual({ decision: 'accept' });
    expect(document.querySelector('.gs-modal__dialog')).toBeNull();
  });

  it('hotkeys 1/2 trigger accept/decline', () => {
    (bus as any).emit('flow:choiceRequired', samplePayload as any);
    pressKey('2');
    expect(received.pop()).toEqual({ decision: 'decline' });
  });

  it('AI side does not open dialog or emit', () => {
    (bus as any).emit('flow:choiceRequired', { choice: 'penaltyAcceptDecline', data: { ...samplePayload.data, side: 'ai' } });
    expect(document.querySelector('.gs-modal__dialog')).toBeNull();
    expect(received.length).toBe(0);
  });

  it('idempotency: duplicate events keep a single dialog', () => {
    (bus as any).emit('flow:choiceRequired', samplePayload as any);
    (bus as any).emit('flow:choiceRequired', samplePayload as any);
    const dialogs = document.querySelectorAll('.gs-modal__dialog');
    expect(dialogs.length).toBe(1);
  });

  it('shows flags when meta set', () => {
    (bus as any).emit('flow:choiceRequired', {
      choice: 'penaltyAcceptDecline',
      data: { ...samplePayload.data, meta: { ...samplePayload.data.meta, halfDistanceCapped: true, untimedDownScheduled: true, measuredFromMidfieldForLG: true } },
    } as any);
    const text = (document.querySelector('.gs-modal') as HTMLElement)?.textContent || '';
    expect(text).toMatch(/Half-the-distance cap applied/);
    expect(text).toMatch(/Untimed down will be played/);
    expect(text).toMatch(/Enforced from midfield due to Long Gain/);
  });
});


