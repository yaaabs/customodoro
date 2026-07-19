@AGENTS.md

## Claude Code specifics

- Before any UI/CSS/HTML work, use the `frontend-ui` skill — it loads the
  design system and anti-slop checklist.
- To verify a change end-to-end, use the `verify` skill (tests + local serve +
  parity/theme checks).
- When preparing a release or version bump, use the `release-version-bump`
  skill — there is no automation; the ritual is manual.
- Windows host: prefer the Grep/Glob/Read tools over shell equivalents.
