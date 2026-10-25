# Dependency audit status

## Braces advisory review on 2026-10-25

- GitHub withdrew [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) on 2026-10-23, stating the issue was not practically exploitable. The original claim was high-severity stack exhaustion from deeply nested patterns in `braces@3.0.3`.
- `braces@3.0.3` remains in the root development-only dependency path `firebase-tools@15.34.0 -> chokidar@3.6.0 -> braces@3.0.3`. It is not in the Functions dependency tree. The current raw root audit reports five moderate findings and zero high or critical findings; `audit-ci` passes and warns that the old exception is unused.
- The former advisory allowlist and its exact-path/expiry checker have been removed. `audit-ci.json` retains `high: true` with no allowlist, so high and critical findings fail through the normal audit-ci threshold. There is no November 7 expiry that can stop CI for this withdrawn advisory.

## Other findings reviewed

- **Vite (high, fixed):** versions through 7.3.6 exposed a Windows-only command-injection path in local `launch-editor` middleware if an attacker controlled its file argument. Vite 7.3.7 fixes it. Vite builds the browser application; Firebase Hosting serves `dist`, and inspection found no editor middleware in those static assets. There is no evidence the public site was exposed. See [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm).
- **body-parser (high, fixed):** a crafted compressed request with trailing bytes could trigger an uncaught error and crash a Node process. The affected copy was in the Functions runtime dependency tree (`firebase-functions -> express -> body-parser`) as well as Firebase tooling. Lockfiles now resolve 1.20.9 and 2.4.0. See [GHSA-27r3-jxmh-p828](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
- **undici (high, fixed):** reported issues included process crashes from malformed responses with excessive content encodings and loss of a caller-supplied TLS identity check. The affected copy is used by Firebase CLI development tooling, not deployed Functions. The lockfile now resolves 6.29.1, which patches the reported 6.x findings. See [GHSA-xjj6-f33q-929c](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) and [GHSA-2m5v-pch6-74hx](https://github.com/nodejs/undici/security/advisories/GHSA-2m5v-pch6-74hx).
- **zod (high, fixed):** an oversized array could make validation accumulate excessive error objects and exhaust memory. The affected copy is in development tooling; it now resolves to 4.6.7. See [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- **Vitest-related findings (moderate, fixed):** the findings were in the test runner's mocker packages, used only for development tests. Updating Vitest to 4.1.12 clears them from the audit.
- **OpenTelemetry Core (moderate, unresolved):** parsing an oversized inbound W3C Baggage header can allocate memory in proportion to the header size. Node's normal HTTP header limit bounds the usual exposure; the concern is higher for transports without such limits. This copy is reached through Firebase CLI development tooling and Pub/Sub, not the deployed Functions tree. See [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf).
- **uuid (moderate, unresolved):** UUID v3/v5/v6 calls with a caller-provided output buffer and invalid size/offset can partially write without throwing. This copy is reached through Firebase CLI development tooling and Gaxios; the affected call path has not been shown to be reachable in the deployed application. See [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

The five remaining root audit package entries are propagated through `firebase-tools@15.34.0` development dependencies and represent the two moderate advisories above. npm's suggested automatic fix downgrades Firebase Tools to 14.23.0, a major-version change; this work preserves 15.34.0 rather than applying that unverified downgrade. The Functions audit reports zero vulnerabilities.

## Verification

`npm run audit:ci` runs IBM `audit-ci` 7.1.0 using `audit-ci.json`. Its high threshold remains enabled with no exception list. `npm audit --prefix functions --audit-level=high` remains unfiltered. Neither result means the root dependency tree is vulnerability-free: the five moderate toolchain entries remain disclosed above.

Sources: [audit-ci documentation](https://github.com/IBM/audit-ci), [Firebase Tools 15.34.0 manifest](https://github.com/firebase/firebase-tools/blob/v15.34.0/package.json), [Functions emulator watcher](https://github.com/firebase/firebase-tools/blob/v15.34.0/src/emulator/functionsEmulator.ts), [Chokidar upgrade notes](https://github.com/paulmillr/chokidar#upgrading).
