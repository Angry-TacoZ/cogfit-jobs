import { describe, expect, it } from 'vitest';
import { checkAudit } from './audit-with-exceptions.mjs';

function fixture() {
  const advisory = {
    name: 'braces', dependency: 'braces', severity: 'high',
    url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm'
  };
  const vulnerabilities = {};
  const packages = {};
  for (const [name, via] of [
    ['braces', [advisory]], ['chokidar', ['braces']], ['firebase-tools', ['chokidar']]
  ]) {
    const node = `node_modules/${name}`;
    vulnerabilities[name] = { severity: 'high', via, nodes: [node] };
    packages[node] = { dev: true, version: name === 'braces' ? '3.0.3' : '3.6.0' };
  }
  return {
    report: { auditReportVersion: 2, metadata: { vulnerabilities: { high: 3, critical: 0 } }, vulnerabilities },
    lock: { packages }
  };
}
const now = new Date('2026-10-07T12:00:00Z');
const check = ({ report, lock }, date = now) => checkAudit(report, lock, date);

describe('temporary Braces audit exception', () => {
  it('allows only the exact advisory and its development ancestors', () => {
    expect(check(fixture())).toEqual({ allowed: ['braces', 'chokidar', 'firebase-tools'], blocked: [] });
  });
  it.each(['high', 'critical'])('blocks unrelated %s advisories, including on an excepted ancestor', (severity) => {
    const data = fixture();
    data.report.vulnerabilities['firebase-tools'].via.push({
      name: 'firebase-tools', severity, url: 'https://github.com/advisories/GHSA-other'
    });
    data.report.vulnerabilities.other = {
      severity, via: [{ name: 'other', severity, url: 'https://github.com/advisories/GHSA-other' }]
    };
    data.report.metadata.vulnerabilities.high = severity === 'high' ? 4 : 3;
    data.report.metadata.vulnerabilities.critical = severity === 'critical' ? 1 : 0;
    expect(check(data).blocked).toEqual(['firebase-tools', 'other']);
  });
  it('blocks Braces in production or missing from the lockfile', () => {
    const data = fixture();
    delete data.lock.packages['node_modules/braces'].dev;
    expect(check(data).blocked).toHaveLength(3);
    delete data.lock.packages['node_modules/braces'];
    expect(check(data).blocked).toHaveLength(3);
  });
  it('blocks unknown Braces versions and expires on the documented date', () => {
    const data = fixture();
    data.lock.packages['node_modules/braces'].version = '3.0.4';
    expect(check(data).blocked).toHaveLength(3);
    expect(check(fixture(), new Date('2026-11-07T00:00:00Z')).blocked).toHaveLength(3);
  });
  it('retains the existing moderate threshold', () => {
    const data = fixture();
    data.report.vulnerabilities.moderate = { severity: 'moderate' };
    data.report.vulnerabilities['firebase-tools'].via.push('moderate');
    data.report.vulnerabilities.moderate.via = [{ severity: 'moderate', url: 'https://example.com/advisory' }];
    expect(check(data).blocked).toEqual([]);
  });
  it('fails closed on errors, invalid reports, missing references, and cycles', () => {
    const data = fixture();
    expect(() => check({ ...data, report: { error: { code: 'ENETWORK' } } })).toThrow();
    expect(() => check({ ...data, report: { auditReportVersion: 2, vulnerabilities: [] } })).toThrow();
    data.report.metadata.vulnerabilities.high = 2;
    expect(() => check(data)).toThrow(/inconsistent/);
    data.report.metadata.vulnerabilities.high = 3;
    data.report.vulnerabilities.chokidar.via = ['missing'];
    expect(() => check(data)).toThrow();
    data.report.vulnerabilities.chokidar.via = ['firebase-tools'];
    expect(() => check(data)).toThrow();
  });
});
