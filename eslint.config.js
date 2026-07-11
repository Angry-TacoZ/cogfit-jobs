import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'functions/node_modules/**',
      '.firebase/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'vite.config.js', 'svelte.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024
      }
    }
  },
  {
    files: ['functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        crypto: 'readonly'
      }
    }
  }
];
