import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { formatFindings, scanPaths } from './scan-public-secrets.mjs';

const temporaryDirectories = [];

async function createFixture(content) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cogfit-secret-scan-'));
  temporaryDirectories.push(directory);
  await writeFile(path.join(directory, 'fixture.js'), content, 'utf8');
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe('public secret scanner', () => {
  it('accepts ordinary browser code', async () => {
    const directory = await createFixture(
      "export const endpoint = '/api/evaluate';\n"
    );

    await expect(scanPaths(['fixture.js'], directory)).resolves.toEqual([]);
  });

  it('reports exposed credentials without printing their values', async () => {
    const exposedKey = `AIza${'A'.repeat(30)}`;
    const directory = await createFixture(
      `export const leakedKey = '${exposedKey}';\n`
    );

    const findings = await scanPaths(['fixture.js'], directory);
    const output = formatFindings(findings);

    expect(findings).toEqual([
      { file: 'fixture.js', line: 1, type: 'Google API key' }
    ]);
    expect(output).toContain('fixture.js:1 Google API key');
    expect(output).not.toContain(exposedKey);
  });
});
