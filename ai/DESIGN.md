# River Romney Design System — Base Dark Theme

## Visual Identity
Dark-first, green-phosphor aesthetic. Minimalist terminal-meets-editorial. Space Grotesk (sans, titles/UI), Spectral (serif, body), JetBrains Mono (code). Single accent: phosphor green (#4ADE6E) signals interactivity only.

---

## Color Tokens

Use ONLY the semantic CSS custom properties below. Never use hex values. Never reference primitive tokens (`--primitive-color-*`) in UI code.

### Background
| CSS Property | Hex | Usage |
|---|---|---|
| --color-background-default | #0A0D0A | Page canvas |
| --color-background-alt | #1E241E | Cards, panels, inputs, code blocks |
| --color-background-disabled | #2E3A2E | Disabled element fills |
| --color-background-action | #4ADE6E | Primary button fill, selected states, active toggles |
| --color-background-action-hover | #3EBA5C | Hovered action fill |
| --color-background-action-active | #349B4D | Pressed action fill |
| --color-background-accent | #4ADE6E | Decorative fills (non-interactive) |
| --color-background-success | #4ADE6E | Success badges, status pills |
| --color-background-success-alt | #0F2016 | Success alert/banner backgrounds |
| --color-background-warning | #FCD34D | Warning badges, status pills |
| --color-background-warning-alt | #221B08 | Warning alert/banner backgrounds |
| --color-background-info | #2456E4 | Info badges, banners |
| --color-background-info-alt | #0D1830 | Info alert/banner backgrounds |
| --color-background-danger | #D03027 | Destructive button fill, error surfaces |
| --color-background-danger-alt | #F5F6F7 | Error alert backgrounds |
| --color-background-accent-green | #0F2016 | Green chip/tag fills |
| --color-background-accent-blue | #0D1830 | Blue chip/tag fills |
| --color-background-accent-violet | #18102E | Violet chip/tag fills |
| --color-background-accent-amber | #221B08 | Amber chip/tag fills |

### Foreground
| CSS Property | Hex | Contrast | Usage |
|---|---|---|---|
| --color-foreground-default | #C8CFC4 | 12.3:1 AAA | Primary text and icons |
| --color-foreground-alt | #A0A89A | 8.0:1 AA | Secondary text |
| --color-foreground-muted | #8B9683 | 6.3:1 AA | Tertiary text, placeholders, helper text |
| --color-foreground-disabled | #1E241E | exempt | Disabled element labels |
| --color-foreground-action | #4ADE6E | 11.1:1 AAA | Links, active nav, text CTAs |
| --color-foreground-on-action | #0A0D0A | 11.1:1 AAA | Text on background-action fills |
| --color-foreground-accent | #4ADE6E | 11.1:1 AAA | Emphasis text (non-interactive) |
| --color-foreground-on-accent | #0A0D0A | 11.1:1 AAA | Text on background-accent fills |
| --color-foreground-success | #4ADE6E | 11.1:1 AAA | Success text/icons |
| --color-foreground-on-success | #0A0D0A | 11.1:1 AAA | Text on success fills |
| --color-foreground-warning | #FCD34D | 12.0:1 AAA | Warning text/icons |
| --color-foreground-on-warning | #0A0D0A | — | Text on warning fills |
| --color-foreground-info | #93C5FD | 7.5:1 AA | Informational text/icons |
| --color-foreground-on-info | #FFFFFF | — | Text on info fills |
| --color-foreground-danger | #D03027 | 4.6:1 AA | Error text, delete labels |
| --color-foreground-on-danger | #FFFFFF | — | Text on destructive fills |
| --color-foreground-accent-green | #4ADE6E | 11.1:1 AAA | Green accent text/icons, pair with bg-accent-green |
| --color-foreground-accent-blue | #93C5FD | 7.5:1 AA | Blue accent text/icons, pair with bg-accent-blue |
| --color-foreground-accent-violet | #C4B5FD | 7.0:1 AA | Violet accent text/icons |
| --color-foreground-accent-amber | #FCD34D | 12.0:1 AAA | Amber accent text/icons |

### Border
| CSS Property | Hex | Usage |
|---|---|---|
| --color-border-default | #1E241E | All UI edges — cards, inputs, dividers |
| --color-border-muted | #0F2016 | Hairline dividers, table row separators |
| --color-border-elevated | #2E3A2E | Prominent borders, raised surface edges |
| --color-border-hover | #8B9683 | Border on interactive hover |
| --color-border-active | #A0A89A | Border on active/pressed state |
| --color-border-focus | #4ADE6E | Focus ring — phosphor green for keyboard nav |
| --color-border-disabled | #0A0D0A | Border on disabled elements |

### State
| CSS Property | Hex | Usage |
|---|---|---|
| --color-state-hover | #1E241E | Background on hovered surfaces |
| --color-state-selected | #2E3A2E | Background on selected rows/items |

---

## Typography — Semantic Tokens

Display and title tokens: Space Grotesk weight 300 (light). Body: Spectral weight 400. Labels/Code: Space Grotesk weight 400. Label Strong: Space Grotesk weight 500.

### Display
| CSS Property | Resolved Value | Usage |
|---|---|---|
| --font-display | 300 2.5rem/1.1 Space Grotesk | Hero text, splash headlines. One per page maximum. |

### Title (structural headings)
| CSS Property | Resolved Value | Usage |
|---|---|---|
| --font-title-large | 300 2rem/1.25 Space Grotesk | Primary page heading (h1) |
| --font-title-medium | 300 1.5rem/1.25 Space Grotesk | Section heading (h2) |
| --font-title-small | 300 1.25rem/1.25 Space Grotesk | Sub-section heading (h3) |

### Body
| CSS Property | Resolved Value | Usage |
|---|---|---|
| --font-body-large | 400 1rem/1.6 Spectral | Default paragraph text |
| --font-body-medium | 400 0.875rem/1.6 Spectral | Secondary body text |
| --font-body-small | 400 0.75rem/1.6 Spectral | Fine print, footnotes |

### Label
| CSS Property | Resolved Value | Usage |
|---|---|---|
| --font-label-large | 400 1rem/1.25 Space Grotesk | Prominent UI labels |
| --font-label-medium | 400 0.875rem/1.25 Space Grotesk | Navigation, button text, standard UI |
| --font-label-small | 400 0.75rem/1.25 Space Grotesk | Meta text, captions, fine print |
| --font-label-xsmall | 400 0.625rem/1.25 Space Grotesk | Micro labels — constrained UI only (chip annotations, icon badges) |

### Label Strong (weight-emphasized UI)
Same sizes as Label but weight stepped up to 500. Use for active states, primary CTAs, emphasized labels.
| CSS Property | Resolved Value | Usage |
|---|---|---|
| --font-label-strong-large | 500 1rem/1.25 Space Grotesk | Active nav, prominent section headers |
| --font-label-strong-medium | 500 0.875rem/1.25 Space Grotesk | Button text, active tabs, column headers |
| --font-label-strong-small | 500 0.75rem/1.25 Space Grotesk | Active badges, selected chips, emphasized meta |
| --font-label-strong-xsmall | 500 0.625rem/1.25 Space Grotesk | Emphasized micro labels — active chip step indicators |

### Mono Label (monospaced UI metadata)
JetBrains Mono at label scale. Use for token names, value readouts, technical identifiers in UI chrome. Not for prose or code blocks — use font.code for those.
| CSS Property | Resolved Value | Usage |
|---|---|---|
| --font-mono-label-small | 400 0.75rem/1.25 JetBrains Mono | Token names, value metadata, technical UI labels |
| --font-mono-label-strong-small | 500 0.75rem/1.25 JetBrains Mono | All-caps category labels, active token identifiers, section markers |
| --font-mono-label-xsmall | 500 0.625rem/1.25 JetBrains Mono | Color chip step labels, compact mono annotations |

### Code
| CSS Property | Resolved Value | Usage |
|---|---|---|
| --font-code | 400 0.875rem/1.6 JetBrains Mono | All code blocks, inline code, terminal UI |

---

## Typography — Primitive Tokens

### Font Size Scale
| CSS Property | Value | Referenced by |
|---|---|---|
| --primitive-font-size-2xs | 0.625rem (10px) | font.label.xsmall, font.label-strong.xsmall, font.mono-label-xsmall |
| --primitive-font-size-xs | 0.75rem (12px) | font.body.small, font.label.small, font.label-strong.small, font.mono-label, font.mono-label-strong |
| --primitive-font-size-sm | 0.875rem (14px) | font.body.medium, font.label.medium, font.label-strong.medium, font.code |
| --primitive-font-size-base | 1rem (16px) | font.body.large, font.label.large, font.label-strong.large |
| --primitive-font-size-md | 1.25rem (20px) | font.title.small |
| --primitive-font-size-lg | 1.5rem (24px) | font.title.medium |
| --primitive-font-size-2xl | 2rem (32px) | font.title.large |
| --primitive-font-size-3xl | 2.5rem (40px) | font.display |

### Font Weight Scale
| CSS Property | Value | Usage |
|---|---|---|
| --primitive-font-weight-light | 300 | Display and title tokens |
| --primitive-font-weight-regular | 400 | Body, label, and code tokens |
| --primitive-font-weight-medium | 500 | Label Strong tokens |
| --primitive-font-weight-semibold | 600 | Ad-hoc emphasis only |
| --primitive-font-weight-bold | 700 | Ad-hoc strong emphasis only |

### Letter-Spacing
| CSS Property | Value | Usage |
|---|---|---|
| --letter-spacing-display | -0.01em | font.display |
| --letter-spacing-title | -0.025em | font.title.* |
| --letter-spacing-body | 0em | font.body.* |
| --letter-spacing-label | 0.03em | font.label.* |
| --letter-spacing-all-caps | 0.1em | ALL CAPS text only |

---

## Spacing

### Semantic Tokens (use these in UI code)
| CSS Property | Resolves to | Usage |
|---|---|---|
| --spacing-micro | 4px | Icon-to-label margins, badge gaps, tight nudges within one element |
| --spacing-tight | 8px | Checkbox-to-label, icon-to-text, stacked lines within one element |
| --spacing-inline | 12px | Nav row items, pill tag groups, horizontal list gaps |
| --spacing-element | 16px | Default internal padding — inputs, buttons, menu items, list rows |
| --spacing-component | 24px | Between distinct components — label-to-input, card-to-card |
| --spacing-group | 32px | Between component groups — form sections, card grid gaps |
| --spacing-layout | 48px | Between major layout regions — sidebar/main, header/first content |
| --spacing-block | 64px | Between content blocks within a section — text/media, editorial rows |
| --spacing-page | 80px | Between major editorial sections — hero-to-content, section-to-section in portfolio and doc contexts |
| --spacing-section | 128px | Between top-level page sections — hero, features, footer |

### Primitives (never use directly in UI)
| CSS Property | Value |
|---|---|
| --primitive-space-3xs | 2px |
| --primitive-space-2xs | 4px |
| --primitive-space-xs | 8px |
| --primitive-space-sm | 12px |
| --primitive-space-md | 16px |
| --primitive-space-lg | 24px |
| --primitive-space-xl | 32px |
| --primitive-space-2xl | 48px |
| --primitive-space-3xl | 64px |
| --primitive-space-4xl | 80px |
| --primitive-space-5xl | 128px |

---

## Motion — Semantic Tokens

### Duration
| CSS Property | Value | Usage |
|---|---|---|
| --motion-duration-instant | 120ms | Hover states, focus rings, color swaps — felt but not watched |
| --motion-duration-standard | 200ms | Dropdowns, tooltips, accordion expand/collapse — the default |
| --motion-duration-emphasized | 350ms | Modals, drawers, page-level transitions — eye tracks consciously |

### Easing
| CSS Property | Value | Usage |
|---|---|---|
| --motion-easing-enter | cubic-bezier(0,0,0.58,1) | Elements appearing — starts fast, decelerates to rest |
| --motion-easing-exit | cubic-bezier(0.42,0,1,1) | Elements disappearing — starts slow, accelerates to exit |
| --motion-easing-move | cubic-bezier(0.42,0,0.58,1) | Repositioning within viewport — panels, tab indicators |
| --motion-easing-default | cubic-bezier(0.25,0.1,0.25,1) | Directionless fades, color shifts |

---

## Border Radius
| CSS Property | Value | Usage |
|---|---|---|
| --radius-none | 0 | Tables, code blocks, structural layout |
| --radius-sm | 4px | Inputs, tags, small chips |
| --radius-default | 8px | Buttons, dropdowns, most components |
| --radius-lg | 12px | Cards, panels |
| --radius-xl | 16px | Modals, hero cards |
| --radius-full | 9999px | Badges, pills, avatars |

---

## Shadow
| CSS Property | Value | Usage |
|---|---|---|
| --shadow-none | none | Flat — no elevation; use background.alt for surface separation |
| --shadow-raised | 0 1px 3px rgba(0,0,0,0.08) | Subtle lift — inputs on hover/focus |
| --shadow-overlay | 0 6px 20px rgba(0,0,0,0.16) | Context menus, popovers, dropdowns |
| --shadow-dialog | 0 12px 40px rgba(0,0,0,0.24) | Modals, drawers, toasts |

Cards use `background.alt` for surface separation — no shadow token needed.

---

## Iconography
| CSS Property | Value | Usage |
|---|---|---|
| --icon-size-compact | 16px | Dense UI — input adornments, tag icons, tight toolbars |
| --icon-size-default | 20px | Default — nav items, button icons, list row glyphs |
| --icon-size-large | 24px | Section header icons, standalone icon buttons |
| --icon-size-xl | 32px | Empty states, onboarding illustrations |

---

## Hard Guardrails
- NEVER use hex values — always `var(--color-*)`
- NEVER reference `--primitive-*` tokens in UI code
- NEVER fabricate tokens — if not listed above, it does not exist
- Display and title tokens are weight 300 (light) — not 400
- Accent green is NEVER resting text — interactivity or intentional emphasis only
- All text/bg pairings in this system pass WCAG AA (4.5:1) — verify before adding new ones
- Spacing values must come from the defined scale — no arbitrary values
