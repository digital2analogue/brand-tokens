# River Romney Design System

## Visual Identity
Dark-first, green-phosphor aesthetic. Minimalist. Two typefaces: Space Grotesk (sans, titles/UI) and Spectral (serif, body). The vibe is terminal-meets-editorial.

---

## Color Tokens

Use ONLY the semantic CSS custom properties below. Never use hex values directly. Never reference primitive tokens (--color-green-*, --color-neutral-*) in UI code.

### Background
| CSS Property | Hex | Usage |
|---|---|---|
| --color-background-default | #0A0D0A | Page canvas — every page, full-bleed section, outermost container |
| --color-background-alt | #1E241E | Elevated surfaces — cards, panels, inputs, code blocks, dropdowns |
| --color-background-action | #4ADE6E | Interactive fills — primary buttons, selected states, active toggles |
| --color-background-accent | #4ADE6E | Decorative fills — callouts, highlights, badges (non-interactive) |

### Foreground
| CSS Property | Hex | Contrast vs default | Usage |
|---|---|---|---|
| --color-foreground-default | #C8CFC4 | 12.26:1 AAA | Primary text and icons — headings, body, nav labels |
| --color-foreground-alt | #A0A89A | 7.97:1 AA | Secondary text — subtitles, metadata, supporting labels |
| --color-foreground-muted | #8B9683 | 6.32:1 AA | Tertiary text — placeholders, disabled labels, helper text |
| --color-foreground-action | #4ADE6E | 11.13:1 AAA | Interactive text — links, active nav, clickable labels |
| --color-foreground-accent | #4ADE6E | 11.13:1 AAA | Emphasis text — highlights, decorative details (non-interactive) |
| --color-foreground-on-action | #0A0D0A | 11.13:1 AAA | Text/icons on background.action surfaces (e.g. primary button label) |
| --color-foreground-on-accent | #0A0D0A | 11.13:1 AAA | Text/icons on background.accent surfaces |

### Border
| CSS Property | Hex | Usage |
|---|---|---|
| --color-border-default | #1E241E | All UI edges — cards, inputs, dividers, panels |

---

## Typography — Semantic Tokens

All title and display tokens use Space Grotesk at **weight 300 (light)**. All body tokens use Spectral at weight 400. All label and code tokens use Space Grotesk at weight 400.

### Display
| Token | CSS Property | Resolved Value | Usage |
|---|---|---|---|
| font.display | --font-display | 300 2.5rem/1.1 Space Grotesk | Hero text, splash headlines — expressive, not structural. One per page. |

### Title (structural headings)
| Token | CSS Property | Resolved Value | Usage |
|---|---|---|---|
| font.title.large | --font-title-large | 300 2rem/1.25 Space Grotesk | Primary page heading — h1 equivalent |
| font.title.medium | --font-title-medium | 300 1.5rem/1.25 Space Grotesk | Section heading — h2 equivalent |
| font.title.small | --font-title-small | 300 1.25rem/1.25 Space Grotesk | Sub-section heading — h3 equivalent |

### Body
| Token | CSS Property | Resolved Value | Usage |
|---|---|---|---|
| font.body.large | --font-body-large | 400 1rem/1.6 Spectral | Default body/paragraph text (16px) |
| font.body.medium | --font-body-medium | 400 0.875rem/1.6 Spectral | Secondary body text (14px) |
| font.body.small | --font-body-small | 400 0.75rem/1.6 Spectral | Fine prose, footnotes (12px) |

### Label
| Token | CSS Property | Resolved Value | Usage |
|---|---|---|---|
| font.label.large | --font-label-large | 400 1rem/1.25 Space Grotesk | Prominent UI labels (16px) |
| font.label.medium | --font-label-medium | 400 0.875rem/1.25 Space Grotesk | Navigation, button text, standard UI (14px) |
| font.label.small | --font-label-small | 400 0.75rem/1.25 Space Grotesk | Meta text, captions, fine print (12px) |

### Code
| Token | CSS Property | Resolved Value | Usage |
|---|---|---|---|
| font.code | --font-code | 400 0.875rem/1.6 JetBrains Mono | Code blocks, inline code, terminal UI |

---

## Typography — Primitive Tokens

### Font Size Scale
| Token | CSS Property | Value | Referenced by |
|---|---|---|---|
| font.size.xs | --font-size-xs | 0.75rem (12px) | font.body.small, font.label.small |
| font.size.sm | --font-size-sm | 0.875rem (14px) | font.body.medium, font.label.medium, font.code |
| font.size.base | --font-size-base | 1rem (16px) | font.body.large, font.label.large |
| font.size.md | --font-size-md | 1.25rem (20px) | font.title.small |
| font.size.lg | --font-size-lg | 1.5rem (24px) | font.title.medium |
| font.size.2xl | --font-size-2xl | 2rem (32px) | font.title.large |
| font.size.3xl | --font-size-3xl | 2.5rem (40px) | font.display |

### Line Height Scale
| Token | CSS Property | Value | Usage |
|---|---|---|---|
| font.lineHeight.tight | --font-line-height-tight | 1.1 | Display text only |
| font.lineHeight.snug | --font-line-height-snug | 1.25 | Title and label text |
| font.lineHeight.normal | --font-line-height-normal | 1.6 | Body and code text |
| font.lineHeight.relaxed | --font-line-height-relaxed | 1.7 | Long-form reading (.blog override) |

### Font Weight Scale
| Token | CSS Property | Value | Usage |
|---|---|---|---|
| font.weight.light | --font-weight-light | 300 | Display and title tokens |
| font.weight.regular | --font-weight-regular | 400 | Body, label, and code tokens |
| font.weight.medium | --font-weight-medium | 500 | Reserved — unmapped |
| font.weight.semibold | --font-weight-semibold | 600 | Ad-hoc emphasis only |
| font.weight.bold | --font-weight-bold | 700 | Ad-hoc strong emphasis only |

### Font Families
| Role | Family | Weight | CSS Property |
|---|---|---|---|
| Display, titles | Space Grotesk | 300 | --font-family-sans / --font-weight-light |
| Labels, UI | Space Grotesk | 400 | --font-family-sans / --font-weight-regular |
| Body text | Spectral | 400 | --font-family-serif / --font-weight-regular |
| Code | JetBrains Mono | 400 | --font-family-mono / --font-weight-regular |

---

## Letter-Spacing — Semantic Tokens

| Token | CSS Property | Value | Usage |
|---|---|---|---|
| letterSpacing.display | --letter-spacing-display | -0.01em | font.display — large hero text |
| letterSpacing.title | --letter-spacing-title | -0.025em | font.title.* — structural headings |
| letterSpacing.body | --letter-spacing-body | 0em | font.body.* — all prose |
| letterSpacing.label | --letter-spacing-label | 0.03em | font.label.* — UI labels, nav |
| letterSpacing.all-caps | --letter-spacing-all-caps | 0.1em | ALL CAPS text only |

⚠️ Note: The underlying primitives `letterSpacing.tightest` (-0.01em) and `letterSpacing.tight` (-0.025em) have inverted names — tight is actually tighter than tightest. The values are correct; names are pending a refactor.

---

## Spacing Scale

### Primitives (8px base)
| Token | CSS Property | Value |
|---|---|---|
| space.3xs | --space-3xs | 2px |
| space.2xs | --space-2xs | 4px |
| space.xs | --space-xs | 8px |
| space.sm | --space-sm | 12px |
| space.md | --space-md | 16px |
| space.lg | --space-lg | 24px |
| space.xl | --space-xl | 32px |
| space.2xl | --space-2xl | 48px |
| space.3xl | --space-3xl | 64px |
| space.4xl | --space-4xl | 80px |
| space.5xl | --space-5xl | 128px |

### Semantic Spacing
| Token | CSS Property | Resolves to | Usage |
|---|---|---|---|
| spacing.tight | --spacing-tight | 8px | Between closely related items — icon + label, checkbox + text |
| spacing.inline | --spacing-inline | 12px | Between adjacent but distinct items — nav row, tag group |
| spacing.element | --spacing-element | 16px | Internal component padding — inputs, buttons, list rows |
| spacing.component | --spacing-component | 24px | Between distinct components in a layout |
| spacing.layout | --spacing-layout | 48px | Between major layout regions — sidebar/content, header/body |
| spacing.section | --spacing-section | 128px | Between top-level page sections |

---

## Motion — Semantic Tokens

### Duration
| Token | CSS Property | Value | Usage |
|---|---|---|---|
| motion.duration.instant | --motion-duration-instant | 120ms | Hover states, focus rings, micro-interactions |
| motion.duration.standard | --motion-duration-standard | 200ms | Dropdowns, tooltips, accordion expand/collapse |
| motion.duration.emphasized | --motion-duration-emphasized | 350ms | Modals, drawers, page-level transitions |

### Easing
| Token | CSS Property | Value | Usage |
|---|---|---|---|
| motion.easing.enter | --motion-easing-enter | cubic-bezier(0,0,0.58,1) | Elements appearing/entering — decelerates to rest |
| motion.easing.exit | --motion-easing-exit | cubic-bezier(0.42,0,1,1) | Elements disappearing/exiting — accelerates to exit |
| motion.easing.move | --motion-easing-move | cubic-bezier(0.42,0,0.58,1) | Elements repositioning within viewport |
| motion.easing.default | --motion-easing-default | cubic-bezier(0.25,0.1,0.25,1) | Directionless transitions — fades, color shifts |

---

## Border Radius — Semantic Tokens

| Token | CSS Property | Value | Usage |
|---|---|---|---|
| radius.none | --radius-none | 0 | Code blocks, tables, structural layout elements |
| radius.sm | --radius-sm | 4px | Inputs, small tags, compact inline elements |
| radius.default | --radius-default | 8px | Buttons, dropdowns, most interactive components |
| radius.lg | --radius-lg | 12px | Cards, panels, contained content regions |
| radius.xl | --radius-xl | 16px | Modals, hero cards, large featured surfaces |
| radius.full | --radius-full | 9999px | Badges, avatars, pills, toggle switches |

---

## Shadow — Semantic Tokens

| Token | CSS Property | Value | Usage |
|---|---|---|---|
| shadow.none | --shadow-none | 0 0 0 0 transparent | Flat — no elevation. Use when background.alt provides separation. |
| shadow.raised | --shadow-raised | 0 1px 3px rgba(0,0,0,0.08) | Subtle lift — inputs on hover/focus, inline dropdowns |
| shadow.overlay | --shadow-overlay | 0 6px 20px rgba(0,0,0,0.16) | Context menus, popovers, dropdowns overlaying content |
| shadow.dialog | --shadow-dialog | 0 12px 40px rgba(0,0,0,0.24) | Modals, drawers, toasts — highest layer |

Note: There is no card-level shadow. Cards use `background.alt` (#1E241E) for surface separation — shadow is not needed.

---

## Guardrails
- NEVER use hex values directly — always use CSS custom properties (e.g. `var(--color-background-default)`)
- NEVER fabricate token values — if a token isn't listed above, it does not exist in the system
- NEVER reference primitive tokens in UI code — always go through the semantic layer
- Display and title tokens use **weight 300 (light)** — not 400
- Accent green (#4ADE6E) via `foreground.action` or `foreground.accent` is never resting text — it signals interactivity or intentional emphasis only
- Always pair text on action/accent backgrounds with `foreground.on-action` or `foreground.on-accent`
- Dark mode is the only supported theme (v1)
- All text/background pairings in this system meet WCAG AA (4.5:1 minimum) — do not create new pairings without verifying contrast
- Minimal decoration: the aesthetic is typographic. Avoid heavy borders, gradients, or ornamental shadows.
