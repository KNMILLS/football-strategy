import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: { provider: 'v8' },
    setupFiles: ['tests/setup/jsdom-audio.ts'],
    coverageThresholds: {
      // approximate thresholds; can be tuned per file via overrides if needed
      lines: 0.7,
      functions: 0.7,
      branches: 0.6,
      statements: 0.7,
    },
  },
});


