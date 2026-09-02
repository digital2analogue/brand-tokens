# Vendored agent skills

These are **third-party skills vendored verbatim** from
[`bradfrost/skills`](https://github.com/bradfrost/skills), MIT licensed
(Copyright (c) 2026 Brad Frost Web LLC). Each folder carries its own copy of
that licence.

| Skill | What it does |
|---|---|
| `ds-inspection` | 10-station inspection of a **design system**; produces a red/yellow/green report plus a prioritized work order. |
| `product-inspection` | 10-station inspection of a **shipped product** (adoption, usability, a11y, performance, security, measurement). Companion to `ds-inspection`. |
| `ds-adoption-plan` | Tears down a product's bespoke UI, maps each pattern to its system replacement, estimates effort, and returns a phased build schedule. |

## Provenance

Vendored from upstream commit **`f05e016`** ("Add MIT LICENSE", 2026-08-30).
`ds-inspection` was byte-identical to that commit before this vendoring, so it
was left untouched.

Upstream moved the per-skill `LICENSE` to the repo root and reorganised the
tree into families (`skills/design-systems/`, `skills/product-design/`,
`skills/mental-health/`). This directory flattens that — Claude Code resolves a
skill by its **folder name**, so the family directories are dropped and the
licence is copied back into each folder.

## Refreshing from upstream

Skills here are vendored **pristine**: no local edits, so a refresh is a
straight copy and any diff you see is genuinely upstream's. Keep it that way —
local integration notes belong in the root `CLAUDE.md`, not in a `SKILL.md`.

```bash
git clone --depth 1 https://github.com/bradfrost/skills.git /tmp/bf-skills
cd /tmp/bf-skills && git rev-parse --short HEAD   # record this in Provenance above

# diff before overwriting, so an upstream change is a reviewed diff
diff -ru .claude/skills/ds-inspection      /tmp/bf-skills/skills/design-systems/ds-inspection
diff -ru .claude/skills/ds-adoption-plan   /tmp/bf-skills/skills/design-systems/ds-adoption-plan
diff -ru .claude/skills/product-inspection /tmp/bf-skills/skills/product-design/product-inspection
```

Ignore the `LICENSE` line in each diff; it is the deliberate delta described above.

## Deliberately NOT vendored

Upstream also ships a `mental-health` family (`limits-setup`, `limits-sessions`,
`limits-quiet-hours`, `limits-endings`, `limits-energy`) and a
`setup-brad-frost-skills` router. Those are **machine-global, not project
scoped**: they write config to `~/.config/ai-limits/` and wire hooks into
`~/.claude/settings.json`. Vendoring them into a repo would do nothing. Install
them per-machine instead:

```bash
npx skills add bradfrost/skills -g
# then, in a new session:
/setup-brad-frost-skills
```
