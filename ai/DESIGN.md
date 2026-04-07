# River Romney Design System

## Visual Identity
Dark-first, green-phosphor aesthetic. Minimalist. Two typefaces: Space Grotesk (sans, headers/UI) and Spectral (serif, body). The vibe is terminal-meets-editorial.

## Color Tokens (use ONLY these CSS custom properties)
| Property | Value | Usage |
|----------|-------|-------|
| --color-bg-primary | #0A0D0A | Page background |
| --color-bg-secondary | #1E241E | Cards, borders, secondary surfaces |
| --color-text-primary | #C8CFC4 | Body text, primary content |
| --color-text-secondary | #A0A89A | Supporting text |
| --color-text-muted | #8B9683 | Labels, descriptions, tertiary text |
| --color-accent | #4ADE6E | Hover states and interactive highlights ONLY |
| --color-border-default | #1E241E | Dividers and borders |

## Typography
| Role | Family | Weight | CSS Property |
|------|--------|--------|-------------|
| Headings (h1-h6) | Space Grotesk | 300 | --font-heading-family / --font-weight-light |
| Body text | Spectral | 400 | --font-body-family / --font-weight-regular |
| UI (nav, buttons, labels) | Space Grotesk | 400 | --font-ui-family / --font-weight-regular |

## Spacing Scale (8px base)
--space-xs: 4px / --space-sm: 8px / --space-md: 16px / --space-lg: 24px / --space-xl: 48px / --space-2xl: 80px

## Guardrails
- NEVER use color hex values directly. Always use the CSS custom property (e.g., var(--color-bg-primary))
- NEVER fabricate token values. If a value isn't listed above, it doesn't exist in the system
- Accent green (#4ADE6E) is for hover and interactive states ONLY — never use it as resting text or background color
- Only two font weights exist: 300 (headings) and 400 (everything else). Do not use 500, 600, 700, etc.
- Dark mode is the only supported theme
- All text on background pairings meet WCAG AA (4.5:1 minimum). Do not create new pairings without checking contrast
- Minimal formatting: avoid heavy borders, shadows, or decorative elements. The aesthetic is clean and typographic
