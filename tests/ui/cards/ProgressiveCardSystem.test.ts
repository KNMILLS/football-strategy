import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../src/utils/EventBus';
import { ProgressiveCardSystem } from '../../../src/ui/cards/ProgressiveCardSystem';
import { CardDefinitions } from '../../../src/ui/cards/CardDefinitions';

// Mock DOM APIs
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now())
  }
});

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({})
  }
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));

// Mock setTimeout and setInterval for testing (avoid circular reference)
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
global.setTimeout = vi.fn((cb) => originalSetTimeout(cb, 0));
global.setInterval = vi.fn((cb, delay = 1000) => originalSetInterval(cb, delay));

describe('ProgressiveCardSystem', () => {
  let bus: EventBus;
  let cardSystem: ProgressiveCardSystem;
  let cardDefinitions: CardDefinitions;

  beforeEach(() => {
    bus = new EventBus();
    cardSystem = new ProgressiveCardSystem(bus);
    cardDefinitions = CardDefinitions.getInstance();
  });

  describe('Feature Detection', () => {
    it('should detect SVG support', () => {
      const features = cardSystem.getFeatureSupport();
      expect(features.svg).toBe(true);
    });

    it('should detect Canvas support', () => {
      const features = cardSystem.getFeatureSupport();
      expect(features.canvas).toBe(true);
    });

    it('should detect text fallback support', () => {
      const features = cardSystem.getFeatureSupport();
      expect(features.textFallback).toBe(true);
    });

    it('should emit feature detection events', () => {
      let featuresDetected = false;

      bus.on('cards:featuresDetected', () => {
        featuresDetected = true;
      });

      // Create new system to trigger detection
      new ProgressiveCardSystem(bus);

      // Should emit features detected event
      expect(featuresDetected).toBe(true);
    });
  });

  describe('Card Rendering', () => {
    it('should render cards with progressive enhancement', async () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      expect(westCoastCards.length).toBeGreaterThan(0);

      const cardId = westCoastCards[0].id;
      const result = await cardSystem.renderCard(cardId);

      expect(result).toContain('<svg');
      expect(result).toContain(cardId);
    });

    it('should fallback gracefully when SVG is not available', async () => {
      // Mock SVG as unavailable
      Object.defineProperty(document, 'createElementNS', {
        writable: true,
        value: vi.fn(() => {
          throw new Error('SVG not supported');
        })
      });

      const cardSystemNoSVG = new ProgressiveCardSystem(bus);
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const cardId = westCoastCards[0].id;

      const result = await cardSystemNoSVG.renderCard(cardId);

      // Should fallback to text representation
      expect(result).toContain('<div');
      expect(result).toContain('SVG unavailable');
    });

    it('should handle card not found errors', async () => {
      await expect(cardSystem.renderCard('nonexistent-card')).rejects.toThrow('Card not found');
    });
  });

  describe('Preloading', () => {
    it('should preload cards successfully', async () => {
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const cardIds = westCoastCards.slice(0, 3).map(card => card.id);

      await cardSystem.preloadCards(cardIds);

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should emit preload completion events', async () => {
      let preloadComplete = false;

      bus.on('cards:preloadComplete', () => {
        preloadComplete = true;
      });

      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const cardIds = westCoastCards.slice(0, 3).map(card => card.id);

      await cardSystem.preloadCards(cardIds);

      expect(preloadComplete).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        dimensions: { width: 300, height: 400, padding: 20, borderRadius: 12 },
        enableCaching: false
      };

      cardSystem.updateConfig(newConfig);

      // Configuration should be updated
      const renderStats = cardSystem.getRenderStats();
      expect(renderStats).toBeDefined();
    });

    it('should clear cache when requested', () => {
      cardSystem.clearCache();

      const cacheInfo = cardSystem.getCacheInfo();
      expect(cacheInfo.size).toBe(0);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should emit fallback events when rendering fails', async () => {
      let fallbackEmitted = false;

      bus.on('cards:renderFallback', () => {
        fallbackEmitted = true;
      });

      // Mock a rendering failure
      const originalRender = cardSystem.getCardRenderer().renderOffensiveCard;
      cardSystem.getCardRenderer().renderOffensiveCard = vi.fn(() => {
        throw new Error('Rendering failed');
      });

      try {
        const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
        await cardSystem.renderCard(westCoastCards[0].id);
      } catch {
        // Expected to fail
      }

      // Restore original method
      cardSystem.getCardRenderer().renderOffensiveCard = originalRender;

      expect(fallbackEmitted).toBe(true);
    });

    it('should provide graceful degradation', async () => {
      // Test that system continues to work even with partial failures
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');

      for (const card of westCoastCards.slice(0, 3)) {
        const result = await cardSystem.renderCard(card.id);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render statistics', () => {
      const stats = cardSystem.getRenderStats();
      expect(stats).toHaveProperty('totalRenders');
      expect(stats).toHaveProperty('averageRenderTime');
      expect(stats).toHaveProperty('lastRenderTime');
    });

    it('should provide cache information', () => {
      const cacheInfo = cardSystem.getCacheInfo();
      expect(cacheInfo).toHaveProperty('size');
      expect(cacheInfo).toHaveProperty('enabled');
      expect(cacheInfo).toHaveProperty('hitRate');
    });
  });

  describe('Integration with EventBus', () => {
    it('should emit events for various card operations', async () => {
      const events: string[] = [];

      bus.on('cards:renderComplete', () => events.push('renderComplete'));
      bus.on('cards:featuresDetected', () => events.push('featuresDetected'));
      bus.on('cards:preloadComplete', () => events.push('preloadComplete'));

      // Trigger various operations
      const westCoastCards = cardDefinitions.getOffensiveCards('West Coast');
      const card = westCoastCards[0];

      // Render a card
      cardSystem.getCardRenderer().renderOffensiveCard(card);

      // Preload cards
      const cardIds = westCoastCards.slice(0, 2).map(c => c.id);
      await cardSystem.preloadCards(cardIds);

      // Should have emitted relevant events
      expect(events).toContain('featuresDetected');
      expect(events).toContain('renderComplete');
      expect(events).toContain('preloadComplete');
    });
  });
});
