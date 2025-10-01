import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPenaltyTable, fetchPenaltyTableByName } from '../../../src/data/loaders/penaltyTables';
import { PenaltyTableSchema } from '../../../src/data/schemas/MatchupTable';

// Mock the http loader
vi.mock('../../../src/data/loaders/http', () => ({
  fetchJson: vi.fn(),
  getOrFetch: vi.fn(),
  ok: vi.fn(),
  err: vi.fn(),
}));

import { fetchJson, getOrFetch, ok, err } from '../../../src/data/loaders/http';

const mockFetchJson = vi.mocked(fetchJson);
const mockGetOrFetch = vi.mocked(getOrFetch);
const mockOk = vi.mocked(ok);
const mockErr = vi.mocked(err);

describe('Penalty Table Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mocks
    mockFetchJson.mockResolvedValue({ ok: true, data: {} });
    mockGetOrFetch.mockImplementation(async (key, fetcher) => fetcher());
    mockOk.mockImplementation((data) => ({ ok: true, data }));
    mockErr.mockImplementation((code, message) => ({ ok: false, error: { code, message } }));
  });

  describe('Schema Validation', () => {
    it('should validate a correct penalty table', () => {
      const validTable = {
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
      };

      const result = PenaltyTableSchema.safeParse(validTable);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entries['4'].override_play_result).toBe(true);
        expect(result.data.entries['5'].override_play_result).toBe(true);
        expect(result.data.entries['6'].override_play_result).toBe(true);
      }
    });

    it('should reject table missing forced override slots', () => {
      const invalidTable = {
        version: '1.0.0',
        entries: {
          '1': { side: 'defense', yards: 5, label: 'Test' },
          '2': { side: 'offense', yards: 5, label: 'Test' },
          '3': { side: 'defense', yards: 10, label: 'Test' },
          '4': { side: 'offense', yards: 10, label: 'Test' }, // Missing override_play_result: true
          '5': { side: 'defense', yards: 15, label: 'Test' },
          '6': { side: 'offense', yards: 15, label: 'Test' },
          '7': { side: 'defense', yards: 5, label: 'Test' },
          '8': { side: 'offense', yards: 10, label: 'Test' },
          '9': { side: 'defense', yards: 10, label: 'Test' },
          '10': { side: 'offset', label: 'Test' }
        }
      };

      const result = PenaltyTableSchema.safeParse(invalidTable);
      expect(result.success).toBe(false);
    });

    it('should reject table with invalid side values', () => {
      const invalidTable = {
        version: '1.0.0',
        entries: {
          '1': { side: 'invalid', yards: 5, label: 'Test' },
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

      const result = PenaltyTableSchema.safeParse(invalidTable);
      expect(result.success).toBe(false);
    });
  });

  describe('Loader Integration', () => {
    it('should load penalty table by name', async () => {
      const mockTable = {
        version: '1.0.0',
        entries: {
          '1': { side: 'defense', yards: 5, label: 'Test Penalty' },
          '2': { side: 'offense', yards: 5, label: 'Test Penalty' },
          '3': { side: 'defense', yards: 10, label: 'Test Penalty' },
          '4': { side: 'offense', yards: 10, override_play_result: true, label: 'Test Penalty' },
          '5': { side: 'defense', yards: 15, override_play_result: true, label: 'Test Penalty' },
          '6': { side: 'offense', yards: 15, override_play_result: true, label: 'Test Penalty' },
          '7': { side: 'defense', yards: 5, label: 'Test Penalty' },
          '8': { side: 'offense', yards: 10, label: 'Test Penalty' },
          '9': { side: 'defense', yards: 10, label: 'Test Penalty' },
          '10': { side: 'offset', label: 'Test Penalty' }
        }
      };

      mockGetOrFetch.mockResolvedValue({
        ok: true,
        data: mockTable
      });

      const result = await fetchPenaltyTableByName('test-penalties');
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockTable);
      expect(mockGetOrFetch).toHaveBeenCalledWith(
        'data/penalties/test_penalties.json',
        expect.any(Function)
      );
    });

    it('should handle loading errors', async () => {
      mockGetOrFetch.mockResolvedValue({
        ok: false,
        error: 'FILE_NOT_FOUND'
      });

      const result = await fetchPenaltyTableByName('nonexistent');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('FILE_NOT_FOUND');
    });

    it('should handle schema validation errors', async () => {
      const invalidTable = {
        version: '1.0.0',
        entries: {
          '1': { side: 'defense', yards: 5, label: 'Test' },
          // Missing required slots
        }
      };

      // Mock the getOrFetch to return the invalid table
      mockGetOrFetch.mockImplementation(async (key, fetcher) => {
        if (key === 'data/penalties/invalid-table.json') {
          return { ok: true, data: invalidTable };
        }
        return fetcher();
      });

      const result = await fetchPenaltyTableByName('invalid-table');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('SCHEMA');
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate penalty yardage limits', async () => {
      const tableWithExcessiveYardage = {
        version: '1.0.0',
        entries: {
          '1': { side: 'defense', yards: 60, label: 'Excessive Yardage' }, // Over 50 yard limit
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

      // Mock the getOrFetch to return the invalid table
      mockGetOrFetch.mockImplementation(async (key, fetcher) => {
        if (key === 'data/penalties/excessive-yardage.json') {
          return { ok: true, data: tableWithExcessiveYardage };
        }
        return fetcher();
      });

      const result = await fetchPenaltyTableByName('excessive-yardage');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('VALIDATION');
    });
  });
});
