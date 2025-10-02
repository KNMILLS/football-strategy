import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CardCatalogAccessor } from '../../../src/data/cards/CardCatalog';
import type { PlaybookName, CardType } from '../../../src/types/dice';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CardCatalogAccessor', () => {
  const mockCatalog = {
    offensive: {
      playbooks: {
        'West Coast': new Array(20).fill(null).map((_, i) => ({
          id: `wc-test-${i + 1}`,
          playbook: 'West Coast',
          label: `Test Card ${i + 1}`,
          type: 'pass' as CardType,
          description: `A test card ${i + 1}`,
          riskLevel: 'medium' as const,
          perimeterBias: 'inside' as const,
          tags: ['test']
        })),
        'Spread': new Array(20).fill(null).map((_, i) => ({
          id: `spread-test-${i + 1}`,
          playbook: 'Spread',
          label: `Spread Card ${i + 1}`,
          type: 'pass' as CardType,
          description: `A spread card ${i + 1}`,
          riskLevel: 'high' as const,
          perimeterBias: 'balanced' as const,
          tags: ['spread']
        })),
        'Air Raid': new Array(20).fill(null).map((_, i) => ({
          id: `ar-test-${i + 1}`,
          playbook: 'Air Raid',
          label: `Air Raid Card ${i + 1}`,
          type: 'pass' as CardType,
          description: `An air raid card ${i + 1}`,
          riskLevel: 'very-high' as const,
          perimeterBias: 'balanced' as const,
          tags: ['air-raid']
        })),
        'Smashmouth': new Array(20).fill(null).map((_, i) => ({
          id: `sm-test-${i + 1}`,
          playbook: 'Smashmouth',
          label: `Smashmouth Card ${i + 1}`,
          type: 'run' as CardType,
          description: `A smashmouth card ${i + 1}`,
          riskLevel: 'medium' as const,
          perimeterBias: 'inside' as const,
          tags: ['smashmouth']
        })),
        'Wide Zone': new Array(20).fill(null).map((_, i) => ({
          id: `wz-test-${i + 1}`,
          playbook: 'Wide Zone',
          label: `Wide Zone Card ${i + 1}`,
          type: 'run' as CardType,
          description: `A wide zone card ${i + 1}`,
          riskLevel: 'medium' as const,
          perimeterBias: 'outside' as const,
          tags: ['wide-zone']
        }))
      }
    },
    defensive: new Array(10).fill(null).map((_, i) => ({
      id: `def-test-${i + 1}`,
      label: 'Cover 2',
      description: 'Zone coverage',
      coverageType: 'zone' as const,
      aggressionLevel: 'conservative' as const,
      tags: ['coverage']
    }))
  };

  beforeEach(() => {
    // Clear cache before each test
    CardCatalogAccessor.clearCache();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadCatalog', () => {
    it('should load catalog successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalog
      });

      const result = await CardCatalogAccessor.loadCatalog();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCatalog);
      expect(result.loadTime).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledWith('/data/cards/playbooks.json');
    });

    it('should return cached result on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalog
      });

      // First call
      const result1 = await CardCatalogAccessor.loadCatalog();
      expect(result1.success).toBe(true);

      // Second call should use cache
      const result2 = await CardCatalogAccessor.loadCatalog();
      expect(result2.success).toBe(true);
      expect(result2.loadTime).toBe(0); // No load time for cached result
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one network call
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await CardCatalogAccessor.loadCatalog();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.loadTime).toBeGreaterThan(0);
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'structure' })
      });

      const result = await CardCatalogAccessor.loadCatalog();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid card catalog structure');
    });

    it('should handle missing offensive playbooks', async () => {
      const invalidCatalog = {
        offensive: { /* no playbooks */ },
        defensive: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidCatalog
      });

      const result = await CardCatalogAccessor.loadCatalog();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid card catalog structure');
    });

    it('should validate playbook card counts', async () => {
      const invalidCatalog = {
        offensive: {
          playbooks: {
            'West Coast': [] // Empty playbook
          }
        },
        defensive: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidCatalog
      });

      const result = await CardCatalogAccessor.loadCatalog();

      expect(result.success).toBe(false);
      expect(result.error).toContain('must have exactly 20 cards');
    });

    it('should validate defensive card count', async () => {
      const invalidCatalog = {
        offensive: {
          playbooks: {
            'West Coast': new Array(20).fill({}),
            'Spread': new Array(20).fill({}),
            'Air Raid': new Array(20).fill({}),
            'Smashmouth': new Array(20).fill({}),
            'Wide Zone': new Array(20).fill({})
          }
        },
        defensive: [] // Empty defensive deck
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidCatalog
      });

      const result = await CardCatalogAccessor.loadCatalog();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Defensive deck must have exactly 10 cards');
    });
  });

  describe('getPlaybookCards', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should return cards for specific playbook', async () => {
      const cards = await CardCatalogAccessor.getPlaybookCards('West Coast');

      expect(cards).toHaveLength(20);
      expect(cards[0].id).toBe('wc-test-1');
      expect(cards[1].id).toBe('wc-test-2');
    });

    it('should return empty array for playbook with no cards', async () => {
      // Test that getPlaybookCards returns empty array when playbook doesn't exist
      const cards = await CardCatalogAccessor.getPlaybookCards('NonExistent Playbook');

      expect(cards).toHaveLength(0);
    });

    it('should throw error if catalog fails to load', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(CardCatalogAccessor.getPlaybookCards('West Coast'))
        .rejects.toThrow('Failed to load card catalog: Network error');
    });
  });

  describe('getOffensiveCard', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should return specific card by ID', async () => {
      const card = await CardCatalogAccessor.getOffensiveCard('wc-test-1');

      expect(card).not.toBeNull();
      expect(card!.id).toBe('wc-test-1');
      expect(card!.label).toBe('Test Card 1');
    });

    it('should return null for non-existent card', async () => {
      const card = await CardCatalogAccessor.getOffensiveCard('non-existent');

      expect(card).toBeNull();
    });
  });

  describe('getDefensiveCards', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should return all defensive cards', async () => {
      const cards = await CardCatalogAccessor.getDefensiveCards();

      expect(cards).toHaveLength(10);
      expect(cards[0].id).toBe('def-test-1');
    });
  });

  describe('getDefensiveCard', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should return specific defensive card by ID', async () => {
      const card = await CardCatalogAccessor.getDefensiveCard('def-test-1');

      expect(card).not.toBeNull();
      expect(card!.id).toBe('def-test-1');
    });

    it('should return null for non-existent defensive card', async () => {
      const card = await CardCatalogAccessor.getDefensiveCard('non-existent');

      expect(card).toBeNull();
    });
  });

  describe('filterOffensiveCards', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should filter by playbook', async () => {
      const cards = await CardCatalogAccessor.filterOffensiveCards({
        playbook: 'West Coast'
      });

      expect(cards).toHaveLength(20);
      expect(cards.every(card => card.playbook === 'West Coast')).toBe(true);
    });

    it('should filter by card type', async () => {
      const cards = await CardCatalogAccessor.filterOffensiveCards({
        type: 'run'
      });

      expect(cards).toHaveLength(40); // Smashmouth (20) + Wide Zone (20) = 40 run plays
      expect(cards.every(card => card.type === 'run')).toBe(true);
    });

    it('should filter by risk level', async () => {
      const cards = await CardCatalogAccessor.filterOffensiveCards({
        riskLevel: 'medium'
      });

      expect(cards).toHaveLength(60); // West Coast (20) + Smashmouth (20) + Wide Zone (20) = 60 medium risk
      expect(cards.every(card => card.riskLevel === 'medium')).toBe(true);
    });

    it('should filter by perimeter bias', async () => {
      const cards = await CardCatalogAccessor.filterOffensiveCards({
        perimeterBias: 'outside'
      });

      expect(cards).toHaveLength(20); // Wide Zone (20) = 20 outside bias cards
      expect(cards.every(card => card.perimeterBias === 'outside')).toBe(true);
    });

    it('should filter by tags', async () => {
      const cards = await CardCatalogAccessor.filterOffensiveCards({
        tags: ['test']
      });

      expect(cards).toHaveLength(20);
      expect(cards.every(card => card.tags.includes('test'))).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const cards = await CardCatalogAccessor.filterOffensiveCards({
        type: 'run',
        riskLevel: 'medium'
      });

      expect(cards).toHaveLength(40); // Smashmouth (20) + Wide Zone (20) = 40 run + medium risk cards
      expect(cards.every(card => card.type === 'run')).toBe(true);
      expect(cards.every(card => card.riskLevel === 'medium')).toBe(true);
    });
  });

  describe('filterDefensiveCards', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should filter by coverage type', async () => {
      const cards = await CardCatalogAccessor.filterDefensiveCards({
        coverageType: 'zone'
      });

      expect(cards).toHaveLength(10);
      expect(cards.every(card => card.coverageType === 'zone')).toBe(true);
    });

    it('should filter by aggression level', async () => {
      const cards = await CardCatalogAccessor.filterDefensiveCards({
        aggressionLevel: 'conservative'
      });

      expect(cards).toHaveLength(10);
      expect(cards.every(card => card.aggressionLevel === 'conservative')).toBe(true);
    });

    it('should filter by tags', async () => {
      const cards = await CardCatalogAccessor.filterDefensiveCards({
        tags: ['coverage']
      });

      expect(cards).toHaveLength(10);
      expect(cards.every(card => card.tags.includes('coverage'))).toBe(true);
    });
  });

  describe('getAvailablePlaybooks', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should return all available playbooks', async () => {
      const playbooks = await CardCatalogAccessor.getAvailablePlaybooks();

      expect(playbooks).toEqual(['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone']);
    });
  });

  describe('getCatalogStats', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });
    });

    it('should return correct statistics', async () => {
      const stats = await CardCatalogAccessor.getCatalogStats();

      expect(stats.totalOffensiveCards).toBe(100);
      expect(stats.totalDefensiveCards).toBe(10);
      expect(stats.playbooksCount).toBe(5);
      expect(stats.cardsByPlaybook['West Coast']).toBe(20);
      expect(stats.cardsByPlaybook['Spread']).toBe(20);
      expect(stats.cardsByType.pass).toBe(60); // West Coast (20) + Spread (20) + Air Raid (20) = 60 pass plays
      expect(stats.cardsByType.run).toBe(40);  // Smashmouth (20) + Wide Zone (20) = 40 run plays
    });
  });

  describe('clearCache', () => {
    it('should clear internal cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockCatalog
      });

      // Load catalog first
      await CardCatalogAccessor.loadCatalog();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      CardCatalogAccessor.clearCache();

      // Load again - should make new network request
      await CardCatalogAccessor.loadCatalog();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
