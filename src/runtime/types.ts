import type { OffenseCharts } from '../data/schemas/OffenseCharts';
import type { PlaceKickTable } from '../data/schemas/PlaceKicking';
import type { TimeKeeping } from '../data/schemas/Timekeeping';
import type { LongGainTable } from '../data/loaders/tables';
import type { EventBus } from '../utils/EventBus';

export type TablesState = {
  offenseCharts: OffenseCharts | null;
  placeKicking: PlaceKickTable | null;
  timeKeeping: TimeKeeping | null;
  longGain: LongGainTable | null;
};

export interface GameRuntime {
  bus: EventBus;
  rules: {
    Kickoff: typeof import('../rules/special/Kickoff');
    Punt: typeof import('../rules/special/Punt');
    PlaceKicking: typeof import('../rules/special/PlaceKicking');
    ResultParsing: typeof import('../rules/ResultParsing');
    Timekeeping: typeof import('../rules/Timekeeping');
    Charts: typeof import('../rules/Charts');
    LongGain: typeof import('../rules/LongGain');
  };
  ai: {
    PATDecision: typeof import('../ai/PATDecision');
    CoachProfiles: typeof import('../ai/CoachProfiles');
  };
  tables: TablesState;
  start(options?: { theme?: 'arcade'|'minimalist'|'retro'|'board'|'vintage'|'modern' }): Promise<void>;
  dispose(): void;
  setTheme(theme: TablesState extends never ? never : string): void;
  runtime: {
    resolvePlayAdapter: (params: {
      state: import('../domain/GameState').GameState;
      charts: import('../data/schemas/OffenseCharts').OffenseCharts;
      deckName: string;
      playLabel: string;
      defenseLabel: string;
      rng: import('../sim/RNG').RNG;
      ui?: { inTwoMinute?: boolean };
    }) => { nextState: any; outcome: any; events: Array<{ type: string; data?: any }> };
    createFlow?: (seed?: number) => any;
  };
}

declare global {
  interface Window { GS?: GameRuntime }
}


