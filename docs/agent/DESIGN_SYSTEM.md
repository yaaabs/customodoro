# Design System Reference

The concrete values that define Customodoro's hand-crafted look. Source of
truth for tokens is the `:root` blocks in `css/style.css` — **always grep those
before inventing a value**; this file explains the system around them. Pair
this with [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md) (the do/don't rules).

## Color

Defined in `:root` at the top of `css/style.css`:

| Token | Value | Role |
|---|---|---|
| `--focus-color` | `#948979` | Warm taupe — classic focus background |
| `--short-break-color` | `#393e46` | Slate — short break background |
| `--long-break-color` | `#222831` | Near-black — long break background |
| `--reverse-color` | `#393e46` | Reverse-mode background |
| `--break-color` | `#393e46` | Reverse break background |
| `--bg-light` | `#f5f5f5` | Light surface |
| `--text-dark` / `--text-light` | `#333333` / `#ffffff` | Text pair |
| `--shadow` | `0 10px 25px rgba(0,0,0,0.1)` | Default card shadow |
| `--transition` | `all 0.3s ease` | Default transition |

De-facto tokens (recurring hardcoded values — reuse these, don't invent):

- **`#8b5fbf` — THE interactive accent** (purple): toggle on-state, focus
  outlines, info-note borders, links. This is the only accent color for
  interactive elements. Not blue, not indigo, not a gradient.
- `#a53860` — rose; default for the user-pickable `theme-color` background
  (runtime var `--color-theme-bg`).
- Dark surfaces: `#1a1a1a` (modal bg), `#111111` (modal sidebar), `#1e1e1e`
  (dark-theme cards), `#121212` (dark-theme body), `#f1f1f1` (dark-theme text).
- Alert/danger red: `#d91802`.
- **Frosted panel pattern:** translucent `rgba(255,255,255,0.1)` surfaces over
  solid/imaged backgrounds, often with `backdrop-filter: blur(...)` (with
  `-webkit-` prefix). Insets use `rgba(0,0,0,0.1)`.

New colors belong in `:root` as a variable, not inlined mid-file.

## Typography

- **Inter only**, from Google Fonts (`preconnect` + `display=swap` in each HTML
  head), weights 300–800. Full stack: `"Inter", -apple-system,
  BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`.
  **Never add another font.**
- Size ladder (second `:root` block in `style.css`): `--text-xs` (.75rem) →
  `--text-sm` → `--text-base` → `--text-lg` → `--text-xl` → `--text-2xl` →
  `--text-3xl` → `--text-4xl` → `--text-5xl` (3rem). Weights `--font-light`
  (300) → `--font-extrabold` (800). Line heights `--leading-tight/normal/relaxed`.
  Use the ladder; don't hardcode px font sizes.
- Utility classes exist for typography only: `.text-medium`, `.text-bold`,
  `.heading-1`…`.heading-5`. This is **not** a utility-first codebase.
- **Timer digits:** `font-feature-settings: "tnum"` (tabular numbers) +
  `letter-spacing: -0.02em`, hero size 100px (72px @600px, 60px @400px),
  weight 800. Any new numeric readout that updates live must use `tnum` so
  digits don't jitter.
- Headings: h1/h2 get `letter-spacing: -0.025em` and tight leading.

## Components (match these patterns exactly)

- **Cards/sections** (`.timer-container`, `.tasks-section`, `.info-section`):
  `border-radius: 16px`, `padding: 30px`, `var(--shadow)`, white or frosted
  translucent background. This is the dominant layout unit.
- **Modals** (`.settings-modal`, `.leaderboard-modal`, `.about-modal`):
  full-screen fixed overlay `rgba(0,0,0,0.7)`; hidden via `display:none`,
  shown by adding `.show` (→ `display:flex`, centered). Panel: `#1a1a1a`,
  `border-radius: 16px`, `box-shadow: 0 15px 40px rgba(0,0,0,0.5)`,
  `animation: modalFadeIn 0.3s ease`. Settings modal is two-column
  (`.settings-sidebar` 200px `#111` + content), `height: min(660px, 90vh)`.
- **Toast** (`.toast`): fixed top-right (20px), `rgba(0,0,0,0.8)`, white text,
  `border-radius: 8px`, opacity 0→1 via `.show`, `pointer-events: none`,
  `z-index: 1000`.
- **Buttons:** `.primary-btn` — `padding: 16px 50px`, `border-radius: 8px`,
  white bg/dark text, semibold; hover lifts `translateY(-3px)` with deeper
  shadow (`0 4px 8px` → `0 6px 12px`); `:active` returns to `translateY(0)`.
  `.secondary-btn` — borderless, `opacity: 0.7 → 1` on hover with
  `rgba(255,255,255,0.1)` bg. Floating round buttons: 48px circle,
  `border-radius: 50%`, fixed corner placement.
- **Toggles** (`.slider-toggle`): iOS-style pill, `border-radius: 24px`, `#444`
  off / **`#8b5fbf` on**, 20px white knob translating 24px, `transition: 0.4s`.
- **Info notes** (`.settings-note`): `border-left: 3px solid #8b5fbf` +
  `rgba(139,95,191,0.15)` tinted background.
- **Tabs** (`.tab` / `.tab.active`): flex-equal, opacity 0.7→1, active gets
  `rgba(255,255,255,0.1)` bg, container has rounded overflow-hidden corners.
- **Icons: inline SVG only.** No icon fonts, no icon libraries, no emoji as UI
  icons. Icon swaps use paired elements toggled in JS
  (e.g. `.enter-fullscreen-icon` / `.exit-fullscreen-icon`).

### CSS conventions

- **kebab-case component classes** (`.radial-menu-item`,
  `.leaderboard-history-result-card`). **Not BEM** (no `__`/`--`), **not
  Tailwind/utility-first**.
- State via appended classes: `.show`, `.active`, `.rank-gold`, etc.
- Theme/mode scoping via **body class prefixes**:
  `body.theme-dark .leaderboard-modal { ... }`.
- Files use ASCII banner section comments (`/* ═══ SECTION ═══ */`).
- IDs are used for one-off elements; occasional `!important` exists in
  theme-override territory — avoid adding new ones unless overriding a theme.

## Theming

Themes are `body.theme-*` classes toggled by `js/theme-manager.js` +
`js/settings.js` (not data-attributes, not separate stylesheets):
`theme-default`, `theme-dark`, `theme-light`, `theme-nature`, `theme-rain`
(GIF background), `theme-color` (solid `--color-theme-bg`), `theme-yourname`
(image), `theme-custom` (user upload via `--theme-bg`/`--theme-overlay`).

Mode classes stack on body: `reverse-mode`, `break-mode`, `focus-mode-active`,
`is-locked-in`, `is-fullscreen`. Image themes layer `.theme-overlay` and switch
panels to the frosted `rgba(255,255,255,0.1)` treatment. **Any new UI must be
checked against at least `theme-default`, `theme-dark`, and one image theme** —
theme-scoped overrides live mostly in `css/utilities.css`.

## Motion

- Default: `var(--transition)` = `all 0.3s ease`. Toggles: `0.4s`. Focus-mode
  layout: `0.5s ease`. Progress bars: `width 1s linear`.
- Signature easing curves — reuse, don't invent:
  - `cubic-bezier(0.34, 1.56, 0.64, 1)` — playful overshoot, for modal/badge
    entrances (the "Customodoro pop").
  - `cubic-bezier(0.16, 1, 0.3, 1)` — smooth expo ease-out for pop-ins.
  - `cubic-bezier(0.4, 0, 0.2, 1)` — Material standard, general movement.
- ~45 named keyframes already exist (`modalFadeIn`, `popIn`, `pulse`,
  `badgeGlow`, `streak-pop`, `progress-shimmer`, `equalize`, …). **Grep for an
  existing keyframe before writing a new one.** Glow/shimmer effects are
  reserved for gamification (badges, streaks, ranks) — don't spread them onto
  regular UI.

## Layout & responsive

- Breakpoints (max-width, desktop-down): **768px** and **480px** dominate;
  also 360px (small phones), 600px, and orientation queries
  (`orientation: landscape/portrait`) for fullscreen timer/music views.
- Mobile hardening: `body { overflow-x: hidden; touch-action: manipulation }`,
  thin custom scrollbars.
- Stylesheet ownership — put styles in the right file:

| File | Owns |
|---|---|
| `css/style.css` | Tokens, base, timer, tabs, buttons, toast, tasks, typography |
| `css/features.css` | Settings modal, radial menu, focus/locked-in mode, toggles/sliders |
| `css/utilities.css` | Leaderboard, badges/glows, theme-scoped overrides |
| `css/media-players.css` | BGM player, mini player, album art, equalizer |
| `css/burnup-tracker.css` | Burn-up progress tracker |
| `css/pomodoro-guide.css` | Guide page |
| `css/theme-uploader.css` | Custom-theme upload UI |
