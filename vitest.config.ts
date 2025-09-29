import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reporter: ['text', 'html'],
      thresholds: {
        lines: 0.7,
        functions: 0.7,
        branches: 0.6,
        statements: 0.7,
        overrides: {
          'src/rules/**': {
            lines: 0.9,
            functions: 0.9,
            branches: 0.85,
            statements: 0.9,
          },
        },
      },
    },
    setupFiles: ['tests/setup/jsdom-audio.ts'],
  },
});


