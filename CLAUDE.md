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
  brands/           Sub-brand overrides (decision-engine, dot-art, dot-blog).
build/
  css/              Built output — one CSS file per brand. Generated; consumed by product repos.
packages/
  components/       Framework-agnostic Lit web components (rr-*). Each ships its own
                    *.meta.json (props/tokens/a11y/rules) and *.figma.ts (Code Connect —
                    authored but unpublishable on the current Figma plan; see CLAUDE.md below).
  tokens/           Publishable @digital2analogue2/parsimony — ships the built brand CSS so
                    consumers `npm install` instead of hand-copying. Built by prepack.
  mcp/              MCP server — components, tokens, and design reasoning (rules + decisions). Thin wrapper; logic lives in scripts/{rules,tokens,reasoning}.mjs.
schemas/
  meta.schema.json  JSON Schema each component *.meta.json validates against.
scripts/
  build-brands.mjs            Runs Style Dictionary for all brands. The token build command.
  generate-docs.mjs           Regenerates docs/index.html from token JSON.
  generate-design-md.mjs      Regenerates the token tables in ai/DESIGN.md from tokens/ (`npm run docs:design`).
                              Marker-fenced GEN regions only — authored prose is preserved. `--check` is the CI
                              staleness gate, and also fails when a semantic token exists that no region emits.
  build-design-system-json.mjs Merges *.meta.json + CEM into design-system.json (deterministic — sorted, no timestamp).
  anatomy.mjs                 The `anatomy` part tree: build gates (dangling binding, unknown state prop)
                              + the fg/bg pairs components declare. Imported by validate and contrast.
  component-tokens.mjs        Holds each component's contract to the styles it ships (#187): the tokens
                              `var()`-referenced in the source vs tokensUsed ∪ anatomy, both directions,
                              plus unknown-token detection. Imported by validate (§4d).
  rules.mjs                   Single source of truth for the lint rules (no hex / no primitive / no hardcoded size / no hardcoded
                              motion duration / deprecated). Imported by validate, the MCP, and drift-lint. Also holds
                              missingReduceGuard — hard-10's other half, a validate gate rather than a portable rule.
  validate.mjs                Build gate. Twelve checks grouped under the five questions they answer:
                              is the spec well-formed / does the code follow the rules / do the names point
                              at things that exist / does the spec match the code / can people read it.
                              Adding a check means putting it under the question it answers.
  drift-scan.mjs              Reusable consumer-repo scan (scanConsumer): walk + ignore handling + shared rules. Shared by drift-lint and the MCP lint_consumer tool.
  drift-lint.mjs              Thin CLI over drift-scan: scans a consumer repo using the shared rules. `npm run drift -- <dir>`.
  adoption-scan.mjs           Consumer ADOPTION scan (#106): which rr-* components and which semantic
                              tokens a consumer actually uses, plus declared/installed/source versions.
                              `npm run adoption -- <dir>`. Shares drift-scan's walker and file filters.
                              drift-lint answers "is the consumer breaking the rules"; this answers "is
                              the consumer using the system" — coverage vs adoption. A measurement, never
                              a gate: it prints the file behind every component it counts, because markup
                              inside a string (a case study quoting `<rr-badge>`) is indistinguishable
                              from real usage to any lexical rule.
  component-parity.mjs        Code↔Figma parity differ (`npm run parity`): diffs meta.json prop bindings against
                              figma/components.dump.json, classifies drift ahead/behind/mismatched. See docs/contracts.md.
  token-diff.mjs              One definition of "what changed" between two sets of built brand CSS (#88):
                              parseTokens + diffTokenMaps + the changelog renderer. Shared by
                              check-publish-fresh and token-changelog so the gate and the changelog
                              cannot disagree.
  token-changelog.mjs         Semantic diff between two published releases (#88):
                              `npm run changelog -- <from> [to]`. Prints markdown; never edits
                              CHANGELOG.md itself, so entries land through a reviewed diff. Omit <to>
                              to diff the last published version against the current source build.
  check-publish-fresh.mjs     Diffs source-built tokens vs the published npm package; flags a needed republish. `npm run check:publish-fresh`.
  check-golden.mjs            Golden gate: built brand CSS must match tests/golden/css fixtures byte-for-byte
                              (`npm run check:golden`; after an intentional token change: `npm run golden:update`).
                              CI also builds twice and byte-compares — non-determinism fails the run.
                              Gotcha: `build/css/` is gitignored, so it SURVIVES a branch checkout — build on one
                              branch, switch, and the gate reports drift from the branch you left. `npm run build`
                              after switching; the gate is right and you are looking at stale CSS.
  drop-baselines.mjs          Deletes visual baselines by substring so `--update-snapshots` will actually
                              rewrite them (`npm run baselines:drop -- <substring>`; refuses to run without
                              a filter). Playwright only rewrites a baseline whose comparison FAILED, so a
                              change small enough to pass on tolerance is one the update flag silently
                              declines to record — see #235 and the visual-regression note below.
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
.claude/skills/       Third-party agent skills, vendored verbatim from bradfrost/skills (MIT).
  ds-inspection/      10-station inspection of a DESIGN SYSTEM → report + work order.
  product-inspection/ 10-station inspection of a SHIPPED PRODUCT built on one.
  ds-adoption-plan/   Bespoke-UI teardown → component mapping → estimate → phased schedule.
  README.md           Provenance (upstream commit pin), refresh procedure, what is NOT vendored.
docs/
  index.html         Base dark theme design system reference. Open file:// directly in browser.
  brand-design-system-prd.md  Product requirements. v1 + the v2 (agentic) scope that reversed several v1 non-goals.
  contracts.md       Operational guide to the component contract system (#156): prop bindings, slot
                     accepts, `npm run parity` + how to read ahead/behind/mismatched, dump refresh.
  decisions.md       THE decision log — the only one. Dated entries, newest first.
AGENTS.md            Vendor-neutral guide for agents *consuming* the system in product repos.
```

> **Visual regression has two traps, both learned the hard way (#235).** The
> component screenshots compare with `maxDiffPixels: 200` — an *absolute*
> allowance, deliberately, because the old `maxDiffPixelRatio: 0.02` was 2% of
> the 800×480 canvas (~7,700 px) while a small component contains fewer pixels
> than that in total; a visibly broken segmented control passed the suite twice.
> And `--update-snapshots` only rewrites a baseline whose comparison **failed**,
> so regenerating locally needs the PNGs deleted first: `npm run baselines:drop
> -- <substring>`. Baselines are still meant to come from the CI runner
> (`update-visual-baselines.yml`), not your machine.

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

**Two tiers** (the component tier was deleted 2026-07-27 — #114; the `no-component-token`
lint fences it out):

1. **Primitives** (`tokens/primitives/`) — raw hex values. Never use in UI code.
2. **Semantic** (`tokens/semantic/`, `tokens/brands/`) — named roles (background, foreground, border). These are what UI code — including every `rr-*` component — references directly.

## Workflow: Making a Token Change

**Always start here, never in the product repo.**

1. Edit the appropriate file:
   - New color value → `tokens/primitives/color.tokens.json`
   - Semantic role change → `tokens/semantic/` or `tokens/brands/<brand>.tokens.json`
   - (There is no component tier — #114. Components reference semantic roles directly.)
2. Build tokens: `npm run build` (or `node scripts/build-brands.mjs`)
3. Regenerate docs: `npm run docs` (docs/index.html) **and** `npm run docs:design`
   (the token tables in `ai/DESIGN.md`)
   - Or run all three at once: `npm run build:all`
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

- **`packages/components/`** — framework-agnostic Lit web components (`rr-*`). Each ships a Code Connect `*.figma.ts`, but **Code Connect is NOT live** — publishing needs a Dev/Full seat on a Figma Organization/Enterprise plan and the account is `pro` tier, so `figma connect publish` 403s (see the 2026-08-10 decision entry). The files are authored, `validate`-checked (§4/§4b) and ready if the plan changes; they are not an agent surface today. The design↔code bridge that DOES work is `npm run parity`, which reads node IDs from `meta.json` and a dump exported via the Figma MCP — no Code Connect involved. Three (`rr-badge`, `rr-button`, `rr-input`) are fully productionized with machine-readable `*.meta.json` (props, slots, events, tokens used, a11y contract, applicable rules) validated against `schemas/meta.schema.json`. See `AGENTS.md` for consumer-facing usage.
- **`design-system.json`** — generated by `npm run build:meta`. Merges every `*.meta.json` with the Custom Elements Manifest into one artifact the MCP server reads. Never hand-edit. **`tokensUsed` is DERIVED for any component that declares an anatomy** (#188): the merge
  computes it from the anatomy tree, and the schema forbids authoring it there. It became
  derivable only once anatomy v2 (#178) could express every binding — before that, 29 tokens
  lived only in the flat list. Components without an anatomy still author it.
  **Prop descriptions are single-sourced from the per-property JSDoc** (`/** … */` above each `@property`): `meta.json` props carry only `{ name, type, default }`, and the merge injects each `description` from the CEM (logic in `scripts/cem-descriptions.mjs`). A prop missing its JSDoc fails the build. To change a prop description, edit the JSDoc and re-run `build:meta` — never `meta.json`.
- **`packages/mcp/`** — MCP server exposing the system to agents. **Auto-registered via
  `.mcp.json` at the repo root** — every Claude Code session in a clone gets the
  `parsimony` server after `npm ci` (the server needs the workspace-installed MCP SDK;
  prefer these tools over re-reading token JSON by hand). A thin wrapper; the
  parsing/query logic lives once in `scripts/{rules,tokens,reasoning}.mjs` and is shared
  with `validate`/`drift-lint` and the tests. Tools follow the shape-follows-verb
  convention: `get_*`/`list_*` look up by exact key (one record), `find_*` search by topic
  (ranked array).
  - Components (from `design-system.json`): `list_components()` — names + summaries;
    `get_component(name)` — full contract (props, events, tokens, anatomy part tree, rules,
    a11y, examples);
    `check_usage(snippet)` — flags rule violations (hex, `--primitive-*` refs, hardcoded
    font sizes/weights, hardcoded transition/animation durations, unapproved font families,
    deprecated tokens) **before** code is
    written. Detectors live once in `scripts/rules.mjs`, so the same set gates `validate`
    + `drift-lint`; values written inside comments are never flagged, by any of the three
    (#174 — a comment ships no styling, and treating one as a violation had a consumer's
    weekly drift report crying wolf for a week); the duration rule goes quiet on any file
    that does reduced-motion work at all, because whether a literal is protected is a
    cascade question a lexical checker cannot answer (same lesson); the statically-undetectable hard rules (display/title weight, accent-
    green-as-resting-text) are out of scope here — they need semantic context.
  - Tokens (from `tokens/**/*.tokens.json`): `get_token(name)`, `find_token(query)`,
    `get_scale(category)` — a full semantic scale (`spacing`, `radius`, `shadow`, `motion`,
    `icon`, `letter-spacing`, `typography`) with resolved values + usage; `get_spacing()`
    is the back-compat alias for `get_scale('spacing')`.
  - Design reasoning (from `ai/rules.md` + `docs/decisions.md`): `find_rule(topic)` /
    `get_rule(id)` — the hard/soft rules, each carrying a **`verify` mode** (#189):
    `lint` (a detector in `scripts/rules.mjs` catches it), `gate` (a `validate` check),
    `schema` (structurally impossible), or `manual` (**no automated check** — the reader's
    judgement is the only thing enforcing it; 12 of the 18 rules are `manual`, which is the
    honest picture, not an oversight). A rule claiming `lint` without a detector fails the
    test suite, in both directions. Component metas cite these by id in `rules[]`; `find_decision(topic)` / `get_decision(id)` —
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
    `check_contrast({component, part, state?})` also resolves the pair from a component's
    declared anatomy instead of two named colours;
    `validate_brand(brand)` — checks every *intended* fg/bg pairing keeps AA once a
    sub-brand's overrides apply. Intended pairs come from three sources: naming convention
    (`on-<role>`↔`background.<role>`, `TEXT_ROLES`↔`SURFACE_ROLES`), the pairs components
    declare in their `anatomy`, and the explicit map (`tokens/pairings.json`) — whose
    `excludeBrands` scopes a pair out of brands that never render it, no matter which
    source named it.
    **The convention half is BRAND-AWARE (#216):** its token universe is base ∪ the brand's
    own overrides, and `SURFACE_ROLES` covers `default/alt/elevated/hover` while `TEXT_ROLES`
    covers `default/alt/muted/action/secondary/tertiary`. Roles absent from a brand are
    skipped, so base and the dot-* brands are unaffected (13 pairs); decision-engine goes
    **13 → 31**. Before this both lists were base-shaped, so `validate_brand('decision-engine')`
    checked **zero** pairs on `background.elevated` — the surface DE renders most content on.
    A pair the convention generates but a brand genuinely never draws goes in
    `tokens/pairings.json`'s **`exclusions`** array, not `excludeBrands` (a convention pair
    has no map entry to flag). The schema requires each exclusion to carry `ratio`,
    `confirmedBy` and a `reason` describing the UI — so "we never draw this" stays
    distinguishable from "this was red and we looked away."
  - Consumer linting (from `scripts/drift-scan.mjs`, shared with the `drift-lint` CLI +
    weekly Action): `lint_consumer({ path, ignore? })` — scans a consumer repo (or single
    file) with the same `RULES` as `check_usage`, but at file/repo level. Honours a
    `.driftignore` at the path root; returns `{ scanned, clean, violations }`. Pass an
    absolute path (relative resolves against the server cwd).
- **`npm run validate`** — static gate over `tokens/` and components; enforces the hard rules below in CI.

### Vendored inspection skills (`.claude/skills/`)

Three third-party skills from [`bradfrost/skills`](https://github.com/bradfrost/skills)
are vendored here, so every session in a clone can invoke them by name. They are the
qualitative counterpart to this repo's own checkers: `validate`, `drift-lint` and
`adoption-scan` answer *what is measurably true*, the skills answer *what should we do
about it*. Provenance, the upstream commit pin and the refresh procedure live in
[`.claude/skills/README.md`](.claude/skills/README.md).

- **`ds-inspection`** grades **this repo** across 10 stations. Stations 9 and 10
  (machine-readable docs, agent access) are largely what `design-system.json`, the
  `*.meta.json` contracts and `packages/mcp/` already exist to satisfy — bring those as
  `[verified]` evidence rather than re-deriving them.
- **`product-inspection`** grades a **consumer repo** (portfolio-vercel, decisioning-table,
  portfolio-art, river-intro). Run it from here pointed at the consumer's path, the same
  shape `npm run drift -- <dir>` uses.
- **`ds-adoption-plan`** plans a consumer's migration onto Parsimony. **Run
  `npm run adoption -- <dir>` first and feed it the output** — that scan already reports
  which `rr-*` components and semantic tokens the consumer uses plus its
  declared/installed/source versions, which is the skill's phase-1 teardown baseline
  measured rather than interviewed. Mind the scan's own caveat: it is lexical, so markup
  quoted inside a string (a case study showing `<rr-badge>`) counts as usage; it prints the
  file behind every component precisely so you can throw those out.

**Vendored files stay pristine** — no local edits, so a refresh is a straight copy and any
diff is genuinely upstream's. Local integration guidance goes here in `CLAUDE.md`, never
into a `SKILL.md`.

The upstream `mental-health` limits family and `setup-brad-frost-skills` are deliberately
**not** vendored: they wire hooks into `~/.claude/settings.json` and write
`~/.config/ai-limits/`, so they are per-machine installs
(`npx skills add bradfrost/skills -g`), not repo artifacts.

## AI Reference Files

- `@ai/DESIGN.md` — resolved token tables for the **base dark theme** only. The tables
  are **generated** from `tokens/` (`npm run docs:design`) and fenced in `GEN:` markers —
  never hand-edit a value there; change the token's `$value`/`$description` and regenerate.
  Everything outside the markers (Visual Identity, Responsive Scaling, Hard Guardrails,
  Interaction Patterns) is authored prose and is preserved across runs.
- `@ai/DECISION-ENGINE.md` — token decisions, naming conventions, deleted tokens, and architecture intent for the decision-engine sub-brand. Read this before touching any DE tokens.
- `@ai/rules.md` — hard and soft rules for token usage across all sites.

## Hard Rules

- Never define color tokens inline in product repos — always trace back here first
- Never reference primitive tokens (`--primitive-color-*`) in UI code
- All text/background pairings must pass WCAG AA (4.5:1). Verify before adding a new semantic token.
- `build/` is generated — never hand-edit it
- **One decision log: `docs/decisions.md`.** Record decisions as dated entries there (newest first, what/why/alternative/status). NEVER create another DECISIONS, ADR, or decision-log file anywhere in the repo — two parallel logs already had to be merged once (see the 2026-06-11 consolidation entry). The archived D-numbers inside it are frozen; do not extend the D-sequence. `ai/DECISION-ENGINE.md` is a sub-brand reference spec, not a decision log.
