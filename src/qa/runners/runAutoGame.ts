import type { EventBus } from '../../utils/EventBus';
import { sleepFrame } from '../util/dom';

export async function runAutoGame(bus: EventBus, p: { seed?: number; playerPAT?: 'auto'|'kick'|'two' } | any): Promise<void> {
  try {
    const seed = (typeof p?.seed === 'number' && p.seed > 0) ? p.seed : Math.floor(Math.random() * 1e9);
    bus.emit('qa:startTestGame', { seed } as any);
    await sleepFrame();
  } catch (e) {
    bus.emit('log', { message: `DEV: Error in runAutoGame: ${(e as any)?.message || e}` });
  }
}


