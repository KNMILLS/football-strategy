import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePenaltyFromTable, resolvePenaltyFromTableSync } from '../../src/rules/PenaltyResolver';
import type { PenaltyTable } from '../../src/data/schemas/MatchupTable';

// Mock the penalty table loader
vi.mock('../../src/data/loaders/penaltyTables', () => ({
  fetchPenaltyTableByName: vi.fn(),
}));

import { fetchPenaltyTableByName } from '../../src/data/loaders/penaltyTables';

const mockFetchPenaltyTableByName = vi.mocked(fetchPenaltyTableByName);

describe('Penalty Resolver', () => {
  const mockRNG = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockPenaltyTable = (): PenaltyTable => ({
    version: '1.0.0',
    entries: {
      '1': {
        side: 'defense',
        yards: 5,
        label: 'Defensive Offsides'
      },
      '2': {
        side: 'offense',
        yards: 5,
        label: 'False Start'
      },
      '3': {
        side: 'defense',
        yards: 10,
        auto_first_down: true,
        label: 'Defensive Pass Interference'
      },
      '4': {
        side: 'offense',
        yards: 10,
        override_play_result: true,
        label: 'Offensive Holding'
      },
      '5': {
        side: 'defense',
        yards: 15,
        auto_first_down: true,
        override_play_result: true,
        label: 'Roughing the Passer'
      },
      '6': {
        side: 'offense',
        yards: 15,
        loss_of_down: true,
        override_play_result: true,
        label: 'Intentional Grounding'
      },
      '7': {
        side: 'defense',
        yards: 5,
        label: 'Defensive Holding'
      },
      '8': {
        side: 'offense',
        yards: 10,
        label: 'Offensive Pass Interference'
      },
      '9': {
        side: 'defense',
        yards: 10,
        label: 'Illegal Contact'
      },
      '10': {
        side: 'offset',
        label: 'Offsetting Penalties'
      }
    }
  });

  describe('Async Resolution', () => {
    it('should resolve penalty from table', async () => {
      const mockTable = createMockPenaltyTable();

      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: true,
        data: mockTable
      });

      // Mock RNG to return 0.3 (maps to slot 4, since Math.floor(0.3 * 10) + 1 = 4)
      mockRNG.mockReturnValue(0.3);

      const result = await resolvePenaltyFromTable('test-table', mockRNG);

      expect(mockFetchPenaltyTableByName).toHaveBeenCalledWith('test-table');
      expect(result.penalty.on).toBe('offense');
      expect(result.penalty.yards).toBe(10);
      expect(result.isForcedOverride).toBe(true);
      expect(result.tableEntry.label).toBe('Offensive Holding');
    });

    it('should handle offsetting penalties', async () => {
      const mockTable = createMockPenaltyTable();

      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: true,
        data: mockTable
      });

      // Mock RNG to return 0.9 (slot 10)
      mockRNG.mockReturnValue(0.9);

      const result = await resolvePenaltyFromTable('test-table', mockRNG);

      expect(result.penalty.yards).toBe(5); // Offsetting penalties use 5 yards
      expect(result.isForcedOverride).toBe(false); // Not a forced override slot
      expect(result.tableEntry.label).toBe('Offsetting Penalties');
    });

    it('should handle loading errors', async () => {
      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: false,
        error: 'TABLE_NOT_FOUND'
      });

      await expect(resolvePenaltyFromTable('nonexistent', mockRNG))
        .rejects
        .toThrow('Failed to load penalty table');
    });

    it('should handle missing table entries', async () => {
      const incompleteTable = {
        version: '1.0.0',
        entries: {
          '1': { side: 'defense', yards: 5, label: 'Test' }
          // Missing other entries
        }
      } as PenaltyTable;

      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: true,
        data: incompleteTable
      });

      // Mock RNG to return 0.3 (slot 4, which doesn't exist)
      mockRNG.mockReturnValue(0.3);

      await expect(resolvePenaltyFromTable('incomplete', mockRNG))
        .rejects
        .toThrow('No penalty entry found for slot');
    });
  });

  describe('Synchronous Resolution', () => {
    it('should resolve penalty from pre-loaded table', () => {
      const mockTable = createMockPenaltyTable();

      // Mock RNG to return 0.5 (slot 6)
      mockRNG.mockReturnValue(0.5);

      const result = resolvePenaltyFromTableSync(mockTable, mockRNG);

      expect(result.penalty.on).toBe('offense');
      expect(result.penalty.yards).toBe(15);
      expect(result.isForcedOverride).toBe(true);
      expect(result.tableEntry.label).toBe('Intentional Grounding');
    });

    it('should handle default yards for missing yardage', () => {
      const tableWithoutYards = {
        version: '1.0.0',
        entries: {
          '1': { side: 'defense', label: 'No Yards Specified' },
          '2': { side: 'offense', yards: 5, label: 'Has Yards' },
          '3': { side: 'defense', yards: 10, label: 'Has Yards' },
          '4': { side: 'offense', override_play_result: true, label: 'No Yards' },
          '5': { side: 'defense', override_play_result: true, label: 'No Yards' },
          '6': { side: 'offense', override_play_result: true, label: 'No Yards' },
          '7': { side: 'defense', label: 'No Yards' },
          '8': { side: 'offense', label: 'No Yards' },
          '9': { side: 'defense', label: 'No Yards' },
          '10': { side: 'offset', label: 'No Yards' }
        }
      } as PenaltyTable;

      // Mock RNG to return 0.0 (slot 1)
      mockRNG.mockReturnValue(0.0);

      const result = resolvePenaltyFromTableSync(tableWithoutYards, mockRNG);

      expect(result.penalty.yards).toBe(10); // Should default to 10
      expect(result.penalty.on).toBe('defense');
    });

    it('should correctly identify forced override slots', () => {
      const mockTable = createMockPenaltyTable();

      // Test slot 4 (forced override)
      mockRNG.mockReturnValue(0.3); // slot 4
      let result = resolvePenaltyFromTableSync(mockTable, mockRNG);
      expect(result.isForcedOverride).toBe(true);

      // Test slot 7 (not forced override)
      mockRNG.mockReturnValue(0.6); // slot 7
      result = resolvePenaltyFromTableSync(mockTable, mockRNG);
      expect(result.isForcedOverride).toBe(false);

      // Test slot 10 (not forced override)
      mockRNG.mockReturnValue(0.9); // slot 10
      result = resolvePenaltyFromTableSync(mockTable, mockRNG);
      expect(result.isForcedOverride).toBe(false);
    });

    it('should handle offsetting penalties in sync version', () => {
      const mockTable = createMockPenaltyTable();

      // Mock RNG to return 0.95 (slot 10, but also test offsetting logic)
      mockRNG.mockReturnValue(0.95);

      const result = resolvePenaltyFromTableSync(mockTable, mockRNG);

      expect(result.tableEntry.side).toBe('offset');
      expect(result.penalty.yards).toBe(5); // Offsetting penalties use 5 yards
      expect(result.isForcedOverride).toBe(false);
    });
  });

  describe('RNG Behavior', () => {
    it('should use RNG correctly for slot selection', () => {
      const mockTable = createMockPenaltyTable();

      // Test specific RNG values and their corresponding slots
      const testCases = [
        { rngValue: 0.0, expectedSlot: 1 },  // Math.floor(0.0 * 10) + 1 = 1
        { rngValue: 0.05, expectedSlot: 1 }, // Math.floor(0.05 * 10) + 1 = 1
        { rngValue: 0.1, expectedSlot: 2 },  // Math.floor(0.1 * 10) + 1 = 2
        { rngValue: 0.5, expectedSlot: 6 },  // Math.floor(0.5 * 10) + 1 = 6
        { rngValue: 0.95, expectedSlot: 10 }, // Math.floor(0.95 * 10) + 1 = 10
        { rngValue: 0.99, expectedSlot: 10 }  // Math.floor(0.99 * 10) + 1 = 10
      ];

      testCases.forEach(({ rngValue, expectedSlot }) => {
        mockRNG.mockReturnValue(rngValue);
        const result = resolvePenaltyFromTableSync(mockTable, mockRNG);
        expect(result.tableEntry).toBe(mockTable.entries[expectedSlot as keyof typeof mockTable.entries]);
      });
    });

    it('should call RNG exactly once per resolution', () => {
      const mockTable = createMockPenaltyTable();

      mockRNG.mockReturnValue(0.3); // slot 4

      resolvePenaltyFromTableSync(mockTable, mockRNG);

      expect(mockRNG).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed penalty table data', async () => {
      const malformedTable = {
        version: '1.0.0',
        entries: {
          '1': { side: 'defense', yards: 5, label: 'Test' },
          '2': { side: 'offense', yards: 5, label: 'Test' },
          '3': { side: 'defense', yards: 10, label: 'Test' },
          '4': { side: 'offense', yards: 10, override_play_result: true, label: 'Test' },
          '5': { side: 'defense', yards: 15, override_play_result: true, label: 'Test' },
          '6': { side: 'offense', yards: 15, override_play_result: true, label: 'Test' },
          '7': { side: 'defense', yards: 5, label: 'Test' },
          '8': { side: 'offense', yards: 10, label: 'Test' },
          '9': { side: 'defense', yards: 10, label: 'Test' },
          '10': { side: 'offset', label: 'Test' }
        }
      };

      // Remove a required entry to cause an error
      delete (malformedTable as any).entries['1'];

      mockFetchPenaltyTableByName.mockResolvedValue({
        ok: true,
        data: malformedTable as PenaltyTable
      });

      mockRNG.mockReturnValue(0.0); // slot 1, which doesn't exist

      await expect(resolvePenaltyFromTable('malformed', mockRNG))
        .rejects
        .toThrow('No penalty entry found for slot');
    });
  });
});
