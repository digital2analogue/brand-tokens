# Design System Rules

## Hard Rules (never break these)
1. No hardcoded colors — use var(--color-*) custom properties
2. No hardcoded font weights — use var(--font-weight-*) custom properties
3. No font families other than Space Grotesk and Spectral
4. No font weights other than 300, 400, 500, 600, and 700 — title tokens use 400 (regular); 600/700 are ad-hoc only via --font-weight-semibold / --font-weight-bold
5. Accent green is hover/interactive only
6. All text must meet WCAG AA contrast (4.5:1) against its background
7. Spacing values must come from the scale: 4, 8, 16, 24, 48, 80
8. No hardcoded font sizes — use var(--font-size-*) primitives or semantic font shorthand tokens

## Soft Rules (prefer but can flex)
1. Prefer the semantic `font:` shorthand tokens (--font-title-large, --font-body, --font-label-medium, etc.) over assembling primitives
2. Use individual --font-size-* and --font-line-height-* primitives only when the shorthand would be overridden anyway
3. Prefer Spectral for long-form content, Space Grotesk for UI and labels
4. Prefer the spacing scale over arbitrary values, but adjust for optical alignment when needed
5. Borders should use --color-border-default unless there's a strong reason for something else

## Typography Hierarchy
- **title-large** (400 / 2.5rem / lh 1.1): hero, page title
- **title-medium** (400 / 2rem / lh 1.25): intro paragraphs, blog h1, featured text
- **title-small** (400 / 1.5rem / lh 1.25): section headers, blog h2, category labels, intro text
- **body-large** (1rem / lh 1.6): default body/paragraph text — Spectral
- **body-medium** (0.875rem / lh 1.6): secondary body text, smaller prose — Spectral
- **body-small** (0.75rem / lh 1.6): tertiary body text, fine prose — Spectral
- **label-large** (1rem / lh 1.25): section headers, prominent UI labels — Space Grotesk
- **label-medium** (0.875rem / lh 1.25): navigation, button text, standard UI
- **label-small** (0.75rem / lh 1.25): meta text, captions, fine print

## Per-Site Variations
- **riverromney.com** (.com): Base tokens, no overrides
- **riverromney.design** (.design): Base tokens, no overrides
- **riverromney.art** (.art): Base tokens, no overrides
- **riverromney.blog** (.blog): Override body font size to 18px, line-height to 1.7
