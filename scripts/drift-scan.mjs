/**
 * drift-scan.mjs — the reusable consumer-repo scan.
 *
 * Walks a directory (or a single file), runs the shared lint rules
 * (scripts/rules.mjs) over every scannable source file, and returns a structured
 * result. Pure: no argv, no console, no process.exit — so it can be called from
 *   - scripts/drift-lint.mjs        (the CLI + the weekly GitHub Action)
 *   - packages/mcp/src/server.mjs   (the agent-facing lint_consumer tool)
 *
 * Both used to need this walk; the CLI had it inline. Extracting it here keeps
 * the consumer scan single-sourced the same way rules.mjs single-sources the
 * rules themselves.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative, sep, basename } from "node:path";
import { lintLines, RULES } from "./rules.mjs";

const SCAN_EXT = new Set([".css", ".ts", ".tsx", ".jsx", ".html"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".claude",
  "build",
  "dist",
  ".next",
  "out",
]);
// Built token output legitimately contains hex + primitives — never flag it.
const SKIP_FILES = new Set([
  "variables.css",
  "decision-engine.css",
  "dot-art.css",
  "dot-blog.css",
]);
const isTokenSource = (name) => name.endsWith(".tokens.json");
// Test files carry deliberately-bad snippets as fixtures — that is what a
// detector's tests ARE. validate.mjs §2 has skipped them in this repo since it
// was written ("tests contain sample violations"); the consumer scan did not,
// so a consumer's own rule tests were reported as drift every week
// (portfolio-vercel's checkUsageRules.spec.ts, parsimony#174). Same rule, same
// exclusion, both sides.
const isTest = (name) => /\.(test|spec)\.[a-z]+$/.test(name);
export const isScannable = (name) =>
  SCAN_EXT.has(extname(name)) &&
  !SKIP_FILES.has(name) &&
  !isTokenSource(name) &&
  !isTest(name);

// Minimal glob → RegExp: `**` spans directories, `*` stays within a segment.
export function globToRegExp(glob) {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex specials (not * or /)
    .replace(/\*\*/g, " ") // placeholder for **
    .replace(/\*/g, "[^/]*")
    .replace(/ /g, ".*");
  return new RegExp(`^${re}$`);
}

/** Ignore globs: the passed-in list + an optional `.driftignore` at the target root. */
function resolveIgnores(target, ignore) {
  const patterns = [...ignore];
  const file = join(target, ".driftignore");
  if (existsSync(file)) {
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (line && !line.startsWith("#")) patterns.push(line);
    }
  }
  return patterns.map(globToRegExp);
}

export function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(full);
    } else if (isScannable(name)) {
      yield full;
    }
  }
}

/**
 * Scan a consumer repo (or a single file) for design-system rule violations.
 *
 * @param {string} target  absolute or cwd-relative path to a directory or file
 * @param {object} [opts]   { ignore?: string[] } — extra ignore globs, merged
 *                          with any `.driftignore` at the target root (dir only)
 * @returns {{ target, scanned, clean, violations, groups }}
 *   - violations : [{ file, line, id, rule, match }]  (file = path relative to target)
 *   - groups     : [{ id, hardRule, message, hits: ["file:line: match"] }]  (non-empty rules only)
 * @throws if `target` does not exist
 */
export function scanConsumer(target, { ignore = [] } = {}) {
  const root = statSync(target); // throws ENOENT if missing — caller handles
  const isFile = root.isFile();

  // For a single file, ignores/.driftignore don't apply; for a dir they do.
  const ignoreRes = isFile ? [] : resolveIgnores(target, ignore);
  const isIgnored = (rel) => {
    const posix = rel.split(sep).join("/");
    return ignoreRes.some((re) => re.test(posix));
  };

  const byRule = new Map(RULES.map((r) => [r.id, { rule: r, hits: [] }]));
  const violations = [];
  let scanned = 0;

  const files = isFile
    ? isScannable(basename(target))
      ? [target]
      : []
    : [...walk(target)];
  for (const file of files) {
    const rel = isFile ? basename(file) : relative(target, file);
    if (!isFile && isIgnored(rel)) continue;
    scanned++;
    const content = readFileSync(file, "utf8");
    for (const v of lintLines(content)) {
      byRule.get(v.id).hits.push(`${rel}:${v.line}: ${v.match}`);
      violations.push({
        file: rel,
        line: v.line,
        id: v.id,
        rule: v.rule,
        match: v.match,
      });
    }
  }

  const groups = [...byRule.values()]
    .filter((g) => g.hits.length > 0)
    .map(({ rule, hits }) => ({
      id: rule.id,
      hardRule: rule.hardRule,
      message: rule.message,
      hits,
    }));

  return {
    target,
    scanned,
    clean: violations.length === 0,
    violations,
    groups,
  };
}
