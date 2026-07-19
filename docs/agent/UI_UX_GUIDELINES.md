# UI/UX Guidelines (anti-slop rules)

Customodoro's design is hand-crafted and specific. Generic "AI default" design
— indigo gradients, Tailwind-esque card grids, emoji icons, stock dashboard
layouts — is instantly recognizable and unwelcome here. These rules keep new
UI indistinguishable from the existing craft. Concrete values live in
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); read both before any user-visible change.

## Never do (design slop)

- **No generic gradients** — no blue/indigo, no purple→pink hero gradients, no
  gradient text. Customodoro uses flat muted color fields (taupe `#948979`,
  slate `#393e46`) with frosted translucent panels.
- **No CSS frameworks or component libraries** — no Tailwind, Bootstrap,
  shadcn-styles, Material kits. All CSS is hand-authored.
- **No BEM, no utility-class soup.** Kebab-case component classes with
  `.show`/`.active` state classes.
- **No new fonts.** Inter only.
- **No emoji as UI icons** and no icon libraries. Inline SVG only.
- **No off-system values:** border radii outside {4, 6, 8, 16, 24px, 50%},
  arbitrary hex colors, px font sizes off the `--text-*` ladder, random
  shadows, random easing curves.
- **No stock "AI dashboard" patterns:** three-column feature-card grids,
  centered hero with gradient headline, oversized rounded-3xl cards with
  pastel icon chips, gratuitous glassmorphism everywhere.
- **No layout thrash:** don't restructure existing markup or rename existing
  classes to suit a new feature; extend in place.

## Always do

- Derive every color/size/shadow/easing from existing tokens and patterns;
  when a needed token doesn't exist, add it to `:root` in `css/style.css`.
- The **only** interactive accent is `#8b5fbf`. Toggles-on, focus rings,
  active highlights, links — all purple.
- Follow the established component recipes (cards 16px/30px, modal `.show`
  pattern, toast, iOS toggle, primary/secondary buttons, `translateY(-3px)`
  hover lift).
- **Check every theme.** New UI must look right on `theme-default`,
  `theme-dark`, and at least one image theme (`theme-yourname`/`theme-rain`),
  where panels must go frosted (`rgba(255,255,255,0.1)`), plus `focus-mode`
  and fullscreen states if the element is visible there.
- **Mirror both timer pages.** UI that exists on `index.html` almost always
  exists on `reverse.html` — ship both or justify why not.
- Use the signature motion curves; entrances get the overshoot curve
  `cubic-bezier(0.34, 1.56, 0.64, 1)`; reuse existing keyframes.
- Live numeric readouts use tabular numbers (`font-feature-settings: "tnum"`).
- Put styles in the stylesheet that owns the domain (see ownership table in
  DESIGN_SYSTEM.md); bump the file's `?v=` buster in every HTML page that
  loads it.

## Design craft (the "impeccable" bar)

Matching the system is necessary but not sufficient — new UI should also be
*good*:

- **Hierarchy first:** one primary action per view; size/weight/contrast make
  the priority obvious without decoration.
- **Restraint:** one accent color, generous whitespace (30px rhythm), few
  borders — surfaces separate by elevation and translucency, not outlines.
- **Design all states,** not just the happy path: hover, active, focused,
  disabled, loading, empty, error, and long-content overflow.
- **Purposeful motion:** animation communicates state change (enter, complete,
  achieve); nothing animates just to animate. Durations 0.3–0.4s; glow/shimmer
  is reserved for gamification moments.
- **Copy tone:** short, warm, encouraging (this is a study companion, not an
  enterprise tool). Sentence case, no exclamation spam, no lorem-ipsum-ish
  filler features.
- **Small-screen honesty:** verify at 480px and 360px, and landscape for
  fullscreen views. No horizontal scroll, ever.

## Accessibility bar (for new or touched UI — no retrofit mandated)

Existing coverage is partial; every new or modified element must raise it:

- Keyboard: every interactive element reachable and operable; visible focus:
  `:focus-visible { outline: 2px solid #8b5fbf; outline-offset: 2px; }`
- Every new animation gets a `@media (prefers-reduced-motion: reduce)` guard.
- New controls get accessible names (`aria-label` on icon-only buttons),
  correct roles, and `aria-expanded`/`aria-pressed` where state exists.
- Maintain readable contrast on frosted panels over image themes — test on
  `theme-yourname`, not just solid backgrounds.
- Touch targets ≥ 40px on mobile.

## Timer-app UX rules

- **Never block, reflow, or restart a running timer.** No layout shift near
  the timer digits; no modal that steals focus mid-session uninvited.
- **Zero friction on core actions:** start/pause/reset must never grow
  confirmation dialogs. Friction is acceptable only for destructive data
  actions (delete account, clear stats).
- **Everything works logged-out and offline.** Auth/sync/leaderboard are
  optional enhancements; a feature that requires network must degrade to a
  quiet, non-nagging fallback.
- **Respect focus modes:** anything added to the timer pages must be hidden or
  minimal in `focus-mode-active` and `is-locked-in` states — those modes exist
  to remove chrome, and new chrome must opt in to being removed.
- Settings apply live (no "save" button pattern), matching the existing
  settings modal behavior.
- Sound/haptic feedback follows existing conventions (SFX on start/pause,
  `[100, 50, 100]` vibration on completion) — don't add new sounds without
  a settings toggle.

## Pre-ship checklist (run before finishing any UI change)

1. Both timer pages updated (or non-parity justified)?
2. Looks right on `theme-default`, `theme-dark`, and one image theme?
3. Checked in `focus-mode-active` / `is-locked-in` / fullscreen if visible there?
4. Only system tokens/values used (colors, radii, type ladder, shadows)?
5. `:focus-visible` outline present on new interactive elements?
6. `prefers-reduced-motion` guard on new animations?
7. Accessible names/roles on new controls?
8. Reused existing keyframes/easing where possible?
9. Verified at 480px and 360px widths, no horizontal scroll?
10. `?v=` cache-busters bumped for every changed CSS/JS file, in every HTML
    page that loads it?
