# Decision-Engine Sub-Brand — AI Context

This file covers token decisions, naming conventions, and architectural intent for the `decision-engine` sub-brand. It is the companion to `ai/DESIGN.md` (which covers the base dark theme only).

For resolved token values, read `build/css/decision-engine.css` directly — it is always the authoritative output.

---

## What This Sub-Brand Is

Light-mode, enterprise data UI theme. White canvas, blue primary action (`#2456E4`), Inter font. Built for data-dense decisioning interfaces — think rule tables, condition builders, outcome badges.

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
| `--color-feedback-danger-foreground` | Redundant with `foreground-danger`. Was a variables.css-only token; never existed in brand-tokens. |
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

When updating consumer repos, search for the old CSS variable name (e.g. `--color-state-hover`) and replace with the new one.

---

## The Foreground Hierarchy

From highest to lowest contrast on white:

```
foreground-default   #1A1A2E   16.1:1  AAA  — body copy, table values, primary labels
foreground-secondary #3A4663    9.4:1  AAA  — supporting labels, metadata, helper text
foreground-alt       #4A4A5A    8.9:1  AAA  — timestamps, icon chrome
foreground-muted     #5E6E88    5.2:1   AA  — placeholders, empty state, meta keys (corrected 2026-04-27 from #767686 which failed AA)
foreground-danger    #C8002E    6.0:1   AA  — errors, destructive labels, deny states
foreground-action    #2456E4    6.0:1   AA  — links, active nav, text CTAs
foreground-inverse   #FFFFFF    —       —   — text on dark/colored surfaces only
```

---

## Known Intentional Drifts (decisioning-table only)

`decisioning-table/src/tokens/variables.css` has 5 tokens that differ from the brand-tokens build output. This is intentional — hand-tuned for a slightly bluer light-mode feel. Do not auto-fix these.

- `--color-background-default` — local `#F7F9FC` (bluer) vs brand `#FFFFFF`
- `--color-background-alt` — local `#EFF1F8` (bluer) vs brand `#F5F6F7`
- `--color-border-default` — local `#DDE1EC` (bluer) vs brand `#D8DCE0`
- `--color-border-muted` — local `#ECEEF5` (bluer) vs brand `#E8EAED`
If `npm run sync-tokens` reports exactly these 4 drifts and nothing else, the system is clean.

---

## Architecture Summary

```
brand-tokens/tokens/primitives/color.tokens.json   ← raw hex values only
brand-tokens/tokens/brands/decision-engine.tokens.json  ← semantic overrides for DE
    ↓  node scripts/build-brands.mjs
brand-tokens/build/css/decision-engine.css         ← built output (never hand-edit)
    ↓  consumer repo: npm run sync-tokens
decisioning-table/src/tokens/variables.css         ← sync target, not a definition file
```

**Never define a new token by writing it into `variables.css` first.** The flow is always brand-tokens → build → variables.css. If you need a token urgently, add it to `decision-engine.tokens.json` first, rebuild, then copy the resolved value.

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
