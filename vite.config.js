import { cwd } from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const siteKey = loadEnv(mode, cwd(), 'VITE_').VITE_FIREBASE_APPCHECK_SITE_KEY?.trim();
    if (!siteKey) {
      throw new Error('VITE_FIREBASE_APPCHECK_SITE_KEY is required to build CogFit Jobs.');
    }
    if (siteKey === 'ci-smoke-test-placeholder' && mode !== 'smoke') {
      throw new Error('The App Check placeholder is only allowed in smoke builds.');
    }
  }

  return {
    plugins: [react()],
    build: { outDir: mode === 'smoke' ? 'dist-smoke' : 'dist' }
  };
});
