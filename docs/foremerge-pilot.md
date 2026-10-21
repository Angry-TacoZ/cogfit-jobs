# Foremerge pilot for CogFit Jobs

Foremerge 0.5.0 coordinates coding agents that work concurrently in local Git worktrees. Its database lives in this repository's Git common directory and is not pushed to GitHub. Git branches, pull requests, CI, and human review remain the integration path.

## Start a coordinated task

1. Use a separate worktree for each concurrent task. Run `foremerge doctor --client codex` from that worktree. Install the Windows release binary and run `foremerge setup codex` if the client is not configured. Restart Codex after MCP setup.
2. Use the repository skill in `.codex/skills/foremerge/SKILL.md`. Register the actual agent/model, query related work, and publish intent with a narrow semantic scope before editing.
3. Record overlapping findings and the decision made before implementation. Recheck conflicts before publishing a ChangeSet and before verification; findings are advisory.
4. Keep the existing PR and CI process. The locally registered `unit` check runs `npm.cmd run test`; run the full repository verifier and relevant browser checks before a PR. Install dependencies in each worktree with `npm.cmd ci` and `npm.cmd ci --prefix functions` as needed by the tests.

Examples of useful scopes: `contract:profile.evidence=modify`, `api:saveProfile=modify`, `component:progressive-onboarding=modify`. The two agents must use the same contract name for Foremerge to detect a shared contract.

## Evaluation

Use `docs/foremerge-pilot-log.csv` for actual parallel task pairs only. Mark each row `baseline` or `foremerge`. Add one row per pair when the PRs are reviewed. Link the intents and PRs, and record:

Use exactly one `warning_result` value per row: `changed-plan` (an early warning changed the work), `false-alarm` (a warning needed no change), `missed-conflict` (a conflict was found later without a useful warning), or `no-warning` (no warning and no later conflict). Use `unknown` for a baseline row whose review history does not establish the result.

- Whether a warning arrived before either agent edited code.
- Whether it changed a plan, was a false alarm, or missed a later discovered conflict.
- Minutes spent on Foremerge setup and coordination, based on actual task notes rather than a guess.
- Rework after PR review or integration, with the cause described.

Use the same fields to document at least two comparable earlier CogFit task pairs from PR history if the evidence exists. Mark unavailable values `unknown`; do not infer time saved from PR timestamps. Review the pilot after three real parallel pairs. Keep Foremerge if it catches at least one material conflict early and the recorded coordination cost is acceptable to James. If it produces no useful warning or recurring false alarms, stop using it and retain the PR/CI workflow. This is a small observational comparison, not a controlled productivity benchmark.

## Reproducible detector check

Run `powershell -ExecutionPolicy Bypass -File scripts/foremerge-detector-check.ps1` on Windows. It creates a disposable Git repository and separate database, never registering fake active tasks in the real CogFit ledger. It publishes one intent that **replaces** `contract:profile.evidence`, then another that **extends** the same contract. The second publish must report a high severity conflict. On October 2, 2026, a manual version of this check returned `destructive_vs_additive`, severity `HIGH`, and `detected_before_code: true` using Foremerge 0.5.0. This confirms the detector works; it does not count as a useful warning in the pilot log.

## Local setup note

On this Windows machine, `foremerge.exe` is installed under `.codex/bin`, which was added to the user PATH for future shells. `codex mcp get foremerge` reports the MCP registration enabled and pointing to that executable, and a direct MCP initialize/tools-list handshake passed. Foremerge 0.5.0 `doctor --client codex` nevertheless reports `mcp_configured: false` after `setup codex --force`. Its current source checks for a file named exactly `foremerge`, while the Windows release binary and Codex registration use `foremerge.exe`. Treat this as a doctor compatibility limitation until a restarted Codex client can exercise the MCP tools; do not mistake the doctor's `ready: false` for a missing database or check.

Foremerge currently shares its database only across worktrees on one machine. A separate ChatGPT Work filesystem will not see this ledger. Its warnings depend on declared scopes and can miss real conflicts. Passing its check shows only that the named command passed for the recorded Git fingerprint, so normal PR review and CI remain required.
