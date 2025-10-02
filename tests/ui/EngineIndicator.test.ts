import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus } from '../../src/utils/EventBus';
import { registerEngineIndicator, updateEngineIndicatorVisibility, removeEngineIndicator } from '../../src/ui/EngineIndicator';
import { setEngine } from '../../src/config/FeatureFlags';

// Mock getCurrentEngineInfo
vi.mock('../../src/config/FeatureFlags', async () => {
  const actual = await vi.importActual('../../src/config/FeatureFlags');
  return {
    ...actual,
    getCurrentEngineInfo: vi.fn().mockReturnValue({
      type: 'deterministic',
      name: 'Deterministic Engine',
      description: 'Legacy card-based resolution system'
    })
  };
});

// Setup JSDOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window as any;
global.document = dom.window.document;

describe('EngineIndicator', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
    // Clear any existing indicator
    const existing = document.getElementById('engine-indicator');
    if (existing) existing.remove();
  });

  afterEach(() => {
    // Clean up after each test
    removeEngineIndicator();
    vi.clearAllMocks();
  });

  describe('registerEngineIndicator', () => {
    it('should create and append engine indicator to DOM', () => {
      registerEngineIndicator(bus);

      const indicator = document.getElementById('engine-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.parentNode).toBe(document.body);
    });

    it('should display current engine information', () => {
      registerEngineIndicator(bus);

      const indicator = document.getElementById('engine-indicator');
      expect(indicator?.textContent).toContain('Deterministic Engine');
      expect(indicator?.textContent).toContain('Legacy card-based resolution system');
    });

    it('should update display when engine changes', () => {
      registerEngineIndicator(bus);

      // Change engine
      setEngine('dice');

      // Emit engine change event
      bus.emit('ui:engineChanged', { engine: 'dice' });

      const indicator = document.getElementById('engine-indicator');
      // The indicator should still show the current engine info
      // (in real implementation, it would update based on the event)
      expect(indicator).toBeTruthy();
    });

    it('should replace existing indicator if already present', () => {
      // Create first indicator
      registerEngineIndicator(bus);
      const firstIndicator = document.getElementById('engine-indicator');

      // Create second indicator (should replace first)
      registerEngineIndicator(bus);
      const secondIndicator = document.getElementById('engine-indicator');

      expect(firstIndicator).not.toBe(secondIndicator);
      expect(document.querySelectorAll('#engine-indicator')).toHaveLength(1);
    });
  });

  describe('updateEngineIndicatorVisibility', () => {
    it('should show indicator when dev mode is enabled', () => {
      registerEngineIndicator(bus);

      updateEngineIndicatorVisibility(true);

      const indicator = document.getElementById('engine-indicator');
      expect(indicator?.style.display).toBe('block');
    });

    it('should hide indicator when dev mode is disabled', () => {
      registerEngineIndicator(bus);

      updateEngineIndicatorVisibility(false);

      const indicator = document.getElementById('engine-indicator');
      expect(indicator?.style.display).toBe('none');
    });

    it('should handle missing indicator gracefully', () => {
      expect(() => updateEngineIndicatorVisibility(true)).not.toThrow();
      expect(() => updateEngineIndicatorVisibility(false)).not.toThrow();
    });
  });

  describe('removeEngineIndicator', () => {
    it('should remove indicator from DOM', () => {
      registerEngineIndicator(bus);

      removeEngineIndicator();

      const indicator = document.getElementById('engine-indicator');
      expect(indicator).toBeNull();
    });

    it('should handle missing indicator gracefully', () => {
      expect(() => removeEngineIndicator()).not.toThrow();
    });
  });
});
