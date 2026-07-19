# Architecture Reference

How Customodoro actually works at runtime. Read this before touching any JS,
auth, sync, storage, or service-worker code. The root [AGENTS.md](../../AGENTS.md)
has the short rules; this file explains *why* they exist.

## Runtime model: no build, global singletons

There is **no build step, no bundler, no ES modules**. Every JS file is loaded
via a plain `<script>` tag and communicates through globals it attaches to
`window`. The script tag order in `index.html` and `reverse.html` **is the
dependency graph** — there is no import system to resolve ordering for you.

### Script load order (identical on both timer pages)

1. **CDN (blocking, in `<head>`):** `@supabase/supabase-js@2.45.4` from unpkg —
   the only external dependency.
2. **Non-deferred core (end of `<body>`):**
   `app-logger.js` → `timezone-manager.js` → `midnight-splitter.js` → then the
   page's timer engine: `script.js` (classic, index.html) or
   `reversePomodoro.js` (reverse.html). These must run before everything else —
   the logger and time utilities are used by all later scripts, and the timer
   engine owns the page's core state.
3. **Deferred stack (executes in tag order after HTML parse):**
   `supabase-client.js` → `auth-service.js` → `sync-manager.js` → `sync-ui.js` →
   `header-profile.js` → `task-retention.js` → `settings.js` → `fullscreen.js` →
   `lockedin-mode.js` → `locked-in-info-modal.js` → `focus-mode.js` →
   `radial-menu.js` → `bgm-player.js` → `mini-music-player.js` →
   `about-modal.js` → `theme-manager.js` → `leaderboard-integration.js` →
   `database-leaderboard.js` → `user-stats.js` → `most-used-pomodoro.js` →
   `copyright-year.js` → `database-achievements.js`

The auth/sync chain ordering is load-bearing: `supabase-client.js` creates the
shared client, `auth-service.js` consumes it, `sync-manager.js` listens to auth
events, `sync-ui.js` renders on top of both. **Never reorder, remove `defer`,
or add `async` to existing tags.** New scripts append to the deferred stack
after their dependencies and get a `?v=x.y.z` cache-buster.

### Global singletons

Each service file instantiates one global at the bottom of the file:
`window.supabaseClient`, `window.authService`, `window.syncManager`,
`window.syncUI`, plus `window.customodoroLogger` (frozen). Cross-module
communication uses these globals, `window` custom events (`authStateChanged`,
`syncStatusChanged`), and per-service `addEventListener`/`notifyListeners`
observer patterns. New modules follow the same shape: an IIFE or class that
attaches a single instance to `window`.

## Pages

| Page | Timer engine | Auth/sync stack? | Notes |
|---|---|---|---|
| `index.html` | `js/script.js` | Yes | Classic Pomodoro (countdown) |
| `reverse.html` | `js/reversePomodoro.js` | Yes | Reverse/Flowmodoro (count-up, break tiers) |
| `pomodoro.html` | none | **No — intentionally loads no auth/sync scripts** | Static educational guide |
| `feedback.html` | none | No | Feedback/bug-report form |

**Parity rule:** `index.html` and `reverse.html` are siblings. A feature or fix
on one usually needs the mirror change on the other (settings, themes, focus/
locked-in mode, tasks, sync UI, music player all exist on both). Timer-engine
logic lives in two separate files (`script.js` / `reversePomodoro.js`) that
must stay behaviorally consistent — e.g. both implement single-completion
guards and the `[100, 50, 100]` completion vibration.

## State & storage (local-first)

**localStorage is the source of truth.** No IndexedDB. Server sync is optional
sugar on top; every feature must work logged-out and offline.

### User-data keys (cleared on logout to prevent cross-account contamination)

`customodoroStatsByDay` (core per-day productivity analytics),
`customodoro-sessions`, `customodoro-tasks`, `customodoro-streaks`,
`customodoro-last-sync`, `customodoroStats` (legacy), `reverseTasks`,
`customodoro-has-used-sync`, `currentFocusedTask`, `seenModalVersion`.

### Auth/sync keys

- `customodoro-auth` — fast-paint mirror of the session
  (`{userId, email, username, createdAt, loginTime, authProvider}`). The
  **Supabase session is the source of truth**; this is only for instant UI.
- `customodoro-pending-sync` — offline queue (single latest snapshot + revision).
- `customodoro-supabase-env` — manual staging/prod override.
- `sb-*` — Supabase's own session storage. Don't touch directly.

### Settings keys (persist across logout — device preferences, not user data)

Timers: `pomodoroTime`, `shortBreakTime`, `longBreakTime`, `sessionsCount`,
`autoBreak`, `autoPomodoro`. Reverse: `breakLogicMode`, `reverseMaxTime`,
`reverseBreak1`–`reverseBreak5`. Audio: `pomodoroVolume`, `breakVolume`,
`soundEffects`, `alarm`, `pomodoroSound`, `breakSound`, `timerSound`,
`timerSoundVolume`, `bgmEnabled`, `bgmVolume`, `bgmPlaylist`/`selectedPlaylist`.
Theme: `siteTheme`, `colorThemeBackground`, `customThemeBackground`. Modes:
`lockedInModeEnabled`, `focusModeEnabled`, `focusModeActive`,
`isLockedInModeEnabled`, `burnupTrackerEnabled`, `burnupTrackerDesign`,
`midnightSplitterEnabled`.

When adding a key, decide which bucket it belongs to and, if it is user data,
add it to the logout-clearing list in `js/auth-service.js`.

### Sync blob wire format (do NOT "clean up")

`js/sync-manager.js` pushes a fixed shape to Supabase `users.data` (jsonb):

```json
{ "sessions": [...], "tasks": [...], "streaks": { ..., "productivityStatsByDay": {...} } }
```

Productivity stats are **tunneled inside `streaks.productivityStatsByDay`** for
compatibility with the leaderboard reader and legacy backend. This looks wrong
but is a wire-format contract — changing it silently breaks other clients and
the leaderboard. Sync-manager has extensive empty-data merge guards to avoid
wiping server data with a fresh device; preserve them.

## Backend: Supabase

- Postgres + Supabase Auth + RLS. Passwordless **email OTP** (6-digit code).
- User profile lives in the `users` table (matched by `auth_id`); app data in
  `users.data` jsonb. Leaderboard reads the `leaderboard_public` **view**.
- **Environment is auto-selected by hostname** in `js/supabase-client.js`:
  `customodoro.vercel.app` → production; everything else (localhost, previews)
  → staging. Anon keys are hardcoded and public by design — **RLS is the
  security boundary**. Never hardcode an environment or add secret keys to the
  client.
- The project is mid-migration from a legacy Express/Render backend (branch
  `feat/supabase-auth`). Before auth work, read
  [SUPABASE_AUTH_MIGRATION.md](../SUPABASE_AUTH_MIGRATION.md) and
  [MIGRATION_PROGRESS.md](../MIGRATION_PROGRESS.md). SQL migrations live in
  `docs/sql/`.
- Sync cadence: pull on login/restore; push on change; auto-sync every 5 min,
  on window focus (if >2 min stale), and on reconnect.

## Service worker (`sw.js`)

- Two versioned caches, defined at the top of the file:
  `CACHE_NAME = "customodoro-static-vX.Y.Z"` and
  `ASSETS_CACHE = "customodoro-assets-vX.Y.Z"`.
- Install: hard-precaches a required "timer shell" (core HTML/CSS/JS), then
  best-effort caches optional assets. Activate: deletes old-versioned caches
  and posts `NEW_VERSION_AVAILABLE` to clients.
- Fetch strategy: **network-first for navigations** (offline fallback to
  cache); **cache-first for core same-origin files** using `ignoreSearch` so
  `?v=` cache-busted URLs still hit; cache-first-then-network for images/audio.
- Messages handled: `HARD_REFRESH`, `CLEAR_USER_CACHE` (logout), `SKIP_WAITING`.
- `vercel.json` serves HTML/`sw.js` with `no-store` and static assets with
  `max-age=31536000, immutable` — which is why the `?v=` buster convention on
  script/style tags matters. If you change a JS/CSS file, bump its `?v=` in
  every HTML page that loads it.

## Logging & privacy

All diagnostics go through `window.customodoroLogger.error('CODE')` (or
`swLogger` inside `sw.js`) where `CODE` is an `UPPER_SNAKE_CASE` constant, e.g.
`SYNC_MANAGER_INITIAL_SYNC_FAILED`. Codes are de-duplicated and must contain
**no PII, no emails, no user content, no free-form strings**. This is enforced
by `tests/logging-privacy.test.cjs` — a raw `console.error("failed: " + email)`
will fail CI-less review and the test suite. Never bypass the logger in
production code paths.
