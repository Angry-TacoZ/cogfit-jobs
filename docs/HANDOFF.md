# CogFit Jobs handoff

## Goal

CogFit Jobs is a public job-fit evaluator for nontraditional candidates. It compares job requirements with career evidence, cognitive and workstyle preferences, constraints, and likely day-to-day demands. The product should remain narrow, explainable, privacy-conscious, and useful without pretending to predict hiring outcomes.

This is the single cross-surface handoff for the entire CogFit Jobs repository. Update its active-work sections as branches and priorities change instead of creating separate handoff files for individual PRs.

## Current status

- Repository: `Angry-TacoZ/cogfit-jobs`
- Default branch: `main`
- Frontend: React and Vite with clean CSS.
- Backend: Firebase Authentication, App Check, callable Cloud Functions, Firestore, and Firebase Hosting.
- Live profile generation and job evaluation use Gemini through protected server functions. The browser must never receive the Gemini key.
- Draft PR #1, `codex/resume-first-onboarding`, adds resume-first evidence extraction.
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
6. After branch or deployment changes, update this same handoff with the new active work and verified status.

## Risks or blockers

- The progressive branch depends on unmerged PR #1 and must target `codex/resume-first-onboarding` until that dependency changes.
- A real signed-in local browser walkthrough has not yet been completed because it requires an authenticated Firebase session and may invoke the paid Gemini path.
- The final canonical verifier, secret scan, and remote conflict review for progressive onboarding remain pending.
- ChatGPT Work and Codex use separate filesystems. This handoff crosses that boundary only after its branch is committed and pushed to GitHub, and Work must open the same branch.
