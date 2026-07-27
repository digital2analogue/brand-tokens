/**
 * governance-eval.mjs — mechanical scorer for the #153 governance eval.
 *
 * Scores saved agent outputs (evals/governance/out/<arm>/<id>.html) on three
 * classes, all machine-checkable — no human grading:
 *
 *   1. rule violations   — the shared RULES detectors (lintSnippet), the same
 *                          set that gates validate / check_usage / drift-lint
 *   2. fabricated tokens — var(--…) refs that exist in no token layer
 *                          (--primitive-* excluded: already a rule violation)
 *   3. fabricated props  — attributes on rr-* tags that aren't declared props
 *                          (globals, aria-*, data-* allowed); unknown rr-*
 *                          tags are findings too
 *
 * A run is clean iff all three are empty. See evals/governance/README.md for
 * the full protocol. Pure scoring — this script never calls a model.
 *
 * Usage: node scripts/governance-eval.mjs [outDir] [--json]
 *        npm run eval:governance
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { lintSnippet } from "./rules.mjs";
import { loadTokens, toCssVar } from "./tokens.mjs";

const ROOT = resolve(import.meta.dirname, "..");

const GLOBAL_ATTRS = new Set([
  "class",
  "id",
  "slot",
  "style",
  "part",
  "title",
  "role",
  "tabindex",
  "hidden",
]);

/**
 * Score one output snippet against the known-token set and component index.
 * Pure function — synthetic-fixture testable (#151 discipline).
 *
 * @param {string} snippet
 * @param {Set<string>} knownVars     every real token as a CSS var name
 * @param {Map<string, object>} componentIndex  rr-* tag → meta
 */
export function scoreSnippet(snippet, knownVars, componentIndex) {
  const ruleViolations = lintSnippet(snippet);

  const fabricatedTokens = [
    ...new Set(
      [...snippet.matchAll(/var\(\s*(--[\w-]+)/g)]
        .map((m) => m[1])
        .filter((v) => !v.startsWith("--primitive-") && !knownVars.has(v)),
    ),
  ];

  const fabricatedProps = [];
  for (const tag of snippet.matchAll(
    /<(rr-[a-z][a-z-]*)((?:\s+[^<>]*?)?)\/?>/g,
  )) {
    const [, name, attrText] = tag;
    const meta = componentIndex.get(name);
    if (!meta) {
      fabricatedProps.push({
        tag: name,
        attr: null,
        reason: "unknown component",
      });
      continue;
    }
    const declared = new Set((meta.props ?? []).map((p) => p.name));
    for (const a of attrText.matchAll(
      /([a-zA-Z][\w-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?/g,
    )) {
      const attr = a[1].toLowerCase();
      if (
        declared.has(attr) ||
        GLOBAL_ATTRS.has(attr) ||
        attr.startsWith("aria-") ||
        attr.startsWith("data-")
      )
        continue;
      fabricatedProps.push({ tag: name, attr, reason: "not a declared prop" });
    }
  }

  const clean =
    ruleViolations.length === 0 &&
    fabricatedTokens.length === 0 &&
    fabricatedProps.length === 0;
  return { clean, ruleViolations, fabricatedTokens, fabricatedProps };
}

/** Aggregate per-run scores into arm-level stats. */
export function aggregate(runs) {
  const total = (r) =>
    r.ruleViolations.length +
    r.fabricatedTokens.length +
    r.fabricatedProps.length;
  const cleanRuns = runs.filter((r) => r.clean).length;
  const byClass = { rule: 0, fabricatedToken: 0, fabricatedProp: 0 };
  for (const r of runs) {
    byClass.rule += r.ruleViolations.length;
    byClass.fabricatedToken += r.fabricatedTokens.length;
    byClass.fabricatedProp += r.fabricatedProps.length;
  }
  return {
    runs: runs.length,
    cleanRuns,
    cleanRate: runs.length ? Math.round((100 * cleanRuns) / runs.length) : null,
    meanViolations: runs.length
      ? Math.round(
          (runs.reduce((s, r) => s + total(r), 0) / runs.length) * 100,
        ) / 100
      : null,
    byClass,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const isMain = process.argv[1] === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const outDir = resolve(
    ROOT,
    args.find((a) => !a.startsWith("--")) ?? "evals/governance/out",
  );

  if (!existsSync(outDir)) {
    console.error(
      `✗ ${outDir} does not exist — run the generation protocol first (evals/governance/README.md).`,
    );
    process.exit(1);
  }

  const store = await loadTokens();
  const knownVars = new Set();
  for (const path of store.base.keys()) knownVars.add(toCssVar(path));
  for (const nodes of store.brands.values())
    for (const path of nodes.keys()) knownVars.add(toCssVar(path));

  const { components } = JSON.parse(
    readFileSync(resolve(ROOT, "design-system.json"), "utf8"),
  );
  const componentIndex = new Map(components.map((c) => [c.name, c]));

  const report = {};
  for (const arm of readdirSync(outDir).sort()) {
    const armDir = join(outDir, arm);
    const files = readdirSync(armDir)
      .filter((f) => f.endsWith(".html"))
      .sort();
    const runs = files.map((f) => ({
      id: f.replace(/\.html$/, ""),
      ...scoreSnippet(
        readFileSync(join(armDir, f), "utf8"),
        knownVars,
        componentIndex,
      ),
    }));
    report[arm] = { ...aggregate(runs), detail: runs };
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const [arm, r] of Object.entries(report)) {
      console.log(
        `\n${arm}: ${r.cleanRuns}/${r.runs} clean (${r.cleanRate}%), ` +
          `${r.meanViolations} violations/run ` +
          `(rules ${r.byClass.rule}, fabricated tokens ${r.byClass.fabricatedToken}, fabricated props ${r.byClass.fabricatedProp})`,
      );
      for (const run of r.detail.filter((d) => !d.clean)) {
        console.log(`  ✗ ${run.id}:`);
        for (const v of run.ruleViolations)
          console.log(`      [rule] ${v.id}: ${v.matches.join(", ")}`);
        for (const t of run.fabricatedTokens)
          console.log(`      [fabricated token] ${t}`);
        for (const p of run.fabricatedProps)
          console.log(
            `      [fabricated prop] <${p.tag}> ${p.attr ?? ""} — ${p.reason}`,
          );
      }
    }
    console.log("");
  }
}
