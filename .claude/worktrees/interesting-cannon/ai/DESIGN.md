# River Romney Design System

## Visual Identity
Dark-first, green-phosphor aesthetic. Minimalist. Two typefaces: Space Grotesk (sans, headers/UI) and Spectral (serif, body). The vibe is terminal-meets-editorial.

## Color Tokens (use ONLY these CSS custom properties)
| Property | Value | Usage |
|----------|-------|-------|
| --color-background-default | #0A0D0A | Page background |
| --color-background-alt | #1E241E | Cards, borders, secondary surfaces |
| --color-foreground-primary | #C8CFC4 | Body text, primary content |
| --color-foreground-secondary | #A0A89A | Supporting text |
| --color-foreground-muted | #8B9683 | Labels, descriptions, tertiary text |
| --color-foreground-accent | #4ADE6E | Hover states and interactive highlights ONLY |
| --color-border-default | #1E241E | Dividers and borders |

## Typography — Semantic Tokens (font shorthand)
Use these for setting the `font:` property. Each resolves to `weight size/line-height family`.

| Token | CSS Property | Resolved Value | Usage |
|-------|-------------|----------------|-------|
| title-large | --font-title-large | 400 2.5rem/1.1 Space Grotesk | Hero text, page titles |
| title-medium | --font-title-medium | 400 2rem/1.25 Space Grotesk | Intro paragraphs, blog h1, featured text |
| title-small | --font-title-small | 400 1.5rem/1.25 Space Grotesk | Section labels, blog h2, category headers, intro text |
| body-large | --font-body-large | 400 1rem/1.6 Spectral | Default body/paragraph text (16px) |
| body-medium | --font-body-medium | 400 0.875rem/1.6 Spectral | Secondary body text (14px) |
| body-small | --font-body-small | 400 0.75rem/1.6 Spectral | Tertiary body text, fine prose (12px) |
| label-large | --font-label-large | 400 1rem/1.25 Space Grotesk | Section headers, prominent UI labels (16px) |
| label-medium | --font-label-medium | 400 0.875rem/1.25 Space Grotesk | Navigation, button text, standard UI (14px) |
| label-small | --font-label-small | 400 0.75rem/1.25 Space Grotesk | Meta text, captions, fine print (12px) |

## Typography — Primitive Tokens

### Font Size Scale
| Token | CSS Property | Value | Usage |
|-------|-------------|-------|-------|
| font.size.xs | --font-size-xs | 0.75rem | 12px — fine print, captions |
| font.size.sm | --font-size-sm | 0.875rem | 14px — UI labels, nav |
| font.size.base | --font-size-base | 1rem | 16px — body text |
| font.size.md | --font-size-md | 1.25rem | 20px — content headings h2 |
| font.size.lg | --font-size-lg | 1.5rem | 24px — title-small / section labels |
| font.size.xl | --font-size-xl | 1.75rem | 28px — (unused in semantic tokens) |
| font.size.2xl | --font-size-2xl | 2rem | 32px — title-medium / intro text |
| font.size.3xl | --font-size-3xl | 2.5rem | 40px — title-large / hero |

### Line Height Scale
| Token | CSS Property | Value | Usage |
|-------|-------------|-------|-------|
| font.lineHeight.tight | --font-line-height-tight | 1.1 | Titles and display text |
| font.lineHeight.snug | --font-line-height-snug | 1.25 | Headings |
| font.lineHeight.normal | --font-line-height-normal | 1.6 | Body text |
| font.lineHeight.relaxed | --font-line-height-relaxed | 1.7 | Long-form reading |

### Font Weight Scale
| Token | CSS Property | Value | Usage |
|-------|-------------|-------|-------|
| font.weight.light | --font-weight-light | 300 | Display/heading weight |
| font.weight.regular | --font-weight-regular | 400 | Body/UI weight — used by all semantic tokens |
| font.weight.medium | --font-weight-medium | 500 | Emphasis — reserved |
| font.weight.semibold | --font-weight-semibold | 600 | Semi-bold — ad-hoc emphasis |
| font.weight.bold | --font-weight-bold | 700 | Bold — ad-hoc strong emphasis |

### Font Families and Weights
| Role | Family | Weight | CSS Property |
|------|--------|--------|-------------|
| Headings, UI | Space Grotesk | 400 | --font-family-sans / --font-weight-regular |
| Body text | Spectral | 400 | --font-family-serif / --font-weight-regular |

## Spacing Scale (8px base)
--space-xs: 4px / --space-sm: 8px / --space-md: 16px / --space-lg: 24px / --space-xl: 48px / --space-2xl: 80px

## Guardrails
- NEVER use color hex values directly. Always use the CSS custom property (e.g., var(--color-background-default))
- NEVER fabricate token values. If a value isn't listed above, it doesn't exist in the system
- Accent green (#4ADE6E) via var(--color-foreground-accent) is for hover and interactive states ONLY — never use it as resting text or background color
- Prefer the `font:` shorthand semantic tokens (e.g., `font: var(--font-body)`) over assembling individual properties
- Only use primitives (--font-size-*, --font-line-height-*) when you need a single dimension without the full shorthand
- Dark mode is the only supported theme
- All text on background pairings meet WCAG AA (4.5:1 minimum). Do not create new pairings without checking contrast
- Minimal formatting: avoid heavy borders, shadows, or decorative elements. The aesthetic is clean and typographic
