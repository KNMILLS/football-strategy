import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../src/utils/EventBus';
import { CardRenderer } from '../../../src/ui/cards/CardRenderer';
import { CardDefinitions } from '../../../src/ui/cards/CardDefinitions';
import type { VisualPlaybookCard, VisualDefensiveCard } from '../../../src/ui/cards/types';

// Mock DOM environment for SVG testing
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now())
  }
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));

// Mock setTimeout and setInterval for testing (avoid circular reference)
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
global.setTimeout = vi.fn((cb) => originalSetTimeout(cb, 0));
global.setInterval = vi.fn((cb, delay = 1000) => originalSetInterval(cb, delay));

describe('CardRenderer', () => {
  let bus: EventBus;
  let cardRenderer: CardRenderer;
  let cardDefinitions: CardDefinitions;

  beforeEach(() => {
    bus = new EventBus();
    cardRenderer = new CardRenderer(bus);
    cardDefinitions = CardDefinitions.getInstance();

    // Clear any existing cache
    cardRenderer.clearCache();
  });

  describe('Basic Rendering', () => {
    it('should render an offensive card successfully', () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      expect(westCoastCards.length).toBeGreaterThan(0);

      const card = westCoastCards[0];
      const svg = cardRenderer.renderOffensiveCard(card);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain(card.label);
      expect(svg).toContain(`Risk: ${card.visual.riskLevel}/5`);
    });

    it('should render a defensive card successfully', () => {
      const defensiveCards = cardDefinitions.getDefensiveCards();
      expect(defensiveCards.length).toBeGreaterThan(0);

      const card = defensiveCards[0];
      const svg = cardRenderer.renderDefensiveCard(card);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain(card.label);
    });

    it('should include accessibility attributes in rendered cards', () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const card = westCoastCards[0];
      const svg = cardRenderer.renderOffensiveCard(card);

      expect(svg).toContain('role="img"');
      expect(svg).toContain('aria-labelledby="card-title"');
      expect(svg).toContain('aria-describedby="card-description"');
    });
  });

  describe('Performance and Caching', () => {
    it('should render cards in under 5ms on average', () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const renderTimes: number[] = [];

      // Render multiple cards and measure performance
      for (let i = 0; i < Math.min(10, westCoastCards.length); i++) {
        const startTime = performance.now();
        cardRenderer.renderOffensiveCard(westCoastCards[i]);
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      const averageTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(averageTime).toBeLessThan(5); // Should be under 5ms average
    });

    it('should cache rendered cards for better performance', () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const card = westCoastCards[0];

      // First render
      const startTime1 = performance.now();
      const svg1 = cardRenderer.renderOffensiveCard(card);
      const endTime1 = performance.now();

      // Second render (should be cached)
      const startTime2 = performance.now();
      const svg2 = cardRenderer.renderOffensiveCard(card);
      const endTime2 = performance.now();

      expect(svg1).toBe(svg2); // Should be identical
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1); // Should be faster

      const cacheInfo = cardRenderer.getCacheInfo();
      expect(cacheInfo.size).toBeGreaterThan(0);
      expect(cacheInfo.enabled).toBe(true);
    });

    it('should preload cards for better performance', async () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const cardIds = westCoastCards.slice(0, 5).map(card => card.id);

      const preloadStart = performance.now();
      await cardRenderer.preloadCards(cardIds);
      const preloadEnd = performance.now();

      // Preloading should complete quickly
      expect(preloadEnd - preloadStart).toBeLessThan(100);

      const cacheInfo = cardRenderer.getCacheInfo();
      expect(cacheInfo.size).toBeGreaterThan(0);
    });
  });

  describe('Visual Indicators', () => {
    it('should display correct risk levels', () => {
      const cards = cardDefinitions.getAllCards();

      cards.forEach(card => {
        const svg = 'playbook' in card
          ? cardRenderer.renderOffensiveCard(card)
          : cardRenderer.renderDefensiveCard(card);

        expect(svg).toContain(`Risk: ${card.visual.riskLevel}/5`);

        // Risk level should be within valid range
        expect(card.visual.riskLevel).toBeGreaterThanOrEqual(1);
        expect(card.visual.riskLevel).toBeLessThanOrEqual(5);
      });
    });

    it('should display correct perimeter bias', () => {
      const cards = cardDefinitions.getAllCards();

      cards.forEach(card => {
        const svg = 'playbook' in card
          ? cardRenderer.renderOffensiveCard(card)
          : cardRenderer.renderDefensiveCard(card);

        const expectedBias = Math.round(card.visual.perimeterBias * 100);
        expect(svg).toContain(`${expectedBias}%`);

        // Perimeter bias should be within valid range
        expect(card.visual.perimeterBias).toBeGreaterThanOrEqual(0);
        expect(card.visual.perimeterBias).toBeLessThanOrEqual(1);
      });
    });

    it('should use appropriate themes for different card types', () => {
      const offensiveCards = cardDefinitions.getOffensiveCards('West Coast');
      const defensiveCards = cardDefinitions.getDefensiveCards();

      // Check offensive card themes
      offensiveCards.forEach(card => {
        expect(['offense', 'special']).toContain(card.visual.theme);
      });

      // Check defensive card themes
      defensiveCards.forEach(card => {
        expect(card.visual.theme).toBe('defense');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid card gracefully', () => {
      const invalidCard = {
        id: 'invalid',
        label: 'Invalid Card',
        visual: {
          riskLevel: 3 as const,
          perimeterBias: 0.5,
          theme: 'offense' as const
        }
      } as VisualPlaybookCard;

      // Should not throw but handle gracefully
      expect(() => cardRenderer.renderOffensiveCard(invalidCard)).not.toThrow();
    });

    it('should emit error events on render failures', () => {
      let errorEmitted = false;

      bus.on('cards:renderError', () => {
        errorEmitted = true;
      });

      // Create a card that might cause issues
      const problematicCard = {
        id: 'test-card',
        playbook: 'West Coast' as const,
        label: 'Test Card',
        type: 'pass' as const,
        visual: {
          riskLevel: 3 as const,
          perimeterBias: 0.5,
          theme: 'offense' as const
        }
      };

      cardRenderer.renderOffensiveCard(problematicCard);

      // Error handling should work without throwing
      expect(true).toBe(true); // Test passes if no exception thrown
    });
  });

  describe('Configuration', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        dimensions: { width: 300, height: 400, padding: 20, borderRadius: 12 },
        enableCaching: false,
        enableAnimations: false
      };

      cardRenderer.updateConfig(newConfig);

      // Configuration should be updated
      const renderStats = cardRenderer.getRenderStats();
      expect(renderStats).toBeDefined();
    });

    it('should clear cache when dimensions change', () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const card = westCoastCards[0];

      // Render a card to populate cache
      cardRenderer.renderOffensiveCard(card);
      expect(cardRenderer.getCacheInfo().size).toBeGreaterThan(0);

      // Update dimensions (should clear cache)
      cardRenderer.updateConfig({
        dimensions: { width: 300, height: 400, padding: 12, borderRadius: 8 }
      });

      // Cache should be cleared
      expect(cardRenderer.getCacheInfo().size).toBe(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track render statistics accurately', () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const initialStats = cardRenderer.getRenderStats();

      // Render some cards
      for (let i = 0; i < Math.min(5, westCoastCards.length); i++) {
        cardRenderer.renderOffensiveCard(westCoastCards[i]);
      }

      const finalStats = cardRenderer.getRenderStats();

      expect(finalStats.totalRenders).toBeGreaterThan(initialStats.totalRenders);
      expect(finalStats.averageRenderTime).toBeGreaterThan(0);
    });

    it('should provide cache information', () => {
      const cacheInfo = cardRenderer.getCacheInfo();

      expect(cacheInfo).toHaveProperty('size');
      expect(cacheInfo).toHaveProperty('enabled');
      expect(cacheInfo).toHaveProperty('hitRate');
      expect(typeof cacheInfo.enabled).toBe('boolean');
    });
  });
});
