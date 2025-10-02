import { describe, it, expect, beforeEach, vi } from 'vitest';
import { engineFactory, resolvePlay, getCurrentEngineInfo } from '../../src/config/EngineSelector';
import type { EngineType } from '../../src/config/FeatureFlags';
import * as FeatureFlags from '../../src/config/FeatureFlags';

// Mock the data loaders to avoid actual file I/O in tests
vi.mock('../../src/data/loaders/offenseCharts', () => ({
  fetchOffenseCharts: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      ProStyle: {
        'Run & Pass Option': {
          A: 'Gain 5',
          B: 'Gain 3',
          // ... mock chart data
        }
      }
    }
  })
}));

vi.mock('../../src/data/loaders/matchupTables', () => ({
  fetchMatchupTable: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      entries: {
        '3': { yards: 2, tags: ['run'] },
        '4': { yards: -1, tags: ['loss'] },
        // ... mock table data
      },
      meta: { field_pos_clamp: true }
    }
  })
}));

vi.mock('../../src/data/loaders/penaltyTables', () => ({
  fetchPenaltyTable: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      entries: {
        '1': { label: 'Offside', side: 'defense', yards: -5 },
        '2': { label: 'Holding', side: 'offense', yards: -10 },
        // ... mock penalty data
      }
    }
  })
}));

// Mock resolvePlayCore and resolveSnap
vi.mock('../../src/rules/ResolvePlayCore', () => ({
  resolvePlayCore: vi.fn().mockReturnValue({
    outcome: { yards: 5, category: 'gain' },
    state: { /* mock state */ },
    touchdown: false,
    safety: false,
    possessionChanged: false
  })
}));

vi.mock('../../src/rules/ResolveSnap', () => ({
  resolveSnap: vi.fn().mockReturnValue({
    diceRoll: { d1: 1, d2: 2, sum: 3, isDoubles: false },
    finalYards: 5,
    finalClockRunoff: 30,
    description: '5 yard gain',
    tags: ['run']
  })
}));

describe('EngineSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('engineFactory', () => {
    it('should initialize engines successfully', async () => {
      await expect(engineFactory.initialize()).resolves.not.toThrow();
    });

    it('should return deterministic engine by default', () => {
      const engine = engineFactory.getEngine();
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('DeterministicEngine');
    });

    it('should return dice engine when specified', () => {
      const engine = engineFactory.getEngine('dice');
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('DiceEngine');
    });

    it('should fallback to deterministic engine for unknown types', () => {
      const engine = engineFactory.getEngine('unknown' as EngineType);
      expect(engine).toBeDefined();
      expect(engine.constructor.name).toBe('DeterministicEngine');
    });
  });

  describe('resolvePlay', () => {
    it('should resolve play using current engine', async () => {
      // Force deterministic engine to avoid dependency on dice tables in this unit test
      FeatureFlags.setFeatureFlag('engine', 'deterministic' as EngineType);
      const result = await resolvePlay('test-offense-id', 'test-defense-id', {
        quarter: 1,
        clock: 900,
        down: 1,
        toGo: 10,
        ballOn: 25,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 }
      }, () => 0.5);

      expect(result).toBeDefined();
      expect(typeof result.yards).toBe('number');
      expect(typeof result.clock).toBe('string');
      // tags may be undefined on stubbed path; assert yards and clock only
      expect(['10','20','30', undefined]).toContain(result.clock);
    });

    it('should handle engine initialization errors gracefully', async () => {
      // Mock initialization failure
      const originalInitialize = engineFactory.initialize;
      engineFactory.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));

      const result = await resolvePlay('test-offense-id', 'test-defense-id', {
        quarter: 1,
        clock: 900,
        down: 1,
        toGo: 10,
        ballOn: 25,
        possession: 'player',
        awaitingPAT: false,
        gameOver: false,
        score: { player: 0, ai: 0 }
      }, () => 0.5);

      // Should still return a result (stub result)
      expect(result).toBeDefined();

      // Restore original method
      engineFactory.initialize = originalInitialize;
    });
  });

  describe('getCurrentEngineInfo', () => {
    it('should return information about current engine', () => {
      const info = getCurrentEngineInfo();
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('description');
      expect(['deterministic', 'dice']).toContain(info.type);
    });
  });
});
