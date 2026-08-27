# Work Order — Parsimony, 2026-08-10

_From the fifth-pass inspection (83/100 after the 2026-08-11 S1 correction, all ten stations). Reds first, then yellows. Every item names its station, its evidence, and a first move._

There are **no reds**. Every item below is a yellow — schedule, don't panic.

> **Close-out, 2026-08-11.** Six of seven items are done. Each keeps its original
> evidence and gains an outcome — including the two where the evidence turned out
> to be wrong, since a work order that quietly rewrites its own premises is worth
> less than one that shows them. The single item left is a procurement decision.

| # | Item | Station | Status |
|---|---|---|:--|
| 1 | Code Connect question | S10 | **open — owner decision** |
| 2 | Design library cover roadmap | S6 | ✅ done |
| 3 | Adoption scan | S8 | ✅ #210 |
| 4 | Close the two shipped-but-open issues | S7 | ✅ done |
| 4b | Missing Figma components | S1 | ✅ #209 — one built, one correctly declined |
| 5 | Parity dump + Routine | S6 | ✅ #211 — the suspicion was wrong |
| 6 | Changelog | S7 | ✅ #212 |

---

## 🟡 Still open

### 1. Decide the Code Connect question (S10) — **OPEN**

**Evidence:** `list_file_components_for_code_connect` → *"You need a Dev or Full seat on an Organization or Enterprise plan."* `whoami` → tier `pro`. 22 `*.figma.ts` files exist and cannot be published.

**This is a procurement decision, not an engineering one.** Three honest options:

- **Upgrade** the Figma plan to Organization — the files are already written, so the bridge lights up immediately.
- **Keep the files as a parity artifact only** and say so plainly. They still feed `npm run parity`, which is real value.
- **Retire them** if neither the bridge nor the parity check earns its keep.

**Partly actioned 2026-08-11.** The *documentation* half is done: `CLAUDE.md`, `CONTRIBUTING.md`, the PRD and the portfolio case study no longer describe Code Connect as live (#207, portfolio #68), and `D-29`/`OD-5` are corrected — the publish 403 was never a Figma bug, it was a plan entitlement, and nothing was ever going to resolve that support ticket.

**The decision itself is still yours, and the case shifted.** The 2026-08-10 entry argued *"the bottleneck is the library, not the bridge — Figma holds 4 of 27 components."* **That premise was false and is retracted** (#208): the library holds 25 of 27, now 26 of 26 real components. It was the strongest argument against upgrading. What remains — `parity` never touches Code Connect, the MCP gives agents strictly more, and 74 days passed without it costing anything measurable — still holds, but the decision is now finely balanced rather than clear-cut.

**First move:** pick one and record it in `docs/decisions.md`.

---

## ✅ Done

### 2. Fix the design library's cover roadmap (S6) — **DONE 2026-08-11**

**Was:** node `32:11` advertised *"Component-level tokens — surfaced as Figma component properties"* citing `tokens/components/*.tokens.json` — a directory deleted in #114 and now fenced out by the `no-component-token` lint.

**Done:** the roadmap now reads Light mode · Code Connect (plan-blocked) · parity coverage. Two further inaccuracies were found and fixed while in there: the cover claimed **158 variables** (real: **218**) and **4 effect styles** including a `shadow/none` that does not exist (real: **3**), and it omitted the 22 component sets entirely.

### 3. Build the adoption scan (S8, #106) — **DONE — #210**

**Was:** no usage measurement anywhere; Station 8 scored **5/10**, lowest on the board.

**Done:** `scripts/adoption-scan.mjs`, `npm run adoption -- <dir>`, reusing `drift-scan`'s walker and file filters. Reports which of the **27** `rr-*` components appear as markup, which of the **120** semantic tokens are referenced (the first draft of this item said "~150" — wrong), and declared/installed/source versions.

**What it found on portfolio-vercel:** 57 of 120 tokens (48%), effectively zero components. A token-layer consumer, not a component one — a *fit* signal rather than a distribution one, and exactly the coverage-vs-adoption split nothing could previously express.

**What building it taught:** the naive version reported `rr-badge` as used; it is not, the string is in an image alt-text. Tightening to markup did not fix it either — the same alt-text contains `<rr-badge variant="success">Active</rr-badge>` as an example of agent output. So the scan prints the file behind every count and states the limit. A measurement, not a gate.

### 4. Close the two issues that describe shipped work (S7) — **DONE 2026-08-11**

**#42** (a11y addon — wired in `.storybook/main.ts`, 57 `toHaveNoViolations` assertions) and **#77** (visual regression — 80 manifest-driven baselines in CI). Both closed with a comment naming the evidence.

### 4b. Build the missing Figma components (S1) — **DONE — #209**

**Evidence, twice corrected.** The first draft of this item said 4 of 27 existed. **Wrong** — 25 of 27 did (#208). Then the remaining two were examined properly:

- **`rr-radio` — built.** Node `214:12` on `Components / RadioGroup`, three variants mirroring `radio.ts`, every visual property variable-bound. Building it also surfaced that `spacing/align` did not exist in Figma at all (added to code that morning in #203) — created there too — and that `rr-radio`'s contract pointed at the **RadioGroup** node, which both radio metas claimed. Repointed.
- **`rr-table-row` — deliberately NOT built.** It is purely structural: `display: table-row`, and `selected` only sets `aria-selected`. Its zebra/hover/selected visuals are painted by the parent `rr-table` stylesheet, as its own meta summary states, and Figma's `Table` already contains `Header Row`, `Row`, `Row (zebra)` and `Row (selected)` with its rail. **A standalone set would assert ownership the code deliberately refuses.**

**So the inventory is complete at 26 of 26 real components** — not 27/27, because one of the 27 correctly has no standalone Figma counterpart.

### 5. Refresh the parity dump and verify its Routine actually fires (S6) — **DONE — #211**

**Was suspected:** the dump was 15 days old and the weekly Routine might never have fired, given the "created inside a session carries no MCP connector grants… exits quietly" caveat in `docs/contracts.md`.

**Both suspicions were wrong, and that is the finding.** The Routine is enabled, ran **2026-08-10T10:35Z**, and carries the Figma connector because it was created via `http_api` rather than from inside a session — so the caveat does not apply to it. Its two siblings fired the same morning. No parity-drift issue has ever been opened, consistent with clean runs rather than silent ones. The dump's age was **by design**: the Routine is explicitly forbidden from committing refreshes.

Re-exported all three bound sets: `rr-badge` 9/9, `rr-input` 5/5, `rr-button` 72/72 — identical in both directions. Only the `exported` date moved.

### 6. Ship a changelog (S7, #88) — **DONE — #212**

`npm run changelog -- <from> [to]`, with the comparison extracted into `scripts/token-diff.mjs` and shared with `check-publish-fresh` so the gate and the changelog cannot disagree. `packages/tokens/CHANGELOG.md` is seeded with real generated output for 0.6.1 → 0.7.0 — the `spacing.align` entry that was missing when the portfolio installed it that morning.

---

## 🟢 Keep green

- **Machine-readable surface (S9, 10/10).** Verification modes as data is genuinely ahead of the field — don't let it rot; #206 (capability manifest) is the right next step for it.
- **Accessibility (S3, 10/10).** Contrast *and* motion are both machine-enforced now. Hold the line: the next new rule should declare its verification mode on day one.
- **Determinism gates.** Golden fixtures + build-twice-byte-compare + artifact staleness. These are why this repo can be trusted by an agent at all.

---

## Owner decisions still waiting (carried from the fourth pass)

1. **DE `foreground.success` on `background.alt` — 4.38:1.** Darken DE's success green one step (repaints decisioning-table status text) or accept the documented exclusion.
2. **Consumer PAIRINGS generation** — the second half of #87's acceptance.
3. ~~Are the 23 unbuilt Figma components demand-gated or a backlog?~~ **Resolved 2026-08-11 — the premise was false.** See item 4b; no owner ruling needed.

---

## Cadence

- Next full 10-station pass: **2026-11** (quarterly from this one).
- **Do not re-score S8 on the strength of #210 alone.** The mechanism now exists, but the station asks whether real usage *informs the backlog*. A report nobody has acted on is worth the same 5 — the number moves when a finding changes a decision, not when a script exists.
- Put the date in a calendar, not a decision log. Four passes in 48 hours followed by 25 days of silence is the pattern Station 8 warns about.
