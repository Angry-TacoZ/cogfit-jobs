import { createRequire } from 'node:module';
import { mkdtemp, writeFile, appendFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const requireFromProject = createRequire(import.meta.url);
const requireFromFirebaseTools = createRequire(requireFromProject.resolve('firebase-tools'));
const chokidar = requireFromFirebaseTools('chokidar');
const firebaseConfig = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));

describe('Firebase Functions emulator ignore globs', () => {
  it('ignores configured .local files while watching source files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cogfit-functions-watch-'));
    const ignoredFile = join(directory, 'probe.local');
    const sourceFile = join(directory, 'index.js');
    let watcher;

    try {
      await writeFile(ignoredFile, 'initial\n');
      await writeFile(sourceFile, 'initial\n');
      const changed = [];
      const result = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Chokidar watcher timed out')), 8_000);
        watcher = chokidar.watch(directory, {
          ignored: [
            /(^|[/\\])\../,
            /.+\.log/,
            /.+?[/\\]node_modules[/\\].+?/,
            /.+?[/\\]venv[/\\].+?/,
            ...(firebaseConfig.functions[0].ignore.map((pattern) => `**/${pattern}`))
          ],
          persistent: true
        });
        watcher.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        watcher.on('change', (file) => {
          changed.push(basename(file));
          if (basename(file) === 'index.js') {
            setTimeout(() => {
              clearTimeout(timeout);
              resolve();
            }, 200);
          }
        });
        watcher.on('ready', async () => {
          try {
            await appendFile(ignoredFile, 'modified\n');
            await appendFile(sourceFile, 'modified\n');
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });

      await result;
      expect(changed).toEqual(['index.js']);
    } finally {
      await watcher?.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 10_000);
});
