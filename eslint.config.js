import js from '@eslint/js';
import globals from 'globals';
import svelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';

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
  ...svelte.configs.recommended,
  {
    files: ['src/**/*.svelte'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2024 },
      parserOptions: { svelteConfig }
    },
    // Existing lists intentionally use unkeyed rendering; their items may repeat.
    rules: { 'svelte/require-each-key': 'off' }
  },
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
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    }
  }
];
