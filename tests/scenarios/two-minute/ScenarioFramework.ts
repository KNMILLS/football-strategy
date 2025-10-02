import type { GameState, TeamSide } from '../../../src/domain/GameState';
import type { Outcome } from '../../../src/rules/ResultParsing';

/**
 * Comprehensive framework for defining and testing two-minute drill scenarios
 * Provides deterministic setup and validation for late-game situations
 */

export interface ScenarioConfig {
  name: string;
  description: string;
  initialState: GameState;
  expectedOutcomes: ScenarioExpectation[];
  timeout?: number; // milliseconds
}

export interface ScenarioExpectation {
  description: string;
  validator: (result: ScenarioResult) => boolean;
  errorMessage?: string;
}

export interface ScenarioResult {
  success: boolean;
  gameState: GameState;
  events: ScenarioEvent[];
  errors: string[];
  warnings: string[];
  executionTime: number;
}

export interface ScenarioEvent {
  type: 'play' | 'penalty' | 'timeout' | 'score' | 'turnover' | 'clock' | 'desperation';
  description: string;
  gameState: GameState;
  outcome?: Outcome;
  timestamp: number;
}

/**
 * Base class for two-minute drill scenarios
 */
export abstract class TwoMinuteScenario {
  protected config: ScenarioConfig;
  protected events: ScenarioEvent[] = [];
  protected startTime: number = 0;

  constructor(config: ScenarioConfig) {
    this.config = config;
  }

  /**
   * Execute the scenario and return results
   */
  abstract execute(): Promise<ScenarioResult>;

  /**
   * Get scenario configuration
   */
  getConfig(): ScenarioConfig {
    return this.config;
  }

  /**
   * Add an event to the scenario log
   */
  protected addEvent(type: ScenarioEvent['type'], description: string, gameState: GameState, outcome?: Outcome): void {
    this.events.push({
      type,
      description,
      gameState: { ...gameState },
      outcome,
      timestamp: Date.now() - this.startTime
    });
  }

  /**
   * Validate scenario expectations
   */
  protected validateExpectations(result: ScenarioResult): ScenarioResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const expectation of this.config.expectedOutcomes) {
      try {
        const passed = expectation.validator(result);
        if (!passed) {
          const message = expectation.errorMessage || `Expectation failed: ${expectation.description}`;
          errors.push(message);
        }
      } catch (error) {
        errors.push(`Validator error for "${expectation.description}": ${error.message}`);
      }
    }

    return {
      ...result,
      errors,
      warnings,
      success: errors.length === 0
    };
  }

  /**
   * Create initial game state with common two-minute settings
   */
  protected static createTwoMinuteState(overrides: Partial<GameState> = {}): GameState {
    return {
      seed: 12345, // Deterministic seed for testing
      quarter: 2, // Fourth quarter scenarios
      clock: 120, // Two minutes remaining
      down: 1,
      toGo: 10,
      ballOn: 50,
      possession: 'player',
      awaitingPAT: false,
      gameOver: false,
      score: { player: 0, ai: 7 }, // Behind by 7, need TD to win/tie
      ...overrides
    };
  }

  /**
   * Create critical game state (last play situations)
   */
  protected static createCriticalState(overrides: Partial<GameState> = {}): GameState {
    return {
      seed: 12345,
      quarter: 4,
      clock: 10, // 10 seconds left
      down: 4,
      toGo: 6,
      ballOn: 75, // Near opponent's territory
      possession: 'player',
      awaitingPAT: false,
      gameOver: false,
      score: { player: 20, ai: 21 }, // Behind by 1, need FG to win
      ...overrides
    };
  }
}

/**
 * Factory for creating scenario instances
 */
export class ScenarioFactory {
  static createClockEdgeCase(config: Partial<ScenarioConfig> = {}): ClockEdgeCaseScenario {
    const fullConfig: ScenarioConfig = {
      name: 'Clock Edge Case',
      description: 'Testing time expiration during play resolution',
      initialState: TwoMinuteScenario.createTwoMinuteState(),
      expectedOutcomes: [],
      timeout: 5000,
      ...config
    };
    return new ClockEdgeCaseScenario(fullConfig);
  }

  static createDesperationPlay(config: Partial<ScenarioConfig> = {}): DesperationPlayScenario {
    const fullConfig: ScenarioConfig = {
      name: 'Desperation Play',
      description: 'Testing Hail Mary and lateral attempts',
      initialState: TwoMinuteScenario.createCriticalState(),
      expectedOutcomes: [],
      timeout: 5000,
      ...config
    };
    return new DesperationPlayScenario(fullConfig);
  }

  static createPenaltyPressure(config: Partial<ScenarioConfig> = {}): PenaltyPressureScenario {
    const fullConfig: ScenarioConfig = {
      name: 'Penalty Pressure',
      description: 'Testing penalty decisions under time pressure',
      initialState: TwoMinuteScenario.createTwoMinuteState(),
      expectedOutcomes: [],
      timeout: 5000,
      ...config
    };
    return new PenaltyPressureScenario(fullConfig);
  }

  static createSidelineManagement(config: Partial<ScenarioConfig> = {}): SidelineManagementScenario {
    const fullConfig: ScenarioConfig = {
      name: 'Sideline Management',
      description: 'Testing timeout and challenge scenarios',
      initialState: TwoMinuteScenario.createTwoMinuteState(),
      expectedOutcomes: [],
      timeout: 5000,
      ...config
    };
    return new SidelineManagementScenario(fullConfig);
  }
}

/**
 * Specific scenario implementations
 */
export class ClockEdgeCaseScenario extends TwoMinuteScenario {
  async execute(): Promise<ScenarioResult> {
    this.startTime = Date.now();
    const result: ScenarioResult = {
      success: false,
      gameState: this.config.initialState,
      events: [],
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Implementation will be added in next step
    this.addEvent('clock', 'Starting clock edge case scenario', result.gameState);

    return this.validateExpectations(result);
  }
}

export class DesperationPlayScenario extends TwoMinuteScenario {
  async execute(): Promise<ScenarioResult> {
    this.startTime = Date.now();
    const result: ScenarioResult = {
      success: false,
      gameState: this.config.initialState,
      events: [],
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Implementation will be added in next step
    this.addEvent('desperation', 'Starting desperation play scenario', result.gameState);

    return this.validateExpectations(result);
  }
}

export class PenaltyPressureScenario extends TwoMinuteScenario {
  async execute(): Promise<ScenarioResult> {
    this.startTime = Date.now();
    const result: ScenarioResult = {
      success: false,
      gameState: this.config.initialState,
      events: [],
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Implementation will be added in next step
    this.addEvent('penalty', 'Starting penalty pressure scenario', result.gameState);

    return this.validateExpectations(result);
  }
}

export class SidelineManagementScenario extends TwoMinuteScenario {
  async execute(): Promise<ScenarioResult> {
    this.startTime = Date.now();
    const result: ScenarioResult = {
      success: false,
      gameState: this.config.initialState,
      events: [],
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Implementation will be added in next step
    this.addEvent('timeout', 'Starting sideline management scenario', result.gameState);

    return this.validateExpectations(result);
  }
}
