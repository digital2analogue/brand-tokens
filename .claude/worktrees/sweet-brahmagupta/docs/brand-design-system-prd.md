# PRD: River Romney Brand Design System

**Author:** River Romney
**Status:** Active
**Created:** 2026-04-06
**Last updated:** 2026-04-10

---

## Problem Statement

River Romney maintains a growing network of personal sites — riverromney.com (splash), riverromney.design (portfolio), a future riverromney.art (photography/video), and eventually riverromney.blog (writing). Each site was built independently, and while they share the same visual DNA today (fonts, colors, dark theme), there is no shared infrastructure enforcing that consistency. Design values are hardcoded in each site's CSS, meaning every change requires manual propagation across repos. Worse, when AI coding agents (Claude Code, Cursor) generate UI for any of these sites, they fabricate plausible-looking values instead of using the correct ones — because no machine-readable spec exists.

As the number of sites grows and AI-assisted development becomes the primary workflow, this gap will compound. The cost is visual drift between properties, wasted time re-specifying the same constraints each session, and accessibility regressions that go unnoticed.

## Goals

1. **Single source of truth** — All design decisions (color, typography, spacing, borders, elevation, motion) are defined once and consumed by every site, eliminating manual propagation.
2. **AI-readable by default** — Any Claude Code or Cursor session working on any River Romney site automatically loads the correct design constraints without the user re-explaining them.
3. **WCAG AA compliant** — Every text/background color pairing in the system meets a minimum 4.5:1 contrast ratio. Accessibility is enforced at the token level, not audited after the fact.
4. **Multi-site theming** — Support per-site overrides (e.g., pure black background for .art, larger body type for .blog, fintech palette for decisioning-table) without duplicating the shared foundation.
5. **Standards-aligned** — Follow the W3C Design Tokens Community Group spec (DTCG 2025.10) so the system is interoperable with Figma, Tokens Studio, Style Dictionary, and future tooling.

## Non-Goals

- **Component library**: This system covers design tokens and visual foundations only. Shared UI components (buttons, cards, nav) are a future initiative that would build on top of this token layer. Not enough sites or complexity to justify it yet.
- **Figma integration**: While the DTCG format is Figma-compatible and the architecture supports Tokens Studio sync, setting up Figma variables and the Figma MCP server is a follow-on project.
- **Custom MCP server**: Spotify and other teams have built dedicated MCP servers for their design systems. At the current scale (4 personal sites, 1 person), a DESIGN.md in the repo is sufficient. MCP becomes relevant if the system is ever consumed by a team.
- **Build pipeline automation**: v1 uses Style Dictionary manually or via a simple npm script. CI/CD integration (auto-generating CSS on token changes, publishing to a registry) is future work.

---

## User Stories

### As the site owner / developer

- As the site owner, I want all my sites to share the same visual identity so that visitors experience a coherent brand across riverromney.com, .design, .art, and .blog.
- As the site owner, I want to change a design value (e.g., accent color) in one place and have it propagate to all sites so that I don't spend time making the same edit four times.
- As the site owner, I want per-site overrides for specific contexts (photo-optimized background for .art, reading-optimized type for .blog, fintech aesthetic for decisioning-table) so that shared doesn't mean identical.
- As the site owner, I want every color pairing to meet WCAG AA so that accessibility is a guarantee, not a manual check.

### As an AI coding agent

- As an AI agent working on any River Romney site, I want to read the complete design system spec at session start so that I produce on-brand output without the user re-explaining constraints.
- As an AI agent, I want an enumerated list of every allowed token value so that I pick from the system instead of fabricating values.
- As an AI agent, I want explicit guardrails (what NOT to do) so that I avoid common mistakes like using the accent color for resting text or inventing font weights.

---

## Requirements

### Must-Have (P0) — Complete

**P0-1: DTCG-format token files** ✅
Define all design values as JSON tokens following the W3C DTCG Format Module (2025.10). Tokens are organized in a three-tier architecture: primitives, semantic, and brand overrides.

Acceptance criteria:

- [x] `primitives/color.tokens.json` defines the full color palette with `$type: "color"` and `$value` for each
- [x] `primitives/typography.tokens.json` defines font families, weights, sizes, and line-heights
- [x] `primitives/spacing.tokens.json` defines the 11-value base-4 spacing scale
- [x] `primitives/radius.tokens.json` defines the border radius scale (none through full)
- [x] `primitives/shadow.tokens.json` defines elevation shadows using DTCG composite shadow type
- [x] `primitives/motion.tokens.json` defines durations and easing curves (cubicBezier type)
- [x] `semantic/color.tokens.json` maps intent-based names (background.default, foreground.primary, foreground.action) to primitive aliases using `{reference}` syntax
- [x] `semantic/typography.tokens.json` defines title, body, and label composite tokens
- [x] All `$value`, `$type`, and `$description` fields conform to DTCG spec
- [x] Token names use semantic naming (color.background.default, not color.dark-green)

**P0-2: WCAG AA contrast compliance** ✅
Every semantic text/background pairing must meet WCAG AA (4.5:1 minimum for normal text).

Acceptance criteria:

- [x] color.foreground.primary (#C8CFC4) on color.background.default (#0A0D0A): 12.26:1 — passes
- [x] color.foreground.secondary (#A0A89A) on color.background.default (#0A0D0A): 7.97:1 — passes
- [x] color.foreground.muted (#8B9683) on color.background.default (#0A0D0A): 6.32:1 — passes
- [x] color.foreground.accent (#4ADE6E) on color.background.default (#0A0D0A): 11.13:1 — passes AAA
- [x] color.foreground.on-action (#0A0D0A) on color.background.action (#4ADE6E): 11.13:1 — passes AAA
- [x] White (#FFFFFF) on color.background.action (#4ADE6E): 1.76:1 — fails AA (documented, not used)
- [x] Contrast ratios are documented in the token `$description` fields

**P0-3: AI-readable DESIGN.md** ✅
A markdown file describing the complete visual system in prose, structured for LLM consumption.

Acceptance criteria:

- [x] Covers: visual identity, color tokens (with CSS variable names and hex values), typography (families, weights, roles), spacing scale, and guardrails
- [x] Guardrails explicitly state: no fabricating values, accent is hover-only for resting text, AA minimum, allowed font weights
- [x] File is concise enough to fit within a typical LLM context window (~2K tokens)
- [x] References the DTCG token files as the canonical source

**P0-4: CLAUDE.md integration** ✅

Acceptance criteria:

- [x] CLAUDE.md exists at repo root
- [x] Uses `@ai/DESIGN.md` import syntax to load the design spec
- [x] Any Claude Code session in the repo has full design context without user intervention

**P0-5: CSS custom property output** ✅
Style Dictionary v4 compiles the DTCG tokens into CSS custom properties that each site can consume.

Acceptance criteria:

- [x] Running the build produces `build/css/variables.css` with all semantic tokens as `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--easing-*` custom properties
- [x] Output CSS is valid and directly consumable by static HTML, Hugo, and React/Vite sites
- [ ] Per-site override files (variables-art.css, variables-blog.css) are generated when brand override tokens exist

**P0-6: Brand token repository** ✅

Acceptance criteria:

- [x] Repo exists at github.com/digital2analogue/brand-tokens
- [x] Contains: `tokens/`, `ai/`, `build/`, `CLAUDE.md`, `package.json`, Style Dictionary config
- [x] README explains repo purpose, structure, and how to consume tokens in a site

### Nice-to-Have (P1)

**P1-1: Per-site brand override tokens** (partial)
Override files for .art and .blog that modify specific tokens while inheriting everything else.

Acceptance criteria:

- [x] `tokens/brands/dot-art.tokens.json` overrides background to #000000
- [x] `tokens/brands/dot-blog.tokens.json` overrides body typography to 18px / 1.7 line-height
- [ ] Overrides produce separate CSS output files via Style Dictionary
- [ ] Decisioning-table brand override file created with fintech palette

**P1-2: CSS linter / audit rule**
A lint rule that flags any hardcoded color, font-weight, or spacing value not in the token allowlist.

Acceptance criteria:

- [ ] Running the linter against a CSS file reports any value that doesn't use a `--token-*` custom property
- [ ] Allowlist is auto-generated from the DTCG token files (not manually maintained)

**P1-3: llms.txt for external AI tools**
A lightweight llms.txt file at the design system's documentation URL for non-Claude AI tools to discover the system.

Acceptance criteria:

- [ ] `/llms.txt` provides a structured overview of the design system (~5K tokens)
- [ ] Includes links to full documentation for tools that want deeper context

**P1-4: Contrast ratio documentation page**
A generated reference showing every text/background pairing with its contrast ratio, pass/fail status, and visual preview.

Acceptance criteria:

- [ ] Auto-generated from token files (not manually maintained)
- [ ] Shows each semantic text color against each semantic background
- [ ] Clearly labels WCAG AA and AAA compliance for each pairing

### Future Considerations (P2)

**P2-1: Light theme**
The architecture supports light themes via the brand override layer. The decisioning-table app already uses a light mode palette (warm off-white backgrounds, dark text, darker accent green for contrast). Formalizing this as a theme token set is a natural next step.

**P2-2: Figma variable sync**
Connect the DTCG tokens to Figma via Tokens Studio. This enables visual design in Figma that stays in sync with the code tokens, and unlocks Figma's MCP server for AI-powered design-to-code workflows.

**P2-3: Component tokens (Tier 3)**
Scoped tokens like `button.bg.primary`, `link.hover.color`, `nav.border.bottom`. These become valuable when there are shared UI components across sites. Semantic spacing categories (inset, stack, inline, section, page) can be added at this stage when usage patterns emerge.

**P2-4: CI/CD pipeline**
Auto-build CSS on token changes via GitHub Actions. Publish CSS as an npm package or push directly to each site repo via a workflow.

**P2-5: Design system documentation site**
A dedicated site (e.g., system.riverromney.design) documenting the token taxonomy, usage guidelines, and component patterns. This is where the llms.txt (P1-3) would live.

---

## Architecture

### Token Taxonomy

| Tier | Purpose | Example | File Location |
|------|---------|---------|---------------|
| Primitive | Raw values, no context | `green.950: #0A0D0A` | `tokens/primitives/` |
| Semantic | Intent-based aliases | `color.background.default: {green.950}` | `tokens/semantic/` |
| Brand override | Per-site exceptions | `color.background.default: #000000` (art only) | `tokens/brands/` |

### Color Palette (Primitives)

| Token | Value | Description | Contrast vs #0A0D0A |
|-------|-------|-------------|---------------------|
| green.950 | #0A0D0A | Near-black green (background) | — |
| green.900 | #1E241E | Dark green (borders, secondary bg) | — |
| green.600 | #8B9683 | Muted sage (labels, tertiary text) | 6.32:1 AA |
| green.500 | #7A9E80 | Sage green (intermediate) | — |
| green.400 | #A0A89A | Soft green (secondary text) | 7.97:1 AA |
| green.200 | #C8CFC4 | Light green (primary text) | 12.26:1 AA |
| green.accent | #4ADE6E | Terminal green (hover/interactive) | 11.13:1 AAA |
| neutral.white | #FFFFFF | Pure white | — |
| neutral.black | #000000 | Pure black | — |

### Semantic Color Tokens

| Token | References | CSS Variable | Description |
|-------|-----------|--------------|-------------|
| color.background.default | green.950 | --color-background-default | Primary background |
| color.background.alt | green.900 | --color-background-alt | Secondary / elevated background |
| color.background.action | green.accent | --color-background-action | Button fills, CTAs |
| color.foreground.primary | green.200 | --color-foreground-primary | Primary text |
| color.foreground.secondary | green.400 | --color-foreground-secondary | Secondary text |
| color.foreground.muted | green.600 | --color-foreground-muted | Tertiary text, labels |
| color.foreground.accent | green.accent | --color-foreground-accent | Interactive / emphasis |
| color.foreground.action | green.accent | --color-foreground-action | Links, interactive text |
| color.foreground.on-action | green.950 | --color-foreground-on-action | Text on action backgrounds (button labels) |
| color.border.default | green.900 | --color-border-default | Default border |

### Typography

| Role | Family | Weight | Usage |
|------|--------|--------|-------|
| Heading | Space Grotesk | 400 (regular) | h1–h6, display text |
| Body | Spectral | 400 (regular) | Paragraphs, long-form |
| UI | Space Grotesk | 400 (regular) | Nav, buttons, labels, meta |
| Code | JetBrains Mono | 400 (regular) | Code blocks (reserved) |

9 semantic typography tokens: title (large/medium/small), body (large/medium/small), label (large/medium/small). Each is a composite token referencing font family, weight, size, and line-height primitives.

### Spacing Scale (Primitives)

Base grid: 4px (with 8px as the primary layout rhythm). 11 values:

| Token | Value | Use |
|-------|-------|-----|
| space.3xs | 2px | Hairline gaps, optical adjustments |
| space.2xs | 4px | Inline icon margins, tight gaps |
| space.xs | 8px | Small padding, compact element spacing |
| space.sm | 12px | Form padding, list item gaps |
| space.md | 16px | Default padding, standard gap |
| space.lg | 24px | Card padding, comfortable spacing |
| space.xl | 32px | Section padding, grid gaps |
| space.2xl | 48px | Section margins, layout gaps |
| space.3xl | 64px | Large section breaks |
| space.4xl | 80px | Page sections |
| space.5xl | 128px | Hero / full-bleed spacing |

### Border Radius (Primitives)

| Token | Value | Use |
|-------|-------|-----|
| radius.none | 0 | Sharp corners |
| radius.sm | 4px | Subtle rounding — inputs, small elements |
| radius.md | 8px | Buttons, menus, selects |
| radius.lg | 12px | Cards, panels |
| radius.xl | 16px | Prominent rounding — modals, hero cards |
| radius.full | 9999px | Pills, badges, circles |

### Shadow / Elevation (Primitives)

| Token | Value | Use |
|-------|-------|-----|
| shadow.none | none | Flat elements |
| shadow.sm | 0 1px 3px rgba(0,0,0,0.08) | Subtle lift — inputs, dropdowns |
| shadow.md | 0 2px 8px rgba(0,0,0,0.12) | Cards, toolbars |
| shadow.lg | 0 6px 20px rgba(0,0,0,0.16) | Modals, menus, popovers |
| shadow.xl | 0 12px 40px rgba(0,0,0,0.24) | Dialogs, toasts |

### Motion (Primitives)

| Token | Value | Use |
|-------|-------|-----|
| duration.fast | 120ms | Hover states, color transitions |
| duration.normal | 200ms | Expand/collapse, menus |
| duration.slow | 350ms | Page transitions, modals |
| easing.default | cubic-bezier(0.25, 0.1, 0.25, 1.0) | General-purpose (ease) |
| easing.in | cubic-bezier(0.42, 0, 1, 1) | Elements exiting |
| easing.out | cubic-bezier(0, 0, 0.58, 1) | Elements entering |
| easing.in-out | cubic-bezier(0.42, 0, 0.58, 1) | Elements moving |

### Repo Structure

```
brand-tokens/
  tokens/
    primitives/
      color.tokens.json
      typography.tokens.json
      spacing.tokens.json
      radius.tokens.json
      shadow.tokens.json
      motion.tokens.json
    semantic/
      color.tokens.json
      typography.tokens.json
    brands/
      dot-art.tokens.json
      dot-blog.tokens.json

  ai/
    DESIGN.md              <- AI-readable system spec
    rules.md               <- Guardrails and constraints

  build/
    css/
      variables.css        <- Base CSS custom properties

  CLAUDE.md                <- Imports @ai/DESIGN.md
  package.json             <- Style Dictionary v4 as devDependency
  style-dictionary.config.js
  README.md
```

### How Sites Consume Tokens

Each site copies the compiled CSS into its assets. The site's own CSS uses custom properties instead of hardcoded values:

```css
body {
  background: var(--color-background-default);
  color: var(--color-foreground-primary);
  font: var(--font-body-large);
}

a {
  color: var(--color-foreground-action);
}

a:hover {
  color: var(--color-foreground-accent);
}

.button {
  background: var(--color-background-action);
  color: var(--color-foreground-on-action);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-md);
  transition: background-color var(--duration-fast) var(--easing-default);
}
```

For v1, the consumption model is copying `variables.css` into each site's assets directory. This can be upgraded to npm/submodule later.

For themed projects (like decisioning-table), the approach is to import the base token CSS then override specific tokens in a local overrides file. This way the project inherits the full system and only maintains the delta.

---

## Success Metrics

### Leading (within 2 weeks of implementation)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token coverage | 100% of color, font, and spacing values in .com and .design are expressed as custom properties referencing the shared token set | Manual audit of both sites' CSS |
| AI accuracy | Claude Code sessions produce on-brand output without manual correction for color/font/spacing values | Qualitative — track over 5 sessions |
| WCAG compliance | 0 contrast violations across all semantic text/background pairings | Automated contrast check against token file |

### Lagging (within 2 months)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Propagation time | Design change takes <5 min to apply across all sites (down from ~30 min manual) | Time from token edit to all sites updated |
| New site velocity | Standing up riverromney.art with correct branding takes <1 hour of styling work | Track actual time during .art buildout |
| Drift incidents | 0 instances of hardcoded values bypassing the token system | CSS lint report (when P1-2 is implemented) |

---

## Resolved Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should accent (#4ADE6E) ever be used as resting text? | Yes, via semantic tokens: foreground.accent for emphasis, foreground.action for links. Contrast ratio (11.13:1) supports this. |
| 2 | Should the spacing scale be hardcoded or derived from a formula? | Hardcoded base-4 grid with 11 values. Compared against Material Design 3's 4dp grid — our scale is more selective (skips every-4dp steps between 24-48) since web layouts need less granularity than mobile UI. |
| 3 | How should the .blog site consume tokens on Substack? | Deferred — .blog is future work. Substack allows custom CSS in paid plans. |
| 4 | Should JetBrains Mono be included in v1? | Yes — included as a primitive. Currently used by the decisioning-table app. |
| 5 | What's the preferred consumption model? | Direct copy of variables.css for v1. Sites maintain their own copy. Upgrade to npm/submodule when the overhead of manual copy becomes painful. |

## Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 6 | Should semantic spacing tokens (inset, stack, inline, section, page) be added? | Design | No — primitives are sufficient for now. Revisit when usage patterns emerge across 3+ sites. |
| 7 | Should the decisioning-table fintech theme live in brand-tokens as a brand override, or locally in the decisioning-table repo? | Design | No — local override is fine for now. Promote to brand-tokens if reused. |
| 8 | Should opacity tokens be added for disabled states and overlays? | Design | No — low priority until a component library exists. |

---

## Timeline

- **Phase 1 (complete):** Created the repo, wrote DESIGN.md + CLAUDE.md, defined primitive and semantic token JSON files.
- **Phase 2 (complete):** Added Style Dictionary config, generated CSS output, integrated into .com and .design repos. Added border radius, shadow, and motion primitives. Renamed color semantics to background/foreground convention. Added action color tokens.
- **Phase 3 (in progress):** Decisioning-table atomic design refactor and brand-token integration. Validating the override architecture with a themed project.
- **Phase 4 (future):** Validate brand override architecture with .art. Add CSS linter rule. Explore Figma sync.

---

## References

### Standards
- [W3C Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/drafts/format/)
- [W3C Design Tokens Resolver Module 2025.10](https://www.designtokens.org/tr/2025.10/resolver/)
- [Design Tokens Community Group](https://www.w3.org/community/design-tokens/)

### AI-Readable Design Systems
- [Expose Your Design System to LLMs — Hardik Pandya](https://hvpandya.com/llm-design-systems)
- [Design Systems and AI: Why MCP Servers Are the Unlock — Figma](https://www.figma.com/blog/design-systems-ai-mcp/)
- [How Spotify is Making Encore AI-Ready](https://www.intodesignsystems.com/blog/how-spotify-design-system-ai-ready)
- [awesome-design-md — VoltAgent](https://github.com/VoltAgent/awesome-design-md)
- [Nord Health llms.txt](https://nordhealth.design/ai/llms-txt/)

### Tooling
- [Style Dictionary v4 — DTCG Support](https://styledictionary.com/info/dtcg/)
- [Tokens Studio — W3C DTCG vs Legacy Format](https://docs.tokens.studio/manage-settings/token-format)

### Architecture
- [Design Token-Based UI Architecture — Martin Fowler](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
- [What's New in the Design Tokens Spec — zeroheight](https://zeroheight.com/blog/whats-new-in-the-design-tokens-spec/)
- [Space in Design Systems — Nathan Curtis / EightShapes](https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62)
- [Material Design 3 Spacing](https://m3.material.io/foundations/layout/understanding-layout/spacing)
