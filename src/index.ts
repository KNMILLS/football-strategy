// Bootstrap: expose extracted modules for gradual integration
import * as Kickoff from './rules/special/Kickoff';
import * as Punt from './rules/special/Punt';
import * as PlaceKicking from './rules/special/PlaceKicking';
import * as ResultParsing from './rules/ResultParsing';
import * as Timekeeping from './rules/Timekeeping';
import * as Charts from './rules/Charts';
import * as RNG from './sim/RNG';
import * as PATDecision from './ai/PATDecision';
import * as CoachProfiles from './ai/CoachProfiles';

export function boot(): void {
  // Placeholder bootstrap for future DOM wiring
}

declare global {
  interface Window { GS?: any }
}

if (typeof window !== 'undefined') {
  (window as any).GS = {
    rules: { Kickoff, Punt, PlaceKicking, ResultParsing, Timekeeping, Charts, LongGain: (await import('./rules/LongGain')) },
    ai: { PATDecision, CoachProfiles },
    sim: { RNG },
  };
}


