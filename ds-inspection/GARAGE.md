# GARAGE.md — Parsimony
_Checked in: 2026-07-15 · **Re-confirmed 2026-08-10** (fifth pass, first full 10-station)_

## Vehicle
- System: Parsimony, River Romney's cross-site design system — single source of truth for color, typography, spacing across riverromney.com/.design/.art/.blog + sub-branded product surfaces
- Team: solo (River), side-of-desk — **scored against small-team professional standards at owner's request** · Consumers: 3 live consumer repos in this session (portfolio-vercel, decisioning-table, river-intro) + the .art/.blog site brands
- Age: ~1 month (first commit 2026-06-17); rapid build-out, no major rebuilds yet; component-tier removal planned (parsimony#114)
- Reason for service: routine service — first inspection, baseline read

## Assets
- Design library: Figma **"River Romney — Parsimony Design System"** (file `4aOEBHcnAv2Kbn0g1arL78`, renamed per #74; cover reads "Base Dark · v1"). 22 `*.figma.ts` Code Connect files; **only 3 carry prop bindings** (badge/button/input). **Plan constraint discovered 2026-08-10: the account is Figma `pro` tier, and Code Connect requires a Dev/Full seat on Organization/Enterprise — the mapping cannot be published to Figma from this account.**
- Code library: Lit web components (`rr-*`), 22 component dirs / **27 `*.meta.json`**; tokens via Style Dictionary (**`tokens/{primitives,semantic,brands}` — the component tier was deleted, #114**) → `build/css/<brand>.css`; published **`@digital2analogue2/parsimony@0.7.0`** and **`@digital2analogue2/parsimony-components@0.1.0`** (mcp package still unpublished)
- Docs: `docs/index.html` (generated token reference, file:// viewable), `ai/DESIGN.md` + `ai/rules.md` + `ai/DECISION-ENGINE.md` (agent-facing), `docs/decisions.md` (single decision log), `AGENTS.md` (consumer guide)
- Process: GitHub issues (single shared board), branch protection on main (`verify` check), weekly Actions (drift-lint, publish-freshness, stale-prs), Dependabot + automerge
- AI surface: MCP server (`packages/mcp/`, logic in `scripts/{rules,tokens,reasoning,assembly,contrast,drift-scan}.mjs`), `design-system.json` (meta.json + CEM merge), per-component `*.meta.json`, CLAUDE.md/AGENTS.md rules files, Code Connect

## Evidence access map
| Asset | Access | Verified how |
|---|---|---|
| Design library | live | Figma MCP `whoami` → River; `get_metadata` on node 115:10 returned the real Icon component set (Size=compact/default/large/xl) |
| Code library | live | Full repo at /home/user/parsimony; read token files, component src, scripts |
| Docs | live | Local files (docs/, ai/, AGENTS.md) readable |
| Process | live | GitHub MCP reachable (issues/PRs); Actions configs in repo |

## Known symptoms
- None volunteered — routine service. **Resolved since:** #114 landed (tier deleted); accent-family pairings now in `tokens/pairings.json` and gated. **Still open:** CLAUDE.md's "three fully productionized" line remains ambiguous now that all 27 carry meta.json (it happens to match the 3 Figma-bound components, but not by intent).

## Probable greens
- Token pipeline & consumer drift tooling (sync-tokens, drift-lint, publish-freshness)
- Machine-readable surface (meta.json, design-system.json, MCP) — stations 9–10 candidates

## Intentional deviations (respect these)
- Geist font for decision-engine sub-brand (documented exception)
- Links underlined at rest, underline removed on hover (inverse of convention, documented)
- portfolio-vercel case study presents two-tier target state ahead of code (#114; decision logged 2026-07-14)
- `.rise` animation transient contrast dips in portfolio (documented, accepted)
- OTKit demo palettes in portfolio are deliberately off-system (demo-local, scoped)

## Scope & frame
- Stations this pass (2026-08-10): **all 10 — S7 and S8 scored for the first time**, per the fourth pass's note that they enter the scored set at the next full pass · Scoring frame: solo held to small-team standards
- Out of scope: nothing. Design-side *internals* (auto-layout hygiene, layer naming) sampled only shallowly — noted at S2.
