import { getCurrentEngine, getFeatureFlags, type EngineType } from './FeatureFlags';
import type { GameState } from '../domain/GameState';
import type { RNG } from '../sim/RNG';
import { OFFENSE_DECKS, DEFENSE_DECK, type DeckName } from '../data/decks';

/**
 * Engine interface for consistent API across different resolution engines
 */
export interface Engine {
  initialize(): Promise<void>;
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
 * Deterministic engine (legacy system using card charts)
 */
class DeterministicEngine implements Engine {
  private offenseCharts: any = null;

  async initialize(): Promise<void> {
    if (this.offenseCharts) return;

    try {
      // Load offense charts for deterministic resolution
      const { fetchOffenseCharts } = await import('../data/loaders/offenseCharts');
      const chartsResult = await fetchOffenseCharts();
      if (chartsResult.ok) {
        this.offenseCharts = chartsResult.data;
      }
    } catch (error) {
      console.warn('Failed to load offense charts for deterministic engine:', error);
    }
  }

  resolvePlay(
    offCardId: string,
    defCardId: string,
    state: GameState,
    rng: RNG
  ): ResolveResult {
    // Map card IDs to play labels for deterministic resolution
    const offenseCard = this.findOffenseCard(offCardId);
    const defenseCard = this.findDefenseCard(defCardId);

    if (!offenseCard) {
      console.warn(`Unknown offense card ID: ${offCardId}`);
      return { yards: 0, clock: '30' };
    }

    if (!defenseCard) {
      console.warn(`Unknown defense card ID: ${defCardId}`);
      return { yards: 0, clock: '30' };
    }

    // Use the existing resolvePlayCore function if charts are available
    if (this.offenseCharts) {
      try {
        const { resolvePlayCore } = require('../rules/ResolvePlayCore');
        const result = resolvePlayCore({
          state,
          charts: this.offenseCharts,
          deckName: offenseCard.deck,
          playLabel: offenseCard.label,
          defenseLabel: defenseCard.label,
          rng
        });

        // Convert the result to our ResolveResult format
        return this.convertDeterministicResult(result, offenseCard.label, defenseCard.label);
      } catch (error) {
        console.warn('Failed to use resolvePlayCore, falling back to stub:', error);
      }
    }

    // Fallback stub result
    return {
      yards: 0,
      clock: '30'
    };
  }

  private convertDeterministicResult(result: any, playLabel: string, defenseLabel: string): ResolveResult {
    // Convert the existing result format to our unified ResolveResult format
    // This is a placeholder - we'd need to properly map all the fields
    return {
      yards: result.outcome?.yards || 0,
      turnover: result.outcome?.category === 'interception' || result.outcome?.category === 'fumble',
      clock: '30' as const, // TODO: Map from result.outcome properly
      tags: [playLabel, defenseLabel]
    };
  }

  private findOffenseCard(cardId: string) {
    for (const deckName of ['Pro Style', 'Ball Control', 'Aerial Style'] as DeckName[]) {
      const deck = OFFENSE_DECKS[deckName];
      const card = deck.find(c => c.id === cardId);
      if (card) return card;
    }
    return null;
  }

  private findDefenseCard(cardId: string) {
    return DEFENSE_DECK.find(c => c.id === cardId) || null;
  }
}

/**
 * Dice engine (new 2d20 system)
 */
class DiceEngine implements Engine {
  private matchupTable: any = null;
  private penaltyTable: any = null;

  async initialize(): Promise<void> {
    if (this.matchupTable && this.penaltyTable) return;

    try {
      // Load matchup and penalty tables for dice resolution
      const { fetchMatchupTable } = await import('../data/loaders/matchupTables');
      const { fetchPenaltyTableByName } = await import('../data/loaders/penaltyTables');

      const [matchupResult, penaltyResult] = await Promise.all([
        fetchMatchupTable('play_vs_defense_outcomes.json'),
        fetchPenaltyTableByName('penalty_table_v1') // Use default penalty table
      ]);

      if (matchupResult.ok) {
        this.matchupTable = matchupResult.data;
      }
      if (penaltyResult.ok) {
        this.penaltyTable = penaltyResult.data;
      }
    } catch (error) {
      console.warn('Failed to load dice tables for dice engine:', error);
    }
  }

  resolvePlay(
    offCardId: string,
    defCardId: string,
    state: GameState,
    rng: RNG
  ): ResolveResult {
    // Map card IDs to play labels for dice resolution
    const offenseCard = this.findOffenseCard(offCardId);
    const defenseCard = this.findDefenseCard(defCardId);

    if (!offenseCard) {
      console.warn(`Unknown offense card ID: ${offCardId}`);
      return { yards: 0, clock: '30' };
    }

    if (!defenseCard) {
      console.warn(`Unknown defense card ID: ${defCardId}`);
      return { yards: 0, clock: '30' };
    }

    // Use the dice resolution system if tables are available
    if (this.matchupTable && this.penaltyTable) {
      try {
        const { resolveSnap } = require('../rules/ResolveSnap');
        const diceResult = resolveSnap(
          offenseCard.id,
          defenseCard.id,
          this.matchupTable,
          this.penaltyTable,
          state,
          rng
        );

        // Convert the dice result to our ResolveResult format
        return this.convertDiceResult(diceResult, offenseCard.label, defenseCard.label);
      } catch (error) {
        console.warn('Failed to use resolveSnap, falling back to stub:', error);
      }
    }

    // Fallback stub result
    return {
      yards: 0,
      clock: '30'
    };
  }

  private convertDiceResult(diceResult: any, playLabel: string, defenseLabel: string): ResolveResult {
    // Convert the dice result format to our unified ResolveResult format
    const result: ResolveResult = {
      yards: diceResult.finalYards || diceResult.baseOutcome?.yards || 0,
      clock: diceResult.finalClockRunoff.toString() as '10' | '20' | '30',
      tags: [playLabel, defenseLabel, ...diceResult.tags]
    };

    // Handle turnovers
    if (diceResult.baseOutcome?.turnover) {
      result.turnover = {
        type: diceResult.baseOutcome.turnover.type,
        return_yards: diceResult.baseOutcome.turnover.return_yards,
        return_to: diceResult.baseOutcome.turnover.return_to
      };
    }

    // Handle doubles
    if (diceResult.doubles) {
      result.doubles = { kind: diceResult.doubles };
    }

    // Handle penalties
    if (diceResult.penalty) {
      result.penalty = {
        side: diceResult.penalty.penaltyInfo.side as 'offense' | 'defense' | 'offset',
        yards: diceResult.penalty.penaltyInfo.yards,
        label: diceResult.penalty.penaltyInfo.label,
        override_play_result: diceResult.penalty.overridesPlayResult
      };

      if (diceResult.canAcceptDecline) {
        result.options = { can_accept_decline: true };
      }
    }

    return result;
  }

  private findOffenseCard(cardId: string) {
    for (const deckName of ['Pro Style', 'Ball Control', 'Aerial Style'] as DeckName[]) {
      const deck = OFFENSE_DECKS[deckName];
      const card = deck.find(c => c.id === cardId);
      if (card) return card;
    }
    return null;
  }

  private findDefenseCard(cardId: string) {
    return DEFENSE_DECK.find(c => c.id === cardId) || null;
  }
}

/**
 * Engine factory and selector
 */
class EngineFactory {
  private engines: Map<EngineType, Engine> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.engines.set('deterministic', new DeterministicEngine());
    this.engines.set('dice', new DiceEngine());
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize all engines asynchronously
      const engines = [this.engines.get('deterministic'), this.engines.get('dice')];
      await Promise.all(engines.map(engine => engine?.initialize()));
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize engines:', error);
    }
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

  async resolvePlay(
    offCardId: string,
    defCardId: string,
    state: GameState,
    rng: RNG
  ): Promise<ResolveResult> {
    // Ensure engines are initialized
    if (!this.initialized) {
      await this.initialize();
    }

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
export async function resolvePlay(
  offCardId: string,
  defCardId: string,
  state: GameState,
  rng: RNG
): Promise<ResolveResult> {
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
