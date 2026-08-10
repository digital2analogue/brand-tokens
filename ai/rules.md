---
scope: rules
applies-to: [base, dot-art, dot-blog, decision-engine]
always-on: true
---

# Design System Rules

Every rule carries a **verification mode** saying how it is actually enforced, because
"this is a rule" and "something checks this rule" are different claims and only one of
them is a promise:

- **`[lint]`** — a detector in `scripts/rules.mjs` catches it. Gates `validate`,
  `drift-lint` and the MCP's `check_usage`. A rule marked `lint` with no detector behind
  it fails the test suite.
- **`[gate]`** — a build check in `validate.mjs` other than the lint pass (e.g. the
  contrast pairing gate, §5).
- **`[schema]`** — structurally impossible to violate; `schemas/meta.schema.json` rejects it.
- **`[manual]`** — **no automated check exists.** Needs semantic context a static checker
  does not have. These are the honest gaps, not oversights: an agent reading a `manual`
  rule should know its own judgement is the only thing enforcing it.

IDs are positional (`hard-5` is the fifth hard rule) and are referenced by
`rules[]` in every component's `*.meta.json`. **Append new rules; never insert one
mid-list** — renumbering would silently repoint every reference.

## Hard Rules (never break these)
1. **[lint]** No hardcoded colors — use var(--color-*) custom properties
2. **[lint]** No hardcoded font weights — use var(--font-weight-*) custom properties
3. **[lint]** No font families other than Space Grotesk, Spectral, and JetBrains Mono
4. **[manual]** Display and title tokens use weight 300 (light) — body, label, and code tokens use weight 400 (regular) — label-strong tokens use weight 500 (medium) for emphasis — 600/700 are ad-hoc only via --font-weight-semibold / --font-weight-bold
5. **[manual]** Accent green (foreground.action, foreground.accent, background.action, background.accent) is never resting text or decoration — it signals interactivity or intentional emphasis only
6. **[gate]** All text must meet WCAG AA contrast (4.5:1) against its background — all pairings in the system already do; do not introduce new ones without checking
7. **[manual]** Spacing values must come from the defined scale — do not introduce arbitrary values
8. **[lint]** No hardcoded font sizes — use var(--font-size-*) primitives or semantic font shorthand tokens
9. **[lint]** Never use primitive tokens (color.green.*, space.*, font.size.*) in UI code — always go through the semantic layer
10. **[lint]** Motion must respect `prefers-reduced-motion` (WCAG 2.3.3). The built brand CSS zeroes `--motion-duration-*` under `reduce`, so token-driven transitions stop automatically — never hardcode a transition/animation duration that bypasses the tokens. Any infinite animation (spin, shimmer, pulse) cannot be reached by the token override and MUST carry its own `@media (prefers-reduced-motion: reduce)` guard that stops or damps it
11. **[manual]** Token custom properties (`--color-*`, `--font-*`, `--spacing-*`, `--radius-*`, etc.) are already defined at `:root` by the site's loaded brand CSS — never declare or redeclare one yourself, not even with its correct value, and not to make a standalone snippet self-contained; reference it with `var(--token-name)` and assume the surrounding page provides the definition
12. **[manual]** Never partially override a font shorthand token (`font: var(--font-*)`) with an individual `font-size`, `font-weight`, or `line-height` declaration — pick a different shorthand token for the size/weight you need, or leave the shorthand alone

## Soft Rules (prefer but can flex)
1. **[manual]** Prefer semantic font shorthand tokens (--font-display, --font-title-large, --font-body-large, --font-label-medium, etc.) over assembling individual primitives
2. **[manual]** Use individual --font-size-* and --font-line-height-* primitives only when the shorthand would be overridden anyway
3. **[manual]** Prefer Spectral for long-form prose, Space Grotesk for titles, UI, and labels
4. **[manual]** Prefer semantic spacing tokens (--spacing-*) over raw space primitives
5. **[manual]** Borders should use --color-border-default (legible, ≥3:1 on canvas) unless there is a strong, specific reason for something else. For deliberately quiet decorative edges use --color-border-alt — never as the only boundary of an interactive control (SC 1.4.11)
6. **[manual]** Prefer background.alt for card-level surface separation over shadows — use shadow tokens only when true elevation is needed

## Typography Hierarchy

### Display (expressive)
- **font.display** (300 / 2.5rem / lh 1.1 / Space Grotesk): hero statements, splash headlines, page-defining moments — expressive and editorial, not a structural heading. Use once per page maximum.

### Title (structural headings)
- **font.title.large** (300 / 2rem / lh 1.25 / Space Grotesk): primary page heading — h1 equivalent
- **font.title.medium** (300 / 1.5rem / lh 1.25 / Space Grotesk): section heading — h2 equivalent
- **font.title.small** (300 / 1.25rem / lh 1.25 / Space Grotesk): sub-section heading — h3 equivalent

### Body (prose)
- **font.body.large** (400 / 1rem / lh 1.6 / Spectral): default body/paragraph text
- **font.body.medium** (400 / 0.875rem / lh 1.6 / Spectral): secondary body, supporting prose
- **font.body.small** (400 / 0.75rem / lh 1.6 / Spectral): fine print, footnotes

### Label (UI)
- **font.label.large** (400 / 1rem / lh 1.25 / Space Grotesk): prominent UI labels, section headers
- **font.label.medium** (400 / 0.875rem / lh 1.25 / Space Grotesk): navigation, button text, standard UI
- **font.label.small** (400 / 0.75rem / lh 1.25 / Space Grotesk): meta text, captions, fine print

### Label Strong (emphasized UI)
Same sizes as Label; weight stepped up to 500 (medium). Use for active states, primary CTAs, and any label that must assert itself without changing size.
- **font.label-strong.large** (500 / 1rem / lh 1.25 / Space Grotesk): active primary nav, section header labels with extra weight
- **font.label-strong.medium** (500 / 0.875rem / lh 1.25 / Space Grotesk): button text, active tab labels, table column headers
- **font.label-strong.small** (500 / 0.75rem / lh 1.25 / Space Grotesk): active badge labels, selected filter chips, emphasized metadata

### Code
- **font.code** (400 / 0.875rem / lh 1.6 / JetBrains Mono): all code blocks, inline code, terminal UI

## Per-Site Variations
- **riverromney.com** (.com): Base tokens, no overrides
- **riverromney.design** (.design): Base tokens, no overrides
- **riverromney.art** (.art): Override background.default to pure black (#000000) for photo contrast
- **riverromney.blog** (.blog): Override body font size to 18px, line-height to 1.7 (font.lineHeight.relaxed)
- **decision-engine** (sub-brand): Full light-mode inversion — white background, primary blue (#2456E4) as action/accent, cool-gray text hierarchy, multi-color outcome states (green=Approve, red=Deny, purple=Review). **Approved font exception**: uses Geist instead of Space Grotesk — enterprise data UI convention for this product only. Source: tokens/brands/decision-engine.tokens.json. Build: node scripts/build-brands.mjs. For resolved token values read build/css/decision-engine.css — ai/DESIGN.md covers the base dark theme only.

