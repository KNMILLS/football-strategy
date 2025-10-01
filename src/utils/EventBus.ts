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

// Controls/UI payloads
export type ControlsUpdatePayload = {
  awaitingPAT?: boolean;
  showFG?: boolean;
  enabled?: boolean;
  hints?: {
    patKickHint?: string;
    patTwoHint?: string;
    fgHint?: string;
  };
};

export type UINewGamePayload = { deckName: string; opponentName: string };
export type UIDevModeChangedPayload = { enabled: boolean };
export type UIThemeChangedPayload = { theme: 'arcade'|'minimalist'|'retro'|'board'|'vintage'|'modern' };
export type UISfxTogglePayload = { enabled: boolean };
export type UISfxVolumePayload = { volume: number };
export type UIChoosePATPayload = { choice: 'kick'|'two' };
export type UIAttemptFieldGoalPayload = { attemptYards?: number };
export type UIPlayCardPayload = { cardId: string };
export type UIFieldOverlayCardPayload = { art: string; label: string; xPercent: number; yPercent: number; ttlMs?: number };

export type EventMap = {
  log: { message: string };
  hudUpdate: HudUpdatePayload;
  handUpdate: HandUpdatePayload;
  sfx: { type: string; payload?: any };
  vfx: { type: string; payload?: any };
  playResolved: any;
  // UI control flow
  'controls:update': ControlsUpdatePayload;
  'ui:newGame': UINewGamePayload;
  'ui:devModeChanged': UIDevModeChangedPayload;
  'ui:themeChanged': UIThemeChangedPayload;
  'ui:sfxToggle': UISfxTogglePayload;
  'ui:sfxVolume': UISfxVolumePayload;
  'ui:choosePAT': UIChoosePATPayload;
  'ui:attemptFieldGoal': UIAttemptFieldGoalPayload;
  'ui:playCard': UIPlayCardPayload;
  'field:overlayCard': UIFieldOverlayCardPayload;
  // Special Teams UI choice flow
  'flow:choiceRequired': { choice: 'puntReturn'|'safetyFreeKick'|'onsideOrNormal'|'penaltyAcceptDecline'; data: any };
  'ui:choice.kickoffType': { type: 'normal'|'onside' };
  'ui:choice.puntReturn': { action: 'return'|'fairCatch'|'downAt20' };
  'ui:choice.safetyFreeKick': { action: 'kickoff+25'|'puntFrom20' };
  // Penalty UI
  'ui:choice.penalty': { decision: 'accept'|'decline' };
  // Dice UI events
  'ui:playbookSelected': { playbook: string };
  'ui:defensiveCardToggled': { cardId: string };
  'ui:cardSelected': { cardId: string };
  'ui:diceResult': { diceResult: { d1: number; d2: number; sum: number; isDoubles: boolean }; outcome: any };
  'ui:resultDisplayShown': { result: any };
  'ui:resultDisplayHidden': {};
  'ui:penaltyOverride': { penaltyInfo: any; description: string };
  'ui:possessionChanged': { isPlayerOffense: boolean };
  'ui:gameReset': {};
  'ui:diceUIReady': { config: any };
  'ui:diceUIEvent': { event: any };
  'ui:playbookStateChanged': { state: any };
  'ui:defensiveStateChanged': { state: any };
  'ui:penaltyStateChanged': { state: any };
  'ui:resultStateChanged': { state: any };
  // QA/Dev harness
  'qa:startTestGame': {
    seed: number;
    playerDeck: string;
    aiDeck: string;
    playerCoach?: string;
    aiCoach?: string;
    startingPossession?: 'player'|'ai';
  };
  'qa:runAutoGame': { seed?: number; playerPAT?: 'auto'|'kick'|'two' };
  'qa:runBatch': { seeds: number[]; playerPAT?: 'auto'|'kick'|'two' };
  'qa:runValidatedBatch': { seeds: number[]; playerPAT?: 'auto'|'kick'|'two'; chunkSize?: number };
  'qa:copyLog': {};
  'qa:downloadDebug': {};
  'qa:debug': { text: string };
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


