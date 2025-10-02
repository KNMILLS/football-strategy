import { describe, it, expect } from 'vitest';
import {
  ScenarioFactory,
  PenaltyPressureScenario,
  type ScenarioConfig,
  type ScenarioResult
} from './ScenarioFramework.test';
import type { GameState } from '../../../src/domain/GameState';

/**
 * Comprehensive tests for penalty decisions under time pressure
 * Tests accept/decline decisions when time is critical in two-minute drill scenarios
 */

describe('Penalty Pressure Decisions', () => {
  describe('Accept vs Decline Under Time Pressure', () => {
    it('should decline defensive penalty that gives automatic first down', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Decline Defensive Penalty for First Down',
        description: 'Decline penalty that would give offense automatic first down',
        initialState: createPenaltyState({
          clock: 45, // 45 seconds left
          down: 4,
          toGo: 2,
          ballOn: 75, // Near goal line
          score: { player: 20, ai: 21 } // Behind by 1, need TD
        }),
        expectedOutcomes: [
          {
            description: 'Should decline penalty that gives automatic first down',
            validator: (result) => {
              const declineEvent = result.events.find(e =>
                e.description.toLowerCase().includes('decline') &&
                e.description.toLowerCase().includes('penalty')
              );
              return declineEvent !== undefined;
            },
            errorMessage: 'Should decline penalty for strategic advantage'
          },
          {
            description: 'Should maintain current field position',
            validator: (result) => result.gameState.ballOn === 75,
            errorMessage: 'Field position should remain unchanged after declining'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept offensive penalty that stops clock', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Accept Clock-Stopping Penalty',
        description: 'Accept penalty that stops clock in critical situation',
        initialState: createPenaltyState({
          clock: 25, // 25 seconds left
          down: 2,
          toGo: 15,
          ballOn: 40, // Mid-field
          score: { player: 17, ai: 21 } // Behind by 4, need TD
        }),
        expectedOutcomes: [
          {
            description: 'Should accept penalty that stops the clock',
            validator: (result) => {
              const acceptEvent = result.events.find(e =>
                e.description.toLowerCase().includes('accept') &&
                e.description.toLowerCase().includes('penalty')
              );
              return acceptEvent !== undefined;
            },
            errorMessage: 'Should accept penalty for clock management'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should decline penalty when time is critical and team is ahead', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Decline Penalty When Leading',
        description: 'Decline penalty when leading and time is running out',
        initialState: createPenaltyState({
          clock: 30, // 30 seconds left
          down: 3,
          toGo: 5,
          ballOn: 45, // Victory formation range
          score: { player: 24, ai: 21 } // Leading by 3
        }),
        expectedOutcomes: [
          {
            description: 'Should decline penalty when leading with little time',
            validator: (result) => {
              const declineEvent = result.events.find(e =>
                e.description.toLowerCase().includes('decline')
              );
              return declineEvent !== undefined;
            },
            errorMessage: 'Should decline penalty to preserve time and lead'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Penalty on Scoring Plays', () => {
    it('should handle penalty on game-winning touchdown', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Penalty on Game-Winning TD',
        description: 'Penalty called on potential game-winning touchdown',
        initialState: createPenaltyState({
          clock: 10, // 10 seconds left
          down: 3,
          toGo: 2,
          ballOn: 5, // Goal line situation
          score: { player: 20, ai: 27 } // Behind by 7, need TD + PAT
        }),
        expectedOutcomes: [
          {
            description: 'Should accept penalty if it allows another play',
            validator: (result) => {
              const acceptEvent = result.events.find(e =>
                e.description.toLowerCase().includes('accept')
              );
              return acceptEvent !== undefined;
            },
            errorMessage: 'Should accept penalty to preserve chance at victory'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle penalty on game-tying field goal attempt', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Penalty on Game-Tying FG',
        description: 'Penalty called on potential game-tying field goal',
        initialState: createPenaltyState({
          clock: 5, // 5 seconds left
          down: 4,
          toGo: 3,
          ballOn: 25, // Chip shot FG range
          score: { player: 20, ai: 23 } // Behind by 3, need FG to tie
        }),
        expectedOutcomes: [
          {
            description: 'Should decline penalty if FG is still makeable',
            validator: (result) => {
              const declineEvent = result.events.find(e =>
                e.description.toLowerCase().includes('decline')
              );
              return declineEvent !== undefined;
            },
            errorMessage: 'Should decline penalty to preserve FG attempt'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Pre-Snap vs Post-Play Penalties', () => {
    it('should handle pre-snap penalty with time pressure', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Pre-Snap Penalty Under Pressure',
        description: 'Pre-snap penalty called with limited time remaining',
        initialState: createPenaltyState({
          clock: 35, // 35 seconds left
          down: 2,
          toGo: 10,
          ballOn: 50, // Mid-field
          score: { player: 17, ai: 21 } // Behind by 4
        }),
        expectedOutcomes: [
          {
            description: 'Should accept pre-snap penalty for yardage benefit',
            validator: (result) => {
              const acceptEvent = result.events.find(e =>
                e.description.toLowerCase().includes('accept') ||
                e.description.toLowerCase().includes('penalty')
              );
              return acceptEvent !== undefined;
            },
            errorMessage: 'Should handle pre-snap penalty appropriately'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle post-play penalty decision with seconds remaining', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Post-Play Penalty Decision',
        description: 'Penalty called after play completion with limited time',
        initialState: createPenaltyState({
          clock: 15, // 15 seconds left
          down: 3,
          toGo: 8,
          ballOn: 35, // Reasonable field position
          score: { player: 14, ai: 17 } // Behind by 3
        }),
        expectedOutcomes: [
          {
            description: 'Should carefully consider post-play penalty impact',
            validator: (result) => {
              // Decision depends on specific situation
              const decisionEvent = result.events.find(e =>
                e.description.toLowerCase().includes('penalty') &&
                (e.description.toLowerCase().includes('accept') ||
                 e.description.toLowerCase().includes('decline'))
              );
              return decisionEvent !== undefined;
            },
            errorMessage: 'Should make strategic penalty decision'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Timeout vs Penalty Decisions', () => {
    it('should choose timeout over accepting minor penalty', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Timeout vs Minor Penalty',
        description: 'Choose timeout over accepting minor penalty',
        initialState: createPenaltyState({
          clock: 40, // 40 seconds left
          down: 1,
          toGo: 10,
          ballOn: 60, // Long field
          score: { player: 21, ai: 24 } // Behind by 3
        }),
        expectedOutcomes: [
          {
            description: 'Should use timeout instead of accepting minor penalty',
            validator: (result) => {
              const timeoutEvent = result.events.find(e =>
                e.description.toLowerCase().includes('timeout')
              );
              return timeoutEvent !== undefined;
            },
            errorMessage: 'Should use timeout for strategic advantage'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should accept penalty if no timeouts remain', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Accept Penalty No Timeouts',
        description: 'Accept penalty when no timeouts remain',
        initialState: createPenaltyState({
          clock: 20, // 20 seconds left
          down: 2,
          toGo: 12,
          ballOn: 45, // FG range
          score: { player: 23, ai: 24 } // Behind by 1, need FG
        }),
        expectedOutcomes: [
          {
            description: 'Should accept penalty when no timeouts available',
            validator: (result) => {
              const acceptEvent = result.events.find(e =>
                e.description.toLowerCase().includes('accept')
              );
              return acceptEvent !== undefined;
            },
            errorMessage: 'Should accept penalty when timeouts are exhausted'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Penalty Scenarios', () => {
    it('should handle offsetting penalties under time pressure', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Offsetting Penalties',
        description: 'Both teams penalized, play replayed',
        initialState: createPenaltyState({
          clock: 50, // 50 seconds left
          down: 3,
          toGo: 7,
          ballOn: 55, // Mid-field
          score: { player: 14, ai: 17 } // Behind by 3
        }),
        expectedOutcomes: [
          {
            description: 'Should handle offsetting penalties correctly',
            validator: (result) => {
              const offsetEvent = result.events.find(e =>
                e.description.toLowerCase().includes('offset')
              );
              return offsetEvent !== undefined;
            },
            errorMessage: 'Should properly handle offsetting penalties'
          },
          {
            description: 'Down should be replayed',
            validator: (result) => result.gameState.down === 3,
            errorMessage: 'Down should be replayed after offsetting penalties'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle penalty followed by another penalty', async () => {
      const scenario = ScenarioFactory.createPenaltyPressure({
        name: 'Consecutive Penalties',
        description: 'Multiple penalties on same play',
        initialState: createPenaltyState({
          clock: 60, // 1 minute left
          down: 2,
          toGo: 15,
          ballOn: 40, // Good field position
          score: { player: 17, ai: 21 } // Behind by 4
        }),
        expectedOutcomes: [
          {
            description: 'Should handle multiple penalties on same play',
            validator: (result) => {
              const penaltyEvents = result.events.filter(e =>
                e.description.toLowerCase().includes('penalty')
              );
              return penaltyEvents.length >= 2;
            },
            errorMessage: 'Should track multiple penalties'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });
});

/**
 * Helper function to create penalty pressure scenario state
 */
function createPenaltyState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 60, // Two-minute drill timeframe
    down: 3,
    toGo: 10,
    ballOn: 50, // Mid-field starting point
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 17, ai: 21 }, // Behind by 4, desperate situation
    ...overrides
  };
}
