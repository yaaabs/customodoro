---
name: release-version-bump
description: Use when preparing a release, bumping the version, updating service worker cache versions, or when the user says release, version bump, deploy prep, or ship. Encodes Customodoro's manual version ritual (package.json + sw.js caches + ?v= cache-busters).
---

# Release / version bump ritual

There is no automated version-bump script — every step is manual. Full context:
[docs/agent/TESTING_AND_RELEASE.md](../../../docs/agent/TESTING_AND_RELEASE.md).

Do all steps together — partial bumps strand installed PWAs on stale code:

1. **`package.json`** — bump the `version` field (semver: patch for fixes,
   minor for features).
2. **`sw.js` lines 1–2** — bump the affected cache version(s):
   - `CACHE_NAME = "customodoro-static-vX.Y.Z"` if any core HTML/CSS/JS changed.
   - `ASSETS_CACHE = "customodoro-assets-vX.Y.Z"` if images/audio changed.
3. **`?v=` cache-busters** — for every JS/CSS file changed in this release,
   bump its `?v=x.y.z` query string in **every** HTML page that loads it
   (`index.html`, `reverse.html`, `pomodoro.html`, `feedback.html`). Grep the
   filename across `*.html` to catch all references — Vercel serves assets
   `immutable` for a year, so a missed buster means stale code for returning
   users.
4. **`npm run test`** — the full suite must pass.
5. Commit with a Conventional Commit (e.g. `chore(release): bump to X.Y.Z` or
   the feature's own `feat(...)`/`fix(...)` message including the bumps).
