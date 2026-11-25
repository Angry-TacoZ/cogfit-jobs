import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));
const variable = 'VITE_FIREBASE_APPCHECK_SITE_KEY';
const placeholder = 'ci-smoke-test-placeholder';
let sandbox;

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'cogfit-build-'));
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function runBuild(siteKey, mode = 'production') {
  const env = { ...process.env };
  delete env[variable];
  if (siteKey !== undefined) env[variable] = siteKey;

  const output = join(sandbox, mode);
  const result = spawnSync(process.execPath, [
    join(root, 'node_modules/vite/bin/vite.js'),
    'build', root,
    '--config', join(root, 'vite.config.js'),
    '--mode', mode,
    '--outDir', output
  ], { cwd: sandbox, env, encoding: 'utf8', timeout: 25_000 });

  if (result.error) throw result.error;
  return { status: result.status, log: result.stdout + result.stderr, output };
}

describe('App Check build configuration', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['whitespace-only', '  \t ']
  ])('rejects a %s key', (_label, siteKey) => {
    const build = runBuild(siteKey);
    expect(build.status).toBe(1);
    expect(build.log).toContain(variable + ' is required');
  });

  it('rejects the smoke placeholder in a release build, including surrounding whitespace', () => {
    const build = runBuild('  ' + placeholder + '  ');
    expect(build.status).toBe(1);
    expect(build.log).toContain('only allowed in smoke builds');
  });

  it.each([
    ['smoke', placeholder],
    ['production', 'release-test-public-site-key']
  ])('builds in %s mode with its expected key', (mode, siteKey) => {
    const build = runBuild(siteKey, mode);
    expect(build.status, build.log).toBe(0);
    const assets = join(build.output, 'assets');
    const entry = readdirSync(assets).find((name) => /^index-.*\.js$/.test(name));
    expect(entry).toBeDefined();
    expect(readFileSync(join(assets, entry), 'utf8')).toContain(siteKey);
  }, 30_000);
});
