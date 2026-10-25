import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('../audit-ci.json', import.meta.url), 'utf8'));

describe('root audit severity policy', () => {
  it('fails on high and critical findings without an allowlist', () => {
    expect(config.high).toBe(true);
    expect(config).not.toHaveProperty('allowlist');
  });
});
