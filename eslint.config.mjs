// @ts-check
/**
 * ESLint flat config (ESLint 9/10).
 * Replaces the legacy .eslintrc.js — same rule intent, flat-config format.
 */
import tseslint from '@typescript-eslint/eslint-plugin';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '**/*.js',
      '**/*.mjs',
    ],
  },
  ...tseslint.configs['flat/recommended'],
  prettierRecommended,
  {
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
