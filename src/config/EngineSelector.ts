import { getCurrentEngine, getFeatureFlags, type EngineType } from './FeatureFlags';
import type { GameState } from '../domain/GameState';
import type { RNG } from '../sim/RNG';

/**
 * Engine interface for consistent API across different resolution engines
 */
export interface Engine {
  resolvePlay(
    offCardId: string,
    defCardId: string,
    state: GameState,
    rng: RNG
  ): ResolveResult;
}

/**
 * Result type for engine resolution
 */
export interface ResolveResult {
  yards: number;
  turnover?: boolean | { type: 'INT' | 'FUM'; return_yards?: number; return_to?: 'LOS' };
  clock?: '10' | '20' | '30';
  tags?: string[];
  doubles?: { kind: 'DEF_TD' | 'OFF_TD' | 'PENALTY' };
  penalty?: {
    side: 'offense' | 'defense' | 'offset';
    yards?: number;
    auto_first_down?: boolean;
    loss_of_down?: boolean;
    replay_down?: boolean;
    override_play_result?: boolean;
    label: string;
  };
  options?: { can_accept_decline: boolean };
}

/**
 * Deterministic engine (legacy system)
 * This is a stub for now - the actual implementation would come from ResolvePlayCore.ts
 */
class DeterministicEngine implements Engine {
  resolvePlay(
    offCardId: string,
    defCardId: string,
    state: GameState,
    rng: RNG
  ): ResolveResult {
    // TODO: Implement deterministic resolution logic
    return {
      yards: 0,
      clock: '30'
    };
  }
}

/**
 * Dice engine (new 2d20 system)
 */
class DiceEngine implements Engine {
  resolvePlay(
    offCardId: string,
    defCardId: string,
    state: GameState,
    rng: RNG
  ): ResolveResult {
    // Import here to avoid circular dependencies
    const { resolveSnap } = require('../rules/ResolveSnap');

    // TODO: Load matchup table and penalty table based on card IDs
    // For now, return a stub result
    return {
      yards: 0,
      clock: '30'
    };
  }
}

/**
 * Engine factory and selector
 */
class EngineFactory {
  private engines: Map<EngineType, Engine> = new Map();

  constructor() {
    this.engines.set('deterministic', new DeterministicEngine());
    this.engines.set('dice', new DiceEngine());
  }

  getEngine(engineType?: EngineType): Engine {
    const type = engineType || getCurrentEngine();
    const engine = this.engines.get(type);

    if (!engine) {
      console.warn(`Unknown engine type: ${type}, falling back to deterministic`);
      return this.engines.get('deterministic')!;
    }

    return engine;
  }

  getCurrentEngine(): Engine {
    return this.getEngine();
  }

  resolvePlay(
    offCardId: string,
    defCardId: string,
    state: GameState,
    rng: RNG
  ): ResolveResult {
    return this.getCurrentEngine().resolvePlay(offCardId, defCardId, state, rng);
  }
}

/**
 * Singleton engine factory instance
 */
export const engineFactory = new EngineFactory();

/**
 * Convenience function to resolve a play using the current engine
 */
export function resolvePlay(
  offCardId: string,
  defCardId: string,
  state: GameState,
  rng: RNG
): ResolveResult {
  return engineFactory.resolvePlay(offCardId, defCardId, state, rng);
}

/**
 * Get information about the current engine
 */
export function getCurrentEngineInfo(): { type: EngineType; name: string; description: string } {
  const flags = getFeatureFlags();
  const type = getCurrentEngine();

  const info = {
    deterministic: {
      name: 'Deterministic Engine',
      description: 'Legacy card-based resolution system'
    },
    dice: {
      name: 'Dice Engine',
      description: 'New 2d20 dice-based resolution system'
    }
  };

  return {
    type,
    ...info[type]
  };
}
