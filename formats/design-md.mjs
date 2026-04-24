/**
 * Style Dictionary custom formatter: design-md
 *
 * Generates a Google DESIGN.md (alpha spec) from the resolved token dictionary.
 * Produces YAML front matter (machine-readable tokens) + markdown prose (semantic
 * guidance for AI agents).
 *
 * Usage in style-dictionary.config.mjs:
 *   import { designMdFormat } from './formats/design-md.mjs'
 *   sd.registerFormat(designMdFormat)
 *
 * Then add a platform with:
 *   format: 'design-md'
 */

// ── helpers ──────────────────────────────────────────────────────────

function resolveValue(token) {
  // Style Dictionary v4 with usesDtcg stores the resolved value in $value
  const val = token.$value ?? token.value
  if (typeof val === 'object' && val !== null) return val
  return val
}

function indent(str, level = 2) {
  return str
    .split('\n')
    .map((line) => ' '.repeat(level) + line)
    .join('\n')
}

function yamlScalar(val) {
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') {
    // Quote strings that start with # (hex colors) or contain special chars
    if (val.startsWith('#') || val.includes(':') || val.includes('{'))
      return `"${val}"`
    return `"${val}"`
  }
  return String(val)
}

// ── token walkers ────────────────────────────────────────────────────

function getTokensByPath(dictionary, prefix) {
  const results = []
  for (const token of dictionary.allTokens) {
    const p = (token.path ?? []).join('.')
    if (p.startsWith(prefix)) results.push(token)
  }
  return results
}

function getResolvedHex(token) {
  const val = resolveValue(token)
  if (typeof val === 'string') return val
  return null
}

// ── section builders ─────────────────────────────────────────────────

function buildColors(dictionary) {
  // Pull semantic color tokens and map to DESIGN.md color roles
  const mapping = [
    ['primary', 'color.background.action'],
    ['secondary', 'color.foreground.default'],
    ['tertiary', 'color.foreground.alt'],
    ['neutral', 'color.foreground.muted'],
    ['background', 'color.background.default'],
    ['surface', 'color.background.alt'],
    ['on-primary', 'color.foreground.on-action'],
  ]

  const lines = ['colors:']
  for (const [role, path] of mapping) {
    const token = dictionary.allTokens.find(
      (t) => (t.path ?? []).join('.') === path
    )
    if (token) {
      lines.push(`  ${role}: ${yamlScalar(getResolvedHex(token))}`)
    }
  }
  return lines.join('\n')
}

function buildTypography(dictionary) {
  // Map semantic font tokens to DESIGN.md typography levels
  const mapping = [
    ['display', 'font.display'],
    ['headline-large', 'font.title.large'],
    ['headline-medium', 'font.title.medium'],
    ['headline-small', 'font.title.small'],
    ['body-large', 'font.body.large'],
    ['body-medium', 'font.body.medium'],
    ['body-small', 'font.body.small'],
    ['label-large', 'font.label.large'],
    ['label-medium', 'font.label.medium'],
    ['label-small', 'font.label.small'],
    ['code', 'font.code'],
  ]

  // Letter spacing lookup: map font roles to their letter-spacing tokens
  const letterSpacingMap = {
    display: 'letterSpacing.display',
    'headline-large': 'letterSpacing.title',
    'headline-medium': 'letterSpacing.title',
    'headline-small': 'letterSpacing.title',
    'body-large': 'letterSpacing.body',
    'body-medium': 'letterSpacing.body',
    'body-small': 'letterSpacing.body',
    'label-large': 'letterSpacing.label',
    'label-medium': 'letterSpacing.label',
    'label-small': 'letterSpacing.label',
    code: 'letterSpacing.body',
  }

  const lines = ['typography:']

  for (const [role, path] of mapping) {
    const token = dictionary.allTokens.find(
      (t) => (t.path ?? []).join('.') === path
    )
    if (!token) continue

    const val = resolveValue(token)
    if (typeof val !== 'object') continue

    lines.push(`  ${role}:`)
    if (val.fontFamily) lines.push(`    font: ${yamlScalar(val.fontFamily)}`)
    if (val.fontWeight != null) lines.push(`    weight: ${val.fontWeight}`)
    if (val.fontSize) lines.push(`    size: ${yamlScalar(val.fontSize)}`)
    if (val.lineHeight != null) lines.push(`    lineHeight: ${val.lineHeight}`)

    // Add letter spacing from separate token
    const lsPath = letterSpacingMap[role]
    if (lsPath) {
      const lsToken = dictionary.allTokens.find(
        (t) => (t.path ?? []).join('.') === lsPath
      )
      if (lsToken) {
        const lsVal = resolveValue(lsToken)
        lines.push(`    letterSpacing: ${yamlScalar(lsVal)}`)
      }
    }
  }

  return lines.join('\n')
}

function buildSpacing(dictionary) {
  const mapping = [
    ['tight', 'spacing.tight'],
    ['inline', 'spacing.inline'],
    ['element', 'spacing.element'],
    ['component', 'spacing.component'],
    ['layout', 'spacing.layout'],
    ['section', 'spacing.section'],
  ]

  const lines = ['spacing:']
  for (const [role, path] of mapping) {
    const token = dictionary.allTokens.find(
      (t) => (t.path ?? []).join('.') === path
    )
    if (token) {
      lines.push(`  ${role}: ${yamlScalar(resolveValue(token))}`)
    }
  }
  return lines.join('\n')
}

function buildRounded(dictionary) {
  const mapping = [
    ['none', 'radius.none'],
    ['sm', 'radius.sm'],
    ['default', 'radius.default'],
    ['lg', 'radius.lg'],
    ['xl', 'radius.xl'],
    ['full', 'radius.full'],
  ]

  const lines = ['rounded:']
  for (const [role, path] of mapping) {
    const token = dictionary.allTokens.find(
      (t) => (t.path ?? []).join('.') === path
    )
    if (token) {
      const val = resolveValue(token)
      // Output numbers without quotes, strings with
      lines.push(
        `  ${role}: ${typeof val === 'number' || val === '0' ? val : yamlScalar(val)}`
      )
    }
  }
  return lines.join('\n')
}

function buildComponents() {
  // Component mappings are authored, not derived from tokens.
  // This section maps component names to the color/typography/spacing/radius
  // roles defined in the YAML above. Edit this to add new components.
  return `components:
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
    typography: code`
}

// ── prose sections ───────────────────────────────────────────────────

function buildProse(dictionary) {
  // Pull motion and shadow tokens for prose-only sections (not in DESIGN.md spec yet)
  const motionDurations = ['motion.duration.instant', 'motion.duration.standard', 'motion.duration.emphasized']
    .map((p) => dictionary.allTokens.find((t) => (t.path ?? []).join('.') === p))
    .filter(Boolean)

  const shadows = ['shadow.none', 'shadow.raised', 'shadow.overlay', 'shadow.dialog']
    .map((p) => dictionary.allTokens.find((t) => (t.path ?? []).join('.') === p))
    .filter(Boolean)

  return `## Identity

Dark-first, green-phosphor aesthetic. Minimalist. The vibe is terminal-meets-editorial — clean structure from Space Grotesk, warmth and readability from Spectral, technical credibility from JetBrains Mono.

One color story: a single-hue green ramp from near-black to vivid accent. The warm green undertone in the background is what separates this from a generic dark theme. There is no light mode (v1).

## Color usage

The palette has two surface levels, three text levels, and one accent.

**Surfaces:** \`background\` is the page canvas — every page, full-bleed section, outermost container. \`surface\` is one level up — cards, panels, inputs, code blocks. The difference is intentionally subtle; a quiet layer, not a strong contrast shift.

**Text hierarchy:** \`secondary\` is primary text (12.26:1 AAA). \`tertiary\` is secondary text (7.97:1 AA). \`neutral\` is muted text (6.32:1 AA). Use the step-down to create visual hierarchy without resorting to bold or underline.

**Accent green:** \`primary\` is the only high-chroma value. It signals interactivity (links, buttons, active states) or intentional emphasis (a highlighted keyword, a decorative badge). It is never resting body text. Text on green surfaces uses \`on-primary\` — contrast is 11.13:1 AAA.

**Borders:** Use \`surface\` for all edges — cards, inputs, dividers. Borders recede; they delineate, not decorate.

## Typography

Three typefaces cover all roles. Never substitute.

**Space Grotesk** (sans): All titles, headings, labels, navigation, buttons, and UI text. At display and title sizes, always weight 300 (light) — the low weight at large sizes creates the elegant, airy heading style. At label sizes, weight 400 (regular).

**Spectral** (serif): All body prose and long-form reading. Weight 400. The humanist serif brings warmth and legibility to extended reading. The \`.blog\` site overrides body size to 18px / line-height 1.7 for a more generous reading experience.

**JetBrains Mono** (mono): Code blocks, inline code, terminal UI. Weight 400. Its character disambiguation (0/O, 1/l/I) is intentional — coherent with the phosphor-green aesthetic.

## Spacing

Base-4 grid. Six semantic levels: \`tight\` (8px) for icon+label pairs, \`inline\` (12px) for nav rows and tag groups, \`element\` (16px) for component internal padding, \`component\` (24px) between sibling components, \`layout\` (48px) between major regions, \`section\` (128px) between page sections.

Never use arbitrary pixel values outside the defined scale.

## Motion

Three duration levels — \`instant\` (${motionDurations[0] ? resolveValue(motionDurations[0]) : '120ms'}) for hover and focus, \`standard\` (${motionDurations[1] ? resolveValue(motionDurations[1]) : '200ms'}) for dropdowns and tooltips, \`emphasized\` (${motionDurations[2] ? resolveValue(motionDurations[2]) : '350ms'}) for modals and page transitions. Four easing curves: \`enter\` (decelerate), \`exit\` (accelerate), \`move\` (symmetric), \`default\` (subtle).

Note: Motion tokens are not yet part of the DESIGN.md spec. These are tracked in the DTCG source at \`tokens/semantic/motion.tokens.json\`.

## Shadows

Minimal. Prefer \`surface\` background for card separation over shadows. Four levels: \`none\` (flat), \`raised\` (subtle lift for hover/focus), \`overlay\` (popovers and dropdowns), \`dialog\` (modals and drawers). Shadows are for true elevation only.

Note: Shadow tokens are not yet part of the DESIGN.md spec. These are tracked in the DTCG source at \`tokens/semantic/shadow.tokens.json\`.

## Per-site overrides

The base tokens apply to all four properties. Two sites override:

- **riverromney.art**: Background → pure black (#000000). Removes the green undertone for maximum photo contrast.
- **riverromney.blog**: Body font size → 18px, line-height → 1.7. Optimized for long-form reading.

## Rules

**Hard rules (never break):**

1. No hardcoded colors — always use CSS custom properties (\`var(--color-*)\`)
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
3. Prefer \`surface\` background for card separation over shadows
4. Borders use \`surface\` color unless there is a strong reason otherwise`
}

// ── main formatter ───────────────────────────────────────────────────

export const designMdFormat = {
  name: 'design-md',
  format({ dictionary }) {
    const yamlSections = [
      'version: alpha',
      'name: River Romney',
      `description: >`,
      `  Dark-first, green-phosphor design system for riverromney.com, .design, .art,`,
      `  and .blog. Terminal-meets-editorial. Three typefaces, one color story.`,
      '',
      buildColors(dictionary),
      '',
      buildTypography(dictionary),
      '',
      buildSpacing(dictionary),
      '',
      buildRounded(dictionary),
      '',
      buildComponents(),
    ]

    const yaml = yamlSections.join('\n')
    const prose = buildProse(dictionary)

    return `---\n${yaml}\n---\n\n${prose}\n`
  },
}
