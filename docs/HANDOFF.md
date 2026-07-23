# CogFit Jobs handoff

## Goal

Create an independently reviewable progressive-onboarding pull request that gives users a useful Provisional Analysis after a job ad, resume evidence, and six core questions, while preserving all 24 questions for the highest-confidence Full Analysis.

## Current status

- Active worktree: `C:\Users\angry\.codex\sessions\cogfit-jobs-progressive`
- Active branch: `codex/progressive-onboarding`
- Intended PR title: `feat: add progressive onboarding with provisional analysis`
- PR #1 remains the source of the resume-extraction architecture. This branch is stacked on `codex/resume-first-onboarding` and must target that branch until PR #1 merges.
- The progressive flow, session-scoped anonymous storage, Provisional Analysis, remaining-question modules, evidence separation, route focus/scroll restoration, documentation, tests, and screenshots are implemented locally.
- No progressive-onboarding PR has been opened yet, and this branch has not been deployed.

## Decisions

- Do not duplicate or replace PR #1's resume extraction.
- Resume evidence drives qualifications, skills evidence, ATS alignment, and callback signals.
- Questionnaire evidence drives cognitive fit, sustainability, autonomy, interaction preferences, and environmental fit.
- Unanswered questions are unknown evidence, never negative evidence.
- Signed-out onboarding uses `sessionStorage`; raw resume text remains in memory only.
- The first signed-out Provisional Analysis is local and clearly confidence-limited. Protected live Gemini analysis remains behind the existing authentication, App Check, quota, validation, and Firestore controls.
- Account creation appears after the first personalized result as the way to save and sync.
- All 24 existing questions remain available and required for a Full Analysis.

## Changed files

- Progressive onboarding and provisional scoring: `src/pages/JobEvaluator.jsx`, `src/lib/onboarding.js`
- Session privacy and promotion: `src/lib/storage.js`
- Evidence contract and protected evaluator path: `functions/index.js`, `functions/payloadValidation.js`, `src/lib/firebaseClient.js`, `src/lib/llmAdapter.js`
- Route and results behavior: `src/App.jsx`, `src/pages/ResultsPage.jsx`
- Supporting UI and documentation: `src/components/AuthPanel.jsx`, `src/pages/HomePage.jsx`, `src/pages/ProfileIntake.jsx`, `src/pages/DataNotice.jsx`, `src/styles.css`, `README.md`
- Tests and browser verification: `src/App.test.js`, `src/lib/onboarding.test.js`, related storage/payload tests, `scripts/smoke-test.mjs`
- PR screenshots: `docs/screenshots/progressive-onboarding-desktop.png`, `docs/screenshots/progressive-onboarding-mobile.png`

## Verification

- `npm.cmd run lint` passed.
- `npm.cmd run test` passed: 7 files and 22 tests.
- `npm.cmd run build` passed.
- `npm.cmd run smoke` passed, including evaluator and Results scroll/focus restoration.
- Desktop and 390 x 844 mobile signed-out walkthrough screenshots were reviewed.
- `npm.cmd audit` now reports zero vulnerabilities after patching affected transitive dependencies.

## Next task

1. Complete the canonical workspace verifier and predeploy secret scan.
2. Complete or explicitly document the signed-in browser walkthrough status.
3. Review the final diff and check for conflicts with the latest PR #1 head.
4. Commit and push only this branch.
5. Open a draft stacked PR against `codex/resume-first-onboarding` with dependency, privacy behavior, validation results, and screenshots documented.

## Risks or blockers

- A real signed-in local browser walkthrough has not yet been completed because it requires an authenticated Firebase browser session and may invoke the paid Gemini path.
- The branch must not be merged independently before PR #1 unless it is rebased onto `main` after PR #1 merges.
- The final canonical verifier, secret scan, and remote merge-conflict review remain pending.
