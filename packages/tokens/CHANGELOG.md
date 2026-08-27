# Changelog — @digital2analogue2/parsimony

Token changes per published release. Entries are **generated**, not hand-written:

```bash
npm run changelog -- <fromVersion> [toVersion]
```

The generator (`scripts/token-changelog.mjs`) diffs the built brand CSS of two
published versions and shares its comparison with the publish-freshness gate
(`scripts/token-diff.mjs`), so the gate and this file cannot disagree about what
changed. Semantic tokens lead — they are what a consumer writes; primitive-layer
movement is folded into a details block.

History starts at 0.7.0. Earlier releases predate the generator and are not
reconstructed here; `npm run changelog -- <old> <newer>` will produce any of them
on demand, since every version remains on the registry.

## 0.7.0 — 2026-08-11

Token changes since `0.6.1`.

#### decision-engine.css

**Added**

- `--spacing-align` → `var(--primitive-space-3xs)`

#### dot-art.css

**Added**

- `--spacing-align` → `var(--primitive-space-3xs)`

#### dot-blog.css

**Added**

- `--spacing-align` → `var(--primitive-space-3xs)`

#### variables.css

**Added**

- `--spacing-align` → `var(--primitive-space-3xs)`

