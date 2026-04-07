# Design System Rules

## Hard Rules (never break these)
1. No hardcoded colors — use var(--color-*) custom properties
2. No hardcoded font weights — use var(--font-weight-*) custom properties
3. No font families other than Space Grotesk and Spectral
4. No font weights other than 300, 400, and 500
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
- **title-large** (2.5rem / lh 1.1): hero, page title
- **title-medium** (2rem / lh 1.25): intro paragraphs, featured text
- **title-small** (1.75rem / lh 1.25): section headers, category labels
- **heading-1** (1.5rem / lh 1.25): primary content heading (h1 in articles)
- **heading-2** (1.25rem / lh 1.25): secondary content heading (h2 in articles)
- **body** (1.125rem / lh 1.6): default body text — Spectral
- **label-medium** (0.875rem / lh 1.25): navigation, labels, standard UI
- **label-small** (0.75rem / lh 1.25): fine print, captions, smallest UI

## Per-Site Variations
- **riverromney.com** (.com): Base tokens, no overrides
- **riverromney.design** (.design): Base tokens, no overrides
- **riverromney.art** (.art): Override bg.primary to pure black (#000000) for photo contrast
- **riverromney.blog** (.blog): Override body font size to 18px, line-height to 1.7
