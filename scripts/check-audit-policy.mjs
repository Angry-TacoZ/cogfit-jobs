import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const advisory = 'GHSA-vfj7-8cjw-p6xm';
const expiresAt = Date.parse('2026-11-07T00:00:00Z');
const policy = JSON.parse(readFileSync('audit-ci.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));

export function validateAuditPolicy(lockfile, config, now = new Date()) {
  const expectedPath = `${advisory}|firebase-tools>chokidar>braces`;
  const records = config.allowlist ?? [];
  const record = records.length === 1 ? records[0]?.[expectedPath] : undefined;
  if (config.high !== true || records.length !== 1 || !record?.active ||
      record.expiry !== '2026-11-07T00:00:00Z' || now.getTime() >= expiresAt) {
    throw new Error('Audit exception policy is missing, broader than allowed, or expired');
  }

  const packages = lockfile.packages ?? {};
  const firebase = packages['node_modules/firebase-tools'];
  const chokidar = packages['node_modules/chokidar'];
  const braces = packages['node_modules/braces'];
  const vulnerableBraces = Object.entries(packages).filter(([path, pkg]) =>
    path.split('/').at(-1) === 'braces' && pkg.version === '3.0.3');
  if (firebase?.version !== '15.34.0' || firebase.dev !== true ||
      firebase.dependencies?.chokidar !== '^3.6.0' ||
      chokidar?.version !== '3.6.0' || chokidar.dev !== true ||
      chokidar.dependencies?.braces !== '~3.0.2' ||
      braces?.version !== '3.0.3' || braces.dev !== true ||
      vulnerableBraces.length !== 1 || vulnerableBraces[0][0] !== 'node_modules/braces') {
    throw new Error('Braces exception no longer matches the expected dev-only Firebase Tools dependency path');
  }
}

export function assertNoCriticalAuditFindings(report) {
  const vulnerabilities = report?.vulnerabilities;
  const criticalCount = report?.metadata?.vulnerabilities?.critical;
  if (report?.auditReportVersion !== 2 || report.error ||
      !vulnerabilities || typeof vulnerabilities !== 'object' || Array.isArray(vulnerabilities) ||
      !Number.isInteger(criticalCount) ||
      !Object.values(vulnerabilities).every((finding) => finding && Array.isArray(finding.via))) {
    throw new Error('Missing or unsupported npm audit report');
  }

  const findings = Object.entries(vulnerabilities);
  const reportedCritical = findings.filter(([, finding]) => finding.severity === 'critical').length;
  const critical = findings.filter(([, finding]) => finding.severity === 'critical' ||
    finding.via.some((cause) => typeof cause === 'object' && cause?.severity === 'critical'));
  if (reportedCritical !== criticalCount || critical.length > 0) {
    throw new Error(`Unexcepted critical audit finding(s): ${critical.map(([name]) => name).join(', ') || 'inconsistent report'}`);
  }
  return criticalCount;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    validateAuditPolicy(lock, policy);
    console.log(`Temporary high-severity exception configured: ${advisory} on firebase-tools>chokidar>braces through 2026-11-07T00:00:00Z; the finding remains visible in the audit report.`);

    if (!process.env.npm_execpath) throw new Error('Run through npm run audit:ci');
    const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--json'], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    });
    if (result.error || result.signal || ![0, 1].includes(result.status)) {
      throw new Error(`Unfiltered npm audit failed: ${result.error?.message || result.stderr || result.status}`);
    }
    assertNoCriticalAuditFindings(JSON.parse(result.stdout));
    console.log('Unfiltered npm audit critical-severity check passed; the high Braces exception remains reported by audit-ci.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
