# Testing & Release Reference

How to verify changes and ship them. Read before committing anything
release-worthy.

## Automated tests

Node's built-in test runner over `.cjs` suites — no Jest, no browser install.
A custom DOM/timer harness (`tests/helpers/browser-harness.cjs`) loads
`js/script.js` / `js/reversePomodoro.js` directly and drives them with mock
timers.

| Command | Runs | Use when |
|---|---|---|
| `npm run test:smoke` | `tests/timer-smoke.test.cjs` | Fast check after timer-adjacent changes |
| `npm run test:regression` | `tests/timer-regression.test.cjs` | Timer lifecycle / completion-guard edits |
| `npm run test` | logging-privacy + smoke + regression | Before any commit |

What the suites protect:

- **Timer lifecycle:** start/pause/reset, single-completion guards (a session
  must complete exactly once — double-fire regressions are the historical bug
  class here). Touching `script.js`/`reversePomodoro.js` completion paths
  means running the regression suite.
- **Logging privacy** (`tests/logging-privacy.test.cjs`): production
  diagnostics must go through `window.customodoroLogger.error('UPPER_SNAKE_CODE')`
  with no PII/free-form strings. This suite is a hard gate.

The harness simulates a minimal DOM — it cannot test real rendering, the
service worker, or Supabase. Those need manual verification.

## Manual verification

1. Serve statically: `npx serve .` (there is no build step).
2. Open the affected page(s) — **both `index.html` and `reverse.html` for any
   shared feature** (settings, themes, tasks, sync UI, music, focus modes).
3. **Beware the service worker:** it cache-firsts core files, so stale code
   can mask your change. Hard-reload (Ctrl+Shift+R), or DevTools → Application
   → Service Workers → "Update on reload", or bump the `?v=` buster.
4. Watch the console — errors surface as `UPPER_SNAKE_CODE` logger codes.
5. UI changes: run the pre-ship checklist in
   [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md) (themes, focus modes, mobile
   widths, reduced motion).
6. Auth/sync/leaderboard changes: localhost automatically targets the
   **staging** Supabase project (hostname-based selection in
   `js/supabase-client.js`), so you can't corrupt production data locally.
   Force an env with `localStorage["customodoro-supabase-env"]` if needed.

## Release ritual (version bump)

Do these together for any release-worthy change — partial bumps cause stale
cached code in installed PWAs:

1. **`package.json`** — bump `version` (semver).
2. **`sw.js` lines 1–2** — bump the changed cache(s):
   `CACHE_NAME = "customodoro-static-vX.Y.Z"` (core HTML/CSS/JS changed) and/or
   `ASSETS_CACHE = "customodoro-assets-vX.Y.Z"` (images/audio changed). Old
   caches are deleted on activate and clients get `NEW_VERSION_AVAILABLE`.
3. **`?v=` cache-busters** — for every JS/CSS file you changed, bump its
   per-file `?v=x.y.z` in **every** HTML page that loads it (`index.html`,
   `reverse.html`, `pomodoro.html`, `feedback.html` as applicable). Vercel
   serves these assets `max-age=31536000, immutable` — without the bump,
   returning visitors keep the old file for a year.
4. **`npm run test`** — full suite must pass.
5. Commit with a Conventional Commit message.

There is no automated version-bump script — all steps above are manual.

## Git conventions

- **Conventional Commits** with scopes, lowercase imperative:
  `feat(achievements): ...`, `fix(pwa): ...`, `refactor(logging): ...`,
  `docs(readme): ...`, `chore(copyright): ...`. Common scopes: `pwa`,
  `pomodoro`, `locked-in`, `leaderboard`, `achievements`, `stats`, `seo`,
  `logging`.
- Branches: `feat/...`, `fix/...`, `backup/...`. PRs target `main`.
- Deployment is Vercel from git — merging to `main` ships. Vercel preview
  deployments hit the staging Supabase project (hostname rule).
