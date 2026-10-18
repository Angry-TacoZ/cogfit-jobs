import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const advisoryUrl = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const expiresAt = Date.parse('2026-11-07T00:00:00Z');
const severities = new Set(['info', 'low', 'moderate', 'high', 'critical']);

// npm also reports vulnerable ancestors (e.g. firebase-tools -> chokidar -> braces).
// Follow their "via" references so the exception applies to one advisory only.
export function checkAudit(report, lock, now = new Date()) {
  if (report.auditReportVersion !== 2 || report.error ||
      !report.vulnerabilities || typeof report.vulnerabilities !== 'object' ||
      Array.isArray(report.vulnerabilities) || !report.metadata?.vulnerabilities || !lock.packages) {
    throw new Error('Missing or unsupported npm audit report/lockfile');
  }
  const vulnerabilities = report.vulnerabilities;
  const reportedHigh = Object.values(vulnerabilities).filter((finding) => finding?.severity === 'high').length;
  const reportedCritical = Object.values(vulnerabilities).filter((finding) => finding?.severity === 'critical').length;
  if (report.metadata.vulnerabilities.high !== reportedHigh ||
      report.metadata.vulnerabilities.critical !== reportedCritical) {
    throw new Error('Incomplete or inconsistent high/critical npm audit report');
  }
  function causes(name, seen = new Set()) {
    const finding = vulnerabilities[name];
    if (seen.has(name) || !finding || !severities.has(finding.severity) ||
        !Array.isArray(finding.via) || finding.via.length === 0) {
      throw new Error(`Invalid audit dependency chain: ${name}`);
    }
    const next = new Set([...seen, name]);
    return finding.via.flatMap((via) => {
      if (typeof via === 'string') return causes(via, next);
      if (!via || !severities.has(via.severity) || typeof via.url !== 'string') {
        throw new Error(`Invalid advisory for ${name}`);
      }
      return [via];
    });
  }
  const allowed = [];
  const blocked = [];
  for (const [name, finding] of Object.entries(vulnerabilities)) {
    if (!severities.has(finding?.severity)) throw new Error(`Invalid severity: ${name}`);
    if (!['high', 'critical'].includes(finding.severity)) continue;
    const severe = causes(name).filter((via) => ['high', 'critical'].includes(via.severity));
    const braces = vulnerabilities.braces;
    const developmentOnly = (nodes) => Array.isArray(nodes) && nodes.length > 0 &&
      nodes.every((node) => lock.packages[node]?.dev === true);
    const excepted = finding.severity === 'high' && now.getTime() < expiresAt && developmentOnly(finding.nodes) &&
      developmentOnly(braces?.nodes) && braces.nodes.every((node) =>
        lock.packages[node].version === '3.0.3') && severe.length > 0 &&
      severe.every((via) => via.url === advisoryUrl && via.name === 'braces' &&
        via.dependency === 'braces' && via.severity === 'high');
    (excepted ? allowed : blocked).push(name);
  }
  return { allowed, blocked };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (!process.env.npm_execpath) throw new Error('Run through npm run audit:ci');
    const result = spawnSync(process.execPath,
      [process.env.npm_execpath, 'audit', '--json', '--audit-level=high'],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.signal || ![0, 1].includes(result.status)) {
      throw new Error(`npm audit failed: ${result.error?.message || result.stderr || result.status}`);
    }
    const report = JSON.parse(result.stdout);
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const { allowed, blocked } = checkAudit(report, lock);
    console.log('Audit severity totals:', report.metadata?.vulnerabilities);
    if (allowed.length) console.warn(`Temporary exception ${advisoryUrl}: ${allowed.join(', ')}; expires 2026-11-07 UTC`);
    if (blocked.length) {
      console.error('Unexcepted high/critical vulnerabilities:', blocked.join(', '));
      console.error(JSON.stringify(report, null, 2));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
