# Temporary dependency audit exception

- Advisory: [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- Package: `braces@3.0.3`; high-severity denial of service from deeply nested brace patterns. As checked on 2026-10-20, the advisory lists no patched version.
- Scope: root development tooling only: `firebase-tools@15.34.0 -> chokidar@3.6.0 -> braces@3.0.3`.
- Reason: Firebase Tools 15.34.0 uses Chokidar 3 glob behavior for Functions emulator `functions.ignore` patterns. Chokidar 4 removes glob support, so forcing that major version changes watcher behavior.
- Boundary: the affected package is not in the deployed Functions dependency tree. Local emulator/CLI use remains exposed to malicious brace patterns; use trusted repository and configuration inputs. The exception accepts this limited tooling risk; it does not fix the vulnerability.
- Owner: James / CogFit Jobs maintainers. Proposed in PR #20; not yet merged.
- Expiration: 2026-11-07 00:00 UTC. `audit-ci` expires this exact advisory-path exception, and the local policy check independently rejects an expired or changed expiry.
- Exception behavior: `audit-ci` allows only this GitHub advisory on the full dependency path and prints the allowed finding in the CI log. Since `audit-ci` applies its allowlist regardless of severity, the policy check first reads the unfiltered `npm audit --json` report and rejects any critical finding, including Braces reclassified as critical. It also verifies the exact config and lockfile path, versions, edges, and development-only flags; it fails if Braces becomes a production dependency or the Firebase/Chokidar path changes. Other high findings fail in audit-ci.
- Functions audit remains unfiltered: `npm audit --prefix functions --audit-level=high`.
- Removal: this exception is not automatically removed when a compatible patch is published. A dependency update changing the pinned path/version makes the policy check fail; maintainers should then remove the allowlist and policy check and return to the unfiltered root audit. The expiry provides a hard stop even if no patch arrives.

## Verification

`npm run audit:ci` validates the lockfile/config, runs the raw npm audit to reject critical findings, then runs IBM `audit-ci` 7.1.0 against the real root dependency tree. The audit still reports the permitted high finding; a passing result means only that this one documented exception and no critical or other high finding were present. It does not mean zero vulnerabilities.

Sources: [audit-ci documentation](https://github.com/IBM/audit-ci), [Firebase Tools 15.34.0 manifest](https://github.com/firebase/firebase-tools/blob/v15.34.0/package.json), [Functions emulator watcher](https://github.com/firebase/firebase-tools/blob/v15.34.0/src/emulator/functionsEmulator.ts), [Chokidar upgrade notes](https://github.com/paulmillr/chokidar#upgrading).
