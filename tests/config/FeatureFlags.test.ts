import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFeatureFlag,
  setFeatureFlag,
  getFeatureFlags,
  isFeatureEnabled,
  getCurrentEngine,
  setEngine,
  isNewEngineEnabled,
  resetFeatureFlags,
} from '../../src/config/FeatureFlags';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

let originalEnv: any;

describe('FeatureFlags', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Setup process.env mock
    originalEnv = process.env;
    Object.defineProperty(process, 'env', {
      value: { ...originalEnv, GRIDIRON_ENGINE: 'dice', GRIDIRON_NEW_ENGINE_V1: 'false' },
      writable: true
    });

    // Reset feature flags
    resetFeatureFlags();
  });

  afterEach(() => {
    // Restore original process.env
    Object.defineProperty(process, 'env', {
      value: originalEnv,
      writable: true
    });

    vi.restoreAllMocks();
  });

  describe('getFeatureFlag', () => {
    it('should return environment variable value when available', () => {
      // Environment variable is set in beforeEach, should return 'dice'
      const engine = getFeatureFlag('engine');
      expect(engine).toBe('dice');
    });

    it('should return localStorage value when environment variable not available', () => {
      // Clear environment variable for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;

      localStorageMock.getItem.mockReturnValue('deterministic');

      const engine = getFeatureFlag('engine');
      expect(engine).toBe('deterministic');

      // Restore environment variable
      process.env = originalEnv;
    });

    it('should return default value when neither env var nor localStorage available', () => {
      // Clear environment variable and localStorage for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;
      localStorageMock.getItem.mockReturnValue(null);

      const engine = getFeatureFlag('engine');
      expect(engine).toBe('deterministic'); // default value

      // Restore environment variable
      process.env = originalEnv;
    });

    it('should handle boolean flags correctly', () => {
      // Clear environment variable for boolean flag test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_NEW_ENGINE_V1;
      localStorageMock.getItem.mockReturnValue('true');

      const enabled = getFeatureFlag('NEW_ENGINE_V1');
      expect(typeof enabled).toBe('boolean');
      expect(enabled).toBe(true);

      // Restore environment variable
      process.env = originalEnv;
    });

    it('should handle engine type flags correctly', () => {
      // Clear environment variable for engine flag test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;
      localStorageMock.getItem.mockReturnValue('dice');

      const engine = getFeatureFlag('engine');
      expect(engine).toBe('dice');

      // Restore environment variable
      process.env = originalEnv;
    });
  });

  describe('setFeatureFlag', () => {
    it('should save engine type to localStorage', () => {
      setEngine('dice');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('gridiron_feature_engine', 'dice');
    });

    it('should save boolean flags to localStorage', () => {
      setFeatureFlag('NEW_ENGINE_V1', true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('gridiron_feature_NEW_ENGINE_V1', 'true');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      expect(() => setEngine('dice')).not.toThrow();
    });
  });

  describe('getFeatureFlags', () => {
    it('should return all current flag values', () => {
      const flags = getFeatureFlags();
      expect(flags).toHaveProperty('engine');
      expect(flags).toHaveProperty('NEW_ENGINE_V1');
      expect(typeof flags.engine).toBe('string');
      expect(typeof flags.NEW_ENGINE_V1).toBe('boolean');
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled boolean flags', () => {
      // Clear environment variable for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_NEW_ENGINE_V1;

      setFeatureFlag('NEW_ENGINE_V1', true);
      expect(isFeatureEnabled('NEW_ENGINE_V1')).toBe(true);

      // Restore environment variable
      process.env = originalEnv;
    });

    it('should return false for disabled boolean flags', () => {
      // Clear environment variable for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_NEW_ENGINE_V1;

      setFeatureFlag('NEW_ENGINE_V1', false);
      expect(isFeatureEnabled('NEW_ENGINE_V1')).toBe(false);

      // Restore environment variable
      process.env = originalEnv;
    });

    it('should return false for non-boolean flags', () => {
      expect(isFeatureEnabled('engine')).toBe(false);
    });
  });

  describe('getCurrentEngine', () => {
    it('should return current engine type', () => {
      const engine = getCurrentEngine();
      expect(['deterministic', 'dice']).toContain(engine);
    });

    it('should return engine from localStorage when env var not set', () => {
      // Clear environment variable for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;
      localStorageMock.getItem.mockReturnValue('dice');

      const engine = getCurrentEngine();
      expect(engine).toBe('dice');

      // Restore environment variable
      process.env = originalEnv;
    });
  });

  describe('setEngine', () => {
    it('should set engine type', () => {
      // Clear environment variable for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;

      setEngine('deterministic');
      expect(getCurrentEngine()).toBe('deterministic');

      // Restore environment variable
      process.env = originalEnv;
    });

    it('should accept valid engine types only', () => {
      // Clear environment variable for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;

      setEngine('dice' as EngineType);
      expect(getCurrentEngine()).toBe('dice');

      // Restore environment variable
      process.env = originalEnv;
    });
  });

  describe('isNewEngineEnabled', () => {
    it('should return true when NEW_ENGINE_V1 is true and engine is dice', () => {
      // Clear environment variables for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;
      delete (process.env as any).GRIDIRON_NEW_ENGINE_V1;

      setFeatureFlag('NEW_ENGINE_V1', true);
      setEngine('dice');
      expect(isNewEngineEnabled()).toBe(true);

      // Restore environment variables
      process.env = originalEnv;
    });

    it('should return false when NEW_ENGINE_V1 is false', () => {
      // Clear environment variables for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;
      delete (process.env as any).GRIDIRON_NEW_ENGINE_V1;

      setFeatureFlag('NEW_ENGINE_V1', false);
      setEngine('dice');
      expect(isNewEngineEnabled()).toBe(false);

      // Restore environment variables
      process.env = originalEnv;
    });

    it('should return false when engine is not dice', () => {
      // Clear environment variables for this test
      const originalEnv = process.env;
      delete (process.env as any).GRIDIRON_ENGINE;
      delete (process.env as any).GRIDIRON_NEW_ENGINE_V1;

      setFeatureFlag('NEW_ENGINE_V1', true);
      setEngine('deterministic');
      expect(isNewEngineEnabled()).toBe(false);

      // Restore environment variables
      process.env = originalEnv;
    });
  });

  describe('resetFeatureFlags', () => {
    it('should remove all feature flags from localStorage', () => {
      resetFeatureFlags();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gridiron_feature_engine');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gridiron_feature_NEW_ENGINE_V1');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      expect(() => resetFeatureFlags()).not.toThrow();
    });
  });
});
