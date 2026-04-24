# Design System Rules

## Hard Rules (never break these)
1. No hardcoded colors — use var(--color-*) custom properties
2. No hardcoded font weights — use var(--font-weight-*) custom properties
3. No font families other than Space Grotesk and Spectral
4. No font weights other than 300 and 400
5. Accent green is hover/interactive only
6. All text must meet WCAG AA contrast (4.5:1) against its background
7. Spacing values must come from the scale: 4, 8, 16, 24, 48, 80

## Soft Rules (prefer but can flex)
1. Prefer Spectral for long-form content, Space Grotesk for UI and labels
2. Prefer the spacing scale over arbitrary values, but adjust for optical alignment when needed
3. Borders should use --color-border-default unless there's a strong reason for something else

## Per-Site Variations
- **riverromney.com** (.com): Base tokens, no overrides
- **riverromney.design** (.design): Base tokens, no overrides
- **riverromney.art** (.art): Override bg.primary to pure black (#000000) for photo contrast
- **riverromney.blog** (.blog): Override body font size to 18px, line-height to 1.7
