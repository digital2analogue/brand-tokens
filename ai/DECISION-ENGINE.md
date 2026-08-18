---
scope: tokens
applies-to: [decision-engine]
always-on: true
---

# Decision-Engine Sub-Brand — AI Context

This file covers token decisions, naming conventions, and architectural intent for the `decision-engine` sub-brand. It is the companion to `ai/DESIGN.md` (which covers the base dark theme only).

For resolved token values, read `build/css/decision-engine.css` directly — it is always the authoritative output.

---

## What This Sub-Brand Is

Light-mode, enterprise data UI theme. Arctic canvas (`#F5F8FC`, blue-tinted near-white), blue primary action (`#2456E4`), Geist font. Built for data-dense decisioning interfaces — think rule tables, condition builders, outcome badges. (Canvas was pure white until the 2026-07-02 prototype reconciliation, parsimony#70.)

It is a sub-brand overlay, not a separate system. All tokens not overridden here inherit from the base dark theme via Style Dictionary merge. If a token appears in `build/css/decision-engine.css` with a phosphor-green value (`#4ADE6E`) or near-black value (`#0A0D0A`), it is a base-theme bleed-through — the DE brand intentionally does not define that token.

---

## Token Naming Conventions

### Accent tokens always include the color name

Any token in the `foreground-accent-*`, `background-accent-*`, or `foreground-on-accent-*` families **must** include the color name as a suffix. There is no generic "accent" — only named slots.

**Correct:** `--color-foreground-accent-blue`, `--color-foreground-accent-green`, `--color-foreground-accent-purple`  
**Wrong:** `--color-foreground-accent` (deleted — see below)

**Why:** A generic `foreground-accent` token has no stable meaning. The color it refers to can change independently per context. Named slots make the usage explicit and prevent accidental misuse.

### Semantic vs. non-semantic accent slots

These two categories look similar but serve different purposes:

| Token | Type | Meaning |
|---|---|---|
| `--color-foreground-danger` | Semantic | Always means "error, destructive, or deny." The color should never change. |
| `--color-foreground-accent-green` | Non-semantic | A green slot available for any bespoke UI need. Not tied to any specific meaning. |
| `--color-foreground-accent-blue` | Non-semantic | A blue slot for bespoke product UI. Currently `#2456E4` but could be anything. |
| `--color-foreground-accent-purple` | Non-semantic | A purple slot. Currently `#7C3AED` but the color has no fixed semantic contract. |

**Key insight:** The accent-color tokens are NOT semantic. They are palette slots for use in bespoke product UI — data visualizations, decorative highlights, product-specific component theming. The fact that Approve/Deny/Review outcomes in the decisioning table happen to use green/red/purple is a product-level decision, not a design system contract. Do not read semantic meaning into the color choices.

The current values in these tokens are placeholders that happen to work. They can be changed freely.

---

## Tokens That Were Deleted (and Why)

The following tokens existed at one point and were removed. Do not re-add them without a strong reason.

| Deleted token | Why removed |
|---|---|
| `--color-foreground-accent` | Generic; replaced by named `foreground-accent-[color]` slots. |
| `--color-background-accent` | Redundant with `background-action`. The DE brand has no generic accent fill. |
| `--color-foreground-on-accent` | Generic counterpart to the deleted `background-accent`. |
| `--color-foreground-primary` | Redundant with `foreground-default`. Two near-identical high-contrast tokens is unnecessary. |
| `--color-feedback-error` | Redundant with `foreground-danger`. Both were `#C8002E`. Use `foreground-danger` for error states. |
| `--color-feedback-danger-foreground` | Redundant with `foreground-danger`. Was a variables.css-only token; never existed in Parsimony. |
| `--color-foreground-accent-red` | Red is a semantic color in this system (Deny, destructive). A non-semantic red slot creates ambiguity. If you need red for a specific product UI reason, use `foreground-danger` or `foreground-accent-red` only after deliberate justification. |
| `--color-foreground-on-accent-red` | Paired counterpart to the deleted `foreground-accent-red`. |

---

## Tokens That Were Renamed (and Why)

| Old name | New name | Reason |
|---|---|---|
| `foreground.on-accent-blue` | `foreground.accent-on-blue` | Naming consistency: accent-on-[color] pattern. 2026-04-27. |
| `foreground.on-accent-green` | `foreground.accent-on-green` | Same as above. |
| `foreground.on-accent-purple` | `foreground.accent-on-purple` | Same as above. |
| `color.state.hover` | `background.action-hover` | `state` is a vague category. Token is specifically a background fill for interactive action elements on hover. `background.action-active` added at the same time. 2026-04-28. |
| `primitive.color.blue.300` | `primitive.color.blue.sky` | `blue.300` (#93C5FD) was perceptually lighter than `blue.250` — an inversion in the numeric tint ramp. Renamed to a named slot because this sky blue is a dark-theme accent color, not a light-mode tint derived from blue.700. Semantic CSS vars unaffected. 2026-04-28. |
| `primitive.color.red.500` ↔ `primitive.color.red.600` | Numbers swapped | `red.600` (#D03027) was lighter than `red.500` (#C8002E), breaking numeric convention. Numbers swapped so higher numbers are darker. After swap: `red.500`=#D03027 (Deny/destructive), `red.600`=#C8002E (error/crimson). `red.700`/`red.800` hover/active chain now correctly descends from `red.500`. Semantic CSS vars unaffected — resolved hex values are identical. 2026-04-28. |
| `primitive.color.gray.600` | `primitive.color.gray.navy` | `gray.600` (#3A4663) was perceptually darker than `gray.700` (#4A4A5A) due to its navy chromatic shift — an unavoidable inversion that cannot be fixed by renumbering. Renamed to a named slot. `foreground.secondary` in DE updated to reference `gray.navy`. Semantic CSS vars unaffected. 2026-04-28. |

| `foreground.secondary` | `foreground.alt` | Completes **D-09** (2026-04-26), which renamed `foreground.primary`/`secondary` → `default`/`alt` system-wide. The base followed; this brand did not, so DE carried **two tokens for one role** — `alt` on `gray.700` (#4A4A5A) and `secondary` on `gray.navy` (#3A4663), both described as "secondary text". `foreground.alt` now carries **gray.navy**: that value was chosen deliberately for its perceptual darkness (see the `gray.600` → `gray.navy` row above) and it is what 16 of the 20 consumer references were already rendering. **`foreground.secondary` remains DEFINED as a same-value alias** so decisioning-table does not lose its text colour at the next package bump; it is registered in `DEPRECATED_TOKENS`, so `drift-lint` and `check_usage` flag it. Remove once no consumer references it. 2026-08-18. |

When updating consumer repos, search for the old CSS variable name (e.g. `--color-state-hover`) and replace with the new one.

---

## The Foreground Hierarchy

From highest to lowest contrast on the arctic canvas (`#F5F8FC`):

```
foreground-default   #1A1A2E   16.0:1  AAA  — body copy, table values, primary labels
foreground-alt       #3A4663    8.8:1  AAA  — supporting labels, metadata, timestamps, icon chrome
                                              (foreground-secondary is a DEPRECATED alias of this — same value)
foreground-tertiary  #4E5F79    6.1:1   AA  — descriptor text, dropdown item descriptions
foreground-danger    #C8002E    5.6:1   AA  — errors, destructive labels, deny states
foreground-action    #2456E4    5.6:1   AA  — links, active nav, text CTAs
foreground-muted     #5E6E88    4.9:1   AA  — placeholders, empty state, meta keys (corrected 2026-04-27 from #767686 which failed AA)
foreground-inactive  #A8B0BE    exempt   —  — WCAG-exempt inactive chrome only (segmented controls); never content text
foreground-inverse   #FFFFFF    —       —   — text on dark/colored surfaces only
```

Watch item: `foreground-muted` on `background-alt` (#EBF0F8) is **4.52:1** — passes AA with almost no headroom. If either value shifts cooler/darker, re-verify with `check_contrast` before shipping.

---

## Drift status vs decisioning-table

The 2026-07-02 reconciliation (parsimony#70) adopted the live prototype's values into the brand source: arctic surfaces/borders (new `arctic` primitive ramp), Geist body/type scale/radii/label tracking, and the 10 local-only color tokens the prototype had accumulated (`background.hover/action-alt/inverted/warning-subtle/warning-vivid`, `foreground.inactive/on-action-alt/on-inverted/warning-dark/warning-icon`). The one reverse case: `background.danger` — the brand's red.600 `#C8002E` is intentional; the prototype's `#d03027` is stale and should sync forward (#70 §B).

This section previously listed 4 "intentional drifts" (`#F7F9FC`/`#EFF1F8`/`#DDE1EC`/`#ECEEF5`) — those values were already superseded in the prototype before the reconciliation and are gone from both sides. After the next `@digital2analogue2/parsimony` publish, `npm run sync-tokens` in decisioning-table should come back clean (or with a small residual set documented in its CLAUDE.md — app-local layout/z-index/shadow tokens stay local by design).

**Border split (2026-07-02, #28):** `border.default` is now the *legible* functional edge (`arctic.600` `#7A8FA9`, 3.11:1 on the arctic canvas — SC 1.4.11 pass) for inputs and interactive controls; the prototype's signature light edge (`#C8D6EA`, ex-default) lives on as **`border.alt`** for table borders, card frames, and dividers. Decorative ladder: muted (`#D8E4F0`) < alt (`#C8D6EA`) < elevated (`#B0C4D8`). **Muted vs alt rule (codified 2026-07-02):** `muted` = separator lines *within* a surface (table rows, menu dividers, zebra stripes); `alt` = the quiet boundary *of* a surface (menu/panel/card frames, chip outlines) — derived from how decisioning-table actually uses the pair (7 row sites vs 31 frame sites).

---

## Architecture Summary

```
Parsimony/tokens/primitives/color.tokens.json   ← raw hex values only
Parsimony/tokens/brands/decision-engine.tokens.json  ← semantic overrides for DE
    ↓  node scripts/build-brands.mjs
Parsimony/build/css/decision-engine.css         ← built output (never hand-edit)
    ↓  consumer repo: npm run sync-tokens
decisioning-table/src/tokens/variables.css         ← sync target, not a definition file
```

**Never define a new token by writing it into `variables.css` first.** The flow is always Parsimony → build → variables.css. If you need a token urgently, add it to `decision-engine.tokens.json` first, rebuild, then copy the resolved value.

---

## Feedback and Danger: Which Token to Use

There are two "danger" families. Use them as follows:

| Use case | Token |
|---|---|
| Form validation error message | `--color-foreground-danger` |
| Destructive button label | `--color-foreground-danger` |
| Deny outcome badge text | `--color-foreground-danger` |
| Danger surface text (text ON a red background) | `--color-foreground-inverse` (white) |
| Danger surface background | `--color-background-danger-subtle` |
| Danger surface border | Use `foreground-danger` value as border color |
| Feedback inline alert (error type) | `--color-feedback-success` counterpart is `foreground-danger` |

Do not use `feedback-error` — it was deleted. Use `foreground-danger` everywhere.
