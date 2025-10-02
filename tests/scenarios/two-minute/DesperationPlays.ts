import { describe, it, expect } from 'vitest';
import {
  ScenarioFactory,
  DesperationPlayScenario,
  type ScenarioConfig,
  type ScenarioResult
} from './ScenarioFramework';
import type { GameState } from '../../../src/domain/GameState';

/**
 * Comprehensive tests for desperation plays in two-minute drill scenarios
 * Tests Hail Mary attempts, lateral plays, and other last-second heroics
 */

describe('Desperation Plays', () => {
  describe('Hail Mary Attempts', () => {
    it('should handle successful Hail Mary touchdown', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Successful Hail Mary TD',
        description: 'Hail Mary pass results in game-winning touchdown',
        initialState: createHailMaryState({
          clock: 5, // 5 seconds left
          down: 4,
          toGo: 50,
          ballOn: 50, // midfield
          score: { player: 20, ai: 27 } // Behind by 7, need TD + PAT to win
        }),
        expectedOutcomes: [
          {
            description: 'Hail Mary should result in touchdown catch',
            validator: (result) => {
              // Check for touchdown event in scenario log
              const touchdownEvent = result.events.find(e =>
                e.description.toLowerCase().includes('touchdown')
              );
              return touchdownEvent !== undefined;
            },
            errorMessage: 'Hail Mary should result in touchdown'
          },
          {
            description: 'Game should continue for PAT attempt',
            validator: (result) => result.gameState.awaitingPAT === true,
            errorMessage: 'Game should continue for PAT after Hail Mary TD'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle incomplete Hail Mary with time expiration', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Incomplete Hail Mary',
        description: 'Hail Mary falls incomplete, time expires',
        initialState: createHailMaryState({
          clock: 3, // 3 seconds left
          down: 4,
          toGo: 45,
          ballOn: 55, // Long Hail Mary attempt
          score: { player: 17, ai: 21 } // Behind by 4, need TD to tie
        }),
        expectedOutcomes: [
          {
            description: 'Hail Mary should fall incomplete',
            validator: (result) => {
              const incompleteEvent = result.events.find(e =>
                e.description.toLowerCase().includes('incomplete')
              );
              return incompleteEvent !== undefined;
            },
            errorMessage: 'Hail Mary should be incomplete'
          },
          {
            description: 'Game should end when time expires on incomplete Hail Mary',
            validator: (result) => result.gameState.gameOver === true,
            errorMessage: 'Game should end when time expires'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle Hail Mary interception', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Intercepted Hail Mary',
        description: 'Hail Mary is intercepted by defense',
        initialState: createHailMaryState({
          clock: 4,
          down: 4,
          toGo: 40,
          ballOn: 60, // Very long Hail Mary
          score: { player: 14, ai: 17 } // Behind by 3
        }),
        expectedOutcomes: [
          {
            description: 'Hail Mary should be intercepted',
            validator: (result) => {
              const interceptionEvent = result.events.find(e =>
                e.description.toLowerCase().includes('interception')
              );
              return interceptionEvent !== undefined;
            },
            errorMessage: 'Hail Mary should result in interception'
          },
          {
            description: 'Possession should change to defense',
            validator: (result) => result.gameState.possession === 'ai',
            errorMessage: 'Possession should change after interception'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Lateral Play Attempts', () => {
    it('should handle successful lateral for touchdown', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Successful Lateral TD',
        description: 'Lateral play results in game-winning touchdown',
        initialState: createLateralState({
          clock: 8,
          down: 3,
          toGo: 15,
          ballOn: 30, // Good field position for lateral
          score: { player: 21, ai: 28 } // Behind by 7
        }),
        expectedOutcomes: [
          {
            description: 'Lateral should result in touchdown',
            validator: (result) => {
              const touchdownEvent = result.events.find(e =>
                e.description.toLowerCase().includes('touchdown')
              );
              return touchdownEvent !== undefined;
            },
            errorMessage: 'Lateral play should result in touchdown'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle fumbled lateral', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Fumbled Lateral',
        description: 'Lateral is fumbled and recovered by defense',
        initialState: createLateralState({
          clock: 6,
          down: 4,
          toGo: 8,
          ballOn: 45, // Moderate field position
          score: { player: 17, ai: 20 } // Behind by 3
        }),
        expectedOutcomes: [
          {
            description: 'Lateral should be fumbled',
            validator: (result) => {
              const fumbleEvent = result.events.find(e =>
                e.description.toLowerCase().includes('fumble')
              );
              return fumbleEvent !== undefined;
            },
            errorMessage: 'Lateral should result in fumble'
          },
          {
            description: 'Defense should recover fumble',
            validator: (result) => result.gameState.possession === 'ai',
            errorMessage: 'Defense should recover fumble'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle multiple lateral sequence', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Multiple Lateral Sequence',
        description: 'Complex lateral play with multiple players involved',
        initialState: createLateralState({
          clock: 10,
          down: 2,
          toGo: 25,
          ballOn: 25, // Good starting position
          score: { player: 19, ai: 26 } // Behind by 7
        }),
        expectedOutcomes: [
          {
            description: 'Multiple lateral sequence should be tracked',
            validator: (result) => {
              const lateralEvents = result.events.filter(e =>
                e.description.toLowerCase().includes('lateral')
              );
              return lateralEvents.length >= 2;
            },
            errorMessage: 'Multiple lateral plays should be tracked'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Spike and Kneel Scenarios', () => {
    it('should handle quarterback spike to stop clock', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'QB Spike to Stop Clock',
        description: 'Quarterback spikes ball to preserve time',
        initialState: createSpikeState({
          clock: 15, // 15 seconds left
          down: 1,
          toGo: 10,
          ballOn: 45, // Field goal range
          score: { player: 23, ai: 24 } // Behind by 1, need FG
        }),
        expectedOutcomes: [
          {
            description: 'Spike should stop the clock',
            validator: (result) => {
              const spikeEvent = result.events.find(e =>
                e.description.toLowerCase().includes('spike')
              );
              return spikeEvent !== undefined;
            },
            errorMessage: 'Spike should be recorded'
          },
          {
            description: 'Clock should remain stopped for next play',
            validator: (result) => {
              // Clock should still be available for next play
              return result.gameState.clock === 15;
            },
            errorMessage: 'Clock should be preserved after spike'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle kneel down to run out clock', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Victory Kneel Down',
        description: 'Quarterback kneels to run out remaining time',
        initialState: createKneelState({
          clock: 30, // 30 seconds left
          down: 1,
          toGo: 10,
          ballOn: 20, // Victory formation territory
          score: { player: 28, ai: 21 } // Leading by 7
        }),
        expectedOutcomes: [
          {
            description: 'Kneel should consume time but preserve lead',
            validator: (result) => {
              const kneelEvent = result.events.find(e =>
                e.description.toLowerCase().includes('kneel')
              );
              return kneelEvent !== undefined;
            },
            errorMessage: 'Kneel down should be recorded'
          },
          {
            description: 'Game should end when time expires during kneel',
            validator: (result) => result.gameState.gameOver === true,
            errorMessage: 'Game should end when time expires'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });

  describe('Onside Kick Recovery', () => {
    it('should handle successful onside kick recovery', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Successful Onside Kick',
        description: 'Team recovers onside kick for final possession',
        initialState: createOnsideState({
          clock: 60, // 1 minute left in game
          quarter: 4,
          score: { player: 21, ai: 24 }, // Behind by 3
          // This would be a kickoff scenario
        }),
        expectedOutcomes: [
          {
            description: 'Onside kick should be recovered by kicking team',
            validator: (result) => {
              const recoveryEvent = result.events.find(e =>
                e.description.toLowerCase().includes('recovered')
              );
              return recoveryEvent !== undefined;
            },
            errorMessage: 'Onside kick should be recovered'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });

    it('should handle failed onside kick attempt', async () => {
      const scenario = ScenarioFactory.createDesperationPlay({
        name: 'Failed Onside Kick',
        description: 'Onside kick is recovered by receiving team',
        initialState: createOnsideState({
          clock: 45,
          quarter: 4,
          score: { player: 17, ai: 21 }, // Behind by 4
        }),
        expectedOutcomes: [
          {
            description: 'Onside kick should be recovered by receiving team',
            validator: (result) => {
              const recoveryEvent = result.events.find(e =>
                e.description.toLowerCase().includes('recovered by')
              );
              return recoveryEvent !== undefined;
            },
            errorMessage: 'Onside kick should be recovered by defense'
          }
        ]
      });

      const result = await scenario.execute();
      expect(result.success).toBe(true);
    });
  });
});

/**
 * Helper function to create Hail Mary scenario state
 */
function createHailMaryState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 10,
    down: 4,
    toGo: 35,
    ballOn: 65, // Long field for Hail Mary
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 17, ai: 24 }, // Desperate situation
    ...overrides
  };
}

/**
 * Helper function to create lateral play scenario state
 */
function createLateralState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 12,
    down: 3,
    toGo: 20,
    ballOn: 35, // Good field position for laterals
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 20, ai: 27 }, // Behind by 7
    ...overrides
  };
}

/**
 * Helper function to create spike scenario state
 */
function createSpikeState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 15,
    down: 1,
    toGo: 10,
    ballOn: 45, // Field goal range
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 23, ai: 24 }, // Behind by 1
    ...overrides
  };
}

/**
 * Helper function to create kneel scenario state
 */
function createKneelState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 30,
    down: 1,
    toGo: 10,
    ballOn: 20, // Victory formation
    possession: 'player',
    awaitingPAT: false,
    gameOver: false,
    score: { player: 28, ai: 21 }, // Leading by 7
    ...overrides
  };
}

/**
 * Helper function to create onside kick scenario state
 */
function createOnsideState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 12345,
    quarter: 4,
    clock: 60,
    down: 0, // Kickoff situation
    toGo: 0,
    ballOn: 35, // Kicking from own 35
    possession: 'ai', // AI just scored, player kicking off
    awaitingPAT: false,
    gameOver: false,
    score: { player: 21, ai: 24 }, // Behind by 3
    ...overrides
  };
}
