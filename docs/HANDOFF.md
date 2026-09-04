# CogFit Jobs handoff

Last verified: 2026-09-03

## Goal

CogFit Jobs is a public job-fit evaluator for nontraditional candidates. It compares job requirements with career evidence, cognitive and workstyle preferences, constraints, and likely day-to-day demands. The product should remain narrow, explainable, privacy-conscious, and useful without pretending to predict hiring outcomes.

This is the single cross-surface handoff for the entire CogFit Jobs repository. Update its active-work sections as branches and priorities change instead of creating separate handoff files for individual PRs.

## Current status

- Repository: `Angry-TacoZ/cogfit-jobs`
- Default branch: `main`
- Frontend: React and Vite with clean CSS.
- Backend: Firebase Authentication, App Check, callable Cloud Functions, Firestore, and Firebase Hosting.
- Live profile generation and job evaluation use Gemini through protected server functions. The browser must never receive the Gemini key.
- PR #5 merged into `main` as `3716e65`. GitHub Actions now runs lint, tests, production build, public secret scanning, and the Playwright smoke workflow on pull requests and pushes to `main`.
- The post-merge `Verify` run for `3716e65` completed successfully.
- PR #6 merged dependency-security fixes into `main` as `43c12d0`. Both npm audits report zero vulnerabilities, and CI now fails on high or critical audit findings.
- The post-merge `Verify` run for `43c12d0` completed successfully.
- PR #1 merged into `main` as `6e6fe17`. Resume-first onboarding is deployed, including PII-redacted retained evidence, a 5 MB upload limit, resume replacement for existing profiles, and a distinct resume/questionnaire evidence contract for profile generation, job evaluation, and cloud persistence.
- Draft PR #2, `codex/svelte-migration`, is an independent frontend migration proposal.
- Active local work, `codex/progressive-onboarding`, is stacked on PR #1 and redesigns onboarding around an early Provisional Analysis followed by progressive completion of all 24 questions.
- PR #2 and progressive onboarding are not treated as deployed behavior until they merge and are deployed from a reviewed source state.
- PR #7 merged the resume evidence limit fix into `main` as `807cec7`. Hosting and all callable Functions were deployed from verified `main` commit `0da6397` on 2026-08-20. A signed-in resume replacement still needs a production retest before the original user report is considered fully closed.
- Active local branch `codex/fix-firestore-profile-save` diagnoses a signed-in profile-save failure after resume import. Production logs show `generateProfile` returned 200, then `saveProfile` returned 500 because Firestore's gRPC metadata plugin rejected the runtime metadata response. The branch switches the Admin Firestore client to its supported REST transport, preserving existing authentication, App Check, validation, quota, and document behavior.

## Decisions

### Durable project decisions

- Keep paid model calls and secrets server-side.
- Preserve authentication, App Check, quotas, request validation, safe errors, and Firestore access controls around live evaluation.
- Keep scoring explainable, lower confidence when evidence is missing, and state assumptions explicitly.
- Keep resume evidence distinct from questionnaire evidence.
- Resume evidence should support qualification, skills, ATS, and callback analysis.
- Questionnaire evidence should support cognitive fit, sustainability, autonomy, interaction, communication, and environmental fit.
- Do not silently treat missing evidence as negative evidence.
- Do not add paid features, scraping, job-board integrations, or fake employer claims to the current product.

### Active progressive-onboarding decisions

- Preserve all 24 existing work-fit questions.
- Ask six core questions before a clearly labeled Provisional Analysis.
- Offer the remaining 18 questions as short named modules.
- Label analysis as Full only after all 24 questions are answered.
- Use `sessionStorage` for signed-out onboarding. Keep raw resume text in memory only.
- Present account creation after the first personalized result as the way to save and sync.
- Keep protected live Gemini evaluation behind the existing signed-in path.
- Reuse PR #1's resume extraction rather than duplicating it.

## Changed files

### Active progressive-onboarding work

- Flow and provisional scoring: `src/pages/JobEvaluator.jsx`, `src/lib/onboarding.js`
- Session privacy and promotion: `src/lib/storage.js`
- Evidence contract and evaluator boundary: `functions/index.js`, `functions/payloadValidation.js`, `src/lib/firebaseClient.js`, `src/lib/llmAdapter.js`
- Route and result behavior: `src/App.jsx`, `src/pages/ResultsPage.jsx`
- Supporting UI and documentation: `src/components/AuthPanel.jsx`, `src/pages/HomePage.jsx`, `src/pages/ProfileIntake.jsx`, `src/pages/DataNotice.jsx`, `src/styles.css`, `README.md`
- Tests and browser verification: `src/App.test.js`, `src/lib/onboarding.test.js`, related storage and payload tests, `scripts/smoke-test.mjs`
- Review artifacts: `docs/screenshots/progressive-onboarding-desktop.png`, `docs/screenshots/progressive-onboarding-mobile.png`

### Merged resume evidence limit fix

- Shared profile array limits: `functions/workFitProfileLimits.json`
- Functions schema and save validation: `functions/payloadValidation.js`
- Browser-side draft generation and deduplication: `src/lib/profileScoring.js`
- Resume replacement regression coverage: `src/lib/profileScoring.test.js`
- Patched build-tool transitive dependencies required by the current audit gate: `package-lock.json`

## Verification

### Resume-first PR #1

- PR #1 merged as `6e6fe17` and deployed to Firebase Hosting and Functions on 2026-08-02.
- The post-merge GitHub Actions Verify run `30771643975` passed for `6e6fe17`.
- Canonical verifier passed: lint, 6 test files with 21 tests, and production build.
- Browser smoke test, public secret scan, predeploy secret scan, and root and Functions audits passed.
- Functions syntax validation passed.
- Regression coverage verifies that retained project evidence redacts email, phone, complete mailing address, and URL values; rejects files larger than 5 MB; rejects a single weak overlapping evidence phrase; and preserves resume and questionnaire evidence as separate validated inputs.
- Browser smoke coverage verifies that an existing saved-profile user can open the resume replacement flow.
- Live Hosting returned the deployed `index-B9wAz1-Q.js` build. Browser verification passed for home, new resume-first profile creation, saved-profile review, and resume replacement with no console or page errors.
- All seven callable Functions report Node.js 22 in `us-central1`; an unauthenticated `evaluateJob` request returned `401 UNAUTHENTICATED` before model invocation.

### Merged dependency-security work

- Root and Functions `npm audit` report zero vulnerabilities.
- Post-merge GitHub Actions Verify run `30180903783` passed for `43c12d0`, including both enforced audit steps.

### Active progressive-onboarding work

- `npm.cmd run lint` passed.
- `npm.cmd run test` passed: 7 files and 22 tests.
- `npm.cmd run build` passed.
- `npm.cmd run smoke` passed, including evaluator and Results scroll/focus restoration.
- Desktop and 390 x 844 mobile signed-out walkthrough screenshots were reviewed.
- `npm.cmd audit` reports zero vulnerabilities after patching affected transitive dependencies.

These results apply to the current local progressive-onboarding worktree. They are not evidence that an unmerged branch is deployed or production-ready.

### Merged resume evidence limit fix

- Reproduced the reported failure: ten resume projects seeded into both questions 4 and 5 produced 20 `strongest_evidence` items, while Functions validation permits 10.
- The focused regression passes and confirms the generated draft deduplicates to 10 items and passes `normalizeWorkFitProfile`.
- External review found that a simple combined cap could let a long question 4 answer crowd out all question 5 project evidence. The revised selector deduplicates each source and interleaves them, with regression coverage for distinct work and project lists.
- Clean root and Functions installs passed.
- Canonical verifier passed after the review fix: lint, 6 test files with 23 tests, and production build.
- Browser smoke, public secret scan, predeploy secret scan, and root and Functions audits passed. Both audits report zero vulnerabilities.
- The root lockfile moved `brace-expansion` from 5.0.8 to 5.0.9 and `nanoid` from 3.3.16 to 3.3.18 after new high-severity advisories caused the required audit gate to fail.
- External AI review approved commit `df9bec8` with no blocking findings. PR #7 merged as `807cec7`, and its pull-request Verify workflow passed.
- Firebase deployed Hosting and all seven Node.js 22 callable Functions from `0da6397`. Live Hosting and the `/profile` route returned 200, the served `assets/index-w0cIDkPs.js` matched the verified build, browser checks found no console or page errors, and unauthenticated `generateProfile` returned 401.

## Next task

1. Review and merge the focused Firestore profile-save fix, deploy Functions, then retest signed-in profile updates with and without resume evidence and confirm cloud reload.
2. Create and review a protected GitHub Actions production deployment workflow using short-lived Google Cloud authentication.
3. Rebase the progressive-onboarding branch onto the latest `main` now that PR #1 and PR #7 have merged.
4. Complete the progressive-onboarding canonical verifier, predeploy secret scan, and signed-in browser walkthrough status.
5. Review the final progressive diff and resolve any conflicts with merged resume-first onboarding.
6. Commit and push the remaining progressive-onboarding changes, then open or retarget its draft PR against `main`.
7. Configure branch protection to require the `Lint, test, build, smoke, and scan` check after confirming the desired merge policy.
8. After branch or deployment changes, update this same handoff with the new active work and verified status.

## Risks or blockers

- The progressive branch was stacked on PR #1 before it merged and now needs a clean rebase or merge-base review against `main` before opening or retargeting its PR.
- A real signed-in local browser walkthrough has not yet been completed because it requires an authenticated Firebase session and may invoke the paid Gemini path.
- The final canonical verifier, secret scan, and remote conflict review for progressive onboarding remain pending.
- The resume evidence limit fix is merged, deployed, and verified at the public and unauthenticated boundaries, but still requires a signed-in production resume-replacement retest before the live issue is considered resolved.
- ChatGPT Work and Codex use separate filesystems. This handoff crosses that boundary only after its branch is committed and pushed to GitHub, and Work must open the same branch.
