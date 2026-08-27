/**
 * adoption-scan.mjs — what a consumer actually USES (#106).
 *
 * Usage: node scripts/adoption-scan.mjs <consumer-dir>   (npm run adoption -- <dir>)
 *
 * The fifth-pass inspection scored Station 8 (Feedback & adoption) at 5/10 —
 * the weakest leg, and the only station with no mechanism at all. `drift-lint`
 * already answers "is the consumer BREAKING the rules". Nothing answered "is
 * the consumer USING the system", so coverage and adoption were
 * indistinguishable: a consumer that installs the package and references three
 * tokens scored the same as one that leans on the whole thing.
 *
 * Deliberately small, per Station 8's own advice — "a dependency-version scan
 * across consumer repos this week beats an analytics platform next year".
 * It reports three numbers and no opinions:
 *
 *   1. components — which rr-* elements appear in the consumer's source
 *   2. tokens     — which SEMANTIC tokens are referenced (primitives excluded;
 *                   referencing one is a rule violation, which is drift-lint's job)
 *   3. version    — what is installed vs what the source builds
 *
 * Shares drift-scan's walker and file filters rather than re-implementing them,
 * so "which files count" can never drift between the two scans. That matters:
 * the exclusions are load-bearing (built token CSS legitimately contains every
 * token; counting it would report 100% adoption for every consumer forever).
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, relative, basename, sep } from "node:path";
import { walk, isScannable } from "./drift-scan.mjs";
import { loadTokens, toCssVar } from "./tokens.mjs";

/** A `--custom-property` reference anywhere in the file. */
const TOKEN_REF = /--[a-z][a-z0-9-]*/g;

/**
 * The full set of semantic token CSS variables the system publishes.
 * Primitives are excluded on purpose — a consumer referencing one is drift,
 * not adoption, and counting it here would reward a rule violation.
 */
export function semanticTokenSet(store) {
  return new Set(
    [...store.base.keys()]
      .filter((p) => !p.startsWith("primitive"))
      .map(toCssVar),
  );
}

/**
 * Scan a consumer directory.
 *
 * @param {string} target       consumer repo root
 * @param {object} opts
 * @param {string[]} opts.components  known component names (e.g. "rr-badge")
 * @param {Set<string>} opts.tokens   known semantic token CSS vars
 * @returns {{ scanned, components: {used, unused}, tokens: {used, unused} }}
 */
export function scanAdoption(target, { components = [], tokens = new Set() }) {
  const root = statSync(target);
  const files = root.isFile()
    ? isScannable(basename(target))
      ? [target]
      : []
    : [...walk(target)];

  const usedComponents = new Map(); // name -> [file:line]
  const usedTokens = new Map(); // cssVar -> count
  let scanned = 0;

  // A component counts as USED only when it appears as markup — `<rr-badge`.
  // A bare name match reports prose as adoption: portfolio-vercel's case study
  // contains the string "rr-badge" inside an image alt-text describing an agent
  // session, and the first version of this scan reported that as 1-of-27
  // component adoption. Same class of false positive as #174 (issue refs read
  // as hex) and #202 (guarded durations read as violations), caught the same
  // way — by running it against a real consumer before shipping it.
  //
  // Two known limits, both stated rather than papered over:
  //   1. A component constructed imperatively
  //      (document.createElement('rr-badge')) is not counted.
  //   2. Markup inside a STRING still counts. portfolio-vercel's case study has
  //      `<rr-badge variant="success">Active</rr-badge>` inside an image
  //      alt-text describing an agent session — real markup, not real usage.
  //      No lexical rule separates those, so the CLI prints the file for every
  //      component it counts and the number stays auditable. This is a
  //      measurement, not a gate; it never fails a build, so an ambiguous hit
  //      costs a glance rather than a red pipeline.
  const compRes = components.map((name) => ({
    name,
    re: new RegExp(`<${name}(?![a-z0-9-])`, "g"),
  }));

  for (const file of files) {
    scanned++;
    const content = readFileSync(file, "utf8");
    const rel = root.isFile() ? basename(file) : relative(target, file);

    for (const { name, re } of compRes) {
      re.lastIndex = 0;
      if (re.test(content)) {
        if (!usedComponents.has(name)) usedComponents.set(name, []);
        usedComponents.get(name).push(rel.split(sep).join("/"));
      }
    }

    for (const m of content.match(TOKEN_REF) ?? []) {
      if (tokens.has(m)) usedTokens.set(m, (usedTokens.get(m) ?? 0) + 1);
    }
  }

  return {
    scanned,
    components: {
      used: [...usedComponents.keys()].sort(),
      unused: components.filter((c) => !usedComponents.has(c)).sort(),
      where: Object.fromEntries(usedComponents),
    },
    tokens: {
      used: [...usedTokens.keys()].sort(),
      unused: [...tokens].filter((t) => !usedTokens.has(t)).sort(),
      counts: Object.fromEntries(usedTokens),
    },
  };
}

/** Installed vs source-built package version, for the version half of #106. */
export function versionReport(target, pkgName, sourceVersion) {
  const installed = resolve(target, "node_modules", pkgName, "package.json");
  const declaredPath = resolve(target, "package.json");
  const declared = existsSync(declaredPath)
    ? (JSON.parse(readFileSync(declaredPath, "utf8")).dependencies ?? {})[
        pkgName
      ]
    : null;
  return {
    declared: declared ?? null,
    installed: existsSync(installed)
      ? JSON.parse(readFileSync(installed, "utf8")).version
      : null,
    source: sourceVersion,
  };
}

const pct = (n, d) => (d === 0 ? "—" : `${Math.round((n / d) * 100)}%`);

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: npm run adoption -- <consumer-dir>");
    process.exit(2);
  }
  const abs = resolve(target);
  const ROOT = resolve(import.meta.dirname, "..");

  const ds = JSON.parse(
    readFileSync(resolve(ROOT, "design-system.json"), "utf8"),
  );
  const componentNames = ds.components.map((c) => c.name).sort();
  const store = await loadTokens();
  const tokens = semanticTokenSet(store);
  const sourceVersion = JSON.parse(
    readFileSync(resolve(ROOT, "packages/tokens/package.json"), "utf8"),
  ).version;

  const r = scanAdoption(abs, { components: componentNames, tokens });
  const v = versionReport(abs, "@digital2analogue2/parsimony", sourceVersion);

  const cTotal = componentNames.length;
  const tTotal = tokens.size;
  const cUsed = r.components.used.length;
  const tUsed = r.tokens.used.length;

  console.log(`\nAdoption — ${basename(abs)}  (${r.scanned} files scanned)\n`);
  console.log(
    `  package     declared ${v.declared ?? "—"} · installed ${v.installed ?? "—"} · source builds ${v.source}`,
  );
  console.log(
    `  components  ${cUsed} of ${cTotal} used  (${pct(cUsed, cTotal)})`,
  );
  console.log(
    `  tokens      ${tUsed} of ${tTotal} used  (${pct(tUsed, tTotal)})\n`,
  );

  if (cUsed) {
    console.log(
      "  components in use — verify each, markup inside a string counts:",
    );
    for (const name of r.components.used) {
      console.log(
        `    ${name}  ←  ${[...new Set(r.components.where[name])].join(", ")}`,
      );
    }
    console.log();
  }

  const top = [...Object.entries(r.tokens.counts)]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (top.length) {
    console.log("  most-referenced tokens:");
    for (const [t, n] of top) console.log(`    ${String(n).padStart(4)}  ${t}`);
    console.log();
  }

  // Coverage vs adoption is the point of the whole exercise — say it plainly.
  if (cUsed === 0 && tUsed > 0) {
    console.log(
      "  NOTE: this consumer adopts the TOKENS but none of the components.\n" +
        "  High coverage with zero component adoption is a different problem than\n" +
        "  low coverage — it usually means fit or awareness, not distribution.\n",
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
