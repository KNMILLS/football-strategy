import { describe, it, expect } from 'vitest';
import {
  ScenarioFactory,
  SidelineManagementScenario,
  type ScenarioConfig,
  type ScenarioResult
} from './ScenarioFramework';
import type { GameState } from '../../../src/domain/GameState';

/**
 * Comprehensive tests for sideline management in two-minute drill scenarios
 * Tests timeout usage, replay challenges, and strategic sideline decisions
 */

describe('Sideline Management', () => {
  describe('Timeout Usage Strategy', () => {
    it('should use timeout to preserve time for final drive', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Strategic Timeout Usage',
        description: 'Use timeout to stop clock and preserve time for game-winning drive',
        initialState: createTimeoutState({
          clock: 90, // 1:30 remaining
          down: 1,
          toGo: 10,
          ballOn: 75, // Near goal line
          score: { player: 20, ai: 27 } // Behind by 7, need TD + PAT
        }),
        expectedOutcomes: [
          {
            description: 'Should use timeout strategically to stop clock',
            validator: (result) => {
              const timeoutEvent = result.events.find(e =>
                e.description.toLowerCase().includes('timeout')
              );
              return timeoutEvent !== undefined;
            },
            errorMessage: 'Should use timeout to manage clock'
          },
          {
            description: 'Clock should be stopped after timeout',
            validator: (result) => {
              // After timeout, clock should be stopped for play clock
              return result.gameState.clock === 90;
            },
            errorMessage: 'Clock should be preserved after timeout'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should save timeouts for critical situations', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Timeout Conservation',
        description: 'Conserve timeouts for when they matter most',
        initialState: createTimeoutState({
          clock: 120, // 2:00 remaining
          down: 2,
          toGo: 8,
          ballOn: 50, // Mid-field
          score: { player: 17, ai: 21 } // Behind by 4
        }),
        expectedOutcomes: [
          {
            description: 'Should avoid using timeout unnecessarily early',
            validator: (result) => {
              const timeoutEvents = result.events.filter(e =>
                e.description.toLowerCase().includes('timeout')
              );
              // Should not use timeout in non-critical situations
              return timeoutEvents.length === 0;
            },
            errorMessage: 'Should conserve timeouts for critical moments'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should use all remaining timeouts when game is on the line', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Desperate Timeout Usage',
        description: 'Use all remaining timeouts in desperate situation',
        initialState: createTimeoutState({
          clock: 45, // 45 seconds left
          down: 4,
          toGo: 6,
          ballOn: 40, // FG range
          score: { player: 23, ai: 24 } // Behind by 1, need FG to win
        }),
        expectedOutcomes: [
          {
            description: 'Should use all available timeouts in desperate situation',
            validator: (result) => {
              const timeoutEvents = result.events.filter(e =>
                e.description.toLowerCase().includes('timeout')
              );
              // Should use multiple timeouts if available
              return timeoutEvents.length >= 2;
            },
            errorMessage: 'Should use all timeouts when game is on the line'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Replay Challenge Decisions', () => {
    it('should challenge critical play when reviewable', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Critical Challenge Decision',
        description: 'Challenge a critical play that could change game outcome',
        initialState: createChallengeState({
          clock: 80, // 1:20 remaining
          down: 3,
          toGo: 3,
          ballOn: 45, // Critical first down
          score: { player: 14, ai: 17 } // Behind by 3
        }),
        expectedOutcomes: [
          {
            description: 'Should challenge when play is reviewable and critical',
            validator: (result) => {
              const challengeEvent = result.events.find(e =>
                e.description.toLowerCase().includes('challenge') ||
                e.description.toLowerCase().includes('review')
              );
              return challengeEvent !== undefined;
            },
            errorMessage: 'Should challenge critical, reviewable play'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should decline challenge when time is too critical', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Decline Challenge Under Time Pressure',
        description: 'Decline challenge when time remaining is too limited',
        initialState: createChallengeState({
          clock: 25, // 25 seconds left
          down: 4,
          toGo: 2,
          ballOn: 35, // Moderate field position
          score: { player: 20, ai: 21 } // Behind by 1
        }),
        expectedOutcomes: [
          {
            description: 'Should decline challenge when time is critical',
            validator: (result) => {
              const noChallengeEvent = result.events.find(e =>
                e.description.toLowerCase().includes('decline') &&
                e.description.toLowerCase().includes('challenge')
              );
              return noChallengeEvent !== undefined;
            },
            errorMessage: 'Should decline challenge to preserve time'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should challenge when timeout would be wasted', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Challenge vs Timeout Decision',
        description: 'Choose challenge over timeout when appropriate',
        initialState: createChallengeState({
          clock: 60, // 1:00 remaining
          down: 2,
          toGo: 10,
          ballOn: 55, // Long field
          score: { player: 17, ai: 21 } // Behind by 4
        }),
        expectedOutcomes: [
          {
            description: 'Should choose challenge over timeout when beneficial',
            validator: (result) => {
              const challengeEvent = result.events.find(e =>
                e.description.toLowerCase().includes('challenge')
              );
              const timeoutEvent = result.events.find(e =>
                e.description.toLowerCase().includes('timeout')
              );
              // Should prefer challenge if it saves timeout
              return challengeEvent !== undefined && timeoutEvent === undefined;
            },
            errorMessage: 'Should prefer challenge over timeout when appropriate'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Two-Minute Warning Management', () => {
    it('should handle two-minute warning stoppage', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Two-Minute Warning Stoppage',
        description: 'Properly handle automatic stoppage at two-minute warning',
        initialState: createWarningState({
          clock: 121, // Just over 2:00
          quarter: 2, // Second quarter
          down: 1,
          toGo: 10,
          ballOn: 50
        }),
        expectedOutcomes: [
          {
            description: 'Should recognize two-minute warning automatically',
            validator: (result) => {
              const warningEvent = result.events.find(e =>
                e.description.toLowerCase().includes('two-minute warning') ||
                e.description.toLowerCase().includes('warning')
              );
              return warningEvent !== undefined;
            },
            errorMessage: 'Should trigger two-minute warning at 2:00'
          },
          {
            description: 'Clock should stop for two-minute warning',
            validator: (result) => result.gameState.clock === 120,
            errorMessage: 'Clock should be at exactly 2:00 after warning'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should manage timeouts around two-minute warning', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Timeout Management Around Warning',
        description: 'Strategic timeout usage around two-minute warning',
        initialState: createWarningState({
          clock: 125, // 2:05 remaining
          quarter: 2,
          down: 2,
          toGo: 15,
          ballOn: 35
        }),
        expectedOutcomes: [
          {
            description: 'Should avoid using timeout just before two-minute warning',
            validator: (result) => {
              const timeoutEvents = result.events.filter(e =>
                e.description.toLowerCase().includes('timeout')
              );
              // Should not use timeout in final seconds before warning
              return timeoutEvents.length === 0;
            },
            errorMessage: 'Should conserve timeouts around two-minute warning'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('End-of-Game Management', () => {
    it('should manage final seconds when leading', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Victory Management',
        description: 'Clock management when leading in final seconds',
        initialState: createEndGameState({
          clock: 35, // 35 seconds left
          down: 1,
          toGo: 10,
          ballOn: 25, // Victory formation territory
          score: { player: 28, ai: 21 } // Leading by 7
        }),
        expectedOutcomes: [
          {
            description: 'Should kneel down to run out clock when leading',
            validator: (result) => {
              const kneelEvent = result.events.find(e =>
                e.description.toLowerCase().includes('kneel')
              );
              return kneelEvent !== undefined;
            },
            errorMessage: 'Should kneel to preserve lead and run clock'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should attempt comeback when trailing in final seconds', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Desperate Comeback Attempt',
        description: 'Aggressive play calling when trailing in final seconds',
        initialState: createEndGameState({
          clock: 20, // 20 seconds left
          down: 4,
          toGo: 8,
          ballOn: 45, // FG range
          score: { player: 23, ai: 24 } // Behind by 1, need FG
        }),
        expectedOutcomes: [
          {
            description: 'Should attempt field goal in final seconds when trailing',
            validator: (result) => {
              const fgEvent = result.events.find(e =>
                e.description.toLowerCase().includes('field goal')
              );
              return fgEvent !== undefined;
            },
            errorMessage: 'Should attempt FG to tie/win game'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should spike ball to stop clock for final play', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Spike for Final Play',
        description: 'Spike ball to stop clock and set up final play',
        initialState: createEndGameState({
          clock: 15, // 15 seconds left
          down: 3,
          toGo: 5,
          ballOn: 30, // Reasonable field position
          score: { player: 20, ai: 21 } // Behind by 1, need TD
        }),
        expectedOutcomes: [
          {
            description: 'Should spike ball to preserve time for final play',
            validator: (result) => {
              const spikeEvent = result.events.find(e =>
                e.description.toLowerCase().includes('spike')
              );
              return spikeEvent !== undefined;
            },
            errorMessage: 'Should spike to stop clock for final play'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Injury and Substitution Management', () => {
    it('should handle injury timeout in critical situation', async () => {
      const scenario = ScenarioFactory.createSidelineManagement({
        name: 'Injury Timeout Management',
        description: 'Handle injury timeout in time-sensitive situation',
        initialState: createInjuryState({
          clock: 55, // 55 seconds left
          down: 2,
          toGo: 12,
          ballOn: 40, // Good field position
          score: { player: 17, ai: 21 } // Behind by 4
        }),
        expectedOutcomes: [
          {
            description: 'Should use injury timeout when player safety is concern',
            validator: (result) => {
              const injuryEvent = result.events.find(e =>
                e.description.toLowerCase().includes('injury') ||
                e.description.toLowerCase().includes('timeout')
              );
              return injuryEvent !== undefined;
            },
            errorMessage: 'Should handle injury timeout appropriately'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });
});

/**
 * Helper function to create timeout scenario state
 */
function createTimeoutState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 90, // 1:30 remaining
    down: 2,
    toGo: 10,
    ballOn: 50, // Mid-field
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 17, ai: 21 }, // Behind by 4
    ...overrides
  };
}

/**
 * Helper function to create challenge scenario state
 */
function createChallengeState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 80, // 1:20 remaining
    down: 3,
    toGo: 5,
    ballOn: 45, // Critical field position
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 14, ai: 17 }, // Behind by 3
    ...overrides
  };
}

/**
 * Helper function to create two-minute warning scenario state
 */
function createWarningState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 2, // Second quarter for two-minute warning
    clock: 125, // 2:05 remaining
    down: 1,
    toGo: 10,
    ballOn: 50, // Mid-field
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 14, ai: 17 }, // Behind by 3
    ...overrides
  };
}

/**
 * Helper function to create end-game scenario state
 */
function createEndGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 30, // 30 seconds left
    down: 1,
    toGo: 10,
    ballOn: 25, // Victory formation range
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 28, ai: 21 }, // Leading by 7
    ...overrides
  };
}

/**
 * Helper function to create injury scenario state
 */
function createInjuryState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 60, // 1:00 remaining
    down: 2,
    toGo: 10,
    ballOn: 40, // Good field position
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 17, ai: 21 }, // Behind by 4
    ...overrides
  };
}
