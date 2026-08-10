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
 *      §1c applies the same rule to anatomy's per-part token bindings.
 *   4. Every string value a *.figma.ts Code Connect enum can emit exists
 *      in a literal union of the paired component source — so Code Connect
 *      can never emit a prop value the component doesn't implement.
 *      §4b holds prop bindings and *.figma.ts to each other; §4c holds a
 *      meta's enum valueMap to the component's own union (#191); §4d holds
 *      the whole contract to the styles the component ships (#187).
 *   5. Every intended fg/bg pairing keeps its contrast threshold.
 *
 * §4c and §4d are the two directions of one idea: nothing in the contract may
 * claim something the code does not do, and nothing the code does may go
 * unclaimed. Both are mechanical — they never infer what a component *meant*.
 *
 * Consumer-side enforcement lives in scripts/drift-lint.mjs (the CI Action).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, dirname, basename } from "node:path";
import { glob } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { lintLines, missingReduceGuard } from "./rules.mjs";
import { loadTokens, toCssVar } from "./tokens.mjs";
import {
  findUnmappedEmissions,
  findBindingMismatches,
  findValueMapMismatches,
} from "./code-connect.mjs";
import { unresolvedAccepts } from "./assembly.mjs";
import { loadRules, getRule } from "./reasoning.mjs";
import { findTokenDrift, localCustomProperties } from "./component-tokens.mjs";
import {
  unresolvedAnatomyTokens,
  unresolvedAnatomyStates,
} from "./anatomy.mjs";

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
// { dir, data, src } — §4b pairs metas with their *.figma.ts; §4c and §6 need
// the meta's own component source, not the directory's (a prop name would
// otherwise resolve against a sibling: tabs/ holds both tab.ts and tab-list.ts).
const metaEntries = [];
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
        metaEntries.push({
          dir: dirname(resolve(ROOT, entry)),
          data,
          src: resolve(ROOT, entry).replace(/\.meta\.json$/, ".ts"),
        });
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

// ── 1c. Anatomy state conditions resolve (#156) ─────────────────────────────
// A state overlay whose `when` names a prop the component doesn't declare
// would silently never fire. Same fencing as §1b — pseudo-classes (:hover) and
// internal state attributes (data-*) are out of scope, deliberately.

for (const { component, part, when, prop } of unresolvedAnatomyStates(metas)) {
  fail(
    `${component}: anatomy part "${part}" has state "${when}" — no prop named "${prop}"`,
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

// ── 2b. Infinite animations carry their own reduce guard (hard-10) ──────────
//
// The other half of hard-10, and the half the lint detector deliberately does
// not touch. Zeroing --motion-duration-* cannot reach an infinite animation —
// a 0s spinner stops rather than damps — so those durations are legitimately
// off-token and the rule requires the component to guard them itself.
//
// This is a gate rather than a lint rule because it is only sound where styles
// are self-contained: each rr-* component ships its own shadow-DOM styles, so
// the guard for its animation must live in its own source. That assumption
// does not hold in a consumer stylesheet, which is why drift-lint is not given
// this check.

console.log("Checking infinite animations for reduced-motion guards...\n");

let infiniteCount = 0;
for (const pattern of lintGlobs) {
  for await (const entry of glob(pattern, { cwd: ROOT })) {
    if (
      entry.endsWith(".figma.ts") ||
      entry.endsWith(".test.ts") ||
      entry.includes(".stories.")
    )
      continue;
    const content = readFileSync(resolve(ROOT, entry), "utf8");
    if (!/\binfinite\b/.test(content)) continue;
    infiniteCount++;
    if (missingReduceGuard(content)) {
      fail(
        `${relative(ROOT, resolve(ROOT, entry))}: infinite animation with no ` +
          `@media (prefers-reduced-motion: reduce) guard — the token override ` +
          `cannot reach it (hard-10)`,
      );
    }
  }
}
console.log(
  exitCode === 0
    ? `  ✓ ${infiniteCount} infinite animation(s) carry a reduce guard\n`
    : "",
);

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

// ── 3b. Anatomy token bindings resolve (#156) ───────────────────────────────
// The §3 rule applied to the other place tokens are named by string: every
// per-part binding must point at a token that exists. Opt-in — metas without
// an anatomy section contribute nothing here.

const anatomyMetas = metas.filter((m) => m.anatomy);
if (anatomyMetas.length) {
  console.log("Resolving anatomy token bindings...\n");
  let bindingFailures = 0;
  for (const { component, part, state, key, token } of unresolvedAnatomyTokens(
    anatomyMetas,
    { base },
  )) {
    bindingFailures++;
    fail(
      `${component}: anatomy part "${part}"${state ? ` state "${state}"` : ""} binds ${key} to ${token} — no such token`,
    );
  }
  if (bindingFailures === 0)
    console.log(
      `  ✓ ${anatomyMetas.length} component(s)' anatomy bindings all resolve\n`,
    );
}

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

// ── 4b. Prop bindings ↔ Code Connect consistency (#152) ─────────────────────
// A meta that declares prop `bindings` must agree with its *.figma.ts in both
// directions: every VARIANT binding matches a figma.enum (property + valueMap),
// and every figma.enum is covered by a binding. Opt-in per component — metas
// without bindings are exempt until their roll-out lands.

console.log("Checking prop bindings ↔ Code Connect consistency...\n");

let boundCount = 0;
for (const { dir, data } of metaEntries) {
  if (!(data.props ?? []).some((p) => p.bindings)) continue;
  boundCount++;
  let figmaSrc = "";
  for await (const f of glob("*.figma.ts", { cwd: dir })) {
    figmaSrc += readFileSync(resolve(dir, f), "utf8") + "\n";
  }
  for (const msg of findBindingMismatches(data, figmaSrc)) {
    fail(`${data.name}: ${msg}`);
  }
}
console.log(
  boundCount === 0
    ? "  (no metas declare prop bindings yet)\n"
    : exitCode === 0
      ? `  ✓ ${boundCount} component(s)' bindings agree with their Code Connect mapping\n`
      : "",
);

// ── 4c. Enum valueMap ↔ the component's own union (#191) ────────────────────
// §4 stops a *.figma.ts emitting a value the component doesn't implement. This
// closes the other half: a meta's valueMap is a third copy of the same option
// set (source union, meta `type`, valueMap) and nothing held it to the source.
// rr-button published `"type": "string"` for variant and size while button.ts
// declared four- and three-member unions — a stable component whose contract
// accepted any string at all. Boolean derivations are exempt.

console.log("Checking enum valueMaps against component unions...\n");

let enumCount = 0;
for (const { data, src } of metaEntries) {
  if (!(data.props ?? []).some((p) => p.bindings?.figma?.valueMap)) continue;
  if (!existsSync(src)) {
    fail(
      `${data.name}: declares enum bindings but ${relative(ROOT, src)} does not exist`,
    );
    continue;
  }
  enumCount++;
  for (const msg of findValueMapMismatches(data, readFileSync(src, "utf8"))) {
    fail(`${data.name}: ${msg}`);
  }
}
console.log(
  enumCount === 0
    ? "  (no metas declare enum valueMaps yet)\n"
    : exitCode === 0
      ? `  ✓ ${enumCount} component(s)' valueMaps match their declared unions\n`
      : "",
);

// ── 4d. Contract ↔ the styles the component ships (#187) ────────────────────
// anatomy is transcribed from real styles by hand and tokensUsed was checked
// against nothing — its only reader was the doc generator. Both could rot the
// moment a `static styles` block changed, while per-part contrast and
// check_contrast kept trusting them. Applies to every meta, not just the bound
// ones: tokensUsed is required by the schema, so there is nothing to opt into.

console.log("Checking component contracts against their styles...\n");

const knownTokens = new Set([...base.keys()].map(toCssVar));
let driftCount = 0;
for (const { dir, data, src } of metaEntries) {
  if (!existsSync(src)) {
    fail(`${data.name}: no component source at ${relative(ROOT, src)}`);
    continue;
  }
  // Local custom properties are collected per directory, not per file — rr-table
  // declares the padding knobs rr-table-cell consumes.
  const dirSources = [];
  for await (const sib of glob("*.ts", { cwd: dir })) {
    if (
      sib.endsWith(".figma.ts") ||
      sib.endsWith(".test.ts") ||
      sib.includes(".stories.")
    )
      continue;
    dirSources.push(readFileSync(resolve(dir, sib), "utf8"));
  }
  const { unknown, behind, ahead } = findTokenDrift(
    data,
    readFileSync(src, "utf8"),
    { known: knownTokens, localDefs: localCustomProperties(dirSources) },
  );
  driftCount++;
  for (const t of unknown) {
    fail(
      `${data.name}: styles reference ${t} — no such token, and nothing in ${relative(ROOT, dir)}/ declares it`,
    );
  }
  for (const t of behind) {
    fail(
      `${data.name}: styles use ${t} but the contract never declares it — add it to tokensUsed or an anatomy binding`,
    );
  }
  for (const t of ahead) {
    fail(
      `${data.name}: contract declares ${t} but the styles never reference it — the contract is stale`,
    );
  }
}
console.log(
  exitCode === 0
    ? `  ✓ ${driftCount} component contract(s) match their styles\n`
    : "",
);

// ── 4e. Rule references resolve (#189) ─────────────────────────────────────
// A meta's `rules` are ids into ai/rules.md, not prose. Before that they were
// copied sentences: three metas restated "never use hex" in three different
// wordings across 27 files, and nothing held any of them to the source. Same
// dangling-reference fencing as §1b (slot accepts) and §3b (anatomy tokens) —
// an id that does not resolve fails the build rather than shipping a reference
// to a rule that no longer exists.

console.log("Resolving rule references...\n");

const allRules = loadRules();
let ruleRefs = 0;
for (const { data } of metaEntries) {
  for (const id of data.rules ?? []) {
    ruleRefs++;
    if (!getRule(allRules, id)) {
      fail(
        `${data.name}: rules references "${id}" — no such rule in ai/rules.md`,
      );
    }
  }
}
console.log(
  exitCode === 0
    ? `  ✓ all ${ruleRefs} rule references resolve (${allRules.length} rules defined)\n`
    : "",
);

// ── §5 Intended-pairing contrast (tokens/pairings.json, #87) ────────────────
// Every mapped pair — plus the convention-derived set, plus the pairs the
// components declare in their anatomy (#156) — must hold its threshold, AA
// 4.5:1 for text and 3:1 for non-text, in the base theme and every brand.

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
    const failures = validateAllPairings(store, anatomyMetas);
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
