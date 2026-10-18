# Temporary dependency audit exception

- Advisory: [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- Package: `braces@3.0.3`; high-severity denial of service from deeply nested brace patterns. As checked on 2026-10-18, the advisory lists no patched version.
- Scope: root development tooling only, currently `firebase-tools@15.34.0 -> chokidar@3.6.0 -> braces@3.0.3`. The gate follows npm's propagated findings to this exact advisory and requires every excepted package node to be development-only in the root lockfile.
- Reason: Firebase Tools 15.34.0 still declares `chokidar: ^3.6.0`; its Functions emulator converts `functions.ignore` to glob patterns. Chokidar 4 removed glob support, so a forced major override changes the expected watcher behavior.
- Boundary: these Braces instances are not dependencies of the deployed Functions package. Local emulator/CLI use remains exposed to malicious brace patterns; use trusted repository/configuration inputs. This exception accepts that limited tooling risk and does not fix the vulnerability.
- Owner: James / CogFit Jobs maintainers. Proposed in PR #20; not yet merged.
- Review by: 2026-11-06. The gate refuses the exception starting 2026-11-07 00:00 UTC.
- Remove the exception when a compatible patched dependency path is available, when Firebase officially migrates its watcher semantics, or if Braces becomes a production dependency. A version other than 3.0.3, another advisory, or critical severity is not covered.

Root CI runs `npm run audit:ci`, retaining the existing high/critical threshold. It fails on all other high/critical advisories, malformed audit output, unresolved/cyclic audit references, and npm transport errors. Moderate findings remain outside the existing threshold. Functions CI still runs the unfiltered `npm audit --prefix functions --audit-level=high`.

Sources: [Firebase Tools manifest](https://github.com/firebase/firebase-tools/blob/v15.34.0/package.json), [Functions watcher](https://github.com/firebase/firebase-tools/blob/v15.34.0/src/emulator/functionsEmulator.ts), [Chokidar upgrade notes](https://github.com/paulmillr/chokidar#upgrading).
