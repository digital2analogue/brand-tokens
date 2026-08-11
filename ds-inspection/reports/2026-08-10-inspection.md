# Parsimony — Full Inspection (Fifth Pass, first all-10)

_Date: 2026-08-10 · Technician: Claude (Claude Code cloud session) · Mode 3: re-inspection against the fourth pass (2026-07-16)_

## TL;DR

**82/100 across all ten stations — the first pass to score S7 and S8**, which the fourth pass deferred to "the next full pass (October)." We are running early, which is fine: this is the pass that finally puts a number on the two legs nobody had measured.

On the eight stations that were scored before, the total moved **75 → 70**. Read that carefully: **the system did not get worse — the inspection got deeper.** Every point lost came from evidence nobody had gathered before, all of it on the *design* side of the house. The code side gained ground: the #114 tier deletion finished, reduced motion went from documented to lint-enforced, and a real accessibility defect was found and fixed.

Three findings carry this report, and two of them are new to this pass.

| # | Station | Light | Score | Δ vs 4th pass |
|---|---------|-------|------:|:---:|
|  1 | Coverage & gaps                 | 🟢 | 8/10  | −1 |
|  2 | Best practices                  | 🟢 | 9/10  | — |
|  3 | Accessibility                   | 🟢 | 10/10 | — |
|  4 | Shared language                 | 🟢 | 9/10  | — |
|  5 | Testing & validation            | 🟢 | 9/10  | — |
|  6 | Orchestration                   | 🟡 | 7/10  | **−2** |
|  7 | Governance & version control    | 🟡 | 7/10  | *first score* |
|  8 | Feedback & adoption             | 🟡 | 5/10  | *first score* |
|  9 | Machine-readable docs & context | 🟢 | 10/10 | — |
| 10 | Agent access                    | 🟢 | 8/10  | **−2** |
|    | **Total**                       |    | **82/100** | |

> _Arithmetic note:_ the fourth pass's table sums to 75, not the 76 printed in its total row. Using 75 as the comparable baseline.

---

## The three findings that carry this report

### 1. Code Connect cannot be published from this Figma account `[verified]`

`list_file_components_for_code_connect` on the library returns:

> *"You need a Dev or Full seat on an Organization or Enterprise plan to use Code Connect."*

`whoami` confirms the account is **`pro` tier** (seat: Full, team: "figma.quduf's team"). The 22 `*.figma.ts` files are real, well-formed, and parity-checked — but the Figma-side integration they exist to create **is not operable on the current plan.** An agent working in Figma Dev Mode cannot see the code mapping today.

This does not make the files worthless: `npm run parity` diffs them against an exported dump and catches drift, which is genuine value. But S10's own warning-light list names "no design-to-code bridge" explicitly, and the prior 10/10 was awarded partly on Code Connect being live. It isn't. **This is a plan/procurement question, not an engineering one** — and it should be a stated constraint rather than an assumed capability.

### 2. The design library's front page advertises an architecture the code deleted `[verified]`

The Figma cover (node `32:11`, "Roadmap") reads:

> **What's next (v2)** — Components — Button, Input, Badge (already defined in `tokens/components/*.tokens.json`) · Light mode — for the decision-engine sub-brand · **Component-level tokens — surfaced as Figma component properties**

`tokens/components/` **was deleted in #114** (2026-07-27), and `no-component-token` now lints against exactly that tier. The system's most public design artifact is promoting the thing the system decided against, and citing a directory that no longer exists.

This is the same class of defect this repo spent August fixing in code (#205: two anatomy descriptions claiming limits that anatomy v2 had removed). The design library has the identical problem and nothing checks it — `validate` reads `tokens/` and `packages/`, never Figma.

### 3. Feedback & adoption is the weakest leg, and it is the only station with no mechanism at all `[verified]`

Scored 5/10, the lowest on the board. There is **no adoption or usage measurement anywhere**: no scan of which components or tokens each consumer actually uses, no coverage-vs-adoption distinction, no cadence. `#106` has been open since the July baseline and has had nothing done.

What keeps it out of red is real and worth naming: `drift-lint` runs weekly against portfolio-vercel and gives a genuine *detachment* signal, `sync-tokens` surfaces version lag in the consumer, and — because the maintainer is also the consumer — product context does flow back informally. This very session is the proof: consumer work drove #174, and the #202 detector was designed against measured consumer output. The loop exists; it just lives in one person's head rather than in the repo.

---

## Station records

### Station 1 — Coverage & gaps: GREEN (8/10, −1)

- `[verified]` **Code side is strong and grew:** 22 component directories / **27 `*.meta.json`** (was 21), 24 story files, generated MDX for all 27 shipped in the npm tarball. Token tiers are now genuinely two-tier — `tokens/{primitives,semantic,brands}`, component tier gone (#114).
- `[verified]` **Design side lags badly.** The Figma file is a *foundations* library: its cover advertises "158 variables across 6 collections, 19 text styles, 4 effect styles." Component sets exist for Icon, Badge, Button, Input — **4 of 27**. S1's first warning light is "design components with no code counterpart (or vice versa)"; this is the vice versa, at scale.
- Prior passes scored this 9 on code coverage alone. The −1 records the design-side gap that was never inspected, not a regression.
- **Not inspected:** whether the missing 23 are demand-gated by design (the fourth pass recorded tooltip/popover/accordion as deliberate). Worth an owner ruling.

### Station 2 — Best practices: GREEN (9/10, unchanged)

- `[verified]` **The fourth pass's withheld point was earned:** #114 finished. `tokens/` has exactly `primitives/`, `semantic/`, `brands/`. The `no-component-token` lint fences the tier out permanently.
- `[verified]` New this month: `spacing.align` names the 2px optical rung that had no semantic name, retiring 18 literal-px sites across seven components (#203). The remaining literals are documented per-component in each anatomy — 1px hairlines, the `.sr-only` recipe, and geometry sized to an adjacent element.
- `[verified]` `check-golden` byte-compares built CSS against fixtures; CI builds twice and fails on non-determinism.
- Withheld point moves rather than clears: **design-side internals were sampled only shallowly** (I read the cover and four component sets; I did not audit auto-layout hygiene or layer naming). Scoring 10 would be claiming coverage I don't have.

### Station 3 — Accessibility: GREEN (10/10, holds)

- `[verified]` **Reduced motion went from documented to enforced.** hard-10 was `manual`; #202 gave it a detector (`no-hardcoded-duration`) plus a `validate` gate (`missingReduceGuard`), and it caught a real shipped defect — `rr-input` animated its border under `prefers-reduced-motion` because a literal `120ms` bypassed the token override.
- `[verified]` **57 `toHaveNoViolations` assertions** across component tests; `@storybook/addon-a11y` wired in `.storybook/main.ts`; `vitest-axe` in the test setup.
- `[verified]` `tokens/pairings.json` — 25 explicit pairs including a non-text class at SC 1.4.11's 3:1 floor, gated per-brand on every push.
- The 10 holds and is better-earned than last pass: contrast was already machine-checked; motion now is too.

### Station 4 — Shared language: GREEN (9/10, unchanged)

- `[verified]` Naming traces cleanly design→code for what exists: Figma `Icon` set variants `Size=compact/default/large/xl` map exactly to `--icon-size-compact/default/large/xl` (16/20/24/32).
- `[verified]` Rule vocabulary is now single-sourced *and* typed: `rules[]` in every meta carries an **id** into `ai/rules.md` rather than restated prose (#189, which removed 80 restatements and three different wordings of "never use hex").
- Withheld point: `CLAUDE.md` still reads "Three (`rr-badge`, `rr-button`, `rr-input`) are fully productionized with machine-readable `*.meta.json`" when all 27 carry one. It happens to match the 3 Figma-bound components, but not by intent — flagged in GARAGE.md a month ago and still unclarified.

### Station 5 — Testing & validation: GREEN (9/10, unchanged)

- `[verified]` **The fourth pass's "no visual regression in the DS itself" gap is closed.** `packages/components/tests/visual/stories.spec.ts` is manifest-driven — one screenshot per story from the built Storybook index, no hand-maintained list — with **80 committed baselines**, run in CI with a diff-report upload on failure.
- `[verified]` Suite totals: 261 root + 285 components + 70 MCP. `validate` runs **twelve checks**, now grouped under the five questions they answer (#204).
- `[verified]` Evals exist for the AI workflow — `governance-eval.mjs` (#153) scores snippets, and the rule-verification test fails in **both** directions (a rule claiming `lint` with no detector, and a detector-targeted rule claiming to be unenforced).
- Withheld point: the DS's own self-healing baselines loop still has no live hands-free proof. (It ran hands-free in the *consumer* this session — portfolio-vercel #67 — but that is a different workflow.)

### Station 6 — Orchestration: YELLOW (7/10, −2)

- `[verified]` **Design→code drift is real and currently unmonitored.** The cover roadmap contradicts the shipped architecture (finding 2 above). Nothing checks the design library against the code; `validate`'s twelve checks all read `tokens/` and `packages/`.
- `[verified]` **The parity dump is thin and ageing.** `figma/components.dump.json` covers **3 components** (badge/button/input), `exported: 2026-07-26` — 15 days old at inspection. `npm run parity` reports "code and Figma agree" for exactly those three, which is true and much narrower than it sounds.
- `[verified]` The weekly re-export Routine documented in `docs/contracts.md` carries a known caveat — a Routine created inside a session carries no MCP connector grants and "exits quietly" if mis-created. Given the dump's age, this is worth verifying actually fired.
- `[verified]` Token→consumer flow is healthy in the other direction: `publish-freshness` weekly, `sync-tokens` in the consumer, and a same-day 0.7.0 publish→install→verify cycle completed during this session.
- The −2 is the honest cost of finally inspecting the design side. The *mechanisms* (parity differ, Routine, drift-lint) are well-built; their **coverage** is 3 of 27 and their freshness is unverified.

### Station 7 — Governance & version control: YELLOW (7/10, first score)

- `[verified]` **The paperwork gap from the July baseline is closed.** `CONTRIBUTING.md`, `.github/pull_request_template.md`, and `.github/ISSUE_TEMPLATE/{bug,roadmap}.md` all exist. Branch protection requires `verify`. `stale-prs.yml` flags PRs idle 7+ days into a tracked issue. `deprecate-package.yml` exists for retirement.
- `[verified]` Release process is documented and lived: publish workflows are on-demand, publish whatever version the package carries, retry `npm ci`, turn already-published dispatches into green no-ops, and **verify the registry serves the new version before reporting success**. Exercised twice today (0.7.0 tokens; components at 0.1.0).
- `[verified]` **No CHANGELOG anywhere** — not at root, not in either published package. Changes live in git history and `docs/decisions.md`. #88 (token semantic-diff changelog on publish) is open and untouched. A consumer upgrading 0.6.1 → 0.7.0 has no release note to read.
- `[verified]` **Tracker hygiene is the other gap, and it is this station's named warning light.** Two work-order items are *done in code but still open as issues*: **#42** (Storybook a11y addon — wired in `.storybook/main.ts`, 57 axe assertions) and **#77** (unit + visual regression — 80 baselines running in CI). An issue board that says "not done" about shipped work is the tracker version of a rotted contract.
- Frame note: for a solo maintainer this is a strong 7. The two gaps are both "the record disagrees with reality," which is precisely what this system is otherwise excellent at catching in code.

### Station 8 — Feedback & adoption: YELLOW (5/10, first score)

- `[verified]` **No adoption measurement exists.** No scan of which of the 27 components or ~150 tokens any consumer actually uses. `grep -rl adoption scripts/ .github/workflows/` returns nothing. #106 open since July, untouched.
- `[verified]` **Detachment signal exists and works** — `drift-lint.yml` runs weekly against `digital2analogue/portfolio-vercel`, opening/closing one tracked issue. It found real drift (#174) and, once its false-positive bug was fixed, now reports clean.
- `[verified]` Coverage vs adoption is currently indistinguishable. Three consumers are named across docs (decisioning-table ×20, portfolio-vercel ×8, river-intro ×2) but only **one** is scanned by anything.
- `[verified]` Product context *does* reach the system — this session's #202 detector was designed against measured consumer output, and #174 came from consumer drift. The loop is real and undocumented; it lives in the maintainer's head.
- `[verified]` **Cadence warning light is on.** S8 lists "reviews are ad hoc; inspection treated as one-and-done." Four passes happened in 48 hours in mid-July, then nothing for 25 days. This pass fixes that only if the next one is scheduled.
- Kept out of red because the detachment signal and the informal loop are genuine. Held below 6 because nothing measures usage and nothing survives the maintainer.

### Station 9 — Machine-readable docs & context: GREEN (10/10, holds)

- `[verified]` The published tarball is a genuine agent surface: `variables.css` + 3 brand CSS, `tokens.json`, `rules.json`, `index.json`, `pairings.json`, `system.md`, and **27 per-component `.md` files**.
- `[verified]` Two structural improvements this month, both removing a place where the same decision was written twice: `tokensUsed` is now **derived** from the anatomy tree and the schema *forbids* authoring it (#188), and prop descriptions are single-sourced from JSDoc via the CEM merge.
- `[verified]` **Verification modes are data now** (#189) — each rule carries `lint` / `gate` / `schema` / `manual`, so an agent can see that 12 of 18 rules have no automated check rather than assuming they all do. I have not seen another system publish this.

### Station 10 — Agent access: GREEN (8/10, −2)

- `[verified]` **MCP half is exemplary.** 17 tools, auto-registered via `.mcp.json` so any session in a clone gets them after `npm ci`, thin wrapper over shared `scripts/*.mjs` so the MCP, `validate`, and `drift-lint` can't drift apart. `@digital2analogue2/parsimony-components@0.1.0` is now published, closing the fourth pass's "components package unpublished" note.
- `[verified]` **Design-to-code bridge half is blocked by plan tier** (finding 1). This is S10's own first warning light.
- The 8 reflects one of two surfaces being fully operable. Nothing here is badly built; one half is gated behind procurement.

---

## Drift vs the fourth pass (2026-07-16)

**Lights turned off**
- #114 tier migration finished — S2's long-standing withheld point (verified: `tokens/` has no `components/`).
- Visual regression now exists in the DS itself — 80 baselines, manifest-driven (closes the fourth pass's S5 gap and issue #77).
- Automated a11y net — addon-a11y + 57 axe assertions (closes #42).
- Reduced motion escalated from documented rule to enforced lint + gate, and caught a real defect (#202).
- Governance paperwork complete — CONTRIBUTING, PR template, issue templates.

**New lights**
- 🟡 Code Connect not operable on the current Figma plan (S10).
- 🟡 Figma cover roadmap advertises the deleted component-token tier (S6).
- 🟡 Parity dump covers 3 of 27 components and is 15 days old, with an unverified refresh Routine (S6).
- 🟡 No CHANGELOG for either published package (S7).
- 🟡 Two shipped work items still open as issues (S7).
- 🟡 No adoption measurement (S8).

**Carried forward from the fourth pass**
1. DE `foreground.success` on `background.alt` at 4.38:1 — still an owner call (darken or accept the documented exclusion).
2. Consumer PAIRINGS generation — the second half of #87.
3. S5/S6 live proof of the DS's own hands-free baselines loop.

---

## Cadence

The fourth pass set **quarterly (next: October)** with daily gates carrying stations 2, 3, 5, 9. That remains right, with one amendment this pass earns:

- **Keep quarterly for the judgment stations** (1, 4, 6, 7, 8).
- **S8 needs a mechanism before it needs another inspection.** Re-scoring it in October without building anything will produce the same 5. Build #106 first; the station scores itself after that.
- **Put the inspection on the calendar rather than in a decision log.** Four passes in 48 hours then 25 days of silence is the pattern S8 warns about.

---

## Scope & honesty notes

- **Not inspected:** Figma design-side internals beyond the cover and four component sets — no audit of auto-layout usage, layer naming, or detached instances. Two of three named consumers (decisioning-table, river-intro) were not scanned; only portfolio-vercel is reachable in this session.
- **Frame:** solo maintainer, scored against small-team professional standards at the owner's standing request.
- **Deviations respected** (not counted as faults): Geist for decision-engine; links underlined at rest; `.rise` animation transients in the portfolio; OTKit demo palettes being deliberately off-system.
