# Work Order — Parsimony, 2026-08-10

_From the fifth-pass inspection (82/100, all ten stations). Reds first, then yellows. Every item names its station, its evidence, and a first move._

There are **no reds**. Every item below is a yellow — schedule, don't panic.

---

## 🟡 Schedule — highest leverage first

### 1. Decide the Code Connect question (S10)

**Evidence:** `list_file_components_for_code_connect` → *"You need a Dev or Full seat on an Organization or Enterprise plan."* `whoami` → tier `pro`. 22 `*.figma.ts` files exist and cannot be published.

**This is a procurement decision, not an engineering one.** Three honest options:

- **Upgrade** the Figma plan to Organization — the files are already written, so the bridge lights up immediately.
- **Keep the files as a parity artifact only** and say so plainly in `CLAUDE.md`/`AGENTS.md` — they still feed `npm run parity`, which is real value. Stop describing Code Connect as a live agent surface anywhere (including the portfolio case study, which currently states "Figma Code Connect 22/27").
- **Retire them** if neither the bridge nor the parity check earns its keep.

**First move:** pick one and record it in `docs/decisions.md`. Whatever you choose, the case-study claim and `AGENTS.md` need to match it.

### 2. Fix the design library's cover roadmap (S6)

**Evidence:** Figma node `32:11` advertises "Component-level tokens — surfaced as Figma component properties" and cites `tokens/components/*.tokens.json` — a directory deleted in #114, now fenced out by the `no-component-token` lint.

**First move:** edit the two cover text nodes (`32:12` / `32:13`) to describe the real v2. Fifteen minutes in the Figma UI. The system's most public artifact currently argues against its own architecture.

### 3. Build the adoption scan (S8, #106) — the weakest leg

**Evidence:** no usage measurement anywhere; `grep -rl adoption scripts/ .github/workflows/` is empty; #106 open since July with nothing done. Station 8 scored **5/10**, lowest on the board.

**First move — deliberately embarrassing, per the station's own advice** ("a dependency-version scan across consumer repos this week beats an analytics platform next year"):

`scripts/adoption-scan.mjs`, reusing `drift-scan.mjs`'s existing walker, answering one question per consumer:

- which of the 27 `rr-*` components appear at all
- which of the ~150 semantic tokens are referenced
- installed package version vs latest published

That single table separates **coverage** (what they *could* use) from **adoption** (what they *do*), which is currently indistinguishable. Start with portfolio-vercel — it's the one consumer already wired into `drift-lint`.

### 4. Close the two issues that describe shipped work (S7)

**Evidence:** **#42** — `@storybook/addon-a11y` is in `.storybook/main.ts` with 57 `toHaveNoViolations` assertions. **#77** — 80 visual baselines running in CI via a manifest-driven spec.

**First move:** close both with a comment naming the evidence, exactly as #191 was closed today. Ten minutes, and it stops the board lying about the system's own health.

### 4b. Build the two missing Figma components — CORRECTED SCOPE (S1)

**Evidence (2026-08-11, corrected):** the design library holds **25 of 27** components, not 4 of 27 as this work order's first draft implied. Enumerating all 32 pages shows 22 `Components / *` pages with real component sets. **Exactly two code components have no Figma counterpart: `rr-radio` and `rr-table-row`.**

**First move:** build those two, taking the library to 27/27. This is an afternoon, not a project — and it makes the design↔code inventory exactly symmetrical for the first time.

### 5. Refresh the parity dump and verify its Routine actually fires (S6)

**Evidence:** `figma/components.dump.json` — 3 components, `exported: 2026-07-26` (15 days). `docs/contracts.md` records the known caveat that a Routine created inside a session carries no MCP connector grants and "exits quietly."

**First move:** re-export the three bound components now (this session has live Figma MCP access), then check whether the Monday 10:30 UTC Routine has opened or updated its tracked issue since 2026-07-26. If it hasn't, re-create it from claude.ai as the caveat instructs.

### 6. Ship a changelog (S7, #88)

**Evidence:** no `CHANGELOG.md` at root or in either published package. A consumer going 0.6.1 → 0.7.0 has nothing to read; today they'd have had to diff two tarballs to learn `spacing.align` was added — which is literally what this session did.

**First move:** the smallest useful version is a token semantic-diff generated at publish time (added / removed / changed value), appended to `packages/tokens/CHANGELOG.md`. #88 already scopes this.

---

## 🟢 Keep green

- **Machine-readable surface (S9, 10/10).** Verification modes as data is genuinely ahead of the field — don't let it rot; #206 (capability manifest) is the right next step for it.
- **Accessibility (S3, 10/10).** Contrast *and* motion are both machine-enforced now. Hold the line: the next new rule should declare its verification mode on day one.
- **Determinism gates.** Golden fixtures + build-twice-byte-compare + artifact staleness. These are why this repo can be trusted by an agent at all.

---

## Owner decisions still waiting (carried from the fourth pass)

1. **DE `foreground.success` on `background.alt` — 4.38:1.** Darken DE's success green one step (repaints decisioning-table status text) or accept the documented exclusion.
2. **Consumer PAIRINGS generation** — the second half of #87's acceptance.
3. **Are the 23 unbuilt Figma components demand-gated or a backlog?** (S1) — changes whether that station's −1 is a gap or a deliberate deviation.

---

## Cadence

- Next full 10-station pass: **2026-11** (quarterly from this one).
- **Do not re-score S8 before building #106** — inspecting it again without a mechanism will just reproduce the 5.
- Put the date in a calendar, not a decision log. Four passes in 48 hours followed by 25 days of silence is the pattern Station 8 warns about.
