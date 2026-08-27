# Contributing to Parsimony

This is the contributor-facing distillation of the working agreement. It applies
to humans and AI agents alike — several autonomous sessions (local and cloud)
work this repo in parallel, and every drift incident on record traces back to
skipping one of these rules. `CLAUDE.md` (agent boot context) points here;
`AGENTS.md` is for agents *consuming* the system in product repos.

## The short version

1. **Branch fresh; rebase before opening or updating a PR.**
   `git fetch origin && git rebase origin/main` before every push. A branch
   behind `main` is the root cause of every drift incident in
   `docs/decisions.md`.
2. **Small and single-purpose.** One concern per PR; aim for under ~200 changed
   lines. Split mechanical changes (regenerated artifacts) from logic. Large
   omnibus PRs don't get reviewed — they sit.
3. **Validate before you push.** `npm run validate`, plus the tests CI runs:
   `npm test --workspaces --if-present` **and** `npm run test:unit -- --run`.
   A root-only test pass has shipped a red branch before.
4. **Declare intent before non-trivial work.** Check open PRs and branches
   first; if your work overlaps, open a draft PR or coordinate.
5. **Land or close within ~7 days.** The weekly `stale-prs.yml` Action flags
   violators; it never closes for you.

## Making a change

### Tokens

Always start in this repo, never in a product repo. Edit
`tokens/{primitives,semantic,components,brands}/…`, then:

```bash
npm run build:all     # build brand CSS + regenerate docs/index.html
npm run validate      # schema + lint rules + reference resolution
```

Commit the regenerated `build/` output in the same PR — CI fails on staleness.
Hard rules that gate every change: no hex in UI code, no `--primitive-*`
references, WCAG AA (4.5:1) for every text/background pairing, spacing from the
scale only. The full set lives in `ai/rules.md`.

### Components (`packages/components/`)

Each `rr-*` component ships its `.ts`, tests, stories, `*.meta.json`
(schema-validated), and a Code Connect `*.figma.ts` (authored and validated, but
not publishable on the current Figma plan — see the 2026-08-10 decision entry).
After changing any of those:

```bash
npm run build:meta        # regenerate CEM + design-system.json
npm run docs:components   # regenerate docs/components/*.mdx (GEN regions)
```

Commit the regenerated artifacts — CI has staleness gates for the CEM,
`design-system.json`, component MDX, and `docs/index.html`. Prop descriptions
are single-sourced from the JSDoc above each `@property`; edit the JSDoc, never
`meta.json`, never `design-system.json`.

The MDX files under `docs/components/` have `GEN` regions (regenerated — do not
hand-edit) and `AUTHORED` regions (overview/usage prose — yours to write;
DocGen preserves them).

### Visual baselines

Baselines are generated **on the CI runner, never locally** (font
rasterization differs across machines). After adding or changing stories:
push your final commit, dispatch the **"Update visual baselines"** workflow on
your branch from the Actions tab, and let it commit the baselines back. Known
quirk: that bot commit leaves the PR's CI run in **"action required"** — re-run
it from the Actions tab and it proceeds normally. Never push to the branch
while the baselines workflow is mid-run.

## Where things are decided and tracked

- **What's next:** GitHub issues (`roadmap` label for the board).
- **Why:** `docs/decisions.md` — the only decision log. Dated entries, newest
  first. Never create a second decision log anywhere.
- **What shipped:** git history and PRs.

## Conduct

Be direct, cite evidence, keep review comments about the work. When a gate
catches your change (validate, staleness, parity, contrast), fix the change —
never bypass the gate.
