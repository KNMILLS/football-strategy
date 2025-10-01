import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMatchupTable, fetchMatchupTableByCards } from '../../src/data/loaders/matchupTables';
import { fetchPenaltyTable, fetchPenaltyTableByName } from '../../src/data/loaders/penaltyTables';
import { clearTablesCache } from '../../src/data/loaders/http';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Matchup Table Loaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTablesCache();
  });

  describe('fetchMatchupTable', () => {
    it('should successfully load and validate a matchup table', async () => {
      const mockTableData = {
        version: 'v1',
        off_card: 'WEST_COAST_QUICK_SLANT',
        def_card: 'DEF_COVER_2',
        dice: '2d20',
        entries: {
          '3': { yards: 0, clock: '20', turnover: { type: 'INT', return_yards: 15, return_to: 'LOS' } },
          '4': { yards: 2, clock: '20', turnover: { type: 'FUM', return_yards: 10, return_to: 'LOS' } },
          '5': { yards: 5, clock: '20', turnover: { type: 'INT', return_yards: 5, return_to: 'LOS' } },
          '6': { yards: 2, clock: '20' },
          '7': { yards: 4, clock: '20' },
          '8': { yards: 6, clock: '20' },
          '9': { yards: 8, clock: '20' },
          '10': { yards: 10, clock: '20' },
          '11': { yards: 12, clock: '20' },
          '12': { yards: 14, clock: '20' },
          '13': { yards: 16, clock: '20' },
          '14': { yards: 18, clock: '20' },
          '15': { yards: 20, clock: '10' },
          '16': { yards: 22, clock: '10' },
          '17': { yards: 25, clock: '10' },
          '18': { yards: 28, clock: '10' },
          '19': { yards: 32, clock: '10' },
          '20': { yards: 35, clock: '10' },
          '21': { yards: 38, clock: '10' },
          '22': { yards: 42, clock: '10' },
          '23': { yards: 45, clock: '10' },
          '24': { yards: 48, clock: '10' },
          '25': { yards: 52, clock: '10' },
          '26': { yards: 55, clock: '10' },
          '27': { yards: 58, clock: '10' },
          '28': { yards: 62, clock: '10' },
          '29': { yards: 65, clock: '10' },
          '30': { yards: 68, clock: '10' },
          '31': { yards: 72, clock: '10' },
          '32': { yards: 75, clock: '10' },
          '33': { yards: 78, clock: '10' },
          '34': { yards: 82, clock: '10' },
          '35': { yards: 85, clock: '10' },
          '36': { yards: 88, clock: '10' },
          '37': { yards: 92, clock: '10' },
          '38': { yards: 95, clock: '10' },
          '39': { yards: 99, clock: '10' },
        },
        doubles: {
          '1': { result: 'DEF_TD' },
          '20': { result: 'OFF_TD' },
          '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
        },
        meta: {
          oob_bias: false,
          field_pos_clamp: true,
          risk_profile: 'medium',
          explosive_start_sum: 25,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTableData,
      });

      const result = await fetchMatchupTable('west_coast_quick_slant__def_cover_2.json');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockTableData);
      expect(mockFetch).toHaveBeenCalledWith('data/west_coast_quick_slant__def_cover_2.json');
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchMatchupTable('nonexistent.json');

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('HTTP');
    });

    it('should handle schema validation errors', async () => {
      const invalidTableData = {
        version: 'v1',
        off_card: 'WEST_COAST_QUICK_SLANT',
        def_card: 'DEF_COVER_2',
        dice: '2d20',
        entries: {
          // Missing required 3-5 entries
          '6': { yards: 2, clock: '20' },
        },
        doubles: {
          '1': { result: 'DEF_TD' },
          '20': { result: 'OFF_TD' },
          '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
        },
        meta: {
          oob_bias: false,
          field_pos_clamp: true,
          risk_profile: 'medium',
          explosive_start_sum: 25,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidTableData,
      });

      const result = await fetchMatchupTable('invalid.json');

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SCHEMA');
    });
  });

  describe('fetchMatchupTableByCards', () => {
    it('should format card names correctly', async () => {
      const mockTableData = {
        version: 'v1',
        off_card: 'AIR_RAID_DEEP_SHOT',
        def_card: 'DEF_INSIDE_BLITZ',
        dice: '2d20',
        entries: {
          '3': { yards: 0, clock: '20', turnover: { type: 'INT', return_yards: 15, return_to: 'LOS' } },
          '4': { yards: 2, clock: '20', turnover: { type: 'FUM', return_yards: 10, return_to: 'LOS' } },
          '5': { yards: 5, clock: '20', turnover: { type: 'INT', return_yards: 5, return_to: 'LOS' } },
          '6': { yards: 2, clock: '20' },
          '7': { yards: 4, clock: '20' },
          '8': { yards: 6, clock: '20' },
          '9': { yards: 8, clock: '20' },
          '10': { yards: 10, clock: '20' },
          '11': { yards: 12, clock: '20' },
          '12': { yards: 14, clock: '20' },
          '13': { yards: 16, clock: '20' },
          '14': { yards: 18, clock: '20' },
          '15': { yards: 20, clock: '10' },
          '16': { yards: 22, clock: '10' },
          '17': { yards: 25, clock: '10' },
          '18': { yards: 28, clock: '10' },
          '19': { yards: 32, clock: '10' },
          '20': { yards: 35, clock: '10' },
          '21': { yards: 38, clock: '10' },
          '22': { yards: 42, clock: '10' },
          '23': { yards: 45, clock: '10' },
          '24': { yards: 48, clock: '10' },
          '25': { yards: 52, clock: '10' },
          '26': { yards: 55, clock: '10' },
          '27': { yards: 58, clock: '10' },
          '28': { yards: 62, clock: '10' },
          '29': { yards: 65, clock: '10' },
          '30': { yards: 68, clock: '10' },
          '31': { yards: 72, clock: '10' },
          '32': { yards: 75, clock: '10' },
          '33': { yards: 78, clock: '10' },
          '34': { yards: 82, clock: '10' },
          '35': { yards: 85, clock: '10' },
          '36': { yards: 88, clock: '10' },
          '37': { yards: 92, clock: '10' },
          '38': { yards: 95, clock: '10' },
          '39': { yards: 99, clock: '10' },
        },
        doubles: {
          '1': { result: 'DEF_TD' },
          '20': { result: 'OFF_TD' },
          '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' },
        },
        meta: {
          oob_bias: false,
          field_pos_clamp: true,
          risk_profile: 'high',
          explosive_start_sum: 25,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTableData,
      });

      const result = await fetchMatchupTableByCards('Air Raid Deep Shot', 'Def Inside Blitz');

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('data/air_raid_deep_shot__def_inside_blitz.json');
    });
  });

  describe('Penalty Table Loaders', () => {
    it('should successfully load and validate a penalty table', async () => {
      const mockPenaltyData = {
        version: 'v1',
        entries: {
          '1': { side: 'offense', yards: -15, label: 'Holding' },
          '2': { side: 'offense', yards: -10, label: 'False Start' },
          '3': { side: 'defense', yards: 5, label: 'Offside' },
          '4': { side: 'offense', yards: -5, override_play_result: true, label: 'Forced Override 4' },
          '5': { side: 'defense', yards: 10, override_play_result: true, label: 'Forced Override 5' },
          '6': { side: 'offset', yards: 0, override_play_result: true, label: 'Forced Override 6' },
          '7': { side: 'offense', yards: -15, label: 'Personal Foul' },
          '8': { side: 'defense', yards: 15, label: 'Roughing' },
          '9': { side: 'offense', yards: -10, label: 'Delay of Game' },
          '10': { side: 'defense', yards: 5, label: 'Encroachment' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPenaltyData,
      });

      const result = await fetchPenaltyTable('penalties/standard.json');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockPenaltyData);
    });

    it('should handle penalty table validation errors', async () => {
      const invalidPenaltyData = {
        version: 'v1',
        entries: {
          '1': { side: 'offense', yards: -15, label: 'Holding' },
          '2': { side: 'offense', yards: -10, label: 'False Start' },
          '3': { side: 'defense', yards: 5, label: 'Offside' },
          '4': { side: 'offense', yards: -5, label: 'Missing Override' }, // Missing override_play_result
          '5': { side: 'defense', yards: 10, label: 'Missing Override' }, // Missing override_play_result
          '6': { side: 'offset', yards: 0, label: 'Missing Override' }, // Missing override_play_result
          '7': { side: 'offense', yards: -15, label: 'Personal Foul' },
          '8': { side: 'defense', yards: 15, label: 'Roughing' },
          '9': { side: 'offense', yards: -10, label: 'Delay of Game' },
          '10': { side: 'defense', yards: 5, label: 'Encroachment' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidPenaltyData,
      });

      const result = await fetchPenaltyTable('penalties/invalid.json');

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SCHEMA');
    });

    it('should format penalty table names correctly', async () => {
      const mockPenaltyData = {
        version: 'v1',
        entries: {
          '1': { side: 'offense', yards: -15, label: 'Holding' },
          '2': { side: 'offense', yards: -10, label: 'False Start' },
          '3': { side: 'defense', yards: 5, label: 'Offside' },
          '4': { side: 'offense', yards: -5, override_play_result: true, label: 'Forced Override 4' },
          '5': { side: 'defense', yards: 10, override_play_result: true, label: 'Forced Override 5' },
          '6': { side: 'offset', yards: 0, override_play_result: true, label: 'Forced Override 6' },
          '7': { side: 'offense', yards: -15, label: 'Personal Foul' },
          '8': { side: 'defense', yards: 15, label: 'Roughing' },
          '9': { side: 'offense', yards: -10, label: 'Delay of Game' },
          '10': { side: 'defense', yards: 5, label: 'Encroachment' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPenaltyData,
      });

      const result = await fetchPenaltyTableByName('Standard Penalties');

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('data/penalties/standard_penalties.json');
    });
  });
});
