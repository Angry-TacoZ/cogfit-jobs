# CogFit Jobs

CogFit Jobs is a public-facing React and Vite prototype for profile-based job-fit analysis. It helps nontraditional candidates compare a job ad against work style, evidence, constraints, cognitive fit, and likely day-to-day role demands.

The MVP runs without live API keys. It uses a deterministic mock evaluator and stores profile answers, generated profiles, evaluations, and feedback in `localStorage`.

## Local setup

```powershell
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build

```powershell
npm run build
```

The production build is emitted to `dist/`.

## Environment variables

Copy `.env.example` to `.env` if you want local environment configuration.

Do not put paid model API keys in frontend variables such as `VITE_*`. The prototype only exposes `VITE_COGFIT_EVALUATOR_MODE`, which is safe because it does not contain a secret.

Future live LLM mode should run through a server-side endpoint or Firebase Cloud Function that reads secrets from server-side environment configuration or Secret Manager.

## Firebase Hosting

This structure is compatible with Firebase Hosting. A typical setup is:

```powershell
npm run build
firebase init hosting
```

Choose `dist` as the public directory, configure as a single-page app, and avoid overwriting `index.html`.

Before deploying a public web artifact from this workspace, run:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\angry\.codex\sessions\scripts\predeploy-secret-scan.ps1 -Path C:\Users\angry\.codex\sessions\cogfit-jobs
```

Do not deploy if the scan reports browser-exposed secrets or direct browser calls to paid model APIs.

## Prototype boundaries

- No backend database.
- No auth.
- No paid features.
- No scraping or job-board integrations.
- No employer claims are generated.
- Scoring is explainable and heuristic-based.
- If evidence is missing, confidence is lowered and the report names what is missing.
