import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
      include: [
        'src/rules/**/*.ts',
        'src/flow/**/*.ts',
        'src/ai/**/*.ts',
        'src/sim/**/*.ts',
        'src/data/schemas/**/*.ts',
        'src/data/loaders/**/*.ts',
        'src/deck/**/*.ts',
        'src/utils/**/*.ts',
        'src/domain/**/*.ts'
      ],
      exclude: [
        'src/ui/**',
        'src/index.ts'
      ],
    },
    setupFiles: ['tests/setup/jsdom-audio.ts'],
  },
});


