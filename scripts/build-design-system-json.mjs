/**
 * Merge *.meta.json + custom-elements.json → design-system.json
 *
 * Usage: node scripts/build-design-system-json.mjs
 *
 * Output: design-system.json (committed artifact — works on git clone without a build step)
 *
 * The MCP server and other consumers read this file directly.
 * $schemaVersion major must match what the consumer was built against;
 * a mismatch means the consumer needs an explicit version bump.
 *
 * Merge-conflict strategy: commit-on-CI-only recommended.
 * PR authors run this locally to preview; CI regenerates and commits
 * the canonical version. Avoids noisy merge conflicts.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { glob } from "node:fs/promises";
import { injectPropDescriptions } from "./cem-descriptions.mjs";
import { contractTokens } from "./component-tokens.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = resolve(ROOT, "design-system.json");

const SCHEMA_VERSION = "1.0.0";

// ── Collect *.meta.json ─────────────────────────────────────────────────────

const metaGlobs = ["packages/components/**/*.meta.json", "src/**/*.meta.json"];

// Collect file paths first, then sort, so the artifact is deterministic
// regardless of filesystem glob order — required for the CI staleness check.
const metaFiles = [];
for (const pattern of metaGlobs) {
  for await (const entry of glob(pattern, { cwd: ROOT })) metaFiles.push(entry);
}
metaFiles.sort();

/**
 * `tokensUsed` is DERIVED for any component that declares an anatomy (#188).
 *
 * It used to be authored by hand alongside the anatomy tree, which stated the
 * same decision twice and was checked against nothing — its only reader was the
 * doc generator, so it could name a token the component had stopped using
 * indefinitely. Deriving it is only possible now that anatomy v2 can express
 * every binding a component has (#178 took the "declared but attached to no
 * part" count from 29 to zero); before that the flat list held the remainder.
 *
 * Same single-sourcing as prop descriptions, which come from the JSDoc rather
 * than the meta (see cem-descriptions.mjs). Metas with no anatomy keep their
 * authored list until their promotion batch lands.
 *
 * Sorted, because the artifact has to be byte-stable for the CI staleness check
 * and part-tree traversal order would otherwise leak into the diff whenever
 * someone reorders an anatomy.
 */
function withDerivedTokens(meta) {
  if (!meta.anatomy) return meta;
  return { ...meta, tokensUsed: [...contractTokens(meta)].sort() };
}

const components = [];
for (const entry of metaFiles) {
  const rel = relative(ROOT, resolve(ROOT, entry));
  try {
    components.push(
      withDerivedTokens(JSON.parse(readFileSync(resolve(ROOT, entry), "utf8"))),
    );
    console.log(`  + ${rel}`);
  } catch (e) {
    console.error(`  ✗ ${rel}: ${e.message}`);
    process.exit(1);
  }
}
// Stable order by component name (plain code-unit compare — locale-independent).
components.sort((a, b) => {
  const x = a.name ?? "";
  const y = b.name ?? "";
  return x < y ? -1 : x > y ? 1 : 0;
});

// ── Merge with Custom Elements Manifest (if it exists) ──────────────────────

const cemPaths = [
  "packages/components/custom-elements.json",
  "custom-elements.json",
];

let customElements = null;
for (const cemPath of cemPaths) {
  const abs = resolve(ROOT, cemPath);
  if (existsSync(abs)) {
    try {
      customElements = JSON.parse(readFileSync(abs, "utf8"));
      console.log(`  + ${cemPath} (Custom Elements Manifest)`);
    } catch (e) {
      console.error(`  ✗ ${cemPath}: ${e.message}`);
      process.exit(1);
    }
    break;
  }
}

// ── Inject prop descriptions from the CEM (single source: JSDoc) ────────────
// Prop descriptions live in exactly one place — the per-property JSDoc above
// each `@property`, captured into the manifest by `cem analyze`. meta.json no
// longer carries `description`; we resolve each prop's text from the CEM here so
// the MCP (which reads this artifact) and Storybook autodocs (which reads the
// CEM) can never diverge. A prop with no CEM description is a hard error — it
// means a `@property` is missing its `/** … */` doc comment.
if (customElements) {
  const missing = injectPropDescriptions(components, customElements);
  if (missing.length) {
    console.error(
      `  ✗ no per-property JSDoc description in the CEM for: ${missing.join(", ")}\n` +
        `    Prop descriptions are sourced from each component's per-property JSDoc.\n` +
        `    Add a /** … */ comment above the @property and re-run \`npm run build:meta\`.`,
    );
    process.exit(1);
  }
}

// ── Build merged artifact ───────────────────────────────────────────────────

// No timestamp: the artifact is a pure function of its inputs, so CI can verify
// it is up to date with `git diff --exit-code`. Provenance comes from the commit.
const artifact = {
  $schemaVersion: SCHEMA_VERSION,
  components,
};

if (customElements) {
  artifact.customElements = customElements;
}

writeFileSync(OUTPUT, JSON.stringify(artifact, null, 2) + "\n");

console.log(
  `\n→ design-system.json (${components.length} component${components.length === 1 ? "" : "s"}, schema v${SCHEMA_VERSION})`,
);
