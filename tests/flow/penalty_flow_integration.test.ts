import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePenaltyFromTable } from '../../src/rules/PenaltyResolver';
import { administerPenalty } from '../../src/rules/PenaltyAdmin';
import type { GameState } from '../../src/domain/GameState';
import type { Outcome } from '../../src/rules/ResultParsing';
import type { PenaltyInfo } from '../../src/rules/Penalties';

// Mock the penalty table loader
vi.mock('../../src/data/loaders/penaltyTables', () => ({
  fetchPenaltyTableByName: vi.fn(),
}));

import { fetchPenaltyTableByName } from '../../src/data/loaders/penaltyTables';

const mockFetchPenaltyTableByName = vi.mocked(fetchPenaltyTableByName);

describe('Penalty Flow Integration', () => {
  const mockRNG = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockPenaltyTable = () => ({
    version: '1.0.0',
    entries: {
      '1': { side: 'defense', yards: 5, label: 'Defensive Offsides' },
      '2': { side: 'offense', yards: 5, label: 'False Start' },
      '3': { side: 'defense', yards: 10, auto_first_down: true, label: 'Defensive Pass Interference' },
      '4': { side: 'offense', yards: 10, override_play_result: true, label: 'Offensive Holding' },
      '5': { side: 'defense', yards: 15, auto_first_down: true, override_play_result: true, label: 'Roughing the Passer' },
      '6': { side: 'offense', yards: 15, loss_of_down: true, override_play_result: true, label: 'Intentional Grounding' },
      '7': { side: 'defense', yards: 5, auto_first_down: true, label: 'Defensive Holding' },
      '8': { side: 'offense', yards: 10, label: 'Offensive Pass Interference' },
      '9': { side: 'defense', yards: 10, label: 'Illegal Contact' },
      '10': { side: 'offset', label: 'Offsetting Penalties' }
    }
  });

  const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
    down: 2,
    toGo: 7,
    ballOn: 45,
    possession: 'player',
    quarter: 3,
    clock: 120,
    score: { player: 14, ai: 10 },
    timeouts: { player: 3, ai: 3 },
    ...overrides
  });

  const createMockOutcome = (penaltyInfo?: PenaltyInfo): Outcome => ({
    category: 'penalty',
    yards: 0,
    clock: '30',
    penalty: penaltyInfo,
    raw: penaltyInfo ? `Penalty: ${penaltyInfo.on} ${penaltyInfo.yards}` : undefined
  });

  describe('End-to-End Penalty Resolution', () => {
    it('should resolve forced override penalty correctly', async () => {
      const mockTable = createMockPenaltyTable();

      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: true,
        data: mockTable
      });

      // Mock RNG to hit slot 4 (forced override: Offensive Holding)
      mockRNG.mockReturnValue(0.3);

      // Step 1: Resolve penalty from table
      const resolution = await resolvePenaltyFromTable('test-table', mockRNG);

      expect(resolution.penalty.on).toBe('offense');
      expect(resolution.penalty.yards).toBe(10);
      expect(resolution.isForcedOverride).toBe(true);
      expect(resolution.tableEntry.label).toBe('Offensive Holding');

      // Step 2: Create game states for penalty administration
      const prePlayState = createMockGameState({ ballOn: 45 });
      const postPlayState = createMockGameState({ ballOn: 55, down: 3, toGo: 5 });
      const outcome = createMockOutcome(resolution.penalty);

      // Step 3: Administer the penalty
      const adminResult = administerPenalty({
        prePlayState,
        postPlayState,
        offenseGainedYards: 10,
        outcome,
        inTwoMinute: false,
        wasFirstDownOnPlay: false
      });

      // Step 4: Verify penalty administration
      expect(adminResult.accepted.ballOn).toBe(35); // 45 - 10 yards (offensive penalty)
      expect(adminResult.accepted.down).toBe(2); // Down repeats for offensive penalty
      expect(adminResult.accepted.toGo).toBe(10); // Distance recalculated from new spot (100 - 35 = 65, min(10, 65) = 10)
      expect(adminResult.declined.ballOn).toBe(55); // Post-play state preserved
    });

    it('should resolve regular penalty with accept/decline choice', async () => {
      const mockTable = createMockPenaltyTable();

      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: true,
        data: mockTable
      });

      // Mock RNG to hit slot 7 (Defensive Holding - not forced override)
      mockRNG.mockReturnValue(0.6);

      // Step 1: Resolve penalty from table
      const resolution = await resolvePenaltyFromTable('test-table', mockRNG);

      expect(resolution.penalty.on).toBe('defense');
      expect(resolution.penalty.yards).toBe(5);
      expect(resolution.isForcedOverride).toBe(false);
      expect(resolution.tableEntry.label).toBe('Defensive Holding');

      // Step 2: Create game states for penalty administration
      const prePlayState = createMockGameState({ ballOn: 45 });
      const postPlayState = createMockGameState({ ballOn: 45, down: 3, toGo: 7 });
      const outcome = createMockOutcome(resolution.penalty);

      // Step 3: Administer the penalty
      const adminResult = administerPenalty({
        prePlayState,
        postPlayState,
        offenseGainedYards: 0,
        outcome,
        inTwoMinute: false,
        wasFirstDownOnPlay: false
      });

      // Step 4: Verify penalty administration
      expect(adminResult.accepted.ballOn).toBe(50); // 45 + 5 yards (defensive penalty)
      expect(adminResult.accepted.down).toBe(1); // Automatic first down for defensive penalty
      expect(adminResult.accepted.toGo).toBe(10); // Fresh set of downs (min(10, 100 - 50) = 10)
      expect(adminResult.declined.ballOn).toBe(45); // Pre-penalty state preserved
    });
  });

  describe('Performance Integration', () => {
    it('should complete penalty resolution within performance budget', async () => {
      const mockTable = createMockPenaltyTable();

      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: true,
        data: mockTable
      });

      // Mock RNG to hit various slots
      mockRNG.mockReturnValue(0.5);

      const startTime = performance.now();

      // Step 1: Resolve penalty
      const resolution = await resolvePenaltyFromTable('test-table', mockRNG);

      // Step 2: Administer penalty
      const prePlayState = createMockGameState();
      const postPlayState = createMockGameState();
      const outcome = createMockOutcome(resolution.penalty);

      const adminResult = administerPenalty({
        prePlayState,
        postPlayState,
        offenseGainedYards: 0,
        outcome,
        inTwoMinute: false,
        wasFirstDownOnPlay: false
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 5ms as per requirements
      expect(duration).toBeLessThan(5);
      expect(resolution).toBeDefined();
      expect(adminResult).toBeDefined();
    });
  });
});