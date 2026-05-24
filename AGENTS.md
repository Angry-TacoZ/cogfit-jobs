# AGENTS.md

You are working on CogFit Jobs, a narrow MVP for profile-based job-ad evaluation for nontraditional candidates.

Rules:
- Never expose API keys in frontend code.
- Never commit secrets.
- Use environment variables for any API keys.
- Do not use `VITE_*`, `NEXT_PUBLIC_*`, or similar public-build variables for secrets.
- Live Gemini model calls must go through Firebase Functions with Secret Manager.
- Require signed-in non-anonymous users for live evaluation.
- Require Firebase App Check for live evaluation.
- Keep request size limits, per-user quota, global quota, max instance cap, timeout, and model output cap in place.
- Do not fabricate user data.
- If the evaluator lacks evidence, lower confidence and say what is missing.
- Avoid em dashes in visible copy.
- Keep all scoring explainable.
- Prefer a working prototype over overbuilt architecture.
- Do not add paid features, auth, scraping, or job-board integrations in MVP.
- Do not create fake employer claims.
- Make all assumptions visible in the output.
- Do not reintroduce browser-side or deterministic mock job scoring as the main product path.

Before public deployment:
- Build the app.
- Inspect source and built output for exposed secrets.
- Run `powershell -ExecutionPolicy Bypass -File C:\Users\angry\.codex\sessions\scripts\predeploy-secret-scan.ps1 -Path <project-root>`.
- Do not deploy if browser-delivered files contain model API keys or direct paid model API call paths.
