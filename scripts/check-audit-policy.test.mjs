import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertNoCriticalAuditFindings, validateAuditPolicy } from './check-audit-policy.mjs';

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const config = JSON.parse(readFileSync(new URL('../audit-ci.json', import.meta.url), 'utf8'));
const now = new Date('2026-10-20T12:00:00Z');

describe('audit-ci exception policy against the checked-in lockfile', () => {
  it('accepts the exact Firebase Tools development dependency path', () => {
    expect(() => validateAuditPolicy(lock, config, now)).not.toThrow();
  });

  it('rejects extra or broader allowlist entries', () => {
    expect(() => validateAuditPolicy(lock, { ...config, allowlist: [...config.allowlist, 'GHSA-other'] }, now)).toThrow();
    expect(() => validateAuditPolicy(lock, { ...config, high: false }, now)).toThrow();
  });

  it('rejects production Braces and unexpected dependency versions or edges', () => {
    const production = structuredClone(lock);
    delete production.packages['node_modules/braces'].dev;
    expect(() => validateAuditPolicy(production, config, now)).toThrow();

    const unexpectedPath = structuredClone(lock);
    unexpectedPath.packages['node_modules/firebase-tools'].dependencies.chokidar = '^4.0.0';
    expect(() => validateAuditPolicy(unexpectedPath, config, now)).toThrow();
  });

  it('rejects a changed or expired exception date', () => {
    expect(() => validateAuditPolicy(lock, { ...config, allowlist: [
      { [Object.keys(config.allowlist[0])[0]]: { ...Object.values(config.allowlist[0])[0], expiry: '2026-11-08T00:00:00Z' } }
    ] }, now)).toThrow();
    expect(() => validateAuditPolicy(lock, config, new Date('2026-11-07T00:00:00Z'))).toThrow();
  });
});

describe('unfiltered npm audit critical-severity guard', () => {
  const highReport = {
    auditReportVersion: 2,
    metadata: { vulnerabilities: { critical: 0 } },
    vulnerabilities: {
      braces: {
        severity: 'high',
        via: [{ name: 'braces', severity: 'high', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' }]
      }
    }
  };

  it('allows the current high Braces advisory while rejecting critical reclassification', () => {
    expect(assertNoCriticalAuditFindings(highReport)).toBe(0);
    const criticalReport = structuredClone(highReport);
    criticalReport.metadata.vulnerabilities.critical = 1;
    criticalReport.vulnerabilities.braces.severity = 'critical';
    criticalReport.vulnerabilities.braces.via[0].severity = 'critical';
    expect(() => assertNoCriticalAuditFindings(criticalReport)).toThrow(/critical audit finding/);
  });

  it('fails closed when npm audit reports malformed or inconsistent critical counts', () => {
    expect(() => assertNoCriticalAuditFindings({})).toThrow(/unsupported npm audit report/);
    const inconsistentReport = structuredClone(highReport);
    inconsistentReport.vulnerabilities.braces.severity = 'critical';
    expect(() => assertNoCriticalAuditFindings(inconsistentReport)).toThrow(/critical audit finding/);
  });
});
