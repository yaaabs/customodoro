---
name: verify
description: Verify a Customodoro change end-to-end - run the Node test suites and exercise the app in a browser via a local static server. Use after implementing any nontrivial change, before committing.
---

# Verify a change

Full reference:
[docs/agent/TESTING_AND_RELEASE.md](../../../docs/agent/TESTING_AND_RELEASE.md).

1. **Tests first:** `npm run test:smoke` for a fast signal, then `npm run test`
   (adds logging-privacy + regression) before committing. Timer completion
   paths changed? The regression suite is mandatory — double-firing
   completions are this repo's historical bug class.
2. **Serve and exercise:** `npx serve .` (no build step), then open the
   affected page(s). Shared features must be checked on **both**
   `index.html` and `reverse.html`.
3. **Bypass the service worker** or it will show you stale code: hard-reload
   (Ctrl+Shift+R) or DevTools → Application → Service Workers → "Update on
   reload".
4. **Watch the console** for `UPPER_SNAKE_CODE` logger errors — new codes
   appearing means something regressed.
5. **UI changes:** check `theme-default` and `theme-dark` minimum (plus one
   image theme for panel translucency), mobile width 480px, and
   focus/locked-in modes if the element is visible there. Then run the
   pre-ship checklist in
   [docs/agent/UI_UX_GUIDELINES.md](../../../docs/agent/UI_UX_GUIDELINES.md).
6. **Auth/sync changes:** localhost automatically targets the staging Supabase
   project (hostname rule in `js/supabase-client.js`) — safe to test login/
   sync flows locally.
