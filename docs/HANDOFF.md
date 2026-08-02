# CogFit Jobs handoff

Last verified: 2026-07-27

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
- Draft PR #1, `codex/resume-first-onboarding`, adds resume-first evidence extraction. Its current branch includes PII redaction for retained evidence, a 5 MB upload limit, resume replacement for existing profiles, and a distinct resume/questionnaire evidence contract for profile generation, job evaluation, and cloud persistence.
- Draft PR #2, `codex/svelte-migration`, is an independent frontend migration proposal.
- Active local work, `codex/progressive-onboarding`, is stacked on PR #1 and redesigns onboarding around an early Provisional Analysis followed by progressive completion of all 24 questions.
- PR #1, PR #2, and progressive onboarding are not treated as deployed behavior until they merge and are deployed from a reviewed source state.

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

## Verification

### Resume-first PR #1

- Canonical verifier passed: lint, 6 test files with 21 tests, and production build.
- Browser smoke test, public secret scan, predeploy secret scan, and root and Functions audits passed.
- Functions syntax validation passed.
- Regression coverage verifies that retained project evidence redacts email, phone, complete mailing address, and URL values; rejects files larger than 5 MB; rejects a single weak overlapping evidence phrase; and preserves resume and questionnaire evidence as separate validated inputs.
- Browser smoke coverage verifies that an existing saved-profile user can open the resume replacement flow.

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

## Next task

1. Complete the progressive-onboarding canonical verifier and predeploy secret scan.
2. Complete or explicitly document the signed-in browser walkthrough status.
3. Review the final progressive diff and check for conflicts with the latest PR #1 head.
4. Commit and push the remaining progressive-onboarding changes.
5. Open a draft stacked PR against `codex/resume-first-onboarding`.
6. Configure branch protection to require the `Lint, test, build, smoke, and scan` check after confirming the desired merge policy.
7. After branch or deployment changes, update this same handoff with the new active work and verified status.

## Risks or blockers

- The progressive branch depends on unmerged PR #1 and must target `codex/resume-first-onboarding` until that dependency changes.
- A real signed-in local browser walkthrough has not yet been completed because it requires an authenticated Firebase session and may invoke the paid Gemini path.
- The final canonical verifier, secret scan, and remote conflict review for progressive onboarding remain pending.
- ChatGPT Work and Codex use separate filesystems. This handoff crosses that boundary only after its branch is committed and pushed to GitHub, and Work must open the same branch.
