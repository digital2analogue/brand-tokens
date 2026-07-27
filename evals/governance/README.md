# Governance Eval (#153)

Measures whether Parsimony's agent governance actually works, as an A/B experiment
(the reference model's governed-100/100 vs ungoverned-69/100 design): the same 20
UI-generation prompts run in two arms, and only the **governed** arm gets Parsimony
context. Scoring is fully mechanical — no human grading, no model-as-judge.

## Protocol (for the orchestrating session)

**Setup**
1. `npm ci` at the repo root; `node packages/tokens/build.mjs` to generate the
   context packs the governed arm loads (`packages/tokens/context/`).
2. Both arms MUST use the same model. Record which.

**Generation — one isolated agent per prompt per arm (40 runs total)**

For each prompt in [prompts.json](./prompts.json), spawn a FRESH subagent per arm —
never reuse an agent across prompts or arms (leakage invalidates the comparison):

- **Arm `governed`** — agent receives, verbatim: the contents of
  `packages/tokens/context/system.md`, the contents of
  `packages/tokens/context/components/<tag>.md` for each tag in the prompt's
  `components` list, then the prompt text.
- **Arm `ungoverned`** — agent receives only the prompt text, prefixed with:
  "Use the design system." Nothing else. Do NOT let it read the repo.

Both arms get the same output instruction: "Return only an HTML fragment with any
CSS in a single `<style>` block. No commentary."

Save each output verbatim (exactly as returned, no fixes) to
`evals/governance/out/<arm>/<id>.html`. The out/ directory is gitignored.

**Scoring**
```
npm run eval:governance            # human-readable per-arm report
npm run eval:governance -- --json  # machine output
```

**Recording**
- Add a dated entry to `docs/decisions.md`: both arms' clean-run rate and mean
  violations/run, the model used, the date, and a pointer to this harness.
- Comment the result on #153. If the governed arm ran off the context packs alone,
  tick the corresponding #155 acceptance box.
- If governed adherence is below 100%: file one follow-up issue per miss class —
  each is either a `rules.mjs` detector gap or a context-delivery gap.

## What the scorer checks (scripts/governance-eval.mjs)

1. **Rule violations** — the shared `RULES` detectors via `lintSnippet` (hex
   literals, primitives, hardcoded font sizes/weights, unapproved families,
   deprecated tokens). Same detectors as validate / check_usage / drift-lint.
2. **Fabricated tokens** — `var(--…)` references that exist in no token layer
   (`--primitive-*` is excluded here; it is already its own rule violation).
3. **Fabricated props** — attributes on `rr-*` tags that are not declared props of
   that component (globals like `class`/`id`/`slot`/`style`/`part`, `aria-*`, and
   `data-*` are allowed; an unknown `rr-*` tag itself is also a finding).

A run is **clean** iff all three classes are empty. Per-arm aggregates: clean-run
rate, mean violations per run, and a per-class breakdown.

## Rules of the experiment

- Never edit an output before scoring; the saved file is the datum.
- Never tune prompts toward either arm after a first run — changing the prompt set
  starts a new experiment, not a re-run.
- The `components` field in prompts.json steers the governed arm's pack loading
  only; the ungoverned arm never sees it.
