#!/usr/bin/env node
/**
 * drop-baselines.mjs — delete visual baselines so `--update-snapshots` will
 * actually rewrite them (#235).
 *
 * Playwright's `--update-snapshots` only rewrites a baseline whose comparison
 * FAILED. A rendering change small enough to pass on tolerance is therefore a
 * change the update flag silently declines to record — the committed PNG stops
 * describing the code, and the next real regression gets measured against a
 * stale reference. That cost a whole debugging cycle during #234: three
 * consecutive update runs reported "86 passed" and wrote nothing, while the
 * component on screen was visibly wrong.
 *
 * Deleting first is the fix, and this is that, with a guard rail: it REQUIRES a
 * filter. `npm run baselines:drop` with no argument is an error, not "delete
 * every baseline" — because every baseline deleted is one that has to be
 * regenerated, and this repo's rule is that regeneration happens on the CI
 * runner (`update-visual-baselines.yml`), not on whatever machine you happen
 * to be sitting at.
 *
 *   npm run baselines:drop -- segmented      # every components-segmented--*
 *   npm run baselines:drop -- chip --dry-run # show what would go
 */
import { readdirSync, unlinkSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "packages/components/tests/visual/__screenshots__");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const filters = args.filter((a) => !a.startsWith("-"));

if (filters.length === 0) {
  console.error(`
  Refusing to run without a filter.

  This deletes committed baselines, and every one deleted has to be
  regenerated — on the CI runner, per CONTRIBUTING.md, not locally. Name what
  you actually changed:

    npm run baselines:drop -- segmented
    npm run baselines:drop -- chip badge
    npm run baselines:drop -- segmented --dry-run
`);
  process.exit(1);
}

const all = readdirSync(DIR).filter((f) => f.endsWith(".png"));
const matched = all.filter((f) => filters.some((needle) => f.includes(needle)));

if (matched.length === 0) {
  console.error(
    `  No baseline matches ${filters.join(", ")} (${all.length} baselines present).`,
  );
  process.exit(1);
}

for (const file of matched) {
  if (!dryRun) unlinkSync(join(DIR, file));
  console.log(`  ${dryRun ? "would drop" : "dropped"}  ${file}`);
}

console.log(`
  ${matched.length} of ${all.length} baseline(s) ${dryRun ? "would be" : ""} dropped.
  Regenerate with:  npm run test:visual:update
`);
