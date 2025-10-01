// Flat config for ESLint v9
// Uses typescript-eslint, import plugin, and unused-imports
// Replace .eslintignore with ignores array here

// @ts-check

import globals from 'globals';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import pluginImport from 'eslint-plugin-import';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'artifacts/**',
      '*.config.*',
      'node_modules/**',
    ],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
      'import': pluginImport,
    },
    rules: {
      'no-console': 'off',
      'no-debugger': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // TypeScript
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',

      // Import ordering/basic sanity
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',
    },
  },
];


