---
version: alpha
name: River Romney
description: >
  Dark-first, green-phosphor design system for riverromney.com, .design, .art,
  and .blog. Terminal-meets-editorial. Three typefaces, one color story.

colors:
  primary: "#4ADE6E"
  secondary: "#C8CFC4"
  tertiary: "#A0A89A"
  neutral: "#8B9683"
  background: "#0A0D0A"
  surface: "#1E241E"
  on-primary: "#0A0D0A"

typography:
  display:
    font: "Space Grotesk"
    weight: 300
    size: "2.5rem"
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline-large:
    font: "Space Grotesk"
    weight: 300
    size: "2rem"
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline-medium:
    font: "Space Grotesk"
    weight: 300
    size: "1.5rem"
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline-small:
    font: "Space Grotesk"
    weight: 300
    size: "1.25rem"
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body-large:
    font: "Spectral"
    weight: 400
    size: "1rem"
    lineHeight: 1.6
    letterSpacing: "0em"
  body-medium:
    font: "Spectral"
    weight: 400
    size: "0.875rem"
    lineHeight: 1.6
    letterSpacing: "0em"
  body-small:
    font: "Spectral"
    weight: 400
    size: "0.75rem"
    lineHeight: 1.6
    letterSpacing: "0em"
  label-large:
    font: "Space Grotesk"
    weight: 400
    size: "1rem"
    lineHeight: 1.25
    letterSpacing: "0.03em"
  label-medium:
    font: "Space Grotesk"
    weight: 400
    size: "0.875rem"
    lineHeight: 1.25
    letterSpacing: "0.03em"
  label-small:
    font: "Space Grotesk"
    weight: 400
    size: "0.75rem"
    lineHeight: 1.25
    letterSpacing: "0.03em"
  code:
    font: "JetBrains Mono"
    weight: 400
    size: "0.875rem"
    lineHeight: 1.6
    letterSpacing: "0em"

spacing:
  tight: "8px"
  inline: "12px"
  element: "16px"
  component: "24px"
  layout: "48px"
  section: "128px"

rounded:
  none: 0
  sm: "4px"
  default: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"

components:
  button:
    backgroundColor: primary
    textColor: on-primary
    rounded: default
    padding: element
    typography: label-medium
  card:
    backgroundColor: surface
    textColor: secondary
    rounded: lg
    padding: component
    typography: body-large
  input:
    backgroundColor: surface
    textColor: secondary
    rounded: sm
    padding: element
    typography: label-medium
  link:
    textColor: primary
    typography: body-large
  nav:
    textColor: secondary
    typography: label-medium
  badge:
    backgroundColor: primary
    textColor: on-primary
    rounded: full
    typography: label-small
  code-block:
    backgroundColor: surface
    textColor: secondary
    rounded: none
    typography: code
---

## Identity

Dark-first, green-phosphor aesthetic. Minimalist. The vibe is terminal-meets-editorial — clean structure from Space Grotesk, warmth and readability from Spectral, technical credibility from JetBrains Mono.

One color story: a single-hue green ramp from near-black to vivid accent. The warm green undertone in the background is what separates this from a generic dark theme. There is no light mode (v1).

## Color usage

The palette has two surface levels, three text levels, and one accent.

**Surfaces:** `background` is the page canvas — every page, full-bleed section, outermost container. `surface` is one level up — cards, panels, inputs, code blocks. The difference is intentionally subtle; a quiet layer, not a strong contrast shift.

**Text hierarchy:** `secondary` is primary text (12.26:1 AAA). `tertiary` is secondary text (7.97:1 AA). `neutral` is muted text (6.32:1 AA). Use the step-down to create visual hierarchy without resorting to bold or underline.

**Accent green:** `primary` is the only high-chroma value. It signals interactivity (links, buttons, active states) or intentional emphasis (a highlighted keyword, a decorative badge). It is never resting body text. Text on green surfaces uses `on-primary` — contrast is 11.13:1 AAA.

**Borders:** Use `surface` for all edges — cards, inputs, dividers. Borders recede; they delineate, not decorate.

## Typography

Three typefaces cover all roles. Never substitute.

**Space Grotesk** (sans): All titles, headings, labels, navigation, buttons, and UI text. At display and title sizes, always weight 300 (light) — the low weight at large sizes creates the elegant, airy heading style. At label sizes, weight 400 (regular).

**Spectral** (serif): All body prose and long-form reading. Weight 400. The humanist serif brings warmth and legibility to extended reading. The `.blog` site overrides body size to 18px / line-height 1.7 for a more generous reading experience.

**JetBrains Mono** (mono): Code blocks, inline code, terminal UI. Weight 400. Its character disambiguation (0/O, 1/l/I) is intentional — coherent with the phosphor-green aesthetic.

## Spacing

Base-4 grid. Six semantic levels: `tight` (8px) for icon+label pairs, `inline` (12px) for nav rows and tag groups, `element` (16px) for component internal padding, `component` (24px) between sibling components, `layout` (48px) between major regions, `section` (128px) between page sections.

Never use arbitrary pixel values outside the defined scale.

## Motion

Three duration levels — `instant` (120ms) for hover and focus, `standard` (200ms) for dropdowns and tooltips, `emphasized` (350ms) for modals and page transitions. Four easing curves: `enter` (decelerate), `exit` (accelerate), `move` (symmetric), `default` (subtle).

Note: Motion tokens are not yet part of the DESIGN.md spec. These are tracked in the DTCG source at `tokens/semantic/motion.tokens.json`.

## Shadows

Minimal. Prefer `surface` background for card separation over shadows. Four levels: `none` (flat), `raised` (subtle lift for hover/focus), `overlay` (popovers and dropdowns), `dialog` (modals and drawers). Shadows are for true elevation only.

Note: Shadow tokens are not yet part of the DESIGN.md spec. These are tracked in the DTCG source at `tokens/semantic/shadow.tokens.json`.

## Per-site overrides

The base tokens apply to all four properties. Two sites override:

- **riverromney.art**: Background → pure black (#000000). Removes the green undertone for maximum photo contrast.
- **riverromney.blog**: Body font size → 18px, line-height → 1.7. Optimized for long-form reading.

## Rules

**Hard rules (never break):**

1. No hardcoded colors — always use CSS custom properties (`var(--color-*)`)
2. No hardcoded font sizes — use semantic font tokens
3. No font families other than the three defined above
4. Display and title weight is always 300. Body, label, and code weight is 400.
5. Accent green is never resting text — it signals interactivity or emphasis only
6. All text must meet WCAG AA contrast (4.5:1) minimum
7. Spacing values come from the defined scale only
8. No primitive tokens in UI code — always go through the semantic layer

**Soft rules (prefer but can flex):**

1. Prefer semantic font shorthand tokens over assembling individual primitives
2. Prefer Spectral for prose, Space Grotesk for titles and UI
3. Prefer `surface` background for card separation over shadows
4. Borders use `surface` color unless there is a strong reason otherwise
