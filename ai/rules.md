# Design System Rules

## Hard Rules (never break these)
1. No hardcoded colors — use var(--color-*) custom properties
2. No hardcoded font weights — use var(--font-weight-*) custom properties
3. No font families other than Space Grotesk, Spectral, and JetBrains Mono
4. Display and title tokens use weight 300 (light) — body, label, and code tokens use weight 400 (regular) — 600/700 are ad-hoc only via --font-weight-semibold / --font-weight-bold
5. Accent green (foreground.action, foreground.accent, background.action, background.accent) is never resting text or decoration — it signals interactivity or intentional emphasis only
6. All text must meet WCAG AA contrast (4.5:1) against its background — all pairings in the system already do; do not introduce new ones without checking
7. Spacing values must come from the defined scale — do not introduce arbitrary values
8. No hardcoded font sizes — use var(--font-size-*) primitives or semantic font shorthand tokens
9. Never use primitive tokens (color.green.*, space.*, font.size.*) in UI code — always go through the semantic layer

## Soft Rules (prefer but can flex)
1. Prefer semantic font shorthand tokens (--font-display, --font-title-large, --font-body-large, --font-label-medium, etc.) over assembling individual primitives
2. Use individual --font-size-* and --font-line-height-* primitives only when the shorthand would be overridden anyway
3. Prefer Spectral for long-form prose, Space Grotesk for titles, UI, and labels
4. Prefer semantic spacing tokens (--spacing-*) over raw space primitives
5. Borders should use --color-border-default unless there is a strong, specific reason for something else
6. Prefer background.alt for card-level surface separation over shadows — use shadow tokens only when true elevation is needed

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

### Code
- **font.code** (400 / 0.875rem / lh 1.6 / JetBrains Mono): all code blocks, inline code, terminal UI

## Per-Site Variations
- **riverromney.com** (.com): Base tokens, no overrides
- **riverromney.design** (.design): Base tokens, no overrides
- **riverromney.art** (.art): Override background.default to pure black (#000000) for photo contrast
- **riverromney.blog** (.blog): Override body font size to 18px, line-height to 1.7 (font.lineHeight.relaxed)

