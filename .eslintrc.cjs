/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  env: { browser: true, es2022: true, node: true },
  rules: {
    'import/no-unresolved': 'off',
    'unused-imports/no-unused-imports': 'error',
  },
  ignorePatterns: ['dist', 'node_modules'],
};


