# Decision Log

A running, append-only record of notable decisions for the Parsimony design
system. Newest first. The PRD (`docs/brand-design-system-prd.md`) describes the
intended shape of the system; this log captures *why* it took the turns it did,
including the ones that reversed an earlier PRD assumption.

Each entry: **what was decided**, **why**, **the alternative considered**, and a
**status**. Keep them short. Add an entry whenever a choice would be expensive to
reverse or would surprise someone reading the code later.

---

## 2026-08-10 — The 2px rung gets a semantic name instead of an exemption (#63, #177)

**What.** Added `spacing.align` → `{primitive.space.3xs}` (2px) and converted 18
literal-px sites across seven components: ten `4px` values that were
`spacing.micro` written out longhand, and eight `2px` values that are now
`spacing.align`. No exemption to hard-7 was granted.

**Why.** #63 was framed as "do we allow 1–2px optical nudges to break the
spacing rule." Auditing the actual values showed the premise was wrong.
`primitive.space.3xs` is 2px and **was referenced by nothing** — the semantic
scale started at `micro` (4px), so the system had a 2px rung with no semantic
name. Since hard-9 forbids reaching a primitive from UI code, every component
needing 2px had no legal path and wrote a literal. That is not components being
sloppy; it is the rule and the token set disagreeing, with the components caught
between them. Naming the rung dissolves the conflict rather than carving an
exception into the rule.

Corroboration that the role was already understood: the hand-authored row in
`docs/index.html` had described `space.3xs` as *"Hairline — optical adjustments
and icon nudges. Not real spacing"* long before this. The token names an intent
the system already had; it just wasn't reachable.

**Alternative considered.** A blanket "≤3px is exempt from hard-7" rule.
Rejected as the worst option available: unfalsifiable, it licenses 3px anywhere
forever, and it would still miss the point — the genuinely arbitrary values in
the library are `padding-right: 36px` and `right: 10px` in rr-select, which sail
past a ≤3px threshold while being far less defensible than the 2px it would
excuse.

**What is deliberately still literal.** Three classes, none of them spacing-scale
candidates: 1px optical hairlines in rr-alert; the standard `.sr-only`
visually-hidden recipe in rr-spinner (`width:1px; height:1px; margin:-1px`),
which is boilerplate accessibility and would be a false positive for any hard-7
detector; and geometry sized to an adjacent element (rr-select's arrow inset and
matching right padding, rr-toggle's knob inset). Each component's anatomy
description now says which of these it carries and why, rather than the contract
claiming a blanket omission.

**Status.** Shipped. hard-7 stays `manual` — after this pass, what remains is
genuine judgement, which is what `manual` is supposed to mean. A detector would
need an allowlist for the sr-only idiom before it could be honest.

**Publishing.** `@digital2analogue2/parsimony` bumped 0.6.1 → 0.7.0 (additive:
one new semantic token). The publish workflow is on-demand and has not been
dispatched.

---

## 2026-08-10 — Code Connect was never blocked by a Figma bug; it is a plan entitlement (supersedes D-29, closes OD-5)

**What.** D-29 (2026-05-28) recorded the `figma connect publish` 403 as *"a Figma
platform issue — their new scoped token UI does not expose the Code Connect Write
scope"*, status *"Not our problem to fix. File a Figma support ticket."* OD-5 has
read "Waiting on Figma support" for 74 days. **That diagnosis was wrong.**

**Evidence.** The Figma MCP's `list_file_components_for_code_connect` against the
library returns, verbatim: *"You need a Dev or Full seat on an Organization or
Enterprise plan to use Code Connect."* `whoami` reports the account as **`pro`
tier**. The Write scope was never exposed because the plan does not entitle it —
a 403 is exactly what that looks like from the CLI. There is no bug, no ticket
that can resolve, and nothing to monitor.

**Consequence, stated plainly: Code Connect has never worked, once, in the life
of this system.** Every claim that the components are "wired to Figma via Code
Connect" describes an intention, not a capability. Those claims are corrected in
`CLAUDE.md`, `CONTRIBUTING.md`, and the PRD in the same change.

**Decision: do not upgrade the plan yet, and keep the 22 `*.figma.ts` files.**

- The system reached 82/100 across ten inspection stations without it, so its
  absence has a 74-day track record of costing nothing measurable.
- The design↔code link that actually works does not use it: `npm run parity`
  reads node IDs from `meta.json` and diffs a dump exported through the Figma
  MCP. Code Connect is not in that path.
- For agents, the MCP already delivers strictly more than Code Connect would —
  `get_component` returns the full contract (props, anatomy, tokens, rules,
  a11y), where Code Connect returns a snippet inside Figma's own UI.
- **The bottleneck is the library, not the bridge.** Figma holds component sets
  for 4 of 27 components. Paying to bridge four while twenty-three have no design
  counterpart is the wrong order of operations.
- The files cost nothing to keep: they are validated by `validate` §4/§4b and
  become useful the day the plan changes.

**Revisit when** any of these becomes true: someone other than the maintainer
builds from the Figma library; Dev Mode becomes a daily working surface; or the
library grows to cover the component set.

**Alternative considered.** Delete the `*.figma.ts` files as dead weight.
Rejected — §4/§4b give them present-tense value as a parity target, and
re-authoring 22 files later costs more than keeping them.

**Status.** Recorded. OD-5 closed as misdiagnosed. D-29 stands as history and is
superseded by this entry.

---

## 2026-08-10 — hard-10 becomes enforced, in two pieces, and deliberately stays incomplete (#177)

**What.** `rr-input` shipped `transition: border-color 120ms ease` — the only
finite transition in 27 components that bypassed the motion tokens, so it kept
animating for users with `prefers-reduced-motion` set. Fixed to
`var(--motion-duration-instant) var(--motion-easing-default)`. hard-10 moves
`manual` → `lint`, enforced by two new checks:

- `no-hardcoded-duration` in `scripts/rules.mjs` — a literal time in a
  transition/animation declaration. Portable; gates `validate`, `drift-lint`
  and `check_usage`.
- `missingReduceGuard`, used as a `validate` gate — an infinite animation with
  no reduce guard in its own source. Not given to `drift-lint` (see below).

**Why now.** #189 shipped three days earlier and made visible that 12 of 18
rules had nothing checking them. The first `manual` rule examined had already
produced a live accessibility defect. That is the argument for converting the
detectable ones, made by the codebase rather than in the abstract.

**Why the rule is deliberately incomplete.** Three things are not flagged:
`infinite` animations (the token override cannot reach them — a 0s spinner
stops rather than damps — so hard-10 requires a hand-written guard instead),
`var(--token, 120ms)` fallbacks (the token is what applies), and **any file that
contains a reduced-motion guard at all**. That last opt-out is the load-bearing
one: whether a literal duration is protected depends on a guard that usually
lives in a separate `@media` block selecting the element from far away — a
cascade question, not a lexical one.

Measured before shipping rather than assumed: the rule reports the one genuine
defect across 27 components and **nothing** across portfolio-vercel, where all
22 candidate hits were either `var()` fallbacks or sat under an explicit guard.
Without the opt-out it would have filed 19 false positives into the consumer's
weekly drift issue — a rerun of #174, where a checker that cried wolf for a
week cost more than the rule it enforced.

**Alternative considered.** Ship the naive detector and accept the noise, on
the theory that hardcoded durations are technically violations regardless.
Rejected: a report nobody trusts enforces nothing, and the consumer's
`.rise` durations are explicitly guarded, so the reports would have been
wrong on the merits as well as unwelcome.

**Known gap, stated rather than papered over.** A hardcoded duration in a file
that guards *something else* is not caught. The rule is sound, not complete —
it never reports a violation that isn't one, and it misses some that are.

**Status.** Shipped. The spacing half of #177 (4px margins in input/select/
textarea, and the 1–2px optical nudges) is untouched and still blocked on the
exemption decision in #63.

---

## 2026-08-07 — Rules are referenced by id, and declare how they are verified (#189)

**What:** `ai/rules.md` annotates every rule with a **verification mode** —
`lint` | `gate` | `schema` | `manual` — parsed into a `verify` field by
`scripts/reasoning.mjs` and returned by `get_rule` / `find_rule`. A meta's `rules[]` now
holds **ids** (`hard-1`) rather than prose; `validate` §4e fails on an id that does not
resolve, and `build:meta` expands each to `{ id, verify, rule }` so consumers read no
differently. Component-specific prose moved to a new `guidance[]`.

**Why the ids:** three system rules were restated **80 times across 27 metas**, and "never
use hex" appeared in **three different wordings**. Nothing held any copy to the source.
That is the same de-normalization the rest of this work has been removing, at component
scale.

**Why the modes — the more important half.** Before this, every rule looked equally
enforced to an agent, while `CLAUDE.md` admitted *in prose* that several are statically
undetectable. Now it is data: **12 of the 18 rules are `manual`**, 5 are `lint`, 1 is a
`gate`. An agent reading `hard-5` (accent green is never resting text) can see that its own
judgement is the only thing checking it, rather than assuming a gate has it covered.

**`lint` is a promise, not a label.** `tests/unit/rules-fixtures.spec.mjs` fails in **both
directions**: a rule claiming `lint` with no detector in `scripts/rules.mjs` behind it, and
a rule a detector targets that claims to be unenforced. Both arrows were verified by
deliberately breaking them. This is the repo's "no capability claim without an eval" rule
turned on the rules themselves.

**Known weakness, recorded rather than hidden:** ids are **positional** — `hard-5` is the
fifth hard rule. Inserting a rule mid-list would silently repoint every meta that cites a
later one, and the resolve-check would not catch it because the shifted id still resolves.
`ai/rules.md` now says append-only in its header. A stronger fix (explicit ids in the file)
is available if that constraint ever gets violated.

**Alternative considered:** keeping prose in `rules[]` and adding a checker that each
string matches a rule in `ai/rules.md`. Rejected for the same reason as #188 — it guards a
redundancy instead of removing it.

**Status:** shipped. Three downstream renderers needed updating for the new shape and all
three were caught before merge: the component MDX generator (which rendered
`[object Object]` on first run), the story-ui briefing, and the MCP's expansion path.

---

## 2026-08-07 — tokensUsed is derived from anatomy, not authored beside it (#188)

**What:** `build-design-system-json.mjs` now computes `tokensUsed` from the anatomy tree
for any component that declares one, and `schemas/meta.schema.json` **forbids** authoring it
there (conditional `if/then/else`: required when there is no anatomy, prohibited when there
is). The field is gone from all nine anatomy metas. Consumers see no change — the derived
list is injected into `design-system.json`.

**Why:** it stated the same decision twice. The anatomy tree and the flat list both named
the component's tokens, and until #187 the flat list was checked against nothing at all —
its only reader was the doc generator, so it could name a token the component had stopped
using indefinitely. Same single-sourcing as prop descriptions, which come from the JSDoc
rather than the meta.

**Why only now:** this was blocked by #178, not by the promotion batches — a point I had
wrong when I filed the issue. You cannot derive a list from anatomy while 29 of its entries
exist *only* in the list. Anatomy v2 took that count to zero, which is what made the
derivation total rather than partial. Had this shipped earlier it would have needed a
dual-path fallback for the un-expressible tokens, written specifically to be deleted.

**Evidence it is a pure deletion:** the derived list reproduces **all 27** previously
hand-authored lists exactly — no additions, no losses. Sorted output, so a reordered
anatomy tree cannot churn the artifact and break the CI staleness check.

**Alternative considered:** keeping `tokensUsed` authored and adding a gate that the two
agree. Rejected — that is guarding a redundancy instead of removing it, which is the thing
this whole line of work exists to stop doing.

**Status:** shipped. Components without an anatomy still author the field; the schema's
conditional handles both populations, so the promotion batches can convert them one at a
time with no flag day.

---

## 2026-08-06 — Anatomy v2: the focus indicator is bound by role, not by CSS (#178 items 1–2)

**What:** `anatomy` gained four binding keys (`radius`, `shadow`, `motion`, `focus`) and a
richer condition grammar — `when` now takes an array of ANDed terms, and terms may be
negated (`!disabled`). All nine promoted components were backfilled. **29 tokens that were
declared in `tokensUsed` but attached to no part are now zero.**

**Why now, rather than after the promotion batches:** those 29 orphans decompose exactly
into the gaps v1 deferred — 11 motion, 5 radius, 4 focus rings, 4 needing compound
conditions. Promoting the remaining 18 components at v1 depth would have multiplied the
count and forced revisiting all 27 later. It also corrects a claim made a few days earlier:
#188 (derive `tokensUsed` from anatomy) is blocked by **this**, not by the batches — you
cannot derive a list from anatomy while 29 of its entries exist only in the list.

**The `focus` decision.** The library draws focus rings three ways — `outline` (checkbox,
dialog, link, radio, tab, toast, toggle), `box-shadow` (button, input, menu-item, select,
textarea), `border-color` (input, select, textarea) — for no design reason anyone recorded.
#178 anticipated only `shadow`. Binding the *mechanism* would need three keys and still
leave "does this component's focus indicator meet SC 1.4.11 (3:1)?" unanswerable, which is
the question #29 exists to audit. So `focus` states the role and the CSS stays an
implementation detail. **This is the one place anatomy abstracts over the code rather than
transcribing it**, and it is called out in the schema so the exception stays visible.
Consequence: where a focus ring is drawn as `border-color` and the token equals the focus
token (input, select, textarea), the `:focus` state now binds `focus` instead of `border` —
the same fact, named once.

**A bug the compound conditions surfaced immediately.** State overlays composed against the
part's *resting* set. That is wrong for a refinement: `variant=secondary + :hover` cascades
over `variant=secondary`, so composing it on resting paired rr-button's hover background
with its resting foreground — 1.23:1, a combination that never renders — and failed the
build on a defect that does not exist. `effectiveTokens()` now models the cascade: apply
every state whose terms are a subset, in authored order, then the state itself. Confident
wrong answers are the failure mode anatomy exists to avoid.

**Alternative considered:** mechanism keys (`shadow` + `outline`) for strict transcription.
Rejected — three focus languages stay three things, and no single query can audit focus
contrast. The right long-term fix is for the components to converge on one mechanism; the
contract naming the role makes that divergence visible instead of encoding it.

**Status:** shipped, contrast-neutral by construction. The `focus` key creates **no** new
pairs — anatomy still derives text pairs only, and the intended-pairing count is unchanged
(40 with anatomy, 38 without, before and after). Checking a focus ring against what
surrounds it needs the ambient-surface model, which stays deferred as #178 item 3: it is
the first piece of anatomy that would describe *context* rather than the component, and a
wrong default there silently produces confident wrong answers of exactly the kind this
change had to fix.

---

## 2026-08-04 — A value in a comment is not a violation (#174)

**What:** `lintLines` and `lintSnippet` now strip comment bodies before running the
rules (blanked in place, so reported line numbers stay true), the hex pattern gained a
`(?<!\w)` guard, and `drift-scan.mjs` skips `*.test.*` / `*.spec.*` files the way
`validate.mjs` §2 already skipped them in this repo.

**Why:** the weekly drift report against portfolio-vercel (#174) was **100% false
positives, and had been for a week**. `parsimony#114` in a comment read as the hex colour
`#114`; a JSDoc explaining *why* a colour fails contrast ("OTKit's accent-yellow #FDAF08
is 1.86:1") read as someone hardcoding it; and the consumer's own detector tests were
reported for containing the deliberately-bad snippets that are the entire point of a
detector's tests. Every rule here exists to stop a hardcoded value reaching rendered UI,
and a comment never does. A checker that cries wolf gets ignored, which costs more than
the rule enforces — the Curtis line about a rotted contract being worse than none,
applied to a detector.

Three of the four flagged files came clean from the upstream fix alone. The fourth,
`lib/checkUsageRules.ts`, holds the lint playground's sample-violation snippets as
template literals — genuinely shipped strings, correctly flagged, and correctly exempted
by a `.driftignore` entry in the consumer.

**Alternative considered:** `.driftignore` for all four. Rejected — it would have hidden
a real detector bug behind per-consumer configuration, and every other consumer would hit
the same false positives and write the same ignores.

**Status:** shipped. Deliberately *not* stripped: string literals — a hex in one may well
ship, which is exactly the `checkUsageRules.ts` case. `lintSnippet` (the MCP's
`check_usage`) got the same preprocessing in the same change: two tools disagreeing about
the same text is worse than either being wrong alone.

---

## 2026-08-03 — The contract is proved against the code, not asserted (#187, #191)

**What:** two new `validate` sections close the gap between what a `*.meta.json` claims
and what its component actually does. **§4d** (`scripts/component-tokens.mjs`) compares
every token the styles `var()`-reference against `tokensUsed` ∪ the anatomy tree, both
directions, and additionally rejects a `var(--x)` that names no token at all. It runs on
all 27 metas — `tokensUsed` is schema-required, so there is nothing to opt into. **§4c**
(`findValueMapMismatches` in `scripts/code-connect.mjs`) holds a prop's enum `valueMap` to
that prop's own literal union in both directions, and requires the meta's declared `type`
to *be* that union rather than a bare `string`.

**Why:** `tokensUsed` was checked against nothing — its only reader was the doc generator —
and `anatomy` is transcribed from real styles by hand, so both could rot the moment a
`static styles` block changed while per-part contrast, `check_contrast` and `validate_brand`
kept trusting them. On the prop side, an enum's options existed in three places (the source
union, the meta `type`, the `valueMap`) with only one pair ever compared. Prompted by Nathan
Curtis, *Component Contracts and Schemas* (2026-07-28), principles 1 and 4.

**What it caught immediately**, none of it hypothetical:
- `rr-button` — a `stable` component with full bindings — declared `"type": "string"` for
  both `variant` and `size` while `button.ts` declared four- and three-member unions. Its
  published contract accepted any string at all.
- `rr-dialog`, `rr-tag` and `rr-table-cell` used `--letter-spacing-title` /
  `--letter-spacing-all-caps` in their styles and declared neither.
- The reason they couldn't: `meta.schema.json`'s `tokensUsed` pattern allowed
  `color|font|spacing|radius|motion|shadow|icon` and **omitted `letter-spacing`**. The
  contract had no grammar for a whole semantic scale, so three components were structurally
  unable to declare tokens they were using. Fixed here.

**Alternative considered:** extracting anatomy from the styles automatically instead of
checking the hand-transcription. Rejected for now — the transcription carries intent a
parser can't recover (which part is "root", which overlay is a variant vs a pseudo-class),
and a checked hand-transcription gets the durability without the guesswork. Also considered
deferring until after #179–#183; rejected precisely backwards — promoting anatomy across 24
more components first would multiply an unverified artifact by eight.

**Status:** shipped, all 27 contracts green. Deliberately mechanical: neither gate infers
what a component *meant*. Primitives are excluded from §4d and left to the no-primitive lint
rule, since telling an author to add one to `tokensUsed` would contradict the schema. Local
custom properties (`--rr-table-cell-padding-x`) are collected per *directory*, because
`rr-table` declares knobs `rr-table-cell` consumes. Boolean derivations
(`State=disabled → disabled: true`) stay exempt from §4c — they map to booleans, not unions.

---

## 2026-08-03 — ai/DESIGN.md's token tables are generated, not transcribed (#186)

**What:** every token table in `ai/DESIGN.md` is now emitted from `tokens/**/*.tokens.json`
by `scripts/generate-design-md.mjs` (`npm run docs:design`, folded into `build:all`), fenced
in `GEN:` marker regions in the same idiom `generate-component-docs.mjs` and
`generate-docs.mjs` already use. Authored prose — Visual Identity, Responsive Scaling, Hard
Guardrails, Interaction Patterns, every heading — sits outside the markers and survives
regeneration. CI runs `--check` and fails on a stale file. The Usage column takes leading
whole sentences of each `$description` up to a 160-character budget (minimum two, because
descriptions open with a short role label and put the guidance in the sentence after it);
the full text stays authoritative via the MCP's `get_token`. The Contrast column is computed
with the same merged pairing set `validate` §5 uses, reports the **worst** intended pairing,
and names the background — `foreground.default` is 12.26:1 on the canvas but 9.94:1 on
`background.alt`, and the lower number is the one that has to hold.

**Why:** the file hand-transcribed every hex, resolved value and contrast ratio that the
token JSON already carries — a second copy of a decision the tokens already make, which
`scripts/tokens.mjs` had flagged as a drift risk in a comment since it was written. It had
drifted: `--shadow-none` was documented as `none` (really `0 0 0 0 rgba(0,0,0,0)`), every
`--shadow-*` row dropped the spread value, the easing rows omitted the spaces Style
Dictionary emits, and `primitive.font.weight.medium`'s `$description` claimed it was "not
currently mapped to any semantic token" while all four `label-strong` tokens referenced it
(fixed here; the primitive scale tables now derive their "Referenced by" column from the
reference graph, so that particular prose can't go stale again). This matters more than an
ordinary doc because `CLAUDE.md` `@`-imports it into every agent session — a wrong value
propagates into generated code before any other gate sees it. Prompted by Nathan Curtis,
*Component Contracts and Schemas* (2026-07-28), principle 2, normalized over redundant.

**Alternative considered:** keep hand-syncing (what #30 asked for — 15 tokens, filed
2026-06-23, still open six weeks later; they were eventually added by hand, which is the
point). Also considered emitting each `$description` whole: 27KB of prose would more than
double a file loaded into every session, for text already reachable through `get_token`.

**Status:** shipped. Coverage is enforced, not assumed — `--check` also fails when a
semantic token exists that no region emits, so a whole new scale can't be silently
undocumented. Primitives stay deliberately partial (font size, font weight, spacing only);
UI code may never reference one. Follow-up worth its own issue: many `$description` fields
embed a hand-typed hex and contrast ratio, so the generated Usage column now restates values
its own columns compute — the remaining copy of this problem lives in the token source.

---

## 2026-07-28 — DE accent foregrounds fixed brand-side (#176): same names, DE values

**What:** The rr-badge accent-variant WCAG failures under decision-engine (2.94:1 green,
1.68:1 violet, 1.39:1 amber — found by anatomy, #175) are fixed as **brand value overrides
on the existing token names**, not a component change: `foreground.accent-green` →
`green.positive` (#15803D, 4.76:1 on the green.50 tint; also corrects a value/intent drift —
the old `green.600` is the sage *gray* #8B9683 while the description promised "vivid green"),
`foreground.accent-violet` → `purple.600` (5.20:1; maps the base violet slot onto DE's
existing purple family), `foreground.accent-amber` → `amber.700` (6.84:1; same value as DE's
`foreground.warning`). All three reuse values DE already employs — no new primitives.
`accent-blue` untouched (5.00:1, already passing). The four `excludeBrands:
["decision-engine"]` entries on the accent-tint pairs in `tokens/pairings.json` are deleted,
so `validate` §5 / `validate_brand` now hold these pairs against every brand permanently.
**Why:** the badge (and any future consumer of these tokens) is fixed in one place, and the
brand override mechanism is doing exactly what it exists for; the alternatives — pointing the
badge at `accent-on-*` (changes the base theme's look) or scoping the variants out of DE
(punts) — each cost more than they fix. **Negative control:** re-breaking amber makes
`validate` fail naming the exact pair. **Fallout:** the MCP test that pinned the live
exclusion inverted, per the live-data corollary (CLAUDE.md workflow rule 3); rewritten
against a synthetic injected pairing map. **Status:** shipped; ships to consumers as 0.6.1.

## 2026-07-28 — Anatomy lands (#156 stage 2): the contract knows which tokens sit together

**What:** `*.meta.json` gains a structured `anatomy` section — a named part tree, each part
binding semantic tokens for `background`/`foreground`/`border`/`spacing`/`font`, with
`states` overlays (`variant=success`, `disabled`, `:hover`). Populated for `rr-badge`,
`rr-button`, `rr-input` by transcription from their `static styles`. `validate` gains §1c
(a state's `when` must name a declared prop) and §3b (every binding must resolve — the §3
rule applied to the other place tokens are named by string). Declared pairs become a third
source of intended fg/bg pairings behind `validate`'s §5 and `validate_brand`, and
`check_contrast` takes `{component, part, state?}` to resolve a pair from the contract.
**Why:** a flat `tokensUsed` array knows a component *touches* two tokens but not that they
are one part's fill and its text — so contrast could only ever be checked against naming
convention, and stage 3's generators would have no structure to generate from.
**Scope boundaries, all deliberate:** five binding keys (radius/shadow/motion deferred);
text pairs only — a part's border is compared against nothing, because a badge's border
equals its own fill and the ambient surface isn't knowable from the contract; both sides
must be declared on the *same* part, never inherited from an ancestor; `disabled` states are
contrast-exempt; compound conditions (`variant=secondary` AND `:hover`) have no grammar, so
those rules exist in the components but are not transcribed. Each boundary is a case where
the alternative was to invent a fact the code doesn't state.
**Fallout fix:** `excludeBrands` in `tokens/pairings.json` was honoured by skipping the
*add*, which only excludes a pair while no other source names it. Anatomy names exactly the
four accent-tint pairs decision-engine is excluded from, so it is now applied as a filter
over the merged set. **Alternative considered:** let those pairs fail the gate and fix the
rendering in the same PR — rejected as two concerns in one change; the defect is filed
instead (see below). **Status:** live; 3 of 24 metas carry anatomy, remaining 21 promoted in
batched follow-ups.

**Found by this stage:** `rr-badge`'s accent variants render **2.94:1 (green), 1.68:1
(violet), 1.39:1 (amber)** under decision-engine — the component hardcodes
`--color-foreground-accent-*`, which DE re-tints without re-tinting the pairing. Real and
previously invisible: the pairing map excluded DE from those pairs, so nothing checked the
component's own combination. Filed separately; needs an owner call between DE-local accent
foreground overrides and a component change.

## 2026-07-27 — Component tier deleted (#114): the two-tier model is live

**What:** Executed #114. All 144 component tokens (139 at the original audit plus the
ghost-button family added 2026-07-15/16) are deleted with `tokens/components/`; the 12
consuming components now reference the semantic roles their component tokens aliased —
pure 1:1 substitution, byte-identical resolved values, so visual baselines are unchanged
by construction. The 7 non-alias values resolved as: `component.avatar.size-lg` (40px) →
an inline intrinsic dimension in `avatar.ts` (component-intrinsic sizing is not brand
material; no semantic size token invented for one consumer); the six transparent fills
(button secondary/ghost, tag default/subtle) → the CSS `transparent` keyword (a keyword,
not a color literal — no token needed). Regression fence: a new `no-component-token`
detector in `scripts/rules.mjs` (propagates to validate, `check_usage`, and drift-lint,
with #151 fixtures) plus `meta.schema.json` no longer admitting `--component-*` in
`tokensUsed` — the tier cannot silently return. **Why:** the tier's re-pointable hook was
never exercised — zero brand divergence across all 144 tokens (see #114's audit); it was
pure carrying cost, and stage-2 anatomy (#156) needs bindings to point at exactly one
semantic layer. **Alternative considered:** keeping the tier dormant as a future hook —
rejected; #114 records that reintroduction-for-specific-tokens remains possible without
carrying 144 unused pass-throughs. **Status:** live in-repo; package 0.6.0 publish +
consumer bumps follow as #114's stage 3.

## 2026-07-27 — Governance eval run (#153): governed 95% clean vs ungoverned 70% clean

**What:** Ran the #153 governed-vs-ungoverned A/B: the 20-prompt set in
`evals/governance/prompts.json` × 2 arms × 1 isolated fresh subagent per prompt per arm
(40 runs total, no agent reused across prompts or arms), exactly per
`evals/governance/README.md`. Governed arm received, verbatim, `packages/tokens/context/system.md`
plus the relevant `packages/tokens/context/components/<tag>.md` pack(s) for each prompt,
then the prompt text — no MCP, no other repo access. Ungoverned arm received only the
prompt text prefixed "Use the design system." — no repo access at all. Both arms: same
model (Claude Sonnet 5), same date. Outputs saved verbatim to `evals/governance/out/<arm>/<id>.html`
(gitignored) and scored mechanically with `npm run eval:governance` (shared `rules.mjs`
detectors + fabricated-token + fabricated-prop checks — no hand grading).
**Result:** governed **19/20 clean (95%)**, mean **0.1** violations/run (2 rule
violations, 0 fabricated tokens, 0 fabricated props). Ungoverned **14/20 clean (70%)**,
mean **0.55** violations/run (11 rule violations, 0 fabricated tokens, 0 fabricated
props). Because the governed arm's only input was the compiled context packs (no MCP,
no other files read), this run also satisfies #155's "governed arm runs off packs
alone" acceptance box. The one dirty governed run (`toast-success`) tripped two rule
classes: `no-hex` (agent redeclared the token custom properties locally with literal
hex values instead of assuming the brand CSS already defines them) and
`no-hardcoded-font-size` (a scalar `font-size` override duplicated a value already
carried by a `font` shorthand token) — both are context-delivery gaps in the packs, not
`rules.mjs` detector bugs; filed as #166 and #167.
**Alternative considered:** none — first measurement of a previously-asserted-but-unmeasured
claim, not a design choice.
**Status:** live; harness is re-runnable (`evals/governance/README.md`) as the MCP/packs
grow (e.g. after #89 patterns, #152 bindings).

## 2026-07-26 — Contract-authoritative model committed: the contract owns the definition, surfaces are generated from it

**What:** Parsimony adopts the component-contract architecture demonstrated by the
ds-contracts-poc reference implementation as its end state: a machine-readable contract
(evolved from `*.meta.json`) becomes the single authoritative definition of each
component — props with dual code↔Figma bindings, per-part anatomy with token bindings,
semantics, slot constraints — and both surfaces (Figma library, Lit code) become
generated renderings of it, mechanically provable against it. Surfaces never sync
side-to-side; every change promotes through the contract as a reviewable diff. Staged in
**#156**: (1) prove-parity — #151 eval harness, #152 bindings + code↔Figma differ,
#154 slot constraints, #153 governance eval, #155 context packs; (2) structured anatomy
in `meta.schema.json`; (3) generation — Figma library first (the most manual,
most drift-prone surface), Lit code second. Scope boundary kept from the reference
model: generation owns API, anatomy, tokens, and semantics — complex behavior (focus
trapping, typeahead, drag) stays hand-written. Current census: 24 components carry
`meta.json`; 3 (`rr-badge`, `rr-button`, `rr-input`) are at full contract depth — the
other 21 get promoted as stages 1–2 roll through them. **Why:** today's `meta.json` is
descriptive — it documents hand-written components and can silently lie when either
surface moves (live evidence: `button.figma.ts` maps a Figma `ghost` variant the code
calls `danger`, #46). A prescriptive contract cannot drift from what it generates, and
the differ names any residual divergence instead of letting it accumulate.
**Alternative considered:** stay descriptive and adopt only the parity checks (stages
1–2 without 3) — most of the drift-elimination value at lower cost. Rejected by
maintainer call (2026-07-26): contract-authoritative is the better architecture, and
the migration only gets more expensive as the component count grows. **Status:**
direction committed, no code yet; work tracked in #156 (+ #151–#155). Sequencing note:
#114 (two-tier token collapse) lands first so anatomy bindings are semantic-only.

## 2026-07-16 — Component-token tier frozen: new components ship semantic-only

**What:** The three staple components added 2026-07-15/16 (toast, menu, table) initially
shipped with new `component.*` token families — 27 tokens deepening the tier #114 exists
to delete. Same-day correction: all three migrated to the semantic roles their component
tokens aliased (pure 1:1 substitution, zero visual change), the three token files are
deleted, and **the tier is frozen — no new `component.*` tokens, ever; new components
write semantic roles directly.** #114's remaining scope is now exactly the 9 legacy
families. Fallout fix: the shared deprecated-token detector (`scripts/rules.mjs`) used a
bare substring match, so deleted `--color-background-accent` flagged its own live
replacement `--color-background-accent-green` the moment a component used the semantic
token directly — now boundary-aware (validate, `check_usage`, and drift-lint all share
the fix). **Why:** the tier's re-pointable-hook purpose has never been exercised (zero
brand divergence across 139 tokens — see #114); adding to it was convention-following
against the stated two-tier target the portfolio case study already presents.
**Status:** live; package 0.5.0 (0.4.0's 27 new component vars existed on the registry
for minutes with zero consumers).

## 2026-07-16 — Explicit pairing map lands (#87); decision-engine scoped out of six base pairs

**What:** `tokens/pairings.json` is now the single declarative source of intended fg/bg
pairings beyond the convention-derived set — the accent family, alert-surface text, and
non-text (SC 1.4.11, 3:1) interactive edges. `validate_brand` checks the union;
`npm run validate` §5 checks every pair against base + every brand on every push; the map
ships in `@digital2analogue2/parsimony` so consumer contrast gates can generate their
token-level pairs from it. Six pairs carry `excludeBrands: ["decision-engine"]`: the four
accent-tint pairs (DE pairs tint fills with its own DE-local accent foregrounds — e.g.
`foreground.accent-purple` — so the base `fg-accent-X ↔ bg-accent-X` convention doesn't
apply there), `border.action` on canvas (the base ghost-button outline DE never renders),
and `foreground.success` on `background.alt` (**4.38:1 under DE — a borderline real
finding**, excluded rather than silently codified; darkening DE's success foreground one
step would fix it but repaints decisioning-table's status text, so it's an owner call —
tracked in the 2026-07-16 work order). **Alternative considered:** encoding all pairs
unscoped and letting DE fail the gate — rejected because three of the six are documented
non-renders, not defects, and a gate that cries wolf gets bypassed. **Status:** live;
gate green across base + 3 brands (25 mapped pairs + convention set).

## 2026-07-15 — Figma-variable drift audit scheduled as an agentic Routine, not a GitHub Action

**What:** `scripts/drift_audit.py` (Figma variables vs. DTCG token JSON) now runs on a
weekly schedule — as a Claude Code Routine ("Parsimony Figma-variable drift audit",
Mondays 10:00 UTC) that exports the variables via the Figma MCP, runs the auditor, and
reflects the result as one tracked issue. **Why not an Action:** the script consumes a
variables export it cannot fetch itself, and Figma's variables REST API is
Enterprise-plan-only — a plain CI job on the Pro plan has no way to produce the export.
The MCP path is the same one that caught the real drift on 2026-07-15 (danger trio +
border.default stale since the 2026-07-02 token changes) by hand. **Alternative
considered:** committing periodic manual exports for CI to diff — rejected as
drift-prone in itself. **Caveat/status:** Routines created from inside a session carry
no MCP connector grants; until the Routine is re-created from the claude.ai Routines UI
with the Figma + GitHub connectors attached, its runs exit quietly (by design) instead
of auditing. Active once re-created with connectors.

---

## 2026-07-14 — Collapse to a two-tier token model; drop the component tier

**Decided:** Move the token architecture from three tiers to **two** — primitives →
semantic — and remove the `component.*` tier entirely. UI (and every `rr-*` component)
references the semantic role directly. Migration is tracked in **#114** (not yet executed;
the code still ships the component tier as of this entry).

**Why:** The component tier's stated purpose is a re-pointable per-component hook so a
brand can override one component without touching component code. Measured against `main`,
that hook is **unused**: all **139** component tokens are pure 1:1 aliases over a semantic
role (e.g. `component.badge.success.background → {color.background.success-alt}`), and base
vs. decision-engine emit **identical** 139 values — DE achieves its full light-mode
inversion entirely at the semantic layer, re-pointing **zero** component tokens. Only 12 of
21 components reference `--component-*` at all, and the "scoping" is already leaky (select/
textarea alias `--component-input-*`, radio-group aliases radio). So the tier costs 139
tokens plus build/validate/docs plumbing for zero realized benefit.

**Alternative considered:** Keep the three-tier model (Material-style ref/sys/comp). Rejected —
nothing exercises the extra tier today. If a future brand genuinely needs a per-component
override, the hook can be reintroduced **for the specific tokens that need it** rather than
kept as a universal pass-through. (One open detail for #114: 4 component tokens resolve to a
value with no semantic equivalent — `avatar-size-lg: 40px` and three `rgba(0,0,0,0)`
transparents — and must be re-homed before deletion.)

**Status:** Decided; execution tracked in #114. The portfolio `/work/system` case study
already presents the two-tier target state (portfolio-vercel#33, merged) — so the case study
leads the code until #114 lands.

---

## 2026-07-02 — border.muted and border.alt stay separate; the distinction is codified

**Decided:** Keep both quiet-border tokens, and write down the rule that was previously
only implicit: **`border.muted` = separator lines *within* a surface** (table row
separators, menu/list dividers, section rules — the lowest decorative rung);
**`border.alt` = the quiet boundary *of* a surface** (card/menu/panel frames,
decorative outlines, container edges — one rung above). Ladder unchanged:
muted < alt < elevated, with `border.default` as the legible functional edge.

**Why:** After the #28 border split, both descriptions said "dividers," raising the
fair question of whether the pair is redundant. A 4-repo usage audit answered it:
`border.muted` has zero consumers outside decisioning-table, but *inside* it the two
tokens are used in perfectly disjoint roles — muted's 7 sites are all within-surface
hairlines, alt's 31 sites are all surface boundaries. The distinction is real and
already practiced; it just wasn't documented.

**Alternative considered:** Merging muted into alt (one quiet-edge token). Rejected —
DE's dense table rows would visibly strengthen (`#D8E4F0` → `#C8D6EA`), and the audit
showed the two rungs genuinely serve different roles. The near-invisible base-theme
delta (`#0F2016` vs `#1E241E`) was accepted: the DE brand proves the slot earns its
keep, and cross-brand token vocabulary should not fork per brand.

**Status:** Docs-only — token `$description`s (base + DE), DESIGN.md,
DECISION-ENGINE.md updated. No values changed; no publish required (descriptions
propagate with the next natural publish). Follow-up filed: portfolio-vercel border
triage (its ~40 `border-default` edges predate the split and will darken on its next
package bump unless classified into default/alt/muted first).

---

## 2026-07-02 — border.default goes legible; new border.alt carries the quiet edge (#28)

**Decided:** Split the border role in two, per direction. `border.default` is now the
**legible functional edge** — base moves green.900 (#1E241E, 1.23:1 on canvas) →
new `green.700` (#5C685A, **3.33:1**, SC 1.4.11 pass); decision-engine moves arctic.400
(#C8D6EA, 1.38:1) → new `arctic.600` (#7A8FA9, **3.11:1**). A new **`border.alt`**
inherits the old subtle values (base #1E241E, DE #C8D6EA) for deliberately decorative
edges — mirroring the background.default/background.alt naming symmetry. Decorative
ladder: muted < alt < elevated; functional/state ladder: default < hover < active <
focus/action. Component tokens: input/checkbox/radio/toggle keep `border.default` (they
were the SC 1.4.11 failure — their border is the only boundary indicator); the neutral
badge switches to `border.alt` (non-interactive, delineated by its fill).

**Why:** Inputs, checkboxes, radios, and toggles used `border.default` as their only
boundary at ~1.2:1 — effectively invisible and a WCAG 1.4.11 failure (#28, surfaced by
the #29 audit). Making the *default* legible and the *alt* quiet puts the accessible
choice on the zero-effort path; the subtle aesthetic remains available but becomes an
opt-in with a name that says what it is.

**Alternative considered:** A scoped `border.input` token, leaving `border.default`
subtle (the original #28 proposal). Rejected by design direction: it makes the
inaccessible value the default and the compliant one the special case. Consumers using
`border.default` decoratively opt into `border.alt` instead.

**Status:** Token source, DESIGN.md, DECISION-ENGINE.md, rules.md (soft rule 5) updated.
Ships in `@digital2analogue2/parsimony@0.3.0`. Consumer note: edges previously on
`border.default` become visibly stronger on the next package bump unless migrated to
`border.alt` — decisioning-table migrated in the same session; portfolio/dot-art/dot-blog
review on their next bump.

---

## 2026-07-02 — Decision-engine brand reconciled to the live decisioning-table prototype (#70)

**Decided:** The DE brand source now matches what the prototype actually renders, per the
"brand should match what's live" direction in #70. Three parts: **(A)** new `arctic`
primitive ramp (7 blue-tinted neutrals) replacing white/gray surfaces and borders —
canvas `#F5F8FC`, alt `#EBF0F8`, elevated `#F0F4FA`, borders `#C8D6EA`/`#B0C4D8`/`#D8E4F0`.
**(C)** typography/shape: DE body is Geist (sans), not Spectral; title scale shifts up
(large 300 40px/1.1, medium 300 32px, small 500 24px — superseding the earlier 18px
title-small override); labels run weight 500; label tracking 0.01em (new
`letterSpacing.subtle` primitive); compact radius ramp 3/6/10/14px incl. a brand-only
`radius.md`. **(D)** backported 10 prototype-local color tokens (hover, action-alt,
inverted chip pair, warning-subtle/vivid/dark/icon, inactive, on-action-alt) via new
`slate` + `amber.900` primitives. Every new/changed text pairing verified AA with
`check_contrast`; `validate_brand('decision-engine')` passes.

**Why:** The published brand had drifted from its only real consumer; per direction the
prototype is the design truth. Backporting kills the local-token debt markers in
decisioning-table and makes `sync-tokens` meaningful again.

**Alternative considered:** Making the prototype adopt brand values instead — rejected in
#70 except for `background.danger` (§B), where the brand's red.600 is the intentional
newer value and the prototype syncs forward. `--color-background-accent` (`#4ade6e`,
phosphor green in a light theme) was deliberately NOT backported — it is defined but
unused in the prototype and should be deleted there instead. App-local tokens
(control heights, z-index, column widths, composite shadows) stay local by design.

**Status:** Brand source reconciled; DECISION-ENGINE.md updated. Needs an
`@digital2analogue2/parsimony` publish, then decisioning-table syncs `variables.css`
(incl. §B danger `#c8002e`) and updates its CLAUDE.md drift list.

---

## 2026-07-02 — Danger fill moved to red.600; DE on-warning goes dark (sub-AA fixes, #66)

**Decided:** Two token-level contrast fixes flagged by `validate_brand` (#59 → #66):
(1) base `color.background.danger` moves `red.500` (#E73027) → `red.600` (#C8002E) —
white `on-danger` text was 4.33:1 (AA fail), now 6.01:1 AA, and the fill still clears
the 3:1 non-text floor against the dark canvas (3.25:1, SC 1.4.11). (2) decision-engine
`foreground.on-warning` moves white → `gray.900` (#1A1A2E) — white on the amber.500
warning fill was 3.19:1 (AA fail); gray.900 gives 5.35:1 AA.

**Why:** Hard rule #6 — every text/background pairing must pass AA 4.5:1. Both were
pre-existing violations, not tooling artifacts. red.600 was already DE's danger fill
(chosen 2026-05-22 for exactly this white-on-red contrast reason), so (1) also unifies
the destructive fill across brands. (2) is the same value the decisioning-table
prototype has shipped as a local override all along — this moves the fix upstream where
it belongs (also closes part A of #70's on-warning row).

**Alternative considered:** Keeping the fills and darkening the text instead. Rejected
for danger — nothing lighter than white exists, so the fill had to darken; red.700/800
pass too but red.600 already carries DE's contrast rationale. For on-warning, an
off-white was checked and cannot reach 4.5:1 on amber.500.

**Status:** Token source + DESIGN.md updated; needs an `@digital2analogue2/parsimony`
publish to reach consumers. dot-art/dot-blog inherit the new danger fill (neither
overrides it). DE's own `background.danger` override (red.600) is now redundant with
base but left in place pending the #70 reconciliation.

---

## 2026-06-26 — Renamed the design system to "Parsimony"

**Decided:** Rebrand the design system from "brand-tokens" to **Parsimony** (capital
P), in stages to avoid breaking consumers: (1) republished the npm package
`@digital2analogue2/tokens` → `@digital2analogue2/parsimony` (identical contents);
(2) migrated all three consumers (portfolio-vercel, decisioning-table, river-intro)
onto it and deployed; (3) swept the system name across docs, the docs-site chrome,
Storybook, and AGENTS.md (#55). The GitHub **repo** rename is deferred (#53), so
`digital2analogue/brand-tokens` repo/path references stay accurate for now.

**Why:** "brand-tokens" described the v1 token-only scope; the system is now tokens +
components + MCP. "Parsimony" names the design philosophy (less, but better) rather
than the implementation.

**Alternative considered:** Rename everything at once including the repo. Rejected — a
hard cutover risks breaking live consumers and CI. Expand-then-contract (publish new
package → migrate consumers → rename repo) keeps every site working throughout. npm
forces the package identifier lowercase, so the capital "Parsimony" lives only in
branding/docs.

**Status:** Package published; all consumers migrated and deployed. Docs/branding
sweep landed (#55). Pending: repo rename (#53); Figma-file rename + Code Connect
`*.figma.ts` update (left untouched here to avoid breaking Code Connect); deprecate-
with-pointer the old `@digital2analogue2/tokens` package once confirmed unused.

---

## 2026-06-26 — Enforce the ~7-day land-or-close rule with a stale-PR watchdog

**Decided:** Add `.github/workflows/stale-prs.yml` — a weekly (+ manual) Action
that lists open, non-draft PRs idle for 7+ days and reflects them as a single
tracked issue (`stale-prs` label), opened/updated while any are stale and closed
automatically once they're all fresh. It reuses the exact open/update/close block
from `publish-freshness.yml`; it never comments on, labels, or closes the PRs
themselves.

**Why:** Branch & PR Workflow rule #5 ("land or close within ~7 days") was
prose-only, and PR rot is the documented root cause of this repo's worst drift
incidents (a 6-week-old PR regressed shipped state; the highest-value PR rotted
into conflict). The repo already guards token/artifact *currency* with three
freshness watchdogs but had nothing guarding PR *age* — this closes that gap with
the same house pattern, no new dependency, no checkout/npm needed.

**Alternative considered:** The off-the-shelf `actions/stale` action, which labels
and eventually auto-closes stale PRs. Rejected: auto-close is unsafe here, where
multiple autonomous sessions push long-running PRs an automated bot would close
out from under them. A non-destructive visibility nudge fits the parallel-agent
reality; pinning/opt-out labels can be added later if a long-lived PR needs them.

**Status:** Done. Verify by triggering the `workflow_dispatch` and confirming it
either opens/updates the tracked issue listing idle PRs or no-ops (and closes any
prior issue) when none are stale.

---

## 2026-06-25 — Adopt figma-console-mcp (Southleft) as the live design↔code bridge

**Decided:** Install Southleft's `figma-console-mcp` as a **local, per-developer**
Claude Code MCP server (user scope), alongside the official Figma MCP. It gives
agents a live link to Figma Desktop via a Desktop Bridge plugin — "what file am I
in?", console/runtime-log reads, token/variable sync, and design read/write —
with a Figma PAT backing the REST reads. Full setup, required PAT scopes, and the
Windows gotchas live in #64 (closed).

**Why:** The official Figma MCP (`mcp.figma.com`) is API/URL-based with **no live
editor link** — it can't see the open file or the runtime console. figma-console
fills that gap and unblocks the component prop/description parity audit (#46) and
the DS assessment pass (#43). Same org as story-ui, already used here.

**Alternative considered:** The hosted remote read-only mode (9 tools, OAuth/
bearer). Rejected for the working setup — npx/local mode exposes the full toolset
incl. the Desktop Bridge live link and write ops, and only a local server can
reach a local Figma Desktop. Leaving it cloud-only was also rejected: the cloud
container has no Figma Desktop, so the bridge only functions on a developer's
machine.

**Status:** Done on the local Windows desktop (verified end-to-end in a VSCode
Claude session). **Not a repo/CI dependency** — it's interactively authenticated
per-developer tooling, absent in headless CI. Keep PAT scopes minimal (File
content read, Comments read+write, Variables read on Enterprise only) and rotate
any token that touches a shared transcript.

---

## 2026-06-25 — MCP token scale accessors: get_scale(category) + a toCssVar camelCase fix

**Decided:** Add `get_scale(category)` to the MCP — the generalization of
`get_spacing` across every semantic scale (`spacing`, `radius`, `shadow`, `motion`,
`icon`, `letter-spacing`, `typography`), returning `{ token, value, usage }[]`
(value composite for shadow/typography). `get_spacing` becomes a thin alias for
`get_scale('spacing')`. Logic in `scripts/tokens.mjs` (`getScale` + a
`SCALE_CATEGORIES` map). MCP server 0.8.0 → 0.9.0 (#60, the last of the four
build-and-verify capabilities).

**Correction to the record:** #60 was framed (including in the question put to the
maintainer) as needing semantic radius/shadow/letter-spacing tokens authored first,
on the belief they existed only as primitives. That was wrong — `tokens/semantic/{radius,
shadow,letter-spacing,motion,icon}.tokens.json` already exist with full semantic
layers. So no token authoring was needed; the work was purely the accessor.

**Latent bug fixed in passing:** `toCssVar` did a plain dot→dash replace, so the
camelCase token roots `letterSpacing` / `lineHeight` (14 paths) rendered as
`--letterSpacing-*` — but Style Dictionary kebab-cases them to `--letter-spacing-*` /
`--line-height-*` in the built CSS. `toCssVar` now kebab-cases camelCase segments,
so `get_token`/`find_token`/`get_scale` report the CSS var that actually exists.
Verified against `build/css/variables.css`.

**Alternative considered:** Parallel `get_radius`/`get_shadow`/… tools. Rejected — a
single `get_scale(category)` keeps the surface small and mirrors the shape-follows-verb
convention; `get_spacing` stays as an alias for back-compat.

---

## 2026-06-25 — Consumer drift scan extracted to a shared module; exposed via MCP lint_consumer

**Decided:** Extract the consumer-repo scan from `scripts/drift-lint.mjs` into a
new pure module `scripts/drift-scan.mjs` (`scanConsumer(target, { ignore })` — walk
+ `.driftignore`/ignore handling + shared `lintLines`, returning structured
`{ scanned, clean, violations, groups }`). `drift-lint.mjs` becomes a thin CLI over
it (identical output + exit codes — the weekly `drift-lint.yml` Action depends on
them), and the MCP gains `lint_consumer({ path, ignore? })`. MCP server 0.7.0 →
0.8.0 (#61, fourth and last of the build-and-verify capabilities).

**Why:** `drift-lint.mjs` already scanned consumer repos with the shared rules, but
only as a CLI/Action and it executed on import (argv + `process.exit`), so it
couldn't be reused. An agent working *inside* a consumer repo can now check
file/repo-level compliance through the MCP instead of shelling out — the cross-repo
workflow the system exists for. Extracting the scan matches the repo pattern
(logic in `scripts/*.mjs`; CLI/MCP are thin wrappers) and keeps the consumer scan
single-sourced the way `rules.mjs` single-sources the rules.

**Alternative considered:** Add a main-guard to `drift-lint.mjs` and import its
internals directly. Rejected — a dedicated pure module is cleaner, testable in
isolation, and consistent with `tokens.mjs`/`rules.mjs`/`reasoning.mjs`. CLI parity
verified against both consumer repos (portfolio clean; decisioning-table the same
pre-existing hex/font-size/deprecated fails, no new ones).

---

## 2026-06-25 — MCP contrast tooling: check_contrast + validate_brand (intended-pairs v1)

**Decided:** Add two MCP tools (`scripts/contrast.mjs`, reusing the WCAG
`contrastRatio` already in `assembly.mjs`): `check_contrast` (ratio + AA/AAA for a
fg/bg pair — tokens or hex, brand-aware, large-text threshold via `fontSize`/`bold`)
and `validate_brand` (every *intended* fg/bg pairing still meets AA once a brand's
overrides apply). MCP server 0.6.0 → 0.7.0 (#59, second of the four build-and-verify
capabilities). `validate_brand`'s intended-pairs set is **derived by naming
convention** and scoped to the pairings where a failure is unambiguously a bug:
`foreground.on-<role>` ↔ `background.<role>`, and base text (default/alt/muted/action)
↔ base surfaces (default/alt). `disabled` is exempt.

**Why:** The system is WCAG-AA-first and the consumer repos run their own contrast
gates, but the MCP could only compute contrast as a side effect of `check_assembly`.
A first-class tool lets an agent verify a pairing (or a whole brand) directly.
Reusing the one luminance implementation keeps the math single-sourced.

**Alternative considered:** Derive *all* fg/bg pairings, including the accent family
(`accent-*` / `accent-on-*` over `accent-*` / `accent-*-bold`). Rejected for v1 — the
accent taxonomy has both subtle and bold fills and its fg/bg names aren't cleanly
parallel, so convention-derived pairing mis-matches and reports impossible <2:1
"failures" (e.g. `accent-on-green` paired with the wrong `accent-green`). Same "no
opinion outside the known rules" stance as `check_assembly`; a proper accent audit
needs an explicit pairing map (follow-up).

**Real findings surfaced (worth their own fix, tracked separately):** with the
trustworthy pairings only, `validate_brand` flags genuine sub-AA pairs — `foreground.
on-danger` (#FFFFFF) on `background.danger` (#D03027) is **4.33:1** in the *base*
theme (inherited by dot-art/dot-blog; DESIGN.md never computed it), and decision-
engine's `on-warning` (white) on `background.warning` (amber) is **3.19:1** (already
worked around locally in decisioning-table). The tooling did its job on first run.

---

## 2026-06-25 — check_usage enforces the statically-detectable hard rules (font-weight + font-family added)

**Decided:** Expand the shared lint rule set (`scripts/rules.mjs`) so the MCP
`check_usage` snippet linter — and, by the same `RULES` array, `validate` and
`drift-lint` — enforces two more hard rules: **hard-2** (no hardcoded
`font-weight`) and **hard-3** (no unapproved `font-family`). It previously caught
only 4 of 9 hard rules (hex, primitive ref, font-size, deprecated). MCP server
bumped 0.5.0 → 0.6.0 (#58, first of four MCP "build-and-verify" capabilities;
siblings: #59 contrast, #60 scale accessors, #61 drift-lint-via-MCP).

**Why:** `check_usage` is the cheapest, earliest compliance guard an agent hits;
every rule it can't see only fails later in CI, or never. Both new detectors are
statically decidable from a snippet and audited clean against current component
source (the one hit, `textarea.ts` `font-family: inherit`, is correctly
allowlisted). Adding them to the single `RULES` source propagates to all three
checkers for free — the design's whole point.

**Alternative considered:** Also add **hard-7** (off-scale spacing). Rejected for
this PR and split to its own issue — an audit found 20+ legitimate sub-scale
optical nudges in component source (`margin-top: 2px` for cap-height alignment,
`margin: -1px`, negative icon margins) that the 4px-floor spacing scale doesn't
cover, so a naive rule is a false-positive minefield and first needs a design
call on a 1–2px exemption/primitive. **hard-4** (display/title weight 300) and
**hard-5** (accent-green never resting text) are deliberately out of scope: both
need a selector's semantic role/interactivity, which a raw snippet lacks — they
belong to `check_assembly` / a future semantic checker, not a regex.

---

## 2026-06-25 — Prop descriptions: JSDoc is the single source (meta.json copy eliminated)

**Decided:** Resolve the open thread from the Storybook-autodocs entry below.
Prop descriptions are now authored in exactly **one** place — the per-property
JSDoc (`/** … */`) above each `@property`. `*.meta.json` no longer carries a
`description` on its props; `scripts/build-design-system-json.mjs` injects each
prop's description from the CEM at merge time (logic in the shared
`scripts/cem-descriptions.mjs`). A prop with no per-property JSDoc is a **hard
build error**, so a new prop can't ship an empty description (#45).

**Why:** The two copies — `meta.json` (→ `design-system.json` → MCP) and JSDoc
(→ CEM → autodocs + IDE hovers) — could silently drift, and already had: of 89
props, 25 diverged. The CEM is a strict projection of the JSDoc, so making JSDoc
authoritative and deriving the artifact removes the second copy entirely rather
than keeping a mirror in lockstep. The `git diff --exit-code` artifact-staleness
gate now doubles as a freshness check: edit a JSDoc without rebuilding and CI
fails. Net effect on `design-system.json`: 22 of the 25 were reconciled into the
JSDoc verbatim (zero change to MCP output); 3 (`rr-badge.variant`,
`rr-card.padding`, `rr-tag.variant`) adopt the richer/better-formatted CEM
wording.

**Alternative considered:** Keep `meta.json` self-contained but auto-generate
its `description` values from the CEM (a maintained mirror). Rejected — a mirror
is still two copies that can be hand-edited out of sync and complicates the
compact meta formatting; eliminating the field is the true single source. The
class-level `@attr` JSDoc block stays as a human file header (a low-risk in-file
third copy); trimming it is a possible follow-up, not part of #45.

**Status:** Done. `meta.json` props are now `{ name, type, default }`; the schema
already made `description` optional, so no schema change was needed.

---

## 2026-06-25 — Storybook autodocs from the CEM; two prop-doc sources reconciled

**Decided:** Wire the generated Custom Elements Manifest into Storybook
(`setCustomElementsManifest` + `tags: ['autodocs']`, with `@storybook/addon-docs`) so
component descriptions and prop tables come from the single source rather than
hand-maintained `argTypes` (#39 step 1, PR #40). Then port the per-prop description copy
from each `*.meta.json` into `@property` JSDoc so the CEM carries it and the autodocs
tables actually populate (#39 step 2, batched).

**Why:** This surfaced a real gap — **two prop-doc sources that weren't unified**: the
hand-authored `*.meta.json` (consumed by the MCP / `design-system.json`) and source
`@property` JSDoc (what `cem analyze` reads for the CEM/autodocs). Storybook reads only the
CEM, so before this the autodocs pages had the component description (from the class JSDoc)
but **empty per-prop columns**. Putting the prose in JSDoc is the one spot that feeds both
the CEM *and* IDE hovers. Gotcha worth recording: `@storybook/addon-docs` must be added
explicitly in Storybook 10 — it's no longer bundled via essentials, and the original POC
ran `addons: []`, so autodocs emitted the `autodocs` tag but generated zero docs pages
until the addon was installed.

**Alternative considered:** (a) Teach Storybook/the CEM to read `meta.json`, or
hand-maintain `argTypes` descriptions per story — both rejected as duplicating the source
of truth; one JSDoc description the CEM already knows how to carry is the parsimonious fix.
(b) Port JSDoc to all ~19 components at once — deferred: only the 4 with stories
(badge/button/input/tag) have visible autodocs pages today, so the rest land with their
stories (#38). **Open thread:** whether `meta.json` should be *generated from* the JSDoc
rather than maintained in parallel — the cleaner long-term de-duplication.

**Status:** Pipeline shipped in PR #40. JSDoc port batch 1 (badge/button/input/tag) in the
accompanying PR; remaining ~15 follow with #38. `build-storybook` generates the autodocs
pages; `lint:stories` + `validate` green.

---

## 2026-06-25 — MCP Phase 2 reasoning tools split into `find_*` + `get_*`

**Decided:** Ship the Phase 2 design-reasoning layer (#25) as **four** tools, not the
two the issue title named: `find_rule(topic)` / `find_decision(topic)` return a ranked
array (wrapped `{ matches, total }`), and `get_rule(id)` / `get_decision(id)` return one
record. Parsing lives in a new shared `scripts/reasoning.mjs` (pure `parseRules` /
`parseDecisions` over `ai/rules.md` and `docs/decisions.md`, plus `load`/`find`/`get`),
imported by the server and the tests — same single-source shape as `rules.mjs` and
`tokens.mjs`. Server bumped to v0.3.0. A rule's `rationale` is the clause after the first
" — " in the rule text (null when there is none); the decision parser normalizes both
the dated-entry labels (`**Decided:**` / `**Alternative considered:**`) and the archived
ADR labels (`**Decision:**` / `**Rejected:**`) onto one `{ decision, why, rejected,
status }` shape.

**Why:** A topic query legitimately matches several rules/decisions, so collapsing to one
object hides relevant hits and forces a re-query. The prevailing MCP convention is
shape-follows-verb — `get_*` = exact-key lookup → one object, `find_*`/`search_*` = query
→ ranked array — and this repo's own Phase 1 already follows it (`get_token` vs
`find_token`). DesignerPunk's Civitas layer (the prior art the expansion PRD cites) ships
the identical split (`get_section` vs `find_docs`). Keeping `get_rule`/`get_decision` as
the exact-id form honors #25's names *and* the convention, rather than overloading a
`get_*` name with array semantics. Array results are wrapped in an object because some MCP
clients choke on a bare top-level array.

**Alternative considered:** (a) Two tools named exactly `get_rule`/`get_decision`
returning a wrapped array — rejected: bends the get_*=single convention the repo already
set. (b) Two tools returning a single best-match object per the PRD's sketch — rejected as
lossy for topic queries. (c) Cross-linking each rule to its rationale decision — deferred;
`rationale` (inline clause) + a separate `find_decision` keeps the parse low-risk and the
two corpora independent, which is what the issue asked for.

**Status:** Shipped (server v0.3.0; `scripts/reasoning.mjs` + 5 new MCP-server tests, all
green; `npm run validate` passes). Closes #25. `check_assembly` and the Phase 3
brand-aware tools (`get_brand`, `compare_brands`) remain on the roadmap.

---

## 2026-06-23 — New `rr-tag` component (outlined uppercase tag/chip)

**Decided:** Add `rr-tag` as its own component — the deliberate inverse of
`rr-badge`. Badge = filled pill for status; tag = square-cornered (`radius.sm`),
transparent fill, bordered, UPPERCASE + `letter-spacing-all-caps`, for
skills/categories/metadata. Two variants: `default` (text `foreground.alt`,
border `foreground.muted`) and `subtle` (text `foreground.muted`, border
`border.elevated`). Sized to `font.label-small` (12px). Motivated by the bespoke
`.tag`/`.tag--skill` CSS on riverromney.design/about, which had no DS equivalent.

**Why:** A new component, not a badge variant — the shape, fill model
(transparent vs filled), and casing differ fundamentally; folding it into badge
would muddy both. `default` is the *visible* treatment so a bare `<rr-tag>` reads
correctly standalone — the first cut pointed its border at `border.default`
(#1E241E), which equals `background.alt` and is invisible on the canvas (the same
SC 1.4.11 trap as the secondary-button finding below). Sized to `label-small`
(12px) for parity with badge — both are compact chips — rather than the
portfolio's 14px; 12px stays WCAG AA (WCAG has no minimum font size, the text
pairings pass ≥4.5:1, and the tokens are rem so they resize).

**Alternative considered:** (a) Add tag as a `rr-badge` variant — rejected
(different shape/fill/case). (b) Keep 14px to match the portfolio exactly —
rejected for badge-scale consistency. (c) Make `default` the quiet treatment with
a `strong` opt-in — rejected: the bare element should look right with no variant.

**Status:** Shipped in PR #31. Figma Code Connect deferred (no Tag node in the
Figma library yet — tracked as a GitHub issue). Storybook also gained brand-font
loading in `preview-head.html` (the token CSS sets `font-family: 'Space Grotesk'`
with no fallback and Storybook never loaded the font files).

---

## 2026-06-23 — `danger` variant: borderless, consistent with sibling status variants

**Decided:** Point the `danger` border at `background.danger-alt` (its own fill)
in both `badge` and `alert`, so every status variant is a uniform borderless tint.

**Why:** `danger` was the lone outlier — its border pointed at `foreground.danger`
(red) while success/warning/info match their fill and read borderless. The red
outline made danger visually inconsistent with its siblings; error state is
already conveyed by the red text on the danger-alt tint. Also corrected stale
token comments in both files: danger foreground said `#E73027` / `4.51:1`
(pre-2026-06-09 palette); `foreground.danger` is now `red.400` `#F87171`
(`6.62:1` AA on the danger-alt fill). The `{token}` reference always resolved
correctly — only the human-readable comment was stale.

**Alternative considered:** Keep danger's red border for extra error emphasis —
rejected for consistency; the tint + red text already signal the state.

**Status:** Shipped in PR #32. (No visible change for `rr-alert` yet — it has no
Storybook story; tokens are now consistent for when it gets one or is consumed.)

---

## 2026-06-23 — Work tracking moved to GitHub Issues (workflow improvement)

**Decided:** GitHub issues are the single board for roadmap / next / in-flight
work. `gh issue list` is how any session orients; `--label roadmap` filters the
plan. Decisions stay in this log (*why*); git/PRs stay as *what shipped*; issues
own *what's next*. The local agent memory is demoted to a per-machine cache.

**Why:** A process-optimization pass found three pains with one root cause —
actionable "what's next" had no single, cloud-visible home: (1) roadmap was
scattered across two PRDs + follow-up prose inside decision entries; (2) the
richest current-state summary lived in local agent memory that **can't travel to
cloud sessions** — the most-informed artifact was the least portable; (3)
follow-ups recorded as prose got buried (the SC 1.4.11 audit nearly was). The
"team" is autonomous sessions (local + cloud + spawned chips) that each boot
blind, so a shared, queryable board matters more than for a human team.

**Alternative considered:** A pinned "Current State / Next" section atop this log
(no new file, travels to cloud) — rejected as the weaker fix: hand-maintained
prose that drifts and still buries items. A standalone `ROADMAP.md`/`STATUS.md`
was rejected outright — the maintainer is doc-averse and it'd be a fourth drifting
surface. Issues win because they're **not a doc**, are cloud-native (`gh` works
everywhere), are a real task tracker (no burial), and reuse a pattern the repo
already runs (drift-lint / publish-freshness auto-open issues).

**Status:** Done. Seeded #25–#30 from the live follow-ups (MCP Phase 2/3, the two
SC 1.4.11 a11y items, the DESIGN.md token-sync). One-line pointer added to
CLAUDE.md so every session boots oriented. **Zero new docs added** — the
constraint that shaped the whole solution.

**Impact / case-study note (workflow win):** Cut new-session orientation from
"read-absent-local-memory → human pastes a pointer → scan three drifting surfaces"
to a single `gh issue list`. Fixed a real cross-environment handoff failure
(local memory invisible to cloud) using infrastructure already present, adding no
maintenance surface. Sequence worth retelling: the gap was found by *trying to
hand off* (wrap-up revealed memory doesn't travel), and the fix fell out of the
doc-averse constraint rather than fighting it — the constraint pointed at the
better answer (issues, not a doc).

---

## 2026-06-22 — Secondary button → green ghost; first SC 1.4.11 (non-text contrast) finding

**Decided:** Make the secondary button a green *ghost* button — transparent fill,
accent-green label (`color.foreground.action`), accent-green outline (new
`color.border.action` = `green.accent`). It pairs as outlined-secondary against
the filled-green primary. `color.border.default` is left neutral and unchanged.

**Why:** Reviewing Storybook, the secondary button's outline was illegible. It
resolved to `color.border.default` (#1E241E) on the canvas (#0A0D0A) = **1.23:1**,
failing **WCAG SC 1.4.11 Non-text Contrast (3:1)** — and since the button's fill
matched the canvas, that near-invisible border was its *only* boundary. This
exposed a systemic gap: the design system's "WCAG AA" claim had only ever covered
**text** contrast (SC 1.4.3); **non-text/UI-component contrast (1.4.11) was never
checked**, and axe doesn't reliably catch it. The green ghost treatment fixes the
control at 11.13:1 (canvas) / 9.02:1 (on a card), and accent-green is rule-5
compliant here because the control is interactive.

**Alternative considered:** (a) Bump `color.border.default` itself to a legible
~3:1 — rejected: it's the passive edge for cards/inputs/dividers, the green ramp
has no tasteful ~3:1 step, and making it green would break hard rule #5 (accent =
interactivity only, never resting decoration). (b) Reuse `border.hover` for the
secondary border — rejected: collapses the hover distinction. The ghost button
sidesteps `border.default` entirely.

**Status:** Shipped (secondary button + `color.border.action`, documented in
ai/DESIGN.md). **Known follow-up:** inputs and cards still use
`color.border.default` at 1.23:1 — a real 1.4.11 miss on input outlines
specifically. And a full 1.4.11 audit of the remaining outlined controls
(checkbox/radio/toggle edges) is still owed; the system's contrast verification
needs to cover non-text contrast, not just text.

---

## 2026-06-22 — Brand-scoped deprecation unnecessary; deprecation made replacement-aware instead

**Decided:** Do NOT add brand-scoped deprecation to `scripts/rules.mjs` (the PRD's
proposed PR-B). Instead: enrich `DEPRECATED_TOKENS` from `string[]` to
`[{ token, replacement }]` (replacements grounded in `ai/DECISION-ENGINE.md`),
export a `DEPRECATED` map, and make `get_token` answer "removed — use X" for dead
names. Also fixed the dead-token drift the investigation exposed.

**Why:** The PRD assumed a contradiction — `get_token` calling a token live while
`check_usage` calls it deprecated (`--color-state-hover` was the example). Checked
against the actual token JSON: all deprecated tokens are fully removed from every
layer. `get_token` is JSON-backed, so it can only return tokens that exist — it
cannot disagree with `check_usage`. No contradiction, so no brand-scoping needed.
The PRD's premise came from stale DESIGN.md, which still documented removed tokens.

**Alternative considered:** Implement the brand-scoped `{ token, scope }` refactor
as written. Rejected — it solves a problem that doesn't exist and adds complexity
to the shared rule module for no correctness gain.

**Status:** Shipped (PR-B). Dead-token drift fixed in the same change:
`dialog.meta.json` (dropped phantom `--color-state-hover`; it already lists the
`--color-background-alt` the component actually uses), `ai/DESIGN.md` (removed the
dead `### State` section — that token category was eliminated; hover/selected route
through `action-hover`/`border-hover`/`action`/`background-alt`), and a `README.md`
example. The 15 *missing* DESIGN.md tokens (the other drift direction) are a
separate PR.

---

## 2026-06-18 — MCP Phase 1: token JSON is authoritative for value AND usage

**Decided:** The MCP token tools (`get_token`, `find_token`, `get_spacing`, in
`scripts/tokens.mjs`) read both the resolved value and the usage prose from the
`*.tokens.json` `$description` fields. `ai/DESIGN.md` is NOT a value or usage
source for the server — it is only a startup **drift cross-check** (warn when a
semantic token's CSS property never appears in DESIGN.md). Token loading +
resolution lives once in `scripts/tokens.mjs`, imported by both the server and
`validate.mjs` (which was refactored off its inline walker — same single-source
principle as `rules.mjs`).

**Why:** The `$description` fields are richer than DESIGN.md's tables (they carry
the *why*, e.g. "at 4px the gap signals two things are one unit") and are
co-located with `$value`, so value and usage cannot drift apart. A parallel
DESIGN.md table is a drift vector, not a source. Running the cross-check on
startup immediately surfaced 15 undocumented semantic tokens (accent-bold tier,
`font.family.*`, `motion.transition.*`) — proving DESIGN.md is the thing that
drifts, not the JSON.

**Alternative considered:** The PRD amendment's split — values from JSON, usage
prose from DESIGN.md. Rejected once the `$description` fields turned out to be the
better usage source; keeping DESIGN.md authoritative for usage would have
re-introduced the exact drift the token system exists to remove.

**Status:** Shipped in PR #21 (server v0.2.0). Phase-1 introduces no deprecation
claims; brand-scoped deprecation is a separate change (so `get_token` and
`check_usage` can't disagree). The 15-token DESIGN.md gap is tracked as a docs
follow-up.

---

## 2026-06-18 — Generated artifacts must be built with LF line endings

**Decided:** `design-system.json` and `packages/components/custom-elements.json`
must be committed with LF line endings and no embedded `\r`. Enforced by a
`.gitattributes` (`* text=auto eol=lf`). On Windows, regenerate them only with
`core.autocrlf=false` and an LF working tree (`git rm --cached -rq . && git
reset --hard`), then `npm run build:meta`; verify the result hashes to the same
blob CI builds.

**Why:** With `core.autocrlf=true` (the Windows default), component `.ts` sources
check out as CRLF, so the CEM analyzer embeds `\r` into the artifact description
strings. CI builds on Linux (LF), so the committed artifact never matches a fresh
build — the "Fail if committed artifacts are stale" gate fails on *every* commit,
even docs-only ones. Worse, local git autocrlf **masks** the `\r` on read (`git
cat-file`, `git show`, even the GitHub contents API piped through Windows all
showed the blob as clean while CI correctly saw the difference), so the mismatch
is invisible without comparing against CI's own build hash.

**Alternative considered:** Strip `\r` from the artifacts post-build, or only ever
regenerate them in a Linux/cloud session. Rejected — stripping is fragile (the
masking made "is it clean?" unanswerable locally) and a Linux-only rule is a
footgun for the Windows maintainer. `.gitattributes` fixes it for every
contributor and platform; verified `git add --renormalize .` produced zero change
(all repo blobs were already LF), so it's pure prevention.

**Status:** Shipped (`.gitattributes` on main). Recorded in project memory with the
masking gotcha flagged, since it cost significant debugging time.

---

## 2026-06-17 — Branch & PR workflow rules (stop the merge pileup)

**Decided:** Adopt five lightweight PR/merge rules, codified as a hard-rule
section in `CLAUDE.md` so every session (local + cloud) loads them: (1) branch
fresh and rebase onto `main` before opening/updating a PR; (2) small,
single-purpose PRs (~200 lines); (3) validate before push and commit
regenerated artifacts in the same PR; (4) declare intent (check open
PRs/branches) before non-trivial work; (5) land or close a PR within ~7 days.

**Why:** A process-optimization pass found the project wasn't stuck for ideas —
it was stuck at the *merge* step. Four PRs had piled up (aged 6 weeks / 4 weeks
/ 3 weeks / new) and the damage was concrete: a real bug fix (#16, `.blog` body
type silently broken) sat a month; a 6-week-old branch (#13) rotted until it
*regressed* shipped state (reverted the npm scope, claimed components were
unshipped); the highest-value PR (#18, the 18-vs-20 component backfill) drifted
into merge conflict; and two decision logs were independently created and had to
be hand-merged. The common root cause: autonomous sessions boot with no memory
of each other, branch from a stale `main`, and never rebase — so work drifts and
a lone maintainer has no forcing function to land it. The one PR branched from
current `main` (#19) was the only one that stayed clean — the fix was visible in
our own data.

**Alternative considered:** A heavyweight team process (CODEOWNERS, review
rotations, required approvals). Rejected — team-shaped solutions for a non-team
problem; the real "team" is AI sessions, and the mechanism that actually reaches
them is `CLAUDE.md` (the same hard-rule lever that fixed the decision-log split).
Also considered: do nothing and triage reactively. Rejected — the pileup was
already compounding (drift makes PRs *harder* to land the longer they wait).

**Status:** Rules live in `CLAUDE.md` ("Branch & PR Workflow"). Backlog cleared
the same session: #16 merged, #13 closed (regressive), #18 merged (18-vs-20
discrepancy closed), #19 reviewed. Still optional, not yet built: a scheduled
stale-PR Action and a CI freshness check (branch-behind-`main` gate) to make
rules #1 and #5 self-enforcing rather than convention — mirrors the existing
`drift-lint.yml` scheduled-Action pattern.

---

## 2026-06-11 — Storybook + story-ui for AI-native story generation

**Decided:** Adopt Storybook (`@storybook/web-components-vite`) for the `rr-*`
components and wire in [story-ui](https://github.com/southleft/story-ui)
(`@tpitre/story-ui`) to generate stories from natural language. Three supporting
choices:
- **Barrel import only.** Stories register elements via the side-effect import
  `import '@riverromney/components'`; the package `exports` map deliberately
  exposes only the barrel, so per-component deep imports are unavailable.
- **The AI briefing is generated, not hand-written.** `story-ui-considerations.md`
  is produced by `scripts/build-considerations.mjs` from `design-system.json` +
  `ai/rules.md` (folded into `build:meta`), so it can never drift from the source
  of truth — the same discipline as every other generated artifact here.
- **Generated stories are gated like everything else.** `cem analyze` is pinned
  to `src/**/*.ts` excluding `*.test.ts`/`*.stories.ts` (so stories never leak
  into `custom-elements.json`), and a new `scripts/lint-stories.mjs` runs the
  shared `rules.mjs` over every `*.stories.*` — making it the fourth caller of
  the one rule set, alongside `validate`, `drift-lint`, and the MCP. CI also
  builds Storybook to prove stories still compile.

**Why:** the system already emits exactly the structured context an AI story
generator needs (`design-system.json`, per-component `*.meta.json`, the hard
rules). Feeding that to story-ui turns "describe a screen" into on-token stories,
and the existing rule engine keeps the AI inside the guardrails instead of
trusting it to stay there.

**Alternative considered:** keep the hand-written `*.stories.html` dev harnesses
and skip Storybook. Rejected — they can't be driven by story-ui, carry no
controls/args, and don't exercise the components the way consumers do. Also
considered letting `validate` keep linting stories incidentally; moved to a
dedicated gate so the responsibility (and the generated-stories path) is explicit.

**Status:** Shipped as a POC (merged via #19; badge/button/input baseline
stories). Not yet productionized: story-ui needs an LLM key to run, and the
generated-stories directory ships empty.

---

## 2026-06-11 — MCP expansion approved (lookup → reasoning)

**Decided:** Expand the MCP server from the 3 lookup tools to ~11, per
`docs/mcp-expansion-prd.md`: token awareness (`get_token`, `find_token`,
`get_spacing`), design reasoning (`get_rule`, `get_decision`,
`check_assembly`), and brand-aware tools (`get_brand`, `compare_brands`).
This supersedes the earlier freeze (archived ADR D-26 below: "no further
investment until external client demand exists").

**Why:** The rationale changed, not the facts. The freeze reasoning —
always-on `DESIGN.md`/`CLAUDE.md` context covers internal sessions — still
holds and remains the internal path. The expansion targets **external agents
that don't have the repo checked out**, and makes the server itself
demonstrate the Parsimony thesis: a design system an AI can reason with, not
just query. Prompted by comparison with DesignerPunk
(github.com/3fn/DesignerPunk), whose Civitas layer validates queryable
rationale as an approach — adopted here at parsimony scale (one server,
~11 tools, parsing files that already exist) rather than 88 steering docs
and 3 servers.

**Alternative considered:** Waiting for external client demand (the original
unfreeze trigger) — rejected; the MCP is positioning/portfolio
infrastructure now. Also rejected: DesignerPunk-style multi-server /
named-agent architecture — wrong scale for one maintainer and contrary to
the project's name.

**Status:** Spec'd (`docs/mcp-expansion-prd.md`). Constraints carried
forward: read-only forever; token values resolve from
`tokens/**/*.tokens.json` (DESIGN.md supplies usage prose only); deprecation
stays brand-scoped via `scripts/rules.mjs` so `get_token` and `check_usage`
cannot disagree; `check_assembly` v1 is an enumerated three-rule set.

---

## 2026-06-11 — One decision log: docs/decisions.md is canonical

**Decided:** This file is the single decision log. The parallel
`ai/DECISIONS.md` (a numbered ADR log, D-01…D-34, written in a local-only
branch of history) is merged in below as an **archived ADR section** —
D-numbers remain citable — and the original file is deleted. A hard rule in
`CLAUDE.md` now names this file as the only decision log so no session
(local or cloud) creates another. `ai/DECISION-ENGINE.md` is not a log — it
is the decision-engine sub-brand reference spec (deleted-token registry,
naming conventions) and stays where code and docs point at it.

**Why:** Local and cloud sessions independently created two decision logs in
the same week. Two logs is drift waiting to happen; this one was already the
actively-appended record. Keeping the ADR content (not just a pointer)
preserves existing D-number references in memory files and sub-brand docs.

**Alternative considered:** Keeping the numbered ADR format as canonical and
porting the dated entries into it. Rejected — cloud sessions already append
here, and retraining them is harder than redirecting one pointer.

**Status:** Done. New entries go here, dated, newest first. D-numbers are
frozen — do not extend the archived sequence.

---

## 2026-06-09 — Dark-theme palette cleanup (danger tint, dead/orphan accents)

**Decided:**
- **danger-alt** was `gray.50` (#F5F6F7, near-white) — a light box in a dark
  theme, inconsistent with the other feedback `-alt` tints. Repointed to a new
  `red.950` (#2A0A0A) dark tint, and lightened `foreground.danger` (`red.500`
  #E73027 → `red.400` #F87171) so danger text passes AA on both the canvas
  (7.06:1) and the dark danger-alt (6.62:1), matching the other bright feedback
  foregrounds. Added `red.400`/`red.950` primitives (the ramp had no dark-theme
  reds).
- **Removed dead/orphan tokens:** `background.accent` (deprecated, unused) and
  the unused light-theme-pairing chips `background/foreground.accent-indigo` and
  `.accent-sky` (#E0E7FF / #E0F2FE — near-white). Their `-bold` avatar variants
  stay. Kept the removed names in `DEPRECATED_TOKENS` to flag any lingering use.

**Why:** the now-complete, auto-generated `/tokens` catalog surfaced these as
visibly wrong — a near-white danger background and near-white "accent" chips in a
dark theme. The catalog doing its job as an audit surface.

**Alternative considered:** keep `foreground.danger` at #E73027 and add a
separate light-red just for alerts/badges. Rejected — lightening the one token is
simpler, improves canvas contrast too, and makes danger consistent with the other
feedback foregrounds.

**Status:** Shipped to source; published as `@digital2analogue2/tokens@0.1.1`;
portfolio reinstalled. DESIGN.md tables updated to match.

---

## 2026-06-09 — Staleness guards on the token propagation chain

**Decided:** Add two scheduled checks (mirroring the drift-loop's open/close-an-issue
pattern) covering the path a token value travels from source to a live site:
- **publish-freshness** (brand-tokens): builds CSS from source and diffs it,
  token by token, against the published npm package; opens an issue when a
  republish is due. Closes the "source → published" arrow.
- **tokens-freshness** (portfolio): runs `sync-tokens` to check the installed
  package against the latest published; opens an issue when behind. Closes the
  "published → consumer install" arrow.

**Why:** Once the portfolio started consuming the package, a token edit could
silently fail to reach production at two points — never republished, or never
reinstalled. Both arrows were manual and uncaught. These make staleness loud
without blocking normal commits.

**Alternative considered:** A blocking CI gate that fails the build whenever the
package is behind source. Rejected — between a token change landing and the
on-demand republish there's a legitimate transient window; failing every commit
in it would be noise. A scheduled issue nags without blocking.

**Status:** Shipped (detection + tracked issue). Comparison is by token
declaration, so comments/ordering/whitespace don't cause false positives;
verified locally against the published 0.1.0 (reports in sync).

## 2026-06-09 — First consumer (portfolio) migrated onto the published package

**Decided:** The portfolio (riverromney.design) consumes
`@digital2analogue2/tokens` via `@import ".../base.css"` plus a thin override
`:root`, instead of a hand-copied token block. The override re-declares only the
portfolio's deltas (responsive `clamp()` scaling, next/font-aware font families);
everything else cascades from the package. `sync-tokens` now checks installed vs
latest-published version instead of diffing a copied block.

**Why:** Closes the distribution loop — the system now dogfoods its own package,
so "single source of truth, consumed by real sites" is literally true and the
hand-copied snapshot (a drift vector) is gone.

**Alternative considered:** Keep inlining the block (zero new dependency, smaller
CSS). Rejected — it perpetuated the copy-paste drift the package exists to remove.
The cost accepted: the package's base CSS is heavier on the wire than the trimmed
inline block (verbose comments + DE-only primitives); revisit with a minified
build if it matters.

**Status:** Shipped for the portfolio. Surfaced and fixed a latent bug on the way
(consumers referenced `--spacing-group`/`--spacing-block`, which the inlined
subset never defined; the full package does). Other sites migrate as they come
online.

## 2026-06-05 — Self-healing drift detection runs in CI

**Decided:** A scheduled GitHub Action runs the shared drift scan against a
consumer repo and reflects the result as a single tracked issue — opened/updated
when drift is found, closed automatically when the consumer comes back clean —
rather than only on manual `workflow_dispatch`. The scanner gained `--ignore` and
`.driftignore` support so a consumer can exempt its own sanctioned token block
(e.g. an inlined primitive layer) and the scan reports real UI drift, not the
consumer's copy of the source of truth.

**Why:** The rules already exist in one place (`scripts/rules.mjs`) and the
manual `drift` command already works; making it run on a schedule and surface an
actionable, self-resolving issue closes the loop the architecture diagram
promises (consumers → drift scan → source) without waiting for a human to run it.

**Alternative considered:** Open a fix *PR* via a codemod that auto-rewrites
violations. Deferred — safely rewriting UI code is a much larger surface; an issue
is the honest artifact when there is no fix to commit.

**Status:** Workflow + scanner shipped on the feature branch. First real scan of
the portfolio caught genuine drift (primitive spacing refs, a deprecated token),
which is being fixed in the consumer. Auto-fix PR remains deferred.

## 2026-06-05 — No semantic font-family token yet; the JS bridge is the sanctioned adapter

**Decided:** Leave `lib/tokens.ts` in the portfolio (the `sans`/`serif`/`mono`
exports) as the single, documented place allowed to reference
`--primitive-font-family-*`, and exempt it in `.driftignore`. UI code imports the
bridge constant instead of inlining the primitive.

**Why:** The drift scan surfaced that there is no *semantic* family-only token —
this system bundles family into the `--font-*` shorthands, so code that needs only
the family (an inline `fontFamily`) has nowhere semantic to go. A single
controlled adapter is a legitimate pattern and avoids inventing a niche token
under time pressure.

**Alternative considered:** Add semantic `--font-family-{sans,serif,mono}` tokens
to brand-tokens. The "more correct" long-term fix, but it touches the published
token surface and the shorthand model; deferred, not rejected.

**Status:** Deferred. Bridge sanctioned now; revisit semantic family tokens if a
second consumer needs family-only access.

## 2026-06-05 — Lint and component rule messages are em-dash-free

**Decided:** Reworded the four shared `rules.mjs` messages and the no-hex rule in
`badge`/`button`/`input` `meta.json` to plain punctuation.

**Why:** These strings are rendered verbatim in the public case-study visuals;
keeping them em-dash-free keeps the visuals authentic *and* consistent with the
portfolio's voice, without faking tool output.

**Alternative considered:** Edit only the images. Rejected — that would make the
"verbatim tool output" claim false.

**Status:** Shipped. Tests assert rule `id`/`matches`, not message copy, so
behaviour is unchanged.

## 2026-06 — Distribution via public npm, not GitHub Packages

**Decided:** Ship the built brand CSS as `@digital2analogue2/tokens` on the
public npm registry.

**Why:** GitHub Packages requires authentication to install even public
packages, so every consumer and CI job would need a token just to download
tokens — the exact friction the package was meant to remove. Tokens are public
CSS anyway; there is nothing to gate.

**Alternative considered:** GitHub Packages (sits next to the repo). Rejected on
the auth-to-install friction and owner/scope coupling.

**Status:** Shipped (`0.1.0`). Reverses the PRD non-goal "no registry publishing
in v1."

## 2026-06 — The agent interface is MCP, not docs or a REST API

**Decided:** Expose the system to agents through an MCP server
(`list_components`, `get_component`, `check_usage`) reading a generated
`design-system.json`.

**Why:** Agents do not open a docs site, and a REST API needs a server, auth, and
the agent knowing it exists. MCP is the protocol the coding session already
speaks, so the same session can query the system with no setup.

**Alternative considered:** A DESIGN.md / docs page (original PRD position), or a
REST API. The docs-only approach was the explicit v1 plan; it was abandoned once
agents became the primary consumer.

**Status:** Shipped (MCP runs locally). Reverses the PRD non-goal "MCP is not
needed at this scale."

## 2026-06 — Components are framework-agnostic Web Components (Lit), not React

**Decided:** Build the `rr-*` components as Lit web components.

**Why:** One implementation works in React, plain HTML, and a Figma Code Connect
mapping, instead of maintaining the same button three times and keeping them in
sync.

**Alternative considered:** React components (smoother in the dominant framework).
Rejected. The real cost is sharper than "clunkier in React": it's *styling across
the Shadow DOM boundary* — the encapsulation bubble that protects a component's
internals also stops a consumer from reaching in with ordinary CSS to restyle
them. Token-based theming largely neutralizes this: CSS custom properties inherit
*through* the shadow boundary, so the components retheme by setting token values
(e.g. `--component-badge-*`, `--color-*`) without piercing encapsulation. The
harder cases (restyling internal *structure*) only arise for composite components,
which aren't built yet.

**Reference:** the five-strategy spectrum in "Web Component Style Flexibility"
(https://its-hcd.github.io/learn-webcomponent-style-flexibility/) — sealed
→ open: variables-only (Locked) → `::part()` → `exportparts` → `<slot>`/`::slotted()`
→ Light DOM. Our atomic components (badge, button, input) sit at the variable-themed
"Locked" end, which the page recommends for exactly that class of component.

**Watch:** progressive-enhancement web-component libraries (e.g. ElenaJS,
https://elenajs.com/) render HTML/CSS first and hydrate after, addressing Lit's
main weakness — client-only rendering (SSR gaps, layout shift, no-JS blankness).
The tradeoff cuts against us: PE leans light-DOM, which trades away the Shadow DOM
encapsulation our token theming relies on. Not a switch to make now; the thing to
evaluate if a consumer ever needs the components to render before JS.

**Status:** Shipped (18 components). Reverses the PRD non-goal "no component
library yet."

## 2026-06 — Tokens and components version together in one repo

**Decided:** Keep tokens and components in a single repo that versions as a unit;
a token rename is a breaking change to every component that uses it, enforced by
the build's token-reference resolution.

**Why:** Avoids version skew between separately published token and component
packages. With one source, a rename that wasn't propagated fails the build, not
production.

**Alternative considered:** Separate, independently versioned packages. Rejected
for the skew-chasing cost at this scale.

**Status:** Shipped. Enforced by `scripts/validate.mjs`.

## 2026-06 — One shared rule module behind every checker

**Decided:** The lint rules live once in `scripts/rules.mjs`; the build gate
(`validate`), the MCP `check_usage`, and the consumer `drift-lint` all import it.

**Why:** Earlier each checker re-implemented the same regexes by hand and they had
drifted apart. One module means the answer an agent gets from `check_usage` is
the one the build will later enforce.

**Alternative considered:** Per-checker rule copies (the prior state). Rejected as
the source of the drift it was meant to catch.

**Status:** Shipped. Delivers the PRD's P1-2 (CSS linter / audit rule).

---

# Archived ADR Log (formerly ai/DECISIONS.md)

> Imported 2026-06-11 when the two decision logs were consolidated (see the
> 2026-06-11 consolidation entry above). D-numbers below remain citable but the
> sequence is frozen — new decisions get dated entries at the top of this file.
> Note: D-26 (MCP freeze) is superseded by the 2026-06-11 MCP expansion entry.

---
scope: decisions
status: active
applies-to: [base, decision-engine, dot-art, dot-blog]
last-updated: 2026-05-28
---

# Design System — Decision Log

Running record of non-obvious design and architecture decisions. Each entry captures the **what**, **why**, and **what was rejected**. Commit messages and `ai/DECISION-ENGINE.md` are the primary audit trail; this log captures decisions whose rationale would otherwise be lost.

Add an entry when you make a call that a future contributor (or AI session) might reasonably second-guess.

---

## Token Architecture

### D-01 · Three-tier token hierarchy (primitives → semantic → brand)
**Date:** 2026-04-06  
**Decision:** Raw values live only in `tokens/primitives/`. Semantic intent lives only in `tokens/semantic/` (and `tokens/brands/` for sub-brand overrides). UI code always references semantic tokens via CSS custom properties. Primitives are never referenced in product code.  
**Why:** Allows the complete color palette to shift (e.g., darkening all greens) without touching product CSS. Semantic tokens are the stable API contract.  
**Rejected:** Flat token list (everything in one file) — loses the separation between "what value is this" and "what does this mean here."

### D-02 · W3C DTCG format for token JSON
**Date:** 2026-04-06  
**Decision:** Use the W3C Design Tokens Community Group spec (`$value`, `$type`, `$description` with `{alias}` reference syntax) rather than Tokens Studio legacy format.  
**Why:** Standards-aligned; directly importable into Figma 2024+ without a plugin; compatible with Style Dictionary v4 natively; future-proof as tooling converges on the spec.  
**Rejected:** Tokens Studio legacy format — would require a transform step and couples us to a single vendor.

### D-03 · Namespace primitives under `primitive.*`
**Date:** 2026-04-17 (commit 5455b46)  
**Decision:** All primitive tokens are prefixed `primitive.color.*`, `primitive.space.*`, `primitive.font.*` etc. Semantic tokens are at the top level: `color.background.*`, `spacing.*`, etc.  
**Why:** Prevents namespace collisions between primitive and semantic layers in the merged Style Dictionary context. Before this, `color.green.950` (primitive) and `color.background.default` (semantic) lived in the same flat namespace and could conflict.  
**Rejected:** No namespace prefix — worked initially but broke as the semantic layer grew.

### D-04 · Tokens stay at repo root permanently
**Date:** 2026-05-16 (plan rev5, commit dbe6931)  
**Decision:** Token files stay at the repository root (`tokens/`). The monorepo workspaces restructure (originally plan step 2) was permanently removed, not deferred.  
**Why:** Solo-practitioner reality check. Two consumer repos (`decisioning-table`, `portfolio-vercel`) both hardcode paths to `scripts/build-brands.mjs` and `build/css/<brand>.css`. Moving everything to `packages/tokens/` adds monorepo toolchain overhead and path migrations for zero practical benefit — the `sync-tokens` script already works.  
**Rejected:** Moving to `packages/tokens/` (npm workspaces) — the overhead wasn't justified until there's a second maintainer or an external npm consumer.

### D-05 · Distribution via sync-tokens, not npm publish
**Date:** 2026-04-06 (PRD), confirmed rev5  
**Decision:** Consumer repos pull the built CSS via a `sync-tokens` script that copies `build/css/<brand>.css`. No npm package is published.  
**Why:** Zero registry infrastructure. One maintainer, two consumers, both in repos River controls. npm publish becomes worthwhile when there's an external consumer or a CI/CD gate that needs a versioned artifact.  
**Rejected:** Publishing `@riverromney/tokens` to npm — overhead without a clear consumer outside of River's own repos.

---

## Color System

### D-06 · Dark-first, single accent color
**Date:** 2026-04-06  
**Decision:** Base theme is dark (near-black canvas `#0A0D0A`). Phosphor green (`#4ADE6E`) is the single allowed accent — all interactivity, all links, all CTAs use it. No secondary accent.  
**Why:** Visual identity constraint. Terminal-meets-editorial aesthetic. Multiple accents introduce hierarchy ambiguity; one accent makes interactivity immediately legible.  
**Rejected:** Blue or purple accent (conventional SaaS) — inconsistent with the established brand identity.

### D-07 · Accent green is never resting text
**Date:** 2026-04-06  
**Decision:** `color/foreground/action` and `color/foreground/accent-green` (phosphor green) are forbidden for static, resting text — only links, active states, intentional emphasis.  
**Why:** High-chroma color at high contrast demands attention. If it's everywhere, it signals nothing. Reserve it so it always means something.

### D-08 · Rename color.text → foreground, color.bg → background
**Date:** 2026-04-09 (commits cb3ab25, ace78d8)  
**Decision:** Token category names use the full words: `color.background.*`, `color.foreground.*`, `color.border.*`.  
**Why:** `text` is ambiguous (is it text color? a text node? a text input?). `foreground` is unambiguous and matches Figma's terminology. `bg` is fine colloquially but full words are more legible for AI context consumption.

### D-09 · Rename foreground.primary/secondary → foreground.default/alt
**Date:** 2026-04-26 (commit 401131f area)  
**Decision:** `foreground.primary` became `foreground.default`, `foreground.secondary` became `foreground.alt`. Corresponding background tokens followed the same pattern.  
**Why:** "Primary" implies a hierarchy that doesn't apply to all uses (primary text ≠ primary action). "Default" communicates "the normal thing" more clearly. "Alt" communicates "an alternative, not a lesser thing."

### D-10 · WCAG AA is enforced at the token level
**Date:** 2026-04-06  
**Decision:** Every token in `color.foreground.*` that could be used as text must pass 4.5:1 against its intended background. This is documented in `$description` fields and verified during token addition.  
**Why:** Accessibility regressions are caught before they reach product code, not after. The token layer is the right enforcement point — stricter than linting component CSS, less noisy than Lighthouse audits.  
**Exception:** Disabled element text (`foreground.disabled`) is exempt per WCAG 1.4.3.

### D-11 · Brighten foreground.danger to pass WCAG AA
**Date:** 2026-05-13 (commit 6e1bbe9)  
**Decision:** `red.500` was brightened from `#D03027` (3.85:1 on dark canvas) to `#E73027` (4.51:1). `background.danger` was simultaneously rerouted from `red.500` to `red.600` (`#C8002E`) to preserve white-on-red contrast (6.0:1 AA), since brightening `red.500` would have dropped that to 4.33:1.  
**Why:** The original value failed WCAG AA for `foreground.danger` text on the dark canvas. Documented in `ai/DESIGN.md` as 4.6:1 — that figure was wrong.  
**Rejected:** Routing around the token — creating a dedicated error text color that didn't alias through `red.500`. Kept the alias chain intact to preserve single-source behavior.

### D-12 · red.500 ↔ red.600 number swap
**Date:** 2026-04-28 (commit in DECISION-ENGINE.md)  
**Decision:** The numeric labels of `red.500` and `red.600` were swapped. After swap: higher numbers are darker (conventional). Before: `red.500` was darker than `red.600`, which violated numeric convention.  
**Why:** Numeric tint ramps should be monotone — 500 is lighter than 600. The inversion was a silent foot-gun for anyone adding a new step to the red ramp.  
**Impact:** Semantic CSS variables were unaffected — resolved hex values remained identical. Only the primitive token names changed.

### D-13 · Named slots instead of numeric steps for anomalous colors
**Date:** 2026-04-28  
**Decision:** Colors that can't fit cleanly into a numeric tint ramp get named slots instead: `color/blue/sky`, `color/green/chip`, `color/green/approve`, `color/gray/navy`.  
**Why:** A named slot is honest — it says "this is a specific color with a specific purpose" rather than implying a systematic position on a scale. Inserting a perceptually anomalous value into a numeric ramp requires either breaking the monotone constraint or creating a collision.  
**Example:** `blue.sky` (#93C5FD) is a dark-theme accent color, perceptually lighter than `blue.250` — it cannot be numbered 300 without inverting the ramp.

### D-14 · Accent-bold tier for saturated identity surfaces
**Date:** 2026-05-16 (commit 943d6b3)  
**Decision:** Added a `-bold` suffix tier for saturated accent fills intended for avatars and identity badges: `background.accent-{color}-bold`. Tint fills (`background.accent-{color}`) remain for chip/tag contexts.  
**Why:** Avatar backgrounds need a vivid, saturated color to be legible at small sizes. The existing tint fills (`#0F2016`, `#0D1830`) are too dark. Bold fills are opaque, saturated colors that pass white-text contrast (AA).  
**Suffix chosen:** `-bold` over `-vivid` (used by Material/Spectrum). River's preference — matches the "bold weight" mental model and avoids vendor-specific terminology.  
**New primitives added:** `indigo.700`, `sky.700`, `emerald.600` (via `color/sky/700`, etc.), `amber.600`.

### D-15 · White text on all accent-bold fills
**Date:** 2026-05-16 to 2026-05-28  
**Decision:** All `foreground.accent-on-*-bold` tokens use white (`neutral.white`). Dark text was rejected for every bold fill.  
**Why:** Bold fills are saturated, mid-to-dark value. Dark text on indigo-700 (7.98:1 AAA for white) or emerald-600 (5.47:1 AA for white) would require near-black text which clashes with the color identity of the surface. White reads clean on all five bold fills.  
**Amber edge case:** `amber.600` (#B45309) passes 5.02:1 AA for white — barely, but passes. Dark text on amber-600 would give 4.17:1, which fails. White was the only option.

---

## Typography

### D-16 · Space Grotesk light (300) for all display and title tokens
**Date:** 2026-04-22 (commit 23d6645)  
**Decision:** `font.display` and all `font.title.*` tokens use weight 300 (light). Body uses 400 (regular). Labels use 400 (regular) or 500 (medium for "strong" variants). 600/700 exist as primitives for ad-hoc use only.  
**Why:** The terminal-meets-editorial visual identity reads as more refined at light weight for headings. Light weight at large sizes creates visual distinction from the 400-weight body text, establishing hierarchy without using size alone.  
**Common mistake:** Previous state had title tokens at 400 (fixed in commit 23d6645). AI sessions sometimes revert to 400 because it's the conventional weight for headings in most systems.

### D-17 · Geist font exception for decision-engine
**Date:** 2026-05-10 (commit 7e7eff1)  
**Decision:** The DE sub-brand uses Geist instead of Space Grotesk for UI labels, buttons, and headings. This is an approved exception to the "Space Grotesk only" rule.  
**Why:** Geist is the de facto font for enterprise data UI (Vercel ecosystem, Linear). DE is a fintech/enterprise product where Geist reads as conventional and trustworthy rather than personal-brand-expressive. Space Grotesk would read as out-of-character in a data-dense table interface.  
**Scope:** DE only. All other River Romney properties use Space Grotesk.

### D-18 · font-family tokens extracted to semantic layer
**Date:** 2026-05-10 (commit 7e7eff1)  
**Decision:** Font family is exposed as a semantic token (`font-family/sans`, `font-family/serif`, `font-family/mono`) so sub-brands can override just the family without redefining every composite typography token.  
**Why:** DE's Geist override would otherwise require rewriting all 19+ typography composite tokens. With semantic family tokens, DE overrides just `font-family/sans = Geist` and all composite tokens that reference it resolve correctly.

---

## Spacing & Scale

### D-19 · Semantic spacing aliases (spacing.component, spacing.layout, etc.)
**Date:** 2026-04-15 (commit 6d13d87)  
**Decision:** Added a semantic spacing layer (`spacing.micro`, `spacing.tight`, `spacing.inline`, `spacing.element`, `spacing.component`, `spacing.group`, `spacing.layout`, `spacing.block`, `spacing.page`, `spacing.section`) as aliases to primitives.  
**Why:** Primitive names (`space.lg`, `space.2xl`) communicate scale but not intent. Semantic names communicate where to use the value. An AI or developer choosing between `space.xl` (32px) and `space.2xl` (48px) has to guess; choosing between `spacing.group` and `spacing.layout` is self-documenting.

---

## Web Components

### D-20 · LitElement for web components, React 19 native CE support
**Date:** 2026-05-07 (commit 6a6c401 area)  
**Decision:** Web components use LitElement. React integration uses React 19's native custom element support — no `@lit/react` wrappers.  
**Why:** LitElement provides reactive properties, shadow DOM, and a minimal footprint without full framework overhead. React 19's native CE support means no adapter library — JSX types cover all 20 components via a single subpath export (`@riverromney/components/react`).  
**Rejected:** `@lit/react` — adds a dependency and requires manual wrapper for every component. React 19 made this unnecessary.

### D-21 · Component tokens (`--component-*`) as the styling layer
**Date:** 2026-05-07  
**Decision:** Each component exposes `--component-*` CSS custom properties (e.g., `--component-button-bg`, `--component-badge-border`) that reference semantic tokens. Product CSS never touches shadow DOM internals directly.  
**Why:** Shadow DOM encapsulates styles — you can't reach inside with a selector. Component tokens are the intentional theming API. They also let DE override a specific component's appearance by setting `--component-*` in its brand CSS, without breaking the base theme.

### D-22 · Form-associated custom elements via ElementInternals
**Date:** 2026-05-07  
**Decision:** `rr-input`, `rr-select`, `rr-checkbox`, `rr-toggle`, `rr-textarea`, `rr-radio-group` use `ElementInternals` and `formAssociated = true` to participate in native HTML forms.  
**Why:** Without `ElementInternals`, custom elements are invisible to `<form>` elements — `FormData` won't include their values, `required` validation won't fire, and they won't serialize with the form. `ElementInternals` gives the full native form control contract.  
**Test guard:** `happy-dom` doesn't implement `ElementInternals.setFormValue`. Tests guard with `typeof this.internals.setFormValue === 'function'`.

### D-23 · Hidden-input focus pattern for checkbox/toggle/radio
**Date:** 2026-05-08  
**Decision:** The real `<input>` is positioned `absolute; inset: 0; opacity: 0; z-index: 1` inside the visual wrapper. CSS `input:focus-visible ~ .visual-element { outline: ... }` drives the focus ring from native focus events.  
**Why:** Gives free keyboard navigation, tab order, and focus ring without reimplementing focus management. The browser handles focus state; CSS handles the visual ring via the `:focus-visible ~ sibling` selector.  
**Rejected:** Custom `tabIndex` management + `keydown` handler — more code, more edge cases, breaks browser autofill and AT integration.

### D-24 · native `<dialog>` element for rr-dialog
**Date:** 2026-05-09 (commit 714610d)  
**Decision:** `rr-dialog` wraps the native `<dialog>` element rather than building a custom overlay with `position: fixed` and manual focus trap.  
**Why:** Native `<dialog>` provides a free focus trap, `Escape` key dismissal, and top-layer stacking context — no `@a11y/focus-trap` or `inert` polyfill needed. It's the correct semantic element.  
**Test guard:** `happy-dom` doesn't implement `dialog.showModal()`. Both `showModal()` and `close()` are guarded with `typeof fn === 'function'` checks in tests.

### D-25 · Select uses options[] prop, not slotted native options
**Date:** 2026-05-08  
**Decision:** `rr-select` takes `options: SelectOption[]` as a reactive property rather than slotting native `<option>` elements.  
**Why:** Shadow DOM's `<select>` cannot contain slotted `<option>` elements — the browser only recognizes `<option>` as a direct child of `<select>`, not slot content. Slotted options appear visually but don't populate the options list. The prop array approach works cleanly inside shadow DOM.  
**Rejected:** Light DOM select (no shadow) — loses style encapsulation and component consistency.

### D-26 · MCP server — complete and frozen
**Date:** 2026-05-16 (plan rev5)  
**Decision:** The MCP server (step 8 of the web components plan) is complete. No further investment until external client demand exists.  
**Why:** At current scale (one maintainer, two consumer repos), the `DESIGN.md` + `CLAUDE.md` approach gives AI sessions full design context without running an MCP server. MCP adds value when a team needs programmatic component lookup or when the system is consumed across organizational boundaries.  
**Superseded:** D-34 (2026-06-11) — expansion approved for external-agent consumption; always-on context remains the internal path.

---

## Figma

### D-27 · Base-dark Figma file covers only the base dark theme
**Date:** 2026-05-10  
**Decision:** The Figma Foundations Library (`4aOEBHcnAv2Kbn0g1arL78`) covers only the base dark theme. DE light-mode is planned as a separate file (v2). DE tokens are excluded from the base-dark drift audit.  
**Why:** Mixing base-dark and DE variables in one Figma file creates mode complexity — every variable needs two mode values, and DE's entirely different color palette makes the base-dark variables confusing in the DE design context.

### D-28 · All semantic Figma variables use VARIABLE_ALIAS to primitives
**Date:** 2026-05-10  
**Decision:** Every variable in the Figma Color collection is an alias (VARIABLE_ALIAS) to a Primitives collection variable. No semantic Figma variable has a raw RGB value.  
**Why:** If the primitive changes (e.g., brightening `red.500`), all semantic variables that alias it resolve automatically without manual updating. This mirrors how the DTCG JSON alias system works.

### D-29 · Code Connect publish blocked by Figma 403 — platform issue
**Date:** 2026-05-28  
**Decision:** All 18 `.figma.ts` files parse cleanly (`All Code Connect files are valid`). The 403 error on `figma connect publish` is a Figma platform issue — their new scoped token UI does not expose the Code Connect Write scope even when all available scopes are selected.  
**Status:** Not our problem to fix. File a Figma support ticket or monitor github.com/figma/code-connect/issues.

### D-30 · Drift audit excludes DE-only tokens from score
**Date:** 2026-05-28 (commit fb26c70)  
**Decision:** Tokens sourced from `brands/decision-engine.tokens.json` that are absent from the base-dark Figma file are routed to a `de_only` bucket in `drift_audit.py` and excluded from the drift score. They appear in the report under "DE-Only Tokens (Expected — Not Scored)".  
**Why:** The 11 DE-only tokens (e.g., `color.foreground.secondary`, `color.background.elevated`) are not missing — they are correctly absent from the base-dark file. Counting them as "missing" would make the audit permanently score below 100 even when the system is fully in sync.

---

## Naming Conventions

### D-31 · accent-on-[color] pattern for foreground-on-fill tokens
**Date:** 2026-04-27  
**Decision:** Tokens for text/icons on colored accent fills use the pattern `foreground.accent-on-{color}` (e.g., `accent-on-indigo`, `accent-on-amber-bold`), not `foreground.on-accent-{color}`.  
**Why:** `accent-on-*` groups all accent family tokens together alphabetically in the token list. `on-accent-*` scatters "on-" tokens away from their corresponding fill tokens.  
**Renamed:** `foreground.on-accent-blue` → `foreground.accent-on-blue`, etc. (2026-04-27).

### D-32 · Accent color tokens are not semantic
**Date:** 2026-04-28 (DECISION-ENGINE.md)  
**Decision:** `foreground.accent-green`, `foreground.accent-blue`, `foreground.accent-purple` etc. are palette slots, not semantic intent tokens. They can be used for any bespoke UI need — data visualization, decorative highlights, product-specific component theming.  
**Why:** The fact that Approve/Deny/Review outcomes in DE happen to use green/red/purple is a product-level decision, not a design system contract. Calling these "semantic" would incorrectly imply the colors are fixed in meaning.  
**Contrast:** `foreground.danger` IS semantic — it always means "error, destructive, or deny." The red color is load-bearing. The accent slots' colors are not.

### D-33 · Deleted tokens — do not re-add without strong reason
**Date:** 2026-04-27 to 2026-04-28  
See `ai/DECISION-ENGINE.md` for the full deleted-token registry. Key deletions:
- `foreground.accent` (generic) → replaced by named `foreground.accent-[color]` slots
- `foreground.primary` → renamed `foreground.default`
- `feedback.error` → redundant with `foreground.danger`
- `foreground.accent-red` → red is semantic in this system; non-semantic red slot creates ambiguity

---

## MCP Server

### D-34 · MCP expansion — supersedes the D-26 freeze
**Date:** 2026-06-11  
**Decision:** Expand the MCP server per `docs/mcp-expansion-prd.md` — Phase 1 token awareness (`get_token`, `find_token`, `get_spacing`), Phase 2 design reasoning (`get_rule`, `get_decision`, `check_assembly`), Phase 3 brand-aware (`get_brand`, `compare_brands`). Supersedes D-26.  
**Why:** The rationale changed, not the facts. D-26's reasoning — always-on `DESIGN.md` + `CLAUDE.md` context covers internal sessions — still holds and remains the internal path. The expansion targets **external agents that don't have the repo checked out**, and makes the server itself demonstrate the Parsimony thesis: a design system an AI can reason with, not just query. Prompted by comparison with DesignerPunk ([github.com/3fn/DesignerPunk](https://github.com/3fn/DesignerPunk)), whose Civitas layer validates queryable rationale as an approach — adopted here at parsimony scale: one server, ~8 tools, parsing files that already exist, versus 88 steering docs and 3 servers.  
**Rejected:** Waiting for external client demand (D-26's unfreeze trigger) — the MCP is positioning/portfolio infrastructure now, not demand-driven tooling. Also rejected: DesignerPunk-style multi-server / named-agent architecture — wrong scale for one maintainer and contrary to the project's name.  
**Constraints carried forward:** read-only forever; token values resolve from `tokens/**/*.tokens.json` (DESIGN.md supplies usage prose only); deprecation is brand-scoped so `get_token` and `check_usage` cannot disagree; `check_assembly` v1 is an enumerated three-rule set, not general design-intent inference.

---

## Open / Pending Decisions

| # | Question | Status |
|---|----------|--------|
| OD-1 | Should the PRD at `docs/brand-design-system-prd.md` be updated to reflect post-April state? | Open — PRD is stale since April 2026 |
| OD-2 | When does the DE Figma file (v2) get built? | Deferred — no timeline |
| OD-3 | Step 7 (format benchmark — JSON vs CSS performance) | Deferred — low priority |
| OD-4 | Should `rr-*` components be published to npm? | Deferred — no external consumer yet |
| OD-5 | Code Connect publish 403 | **Closed 2026-08-10 — misdiagnosed. Not a bug: the `pro` plan does not entitle Code Connect. See the 2026-08-10 entry.** |
| OD-6 | DE font-size-2xs debt — hardcoded 10px/9px on `.dt-avatar` | In decisioning-table CSS; needs `var(--primitive-font-size-2xs)` |
