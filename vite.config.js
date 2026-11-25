import { cwd } from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const { VITE_FIREBASE_APPCHECK_SITE_KEY: siteKey } = loadEnv(mode, cwd(), 'VITE_');
    if (!siteKey?.trim()) {
      throw new Error('VITE_FIREBASE_APPCHECK_SITE_KEY is required to build CogFit Jobs.');
    }
  }

  return { plugins: [react()] };
});
