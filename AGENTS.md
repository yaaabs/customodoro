# AGENTS.md — Customodoro

Instructions for AI coding agents (Codex, Cursor, Copilot, Gemini, etc.).
Claude Code loads this via CLAUDE.md. Keep this file short; deep detail lives
in `docs/agent/`.

## What this is

Customodoro (v3.7.x) — a hand-crafted Pomodoro timer web app / PWA in **pure
vanilla JS/HTML/CSS**, deployed on Vercel (customodoro.vercel.app), with
optional Supabase-backed accounts/sync/leaderboard. Pages: `index.html`
(classic Pomodoro), `reverse.html` (reverse/flowmodoro — sibling of index),
`pomodoro.html` (static guide, deliberately loads NO auth/sync scripts),
`feedback.html`.

## Hard rules — read before writing any code

1. **No frameworks, no bundlers, no build step, no TypeScript, no npm runtime
   deps.** Plain `<script>`/`<link>` tags only. Never add React/Vue/Tailwind/
   Vite/webpack — this is a deliberate architecture, not an omission.
2. **Script load order in `index.html`/`reverse.html` is a hard contract** —
   the tag order IS the dependency graph. Never reorder/remove `defer`/add
   `async` without reading `docs/agent/ARCHITECTURE.md`.
3. Modules are **`window.*` global singletons** (`window.authService`,
   `window.syncManager`, `window.syncUI`, `window.supabaseClient`). New
   modules follow the same pattern and append to the deferred script stack.
4. **Two-page parity:** features/fixes on `index.html` almost always need the
   mirror change on `reverse.html` (and `script.js` ↔ `reversePomodoro.js`).
5. **Local-first:** localStorage is the source of truth; Supabase sync is
   optional. Every feature must work logged-out and offline. Never change the
   sync blob wire format (`{sessions, tasks, streaks}` with stats tunneled in
   `streaks.productivityStatsByDay`).
6. **Logging:** production diagnostics only via
   `window.customodoroLogger.error('UPPER_SNAKE_CODE')` — codes, never PII or
   free-form strings (enforced by `tests/logging-privacy.test.cjs`).
7. **UI must follow the design system** (`docs/agent/DESIGN_SYSTEM.md` +
   `docs/agent/UI_UX_GUIDELINES.md`). The only interactive accent is
   `#8b5fbf`; Inter is the only font; no CSS frameworks, no gradients, no
   emoji icons; kebab-case classes with `.show`/`.active` state pattern.
8. **Release ritual** for shipped changes: bump `package.json` version +
   `sw.js` cache versions + per-file `?v=` cache-busters in every HTML page
   (see `docs/agent/TESTING_AND_RELEASE.md`). Skipping busters strands users
   on year-long-cached assets.
9. **Conventional Commits** with scopes: `feat(pwa): ...`, `fix(leaderboard): ...`.
10. Sole CDN dep: `@supabase/supabase-js@2.45.4`. Supabase env (prod vs
    staging) is **auto-selected by hostname** in `js/supabase-client.js` —
    never hardcode an environment; localhost/previews always hit staging.

## Commands

- `npm run test` — full suite (logging-privacy + smoke + regression); run
  before committing.
- `npm run test:smoke` / `npm run test:regression` — narrower timer suites.
- Local dev: `npx serve .` (no build). The service worker caches aggressively —
  hard-reload (Ctrl+Shift+R) to see changes.
- There is **no automated version-bump script** — the release ritual is manual
  (see `docs/agent/TESTING_AND_RELEASE.md`).

## Repo map

- `js/` — one file per feature; timer engines `script.js` (classic) and
  `reversePomodoro.js` (reverse); auth/sync stack; `app-logger.js`.
- `css/` — 7 hand-authored sheets; `css/style.css` holds the `:root` design
  tokens (ownership table in `docs/agent/DESIGN_SYSTEM.md`).
- `sw.js` — service worker; versioned caches defined on lines 1–2.
- `vercel.json` — redirects + cache headers (HTML/sw.js `no-store`, assets
  immutable — hence `?v=` busters).
- `tests/` — Node `--test` `.cjs` suites + DOM harness in `tests/helpers/`.
- `docs/` — agent docs (`docs/agent/`), Supabase migration docs + SQL.

## Deep docs — read on demand

| Read this | When |
|---|---|
| `docs/agent/ARCHITECTURE.md` | Touching any JS, auth, sync, storage, or the service worker |
| `docs/agent/DESIGN_SYSTEM.md` | Touching any HTML/CSS (tokens, components, themes, motion) |
| `docs/agent/UI_UX_GUIDELINES.md` | Any user-visible change (anti-slop rules + pre-ship checklist) |
| `docs/agent/TESTING_AND_RELEASE.md` | Before committing / preparing a release |
| `docs/SUPABASE_AUTH_MIGRATION.md` + `docs/MIGRATION_PROGRESS.md` | Auth work — the app is mid-migration from a legacy Express backend |

## Current state & gotchas

- Active branch work: Supabase auth migration (`feat/supabase-auth`).
- `pomodoro.html` intentionally has no auth stack — don't "fix" that.
- Historical bug class: double-firing timer completions — respect the
  single-completion guards in both timer engines.
