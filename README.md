# CogFit Jobs

CogFit Jobs is a public-facing React and Vite prototype for profile-based job-fit analysis. It helps nontraditional candidates compare a job ad against work style, evidence, constraints, cognitive fit, and likely day-to-day role demands.

Live profile generation and job evaluation run through Firebase callable Cloud Functions. The browser never receives the Gemini API key. Profile answers, generated profiles, evaluations, and feedback are cached in `localStorage` and saved to Firestore under the signed-in user's account.

## Project status

See [`docs/HANDOFF.md`](docs/HANDOFF.md) for the current repository state, durable decisions, active branches, verification, and known blockers.

## Local setup

```powershell
npm install
npm run dev
```

Open the local Vite URL shown in the terminal. Live profile generation and job evaluation require Firebase client config, Firebase Auth, App Check, and a server-side `GEMINI_API_KEY` secret.

## Build

```powershell
npm run build
```

The production build is emitted to `dist/`.

## Environment variables

Copy `.env.example` to `.env` and fill in the Firebase web app config.

Do not put paid model API keys in frontend variables such as `VITE_*`. The `VITE_FIREBASE_*` values are public Firebase client config, not model secrets.

Set the Gemini key as a Firebase Functions secret:

```powershell
firebase functions:secrets:set GEMINI_API_KEY --project cogfit-jobs
```

The function defaults to `gemini-3.5-flash`, matching the intended live evaluator model. Search grounding and other tools are not enabled in the function, so the evaluator should only make standard model calls unless the function code is intentionally changed later.

## Required Firebase setup

Enable these before deploying live evaluation:

- Firebase Authentication with Email/Password sign-in.
- Firebase App Check for the web app using reCAPTCHA Enterprise.
- Firestore in Native mode for daily usage counters.
- Firestore security rules deployed from `firestore.rules`.
- Google Cloud billing budget alerts.
- Google AI Studio or Gemini API budget and usage limits.

The callable function also enforces:

- signed-in non-anonymous user required
- valid App Check token required
- replay-protected limited-use App Check tokens
- `maxInstances: 1`
- 60 second timeout
- 256 MiB memory
- daily per-user quota, default 5 live Gemini calls per user
- daily global quota, default 50 live Gemini calls across non-admin users
- request size limits
- model output token cap

Admin users can be exempted from the live Gemini quota checks by either setting a Firebase Auth custom claim of `admin: true` or by configuring the server-only `ADMIN_EMAILS` Functions parameter as a comma-separated email list. Do not put admin emails in frontend code. If you use a local Functions env file for this parameter, keep it out of Git.

## Firebase Hosting and Functions

This structure is compatible with Firebase Hosting. A typical setup is:

```powershell
npm run build
firebase deploy --only hosting,functions --project cogfit-jobs
```

Hosting uses `dist` as the public directory and rewrites SPA routes to `index.html`.

Before deploying a public web artifact from this workspace, run:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\angry\.codex\sessions\scripts\predeploy-secret-scan.ps1 -Path C:\Users\angry\.codex\sessions\cogfit-jobs
```

Do not deploy if the scan reports browser-exposed secrets or direct browser calls to paid model APIs.

### Protected production deployment

The `Deploy production` GitHub Actions workflow can deploy the current `main` commit only after its `Verify` workflow succeeds. It checks that the verified commit is still the tip of `main`, repeats the deterministic lint, test, build, secret scan, and dependency audit gates, deploys Hosting and Functions, then runs a non-destructive live smoke test.

The workflow is disabled by default. Before enabling it:

1. Create a GitHub environment named `production` and configure required reviewers. Do not enable deployment without that approval rule.
2. Create a dedicated Google Cloud deployment service account for this repository. Grant only the Firebase Hosting Admin, Cloud Functions Admin, and Service Account User roles needed by the existing Hosting and Functions deployment. Add further permissions only when a real failed deployment demonstrates they are required.
3. Configure Google Cloud Workload Identity Federation for GitHub Actions. Restrict the provider to `Angry-TacoZ/cogfit-jobs`, and grant that repository principal `roles/iam.workloadIdentityUser` on the deployment service account.
4. Add these GitHub Actions variables: `GCP_WORKLOAD_IDENTITY_PROVIDER` with the full provider resource name and `GCP_SERVICE_ACCOUNT` with the deployment service account email.
5. Set the repository variable `PRODUCTION_DEPLOY_ENABLED` to `true` only after the environment protection and identity restrictions have been reviewed.

The workflow uses GitHub OIDC and Google Application Default Credentials. Do not add a Firebase CI token or service-account JSON key to GitHub secrets. Generated `gha-creds-*.json` files are ignored by Git.

For rollback, revert `main` to the last known-good application state through a reviewed pull request. After `Verify` passes and the production environment reviewer approves, the workflow redeploys that traceable state. Firebase Hosting release history remains available for a Hosting-only emergency rollback, but it does not roll back Functions.

## Prototype boundaries

- No paid features.
- No scraping or job-board integrations.
- No employer claims are generated.
- Profile synthesis and job scoring are generated by protected live evaluator functions and must remain explainable.
- If evidence is missing, confidence is lowered and the report names what is missing.
- Login protects the live API path and profile-scoped Firestore storage.
- Firestore stores data under `/users/{uid}/profiles/{profileId}` with evaluations under `/users/{uid}/profiles/{profileId}/evaluations/{evaluationId}`.
