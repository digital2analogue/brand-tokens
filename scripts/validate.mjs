/**
 * validate.mjs — the build-time gate for the token system.
 *
 * Usage: node scripts/validate.mjs   (npm run validate)
 *
 * Checks:
 *   1. Every *.meta.json validates against schemas/meta.schema.json
 *   2. Component source files obey the lint rules (scripts/rules.mjs)
 *   3. Every token reference {a.b.c} resolves to a token that exists
 *      — this is what makes "a rename is a breaking change" actually true.
 *   4. Every string value a *.figma.ts Code Connect enum can emit exists
 *      in a literal union of the paired component source — so Code Connect
 *      can never emit a prop value the component doesn't implement.
 *
 * Consumer-side enforcement lives in scripts/drift-lint.mjs (the CI Action).
 */

import { readFileSync } from "node:fs";
import { resolve, relative, dirname, basename } from "node:path";
import { glob } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { lintLines } from "./rules.mjs";
import { loadTokens } from "./tokens.mjs";
import { findUnmappedEmissions } from "./code-connect.mjs";
import { unresolvedAccepts } from "./assembly.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const SCHEMA_PATH = resolve(ROOT, "schemas/meta.schema.json");

let exitCode = 0;
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  exitCode = 1;
}

// ── 1. Schema validation ────────────────────────────────────────────────────

console.log("Validating *.meta.json files...\n");

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const metaGlobs = ["packages/components/**/*.meta.json", "src/**/*.meta.json"];

let metaCount = 0;
const metas = [];
for (const pattern of metaGlobs) {
  for await (const entry of glob(pattern, { cwd: ROOT })) {
    metaCount++;
    const rel = relative(ROOT, resolve(ROOT, entry));
    try {
      const data = JSON.parse(readFileSync(resolve(ROOT, entry), "utf8"));
      if (!validate(data)) {
        fail(`${rel}: schema validation failed`);
        for (const err of validate.errors) {
          console.error(`    ${err.instancePath || "/"} ${err.message}`);
        }
      } else {
        console.log(`  ✓ ${rel}`);
        metas.push(data);
      }
    } catch (e) {
      fail(`${rel}: ${e.message}`);
    }
  }
}
console.log(metaCount === 0 ? "  (no *.meta.json files found)\n" : "");

// ── 1b. Slot `accepts` references resolve ───────────────────────────────────
// A typo'd rr-* entry in a slot's accepts would never match anything and
// check_assembly's rule 4 would silently wave violations through. Same
// principle as the token reference check (§3): dangling references fail here.

for (const { component, slot, entry } of unresolvedAccepts(metas)) {
  fail(
    `${component}: slot "${slot}" accepts "${entry}" — no such component exists`,
  );
}

// ── 2. Token lint on component sources ──────────────────────────────────────

console.log("Linting component sources for token violations...\n");

const lintGlobs = [
  "packages/components/src/**/*.{ts,js,css}",
  "src/components/**/*.{ts,js,css}",
];

let lintCount = 0;
for (const pattern of lintGlobs) {
  for await (const entry of glob(pattern, { cwd: ROOT })) {
    // .figma.ts files reference Figma node URLs; tests contain sample violations;
    // *.stories.* (incl. story-ui's generated ones) are gated by scripts/lint-stories.mjs.
    if (
      entry.endsWith(".figma.ts") ||
      entry.endsWith(".test.ts") ||
      entry.includes(".stories.")
    )
      continue;
    lintCount++;
    const rel = relative(ROOT, resolve(ROOT, entry));
    const content = readFileSync(resolve(ROOT, entry), "utf8");
    for (const v of lintLines(content)) {
      fail(`${rel}:${v.line}: ${v.match} — ${v.rule}`);
    }
  }
}
console.log(lintCount === 0 ? "  (no component source files found)\n" : "");

// ── 3. Token reference resolution ───────────────────────────────────────────
// Every {a.b.c} alias must point at a token that actually exists, including
// across brand override layers. A dangling reference = a rename that wasn't
// propagated; it fails the build here instead of silently shipping.

console.log("Resolving token references...\n");

// Token walking + layering lives in scripts/tokens.mjs (shared with the MCP
// server). Here we only assert existence: every {ref} must point at a real
// token, including across the brand override layers.
const { base, brands, baseRefs, brandRefs } = await loadTokens();

const basePaths = new Set(base.keys());
let refCount = baseRefs.length;
for (const { ref, from, file } of baseRefs) {
  if (!basePaths.has(ref))
    fail(`${file}: ${from} references {${ref}} which does not exist`);
}

// Each brand may reference base tokens plus whatever it defines itself.
for (const [name, nodes] of brands) {
  const brandPaths = new Set([...basePaths, ...nodes.keys()]);
  const refs = brandRefs.get(name);
  refCount += refs.length;
  for (const { ref, from, file } of refs) {
    if (!brandPaths.has(ref))
      fail(`${file}: ${from} references {${ref}} which does not exist`);
  }
}

console.log(exitCode === 0 ? `  ✓ all ${refCount} references resolve\n` : "");

// ── 4. Code Connect ↔ component parity ──────────────────────────────────────
// Every string a figma.enum() mapping can emit must appear in a literal union
// of the paired component source. Guards against the drift class found in the
// 2026-07-15 inspection: button.figma.ts emitted variant="ghost" while
// button.ts had no ghost variant — Code Connect generated code that didn't
// exist and nothing failed.

console.log("Checking Code Connect enum parity...\n");

// A figma.ts is checked against every component source in its directory, not
// just its namesake — tabs.figma.ts maps rr-tab + rr-tab-list, and
// radio.figma.ts emits the Orientation values declared in radio-group.ts.
let ccCount = 0;
for await (const entry of glob("packages/components/src/**/*.figma.ts", {
  cwd: ROOT,
})) {
  const figmaPath = resolve(ROOT, entry);
  const dir = dirname(figmaPath);
  let dirSources = "";
  for await (const sib of glob("*.ts", { cwd: dir })) {
    if (
      sib.endsWith(".figma.ts") ||
      sib.endsWith(".test.ts") ||
      sib.includes(".stories.")
    )
      continue;
    dirSources += readFileSync(resolve(dir, sib), "utf8") + "\n";
  }
  const rel = relative(ROOT, figmaPath);
  if (!dirSources) {
    fail(
      `${rel}: no component sources in ${relative(ROOT, dir)} to check enum parity against`,
    );
    continue;
  }
  ccCount++;
  for (const { prop, value } of findUnmappedEmissions(
    readFileSync(figmaPath, "utf8"),
    dirSources,
  )) {
    fail(
      `${rel}: figma.enum emits ${prop}="${value}" but '${value}' appears in no literal union in ${relative(ROOT, dir)}/`,
    );
  }
}
console.log(
  ccCount === 0
    ? "  (no *.figma.ts files found)\n"
    : exitCode === 0
      ? `  ✓ ${ccCount} Code Connect files in parity\n`
      : "",
);

// ── §5 Intended-pairing contrast (tokens/pairings.json, #87) ────────────────
// Every mapped pair (plus the convention-derived set) must hold its threshold
// — AA 4.5:1 for text, 3:1 for non-text — in the base theme and every brand.

console.log("Checking intended-pairing contrast (base + every brand)...\n");
{
  const pairingsPath = resolve(ROOT, "tokens/pairings.json");
  const pairingsSchema = JSON.parse(
    readFileSync(resolve(ROOT, "schemas/pairings.schema.json"), "utf8"),
  );
  const validatePairingsDoc = ajv.compile(pairingsSchema);
  const doc = JSON.parse(readFileSync(pairingsPath, "utf8"));
  if (!validatePairingsDoc(doc)) {
    fail("tokens/pairings.json: schema validation failed");
    for (const e of validatePairingsDoc.errors ?? [])
      console.error(`    ${e.instancePath || "/"} ${e.message}`);
  } else {
    const { loadTokens } = await import("./tokens.mjs");
    const { validateAllPairings } = await import("./contrast.mjs");
    const store = await loadTokens();
    const failures = validateAllPairings(store);
    for (const f of failures) {
      fail(
        f.ratio === null
          ? `pairings: ${f.brand}: ${f.fg} on ${f.bg} — ${f.reason}`
          : `pairings: ${f.brand}: ${f.fg} on ${f.bg} — ${f.ratio}:1 (needs ${f.threshold}:1, ${f.kind})`,
      );
    }
    if (failures.length === 0)
      console.log(
        `  ✓ ${doc.pairs.length} mapped pairs (+ convention set) hold AA/3:1 across base + all brands\n`,
      );
  }
}

// ── Result ──────────────────────────────────────────────────────────────────

if (exitCode === 0) console.log("All checks passed.");
else console.error("Validation failed — see errors above.");

process.exit(exitCode);
