# The Component Contract System

> Operational guide: what the contract machinery is, which commands run it, and how
> to read what they tell you. The *why* lives in `docs/decisions.md` (2026-07-26,
> "Contract-authoritative model committed"); the staged roadmap is issue **#156**.
> This doc describes what is shipped and running today.

Parsimony is moving to a **contract-authoritative** model: each component's
`*.meta.json` is evolving into the single machine-readable definition — props with
dual code↔Figma bindings, slot constraints, (later) per-part anatomy — and both
surfaces (Lit code, Figma library) are provable against it. Two rules carry the
whole model:

1. **Surfaces never sync side-to-side.** A drift between code and Figma is resolved
   by promoting the change *into the contract* as a reviewed diff, then bringing the
   lagging surface up to it — never by eyeballing one surface against the other.
2. **No capability claim without an eval behind it.** Every gate and detector below
   has synthetic-fixture tests (`tests/unit/`); a rule added without its fixture
   pair fails the suite.

## The pieces

| Piece | Where | What it declares |
|---|---|---|
| **Prop bindings** | `props[].bindings` in `*.meta.json` | `{ code: { prop }, figma: { kind, property, valueMap? } }` — how one code prop maps to a Figma variant axis and its options. Boolean derivations supported (`State=disabled → disabled: true`). |
| **Design-only options** | `figma.ignoredOptions` in `*.meta.json` | Figma variant options that deliberately emit no code (e.g. button `State=hover` — CSS handles it). Declared, so they are covered — anything *undeclared* and unbound is drift. |
| **Slot constraints** | `slots[].accepts` in `*.meta.json` | Element tags a slot accepts (`rr-menu` default slot → `rr-menu-item`). Omitted = unconstrained; `"*"` = explicitly anything; `"#text"` = text-only. |
| **The dump** | `figma/components.dump.json` | Snapshot of the Figma component sets (variant symbol names per bound component), exported from the Parsimony Design System file (`4aOEBHcnAv2Kbn0g1arL78`) via the Figma MCP. Input to the parity differ. Never hand-edit. |

Roll-out is **opt-in per component**: gates only fire on metas that declare bindings.
Currently bound: `rr-badge`, `rr-button`, `rr-input` (the three `stable` components).
The other 24 metas get promoted as #156 stages roll through them.

## Commands

| Command | What it does | When it fails |
|---|---|---|
| `npm run parity` | Diffs every bound meta's bindings against `figma/components.dump.json` and classifies drift (see below). `--json` for machine output; pass a path to diff a different dump. | Exit 1 on any finding. |
| `npm run validate` | The build gate. Contract-relevant sections: **§1b** — every `rr-*` entry in a slot's `accepts` must name a real component; **§4** — every `figma.enum` emission must exist in a component literal union; **§4b** — bindings must agree with the component's `*.figma.ts` bidirectionally (property name, full valueMap, reverse coverage). | Exit 1, offending item named. |
| `npm run build:meta` | Regenerates the CEM + `design-system.json` (bindings, `accepts`, `ignoredOptions` all flow through to the MCP's `get_component`). Commit the regenerated artifact — CI fails on staleness. | On schema violations or missing prop JSDoc. |

## Reading parity findings

Each finding is `[class] component: detail`, classified — never guessed:

- **`ahead`** — Figma has a variant axis or option that no binding and no
  `ignoredOptions` entry covers. Figma is ahead of the contract. → Either promote it
  (add to the binding's `valueMap` + implement in code) or declare it design-only
  (`ignoredOptions`). Both are reviewed changes to the meta.
- **`behind`** — a binding or ignore references a property/option the Figma
  component set no longer has (stale ignores included), or a bound meta has no
  matching component set in the dump. Figma is behind the contract. → Fix the Figma
  library (or the stale declaration) to match.
- **`mismatched`** — same axis on both sides, but an option exists on exactly one
  side (the historical `ghost`/`danger` drift, #46). Reported per option, with which
  side has it. → Decide which side is right, change the *contract* first, then the
  lagging surface.

The differ only reports. It never edits metas, code, or Figma.

## Refreshing the dump

The dump is a point-in-time export. To refresh (after changing the Figma library, or
when the weekly audit says it's stale):

1. For each bound component, take `figma.nodeId` from its meta
   (`96:21` badge, `98:56` button, `103:27` input today).
2. In a session with the **Figma MCP** connected: `get_metadata` on the file key
   `4aOEBHcnAv2Kbn0g1arL78` + that nodeId. The `<symbol name="Variant=…,State=…">`
   entries are the variant names — copy them verbatim into the component's
   `variants` array in `figma/components.dump.json`, update `exported`.
3. `npm run parity` — resolve any findings per the classes above before committing
   the refreshed dump.

(The Figma **variables** REST API is Enterprise-only, which is why exports go
through the MCP — same constraint and same pattern as `scripts/drift_audit.py`;
see the 2026-07-15 decision entry.)

## The weekly audit

A scheduled Claude Routine ("Parsimony component parity audit", Mondays 10:30 UTC)
re-exports the dump via the Figma MCP, runs the differ against the fresh export, and
reflects the result in one tracked GitHub issue — opened/updated with findings,
closed when clean. It never commits and never auto-fixes. **Caveat** (shared with
the drift-audit Routine): a Routine created from inside a session carries no MCP
connector grants — if its runs exit quietly, re-create it from the claude.ai
Routines UI with the Figma + GitHub connectors attached.

## Where this is heading

- **#156 stage 2** — structured `anatomy` (per-part token bindings) in the schema.
- **#156 stage 3** — the contract *generates* the surfaces: Figma library first,
  then the Lit components. From that point the differ's job flips from detecting
  drift to proving the generators faithful.
- Deferred slot-constraint scope (`acceptsMode`, `min`/`max` cardinality,
  per-surface anchors) is recorded on **#154**.
