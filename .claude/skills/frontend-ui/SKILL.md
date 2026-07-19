---
name: frontend-ui
description: Use before ANY change to HTML, CSS, styling, layout, themes, animations, components, or user-visible UI in Customodoro. Loads the project design system and anti-slop checklist so output matches the existing hand-crafted design language instead of generic AI defaults. Triggers on UI, design, style, CSS, modal, button, toggle, theme, animation, layout, responsive.
---

# Frontend UI work

Customodoro's design is hand-crafted (taupe/slate palette, single `#8b5fbf`
accent, Inter, 16px cards, signature motion). Generic AI styling is not
acceptable. Before writing any markup or CSS:

1. **Read both design docs in full:**
   - [docs/agent/DESIGN_SYSTEM.md](../../../docs/agent/DESIGN_SYSTEM.md) — concrete tokens, component recipes, motion curves, stylesheet ownership.
   - [docs/agent/UI_UX_GUIDELINES.md](../../../docs/agent/UI_UX_GUIDELINES.md) — never/always rules, craft bar, accessibility bar, timer-app UX rules.
2. **Verify live tokens at the source** — grep the `:root` blocks in
   `css/style.css` before using any color/size/shadow value. If a needed token
   doesn't exist, add it to `:root`; never inline arbitrary values.
3. **Find the pattern to copy** — before building a component, locate the
   closest existing one (modal, toggle, card, toast, tab) and match its class
   naming, state pattern (`.show`/`.active`), and motion.
4. **Remember the constraints:**
   - Two-page parity: mirror changes across `index.html` ↔ `reverse.html`.
   - Theme matrix: verify on `theme-default`, `theme-dark`, one image theme,
     and in `focus-mode-active`/`is-locked-in` if visible there.
   - Put styles in the stylesheet that owns the domain; bump `?v=` busters.
5. **Before finishing, run the 10-item pre-ship checklist** at the end of
   UI_UX_GUIDELINES.md and fix anything that fails.
