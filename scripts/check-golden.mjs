/**
 * check-golden.mjs — golden-output gate for the built brand CSS (#151).
 *
 * build/ is gitignored (distribution is the npm package), so without this
 * gate a token change that alters built output is only visible via the
 * weekly publish-freshness check. The committed fixtures in tests/golden/css/
 * are the golden copy: CI rebuilds and compares byte-for-byte, so any change
 * to built output shows up as a reviewable fixture diff in the PR that
 * caused it — the ds-contracts golden-output-manifest idea.
 *
 * Usage:
 *   node scripts/check-golden.mjs            compare build/css ↔ tests/golden/css
 *   node scripts/check-golden.mjs --update   copy build/css over the fixtures
 *   npm run check:golden / npm run golden:update
 *
 * On an intentional token change: npm run build && npm run golden:update,
 * then review and commit the fixture diff alongside the token change.
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUILT = resolve(ROOT, "build/css");
const GOLDEN = resolve(ROOT, "tests/golden/css");

const update = process.argv.includes("--update");

if (!existsSync(BUILT)) {
  console.error("✗ build/css does not exist — run `npm run build` first.");
  process.exit(1);
}
const built = readdirSync(BUILT)
  .filter((f) => f.endsWith(".css"))
  .sort();
if (built.length === 0) {
  console.error("✗ build/css contains no CSS — run `npm run build` first.");
  process.exit(1);
}

if (update) {
  rmSync(GOLDEN, { recursive: true, force: true });
  mkdirSync(GOLDEN, { recursive: true });
  for (const f of built) {
    writeFileSync(join(GOLDEN, f), readFileSync(join(BUILT, f)));
  }
  console.log(
    `✓ golden fixtures updated from build/css (${built.length} file(s)) — review and commit the diff.`,
  );
  process.exit(0);
}

if (!existsSync(GOLDEN)) {
  console.error(
    "✗ tests/golden/css missing — seed it with `npm run golden:update` and commit.",
  );
  process.exit(1);
}
const golden = readdirSync(GOLDEN)
  .filter((f) => f.endsWith(".css"))
  .sort();

let failed = false;
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failed = true;
};

for (const f of golden) {
  if (!built.includes(f)) fail(`${f}: in golden fixtures but not in build/css`);
}
for (const f of built) {
  if (!golden.includes(f)) {
    fail(`${f}: built but has no golden fixture`);
    continue;
  }
  if (!readFileSync(join(BUILT, f)).equals(readFileSync(join(GOLDEN, f)))) {
    fail(`${f}: built output differs from tests/golden/css/${f}`);
  }
}

if (failed) {
  console.error(
    "\nBuilt brand CSS no longer matches the golden fixtures.\n" +
      "Intentional token change → `npm run build && npm run golden:update`, " +
      "review the fixture diff, and commit it with the change.\n" +
      "Not intentional → the build output drifted; investigate before updating.",
  );
  process.exit(1);
}
console.log(`✓ build/css matches golden fixtures (${built.length} file(s))`);
