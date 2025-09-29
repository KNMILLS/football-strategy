export type HudUpdatePayload = {
  quarter: number;
  clock: number;
  down: number;
  toGo: number;
  ballOn: number;
  possession: 'player' | 'ai';
  score: { player: number; ai: number };
};

export type HandCardPayload = {
  id: string;
  label: string;
  art: string;
  type: string;
};

export type HandUpdatePayload = {
  cards: HandCardPayload[];
  isPlayerOffense: boolean;
};

export type EventMap = {
  log: { message: string };
  hudUpdate: HudUpdatePayload;
  handUpdate: HandUpdatePayload;
  sfx: { type: string; payload?: any };
  vfx: { type: string; payload?: any };
  playResolved: any;
};

type Handler<T> = (payload: T) => void;

export class EventBus {
  private listeners: { [K in keyof EventMap]?: Handler<EventMap[K]>[] } = {};

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    const arr = (this.listeners[event] ||= [] as any);
    (arr as any).push(handler as any);
    return () => {
      const i = (arr as any).indexOf(handler as any);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const arr = this.listeners[event] as any;
    if (!arr) return;
    for (const h of arr) h(payload as any);
  }
}


