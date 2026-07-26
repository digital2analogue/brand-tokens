# Parsimony

River Romney's cross-site design system. Single source of truth for color, typography, and spacing across all sites.

@ai/DESIGN.md
@ai/rules.md

---

## Repo Structure

```
tokens/
  primitives/       Raw values — hex colors, px sizes. Never referenced directly in UI.
  semantic/         Base dark-theme semantic tokens (named roles → primitives).
  components/        Component-scoped tokens (badge, button, input, alert, …).
  brands/           Sub-brand overrides (decision-engine, dot-art, dot-blog).
build/
  css/              Built output — one CSS file per brand. Generated; consumed by product repos.
packages/
  components/       Framework-agnostic Lit web components (rr-*). Each ships its own
                    *.meta.json (props/tokens/a11y/rules) and *.figma.ts (Code Connect).
  tokens/           Publishable @digital2analogue2/parsimony — ships the built brand CSS so
                    consumers `npm install` instead of hand-copying. Built by prepack.
  mcp/              MCP server — components, tokens, and design reasoning (rules + decisions). Thin wrapper; logic lives in scripts/{rules,tokens,reasoning}.mjs.
schemas/
  meta.schema.json  JSON Schema each component *.meta.json validates against.
scripts/
  build-brands.mjs            Runs Style Dictionary for all brands. The token build command.
  generate-docs.mjs           Regenerates docs/index.html from token JSON.
  build-design-system-json.mjs Merges *.meta.json + CEM into design-system.json (deterministic — sorted, no timestamp).
  rules.mjs                   Single source of truth for the lint rules (no hex / no primitive / no hardcoded size / deprecated). Imported by validate, the MCP, and drift-lint.
  validate.mjs                Build gate: meta.json schema + lint rules + token-reference resolution.
  drift-scan.mjs              Reusable consumer-repo scan (scanConsumer): walk + ignore handling + shared rules. Shared by drift-lint and the MCP lint_consumer tool.
  drift-lint.mjs              Thin CLI over drift-scan: scans a consumer repo using the shared rules. `npm run drift -- <dir>`.
  check-publish-fresh.mjs     Diffs source-built tokens vs the published npm package; flags a needed republish. `npm run check:publish-fresh`.
  drift_audit.py              Figma-variable-vs-token drift auditor (separate concern from code linting).
design-system.json   Generated artifact — merged component metadata + Custom Elements Manifest, read by the MCP server.
.github/workflows/
  ci.yml             Runs on every push/PR: validate → build → build:meta → artifact-staleness check → tests
                     (workspace tests + root token-sanity tests in tests/unit — npm test --workspaces skips
                     the repo root, so ci.yml runs `npm run test:unit -- --run` explicitly). `main` has branch
                     protection requiring the `verify` check; Dependabot bumps auto-merge via
                     dependabot-automerge.yml once CI passes (major npm bumps stay manual).
  drift-lint.yml     Scheduled (weekly) + manual scan of a consumer repo for drift; opens/closes a tracked issue.
  publish.yml        On-demand publish of @digital2analogue2/parsimony to public npm. Publishes whatever
                     version packages/tokens/package.json carries — bump it BEFORE dispatching. Retries
                     npm ci, turns already-published dispatches into green no-ops, and verifies the
                     registry serves the new version before reporting success.
  publish-freshness.yml  Scheduled (weekly) + manual check that the published package matches the source tokens; opens/closes a tracked issue when a republish is due.
  stale-prs.yml      Scheduled (weekly) + manual check for open PRs idle 7+ days; opens/closes a tracked issue. Enforces the ~7-day land-or-close rule below.
docs/
  index.html         Base dark theme design system reference. Open file:// directly in browser.
  brand-design-system-prd.md  Product requirements. v1 + the v2 (agentic) scope that reversed several v1 non-goals.
  decisions.md       THE decision log — the only one. Dated entries, newest first.
AGENTS.md            Vendor-neutral guide for agents *consuming* the system in product repos.
```

> **One repo, real workspaces.** `packages/*` are npm workspaces — run `npm ci`
> once at the root. The lint rules live in exactly one place (`scripts/rules.mjs`);
> never re-implement a regex in a checker, import from there.

## Branch & PR Workflow

> Contributor-facing version: [CONTRIBUTING.md](CONTRIBUTING.md) (same rules,
> human-oriented). PRs follow `.github/pull_request_template.md`.

Multiple autonomous sessions (local + cloud) work this repo in parallel. Each boots without memory of the others, so branches and PRs drift unless every session follows these rules. (Context: a 6-week-old PR regressed shipped state, a real bug fix sat a month, and the highest-value PR rotted into conflict — all from branches that never caught up to `main`. See `docs/decisions.md`.)

1. **Branch fresh; rebase before opening or updating a PR.** Always `git fetch origin && git rebase origin/main` before you push a PR. A branch behind `main` is the root cause of every drift incident here — the one PR that was branched from current `main` was the only one that stayed clean.
2. **Small and single-purpose.** One concern per PR; aim for under ~200 changed lines. Large omnibus PRs don't get reviewed — they sit. Split mechanical changes (regenerated artifacts) from logic.
3. **Validate before you push.** Run `npm run validate` (and `npm run build:all` if tokens changed, `npm run build:meta` if component metadata changed). Commit regenerated artifacts in the same PR — CI fails on staleness. **Run the tests CI runs, not just the root suite:** `npm test --workspaces --if-present` AND `npm run test:unit -- --run`. A root-only test pass has already shipped a red branch once (2026-07-02: an MCP-workspace canary test pinned `validate_brand`'s verdict to a then-broken pairing; the token fix flipped it and only CI noticed). Corollary: a test that asserts live token data is *broken* will invert when someone fixes the data — write regression tests against synthetic fixtures, not real defects.
4. **Declare intent before non-trivial work.** Check open PRs/branches first (`gh pr list`, `git branch -r`); if your work overlaps, open a draft PR or coordinate rather than starting a parallel branch. Two sessions independently created duplicate work (two decision logs, overlapping docs) by skipping this.
5. **Land or close within ~7 days.** A PR with no movement for a week is merged or closed — never left to rot. The longer it waits, the harder it is to land. The weekly `stale-prs.yml` Action surfaces violators in a tracked issue (it only flags — it never closes a PR for you).
6. **Automation quirks (learned 2026-07-02):** `@dependabot rebase`/`recreate` comments posted through an API integration are silently ignored — Dependabot only honours them from the GitHub UI. For a Dependabot PR that's merely behind (no conflict), the update-branch API works and re-triggers CI; a *conflicted* one must wait for Dependabot's own rebase cycle or a human comment. Also: batch your pushes — every push to a CI-watched branch is a run (and a failure email if red), so push once per logical unit, and never push to a branch while its "Update visual baselines"-style workflow is mid-run in a consumer repo.

**Where work is tracked (orient here on boot):** Current and next work lives in **GitHub issues** — run `gh issue list` (filter the roadmap with `--label roadmap`). It's the single board every session shares, local or cloud. Cross-session follow-ups become **issues, not prose** buried in the decision log. Division of labour: issues = *what's next*, `docs/decisions.md` = *why* (decisions), git/PRs = *what shipped*. The local agent memory is a per-machine cache, not the source of truth — it does not travel to cloud sessions.

## Token Layers

1. **Primitives** (`tokens/primitives/`) — raw hex values. Never use in UI code.
2. **Semantic** (`tokens/semantic/`, `tokens/brands/`) — named roles (background, foreground, border). These are what UI code imports.
3. **Component** (`tokens/components/`) — tokens scoped to a single component (badge, button, input, …), consumed by the matching `rr-*` web component in `packages/components/`. **FROZEN — do not add to this tier.** The target architecture is two-tier (primitives → semantic; see #114 and the 2026-07-16 decision entry): new components write semantic roles directly, and the 9 remaining legacy families migrate out under #114.

## Workflow: Making a Token Change

**Always start here, never in the product repo.**

1. Edit the appropriate file:
   - New color value → `tokens/primitives/color.tokens.json`
   - Semantic role change → `tokens/semantic/` or `tokens/brands/<brand>.tokens.json`
   - Component-scoped value → `tokens/components/<component>.tokens.json`
2. Build tokens: `npm run build` (or `node scripts/build-brands.mjs`)
3. Regenerate docs: `npm run docs` (or `node scripts/generate-docs.mjs`)
   - Or run both at once: `npm run build:all`
4. Validate: `npm run validate` (rejects hex literals, primitive/deprecated refs, and dangling token references)
5. If a component's metadata changed, rebuild the artifact: `npm run build:meta` → regenerates the CEM and `design-system.json`. **Commit the regenerated artifact** — CI fails if it's stale.
6. Check the output in `build/css/<brand>.css`
7. Go to the consumer repo and run `npm run sync-tokens` to surface any drift

CI (`.github/workflows/ci.yml`) runs steps 4–5 plus the workspace tests on every push/PR, so a broken reference, a malformed `meta.json`, or a stale artifact can't land.

## Distribution

`@digital2analogue2/parsimony` (`packages/tokens/`) makes the built brand CSS a real,
versioned dependency so consumers stop hand-copying the token block. Preview the
publish tarball anytime with `npm pack --workspace @digital2analogue2/parsimony --dry-run`.

Publishing targets the **public npm registry** under the `@digital2analogue2`
scope (the maintainer's npm username, used as a free user scope — no npm org
needed) via `.github/workflows/publish.yml` (on-demand only). Public npm keeps
the scope independent of the GitHub repo owner, so the repo stays under
`digital2analogue` with no transfer. One-time setup: add an npm automation token
as the `NPM_TOKEN` Actions secret. Steps in `packages/tokens/README.md`. The
components package publishes as `@digital2analogue2/parsimony-components` via
`.github/workflows/publish-components.yml` (on-demand, same conventions); the
mcp package (still scoped `@riverromney`) is not published yet.

## Sub-Brands

| Brand | Token file | Built CSS | Notes |
|---|---|---|---|
| Base (dark) | `tokens/semantic/` | — | All `.com`, `.design` sites |
| decision-engine | `tokens/brands/decision-engine.tokens.json` | `build/css/decision-engine.css` | Light-mode enterprise UI. Geist font exception. |
| dot-art | `tokens/brands/dot-art.tokens.json` | `build/css/dot-art.css` | Pure black canvas for photo |
| dot-blog | `tokens/brands/dot-blog.tokens.json` | `build/css/dot-blog.css` | 18px body, relaxed line-height |

## Components & Agent Tooling

- **`packages/components/`** — framework-agnostic Lit web components (`rr-*`). All are wired to Figma via Code Connect (`*.figma.ts`). Three (`rr-badge`, `rr-button`, `rr-input`) are fully productionized with machine-readable `*.meta.json` (props, slots, events, tokens used, a11y contract, applicable rules) validated against `schemas/meta.schema.json`. See `AGENTS.md` for consumer-facing usage.
- **`design-system.json`** — generated by `npm run build:meta`. Merges every `*.meta.json` with the Custom Elements Manifest into one artifact the MCP server reads. Never hand-edit. **Prop descriptions are single-sourced from the per-property JSDoc** (`/** … */` above each `@property`): `meta.json` props carry only `{ name, type, default }`, and the merge injects each `description` from the CEM (logic in `scripts/cem-descriptions.mjs`). A prop missing its JSDoc fails the build. To change a prop description, edit the JSDoc and re-run `build:meta` — never `meta.json`.
- **`packages/mcp/`** — MCP server exposing the system to agents. **Auto-registered via
  `.mcp.json` at the repo root** — every Claude Code session in a clone gets the
  `parsimony` server after `npm ci` (the server needs the workspace-installed MCP SDK;
  prefer these tools over re-reading token JSON by hand). A thin wrapper; the
  parsing/query logic lives once in `scripts/{rules,tokens,reasoning}.mjs` and is shared
  with `validate`/`drift-lint` and the tests. Tools follow the shape-follows-verb
  convention: `get_*`/`list_*` look up by exact key (one record), `find_*` search by topic
  (ranked array).
  - Components (from `design-system.json`): `list_components()` — names + summaries;
    `get_component(name)` — full contract (props, events, tokens, rules, a11y, examples);
    `check_usage(snippet)` — flags rule violations (hex, `--primitive-*` refs, hardcoded
    font sizes/weights, unapproved font families, deprecated tokens) **before** code is
    written. Detectors live once in `scripts/rules.mjs`, so the same set gates `validate`
    + `drift-lint`; the statically-undetectable hard rules (display/title weight, accent-
    green-as-resting-text) are out of scope here — they need semantic context.
  - Tokens (from `tokens/**/*.tokens.json`): `get_token(name)`, `find_token(query)`,
    `get_scale(category)` — a full semantic scale (`spacing`, `radius`, `shadow`, `motion`,
    `icon`, `letter-spacing`, `typography`) with resolved values + usage; `get_spacing()`
    is the back-compat alias for `get_scale('spacing')`.
  - Design reasoning (from `ai/rules.md` + `docs/decisions.md`): `find_rule(topic)` /
    `get_rule(id)` — the hard/soft rules; `find_decision(topic)` / `get_decision(id)` —
    the decision log (dated entries + archived ADR D-NN log).
  - Brand awareness (from `tokens/brands/*.tokens.json`): `get_brand(brand)` — a
    sub-brand's full override set (base vs brand value per token); `compare_brands(a, b)` —
    the tokens whose resolved value diverges between two brands.
  - Assembly: `check_assembly({components, tokens, placements, context})` — design-intent
    check over a set used together (4 rules: spacing-between-components, WCAG fg/bg pairing,
    deprecated/unknown token, and slot composition — `placements: [{component, parent, slot?}]`
    checked against the parent slot's `accepts` contract from meta.json; slots without
    `accepts` are unconstrained). Returns `{ valid, suggestions }`; logic in `scripts/assembly.mjs`.
  - Contrast (from `scripts/contrast.mjs`, reusing the WCAG math in `assembly.mjs`):
    `check_contrast({foreground, background, brand?, fontSize?, bold?})` — ratio + AA/AAA
    verdict for a pair (tokens or hex; large-text threshold when `fontSize` qualifies);
    `validate_brand(brand)` — checks every *intended* fg/bg pairing keeps AA once a
    sub-brand's overrides apply. Intended pairs are derived by convention and v1 is
    deliberately scoped to the unambiguous ones (`on-<role>`↔`background.<role>`, base
    text↔base surfaces); the accent family is out of scope pending an explicit pairing map.
  - Consumer linting (from `scripts/drift-scan.mjs`, shared with the `drift-lint` CLI +
    weekly Action): `lint_consumer({ path, ignore? })` — scans a consumer repo (or single
    file) with the same `RULES` as `check_usage`, but at file/repo level. Honours a
    `.driftignore` at the path root; returns `{ scanned, clean, violations }`. Pass an
    absolute path (relative resolves against the server cwd).
- **`npm run validate`** — static gate over `tokens/` and components; enforces the hard rules below in CI.

## AI Reference Files

- `@ai/DESIGN.md` — resolved token tables for the **base dark theme** only.
- `@ai/DECISION-ENGINE.md` — token decisions, naming conventions, deleted tokens, and architecture intent for the decision-engine sub-brand. Read this before touching any DE tokens.
- `@ai/rules.md` — hard and soft rules for token usage across all sites.

## Hard Rules

- Never define color tokens inline in product repos — always trace back here first
- Never reference primitive tokens (`--primitive-color-*`) in UI code
- All text/background pairings must pass WCAG AA (4.5:1). Verify before adding a new semantic token.
- `build/` is generated — never hand-edit it
- **One decision log: `docs/decisions.md`.** Record decisions as dated entries there (newest first, what/why/alternative/status). NEVER create another DECISIONS, ADR, or decision-log file anywhere in the repo — two parallel logs already had to be merged once (see the 2026-06-11 consolidation entry). The archived D-numbers inside it are frozen; do not extend the D-sequence. `ai/DECISION-ENGINE.md` is a sub-brand reference spec, not a decision log.
