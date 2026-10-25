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

## Security review on 2026-10-25

- Vite: the repository's declared `vite` range allowed releases through 7.3.6. GitHub Advisory [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) describes a Windows-only command-injection issue in the local `launch-editor` middleware when an attacker can control the file argument. Vite 7.3.7 is the patched release; the root dependency now requires `^7.3.7`. The app is hosted from the generated `dist` directory, so this dev-server middleware is not part of the deployed browser bundle. This is a vulnerable local developer tool path, not evidence that the public site was exploitable.
- The same audit found high findings in `body-parser`, `undici`, and `zod`, plus newly reported moderate Vitest findings. Lockfile updates resolve them with patched versions (`body-parser` 1.20.9 / 2.4.0, `undici` 6.29.1, `zod` 4.6.7, and Vitest 4.1.12). The Functions audit is now clean.
- Five moderate package findings remain in the root raw audit, all through `firebase-tools@15.34.0`, which is root development tooling: `@opentelemetry/core` via Pub/Sub and `uuid` via Gaxios. They are not in the deployed Functions dependency tree or static Hosting output. npm's proposed automatic resolution downgrades Firebase Tools to 14.23.0, a major-version downgrade; this change therefore preserves Firebase Tools 15.34.0 and reports the remaining findings instead of applying a potentially breaking downgrade.
- The Braces high advisory above remains the one explicitly permitted, narrowly scoped temporary exception. It has not been broadened or extended, and still expires 2026-11-07 00:00 UTC.

## Verification

`npm run audit:ci` validates the lockfile/config, runs the raw npm audit to reject critical findings, then runs IBM `audit-ci` 7.1.0 against the real root dependency tree. The audit still reports the permitted high finding; a passing result means only that this one documented exception and no critical or other high finding were present. It does not mean zero vulnerabilities.

Sources: [audit-ci documentation](https://github.com/IBM/audit-ci), [Firebase Tools 15.34.0 manifest](https://github.com/firebase/firebase-tools/blob/v15.34.0/package.json), [Functions emulator watcher](https://github.com/firebase/firebase-tools/blob/v15.34.0/src/emulator/functionsEmulator.ts), [Chokidar upgrade notes](https://github.com/paulmillr/chokidar#upgrading).
