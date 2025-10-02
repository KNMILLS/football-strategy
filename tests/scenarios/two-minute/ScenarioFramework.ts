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
      success: true, // Start with success, will be validated by expectations
      gameState: { ...this.config.initialState },
      events: [...this.events], // Use the instance events array
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Simulate clock edge case scenario
    this.addEvent('clock', 'Starting clock edge case scenario', result.gameState);
    result.events = [...this.events]; // Update result events

    // Check if this is a time expiration scenario
    if (result.gameState.clock <= 5) {
      this.addEvent('clock', 'Time is running out', result.gameState);
      result.events = [...this.events];

      // Simulate time expiration during play resolution
      if (result.gameState.clock <= 3) {
        result.gameState.clock = 0;

        // Check if this is a scoring play that should count
        if (result.gameState.down === 4 && result.gameState.ballOn <= 30) {
          // Field goal attempt - should count if attempted before expiration
          this.addEvent('clock', 'Field goal counts before time expires', result.gameState);
        } else if (result.gameState.ballOn <= 10) {
          // Touchdown attempt - should count if scored before expiration
          result.gameState.awaitingPAT = true;
          this.addEvent('clock', 'Touchdown counts before time expires', result.gameState);
        } else {
          // Regular play - game ends
          result.gameState.gameOver = true;
          this.addEvent('clock', 'Time expired during play', result.gameState);
        }
        result.events = [...this.events];
      }
    }

    // Check for two-minute warning scenarios
    if (result.gameState.clock === 121 && result.gameState.quarter === 2) {
      this.addEvent('clock', 'two-minute warning', result.gameState);
      result.gameState.clock = 120; // Set to exactly 2:00
      result.events = [...this.events];
    }

    // Check for quarter end scenarios
    if (result.gameState.clock <= 1 && result.gameState.quarter < 4) {
      result.gameState.quarter += 1;
      result.gameState.clock = 900; // Reset to 15:00
      this.addEvent('clock', `Quarter ${result.gameState.quarter} begins`, result.gameState);
      result.events = [...this.events];
    }


    return this.validateExpectations(result);
  }
}

export class DesperationPlayScenario extends TwoMinuteScenario {
  async execute(): Promise<ScenarioResult> {
    this.startTime = Date.now();
    const result: ScenarioResult = {
      success: true,
      gameState: { ...this.config.initialState },
      events: [],
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Simulate desperation play scenario
    this.addEvent('desperation', 'Starting desperation play scenario', result.gameState);

    // Check for Hail Mary scenarios (long field, 4th down, desperate score)
    if (result.gameState.down === 4 && result.gameState.toGo >= 35 && result.gameState.clock <= 10) {
      this.addEvent('desperation', 'Attempting Hail Mary', result.gameState);

      // Simulate various outcomes (deterministic based on seed)
      const seed = result.gameState.seed;
      const rand = ((seed * 9301 + 49297) % 233280) / 233280; // Simple LCG
      if (rand < 0.3) {
        this.addEvent('desperation', 'Hail Mary touchdown!', result.gameState);
        result.gameState.awaitingPAT = true;
      } else if (rand < 0.6) {
        this.addEvent('desperation', 'Hail Mary intercepted', result.gameState);
        result.gameState.possession = 'ai';
      } else {
        this.addEvent('desperation', 'Hail Mary incomplete', result.gameState);
      }
    }

    // Check for lateral scenarios
    if (result.gameState.down <= 3 && result.gameState.ballOn <= 50 && result.gameState.clock <= 15) {
      this.addEvent('desperation', 'Attempting lateral play', result.gameState);

      const seed = result.gameState.seed;
      const rand = ((seed * 9301 + 49297) % 233280) / 233280;
      if (rand < 0.4) {
        this.addEvent('desperation', 'Lateral successful for touchdown', result.gameState);
      } else {
        this.addEvent('desperation', 'Lateral fumbled', result.gameState);
        result.gameState.possession = 'ai';
      }
    }

    return this.validateExpectations(result);
  }
}

export class PenaltyPressureScenario extends TwoMinuteScenario {
  async execute(): Promise<ScenarioResult> {
    this.startTime = Date.now();
    const result: ScenarioResult = {
      success: true,
      gameState: { ...this.config.initialState },
      events: [],
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Simulate penalty pressure scenario
    this.addEvent('penalty', 'Starting penalty pressure scenario', result.gameState);

    // Check for penalty decision scenarios
    if (result.gameState.clock <= 60) {
      this.addEvent('penalty', 'Penalty called under time pressure', result.gameState);

      // Simulate penalty decision based on situation (deterministic)
      const seed = result.gameState.seed;
      const isDefensivePenalty = ((seed * 9301 + 49297) % 233280) / 233280 < 0.5;
      const timeCritical = result.gameState.clock <= 30;

      if (isDefensivePenalty && timeCritical) {
        // Decline penalty that gives automatic first down
        this.addEvent('penalty', 'Declining defensive penalty for strategic advantage', result.gameState);
      } else if (!isDefensivePenalty && result.gameState.clock <= 45) {
        // Accept offensive penalty that stops clock
        this.addEvent('penalty', 'Accepting penalty to stop clock', result.gameState);
      } else {
        // Make decision based on situation (deterministic)
        const rand = ((seed * 9301 + 49297) % 233280) / 233280;
        if (rand < 0.5) {
          this.addEvent('penalty', 'Accepting penalty', result.gameState);
        } else {
          this.addEvent('penalty', 'Declining penalty', result.gameState);
        }
      }
    }

    return this.validateExpectations(result);
  }
}

export class SidelineManagementScenario extends TwoMinuteScenario {
  async execute(): Promise<ScenarioResult> {
    this.startTime = Date.now();
    const result: ScenarioResult = {
      success: true,
      gameState: { ...this.config.initialState },
      events: [],
      errors: [],
      warnings: [],
      executionTime: 0
    };

    // Simulate sideline management scenario
    this.addEvent('timeout', 'Starting sideline management scenario', result.gameState);

    // Check for timeout scenarios
    if (result.gameState.clock <= 120 && result.gameState.clock >= 30) {
      this.addEvent('timeout', 'Managing timeouts strategically', result.gameState);

      // Simulate timeout decision based on situation
      const timeCritical = result.gameState.clock <= 60;
      const desperateSituation = result.gameState.score.player < result.gameState.score.ai - 3;

      if (timeCritical || desperateSituation) {
        this.addEvent('timeout', 'Using timeout to manage clock', result.gameState);
      } else {
        this.addEvent('timeout', 'Conserving timeouts for later', result.gameState);
      }
    }

    // Check for two-minute warning scenarios
    if (result.gameState.clock === 121 && result.gameState.quarter === 2) {
      this.addEvent('timeout', 'Two-minute warning stoppage', result.gameState);
    }

    // Check for challenge scenarios
    if (result.gameState.clock <= 90 && result.gameState.down >= 3) {
      this.addEvent('timeout', 'Considering replay challenge', result.gameState);

      const seed = result.gameState.seed;
      const shouldChallenge = ((seed * 9301 + 49297) % 233280) / 233280 < 0.6; // 60% chance to challenge
      if (shouldChallenge) {
        this.addEvent('timeout', 'Challenging play for review', result.gameState);
      } else {
        this.addEvent('timeout', 'Declining challenge to preserve time', result.gameState);
      }
    }

    return this.validateExpectations(result);
  }
}
