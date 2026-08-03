/**
 * scripts/generate-design-md.mjs — regenerates the token tables in ai/DESIGN.md
 * from tokens/**\/*.tokens.json (#186).
 *
 * Usage:
 *   node scripts/generate-design-md.mjs            (npm run docs:design)
 *   node scripts/generate-design-md.mjs --check    exit 1 if the file is stale
 *
 * WHY THIS EXISTS
 * ---------------
 * ai/DESIGN.md used to hand-transcribe every hex, resolved value and contrast
 * ratio that already lives in the token JSON. That is a second copy of a
 * decision the tokens already make — it drifts, and it had drifted (#30 tracked
 * 15 tokens the file never documented; the shadow and easing rows disagreed with
 * the built CSS on spread and spacing). scripts/tokens.mjs has flagged the risk
 * in a comment since it was written.
 *
 * The file matters more than an ordinary doc: CLAUDE.md @-imports it into every
 * agent session, so it is the foundational context agents reason from. A wrong
 * value here propagates into generated code before any gate sees it.
 *
 * REGIONS
 * -------
 * Same technique as generate-component-docs.mjs and generate-docs.mjs: only the
 * marked regions regenerate. Everything else — Visual Identity, Responsive
 * Scaling, Hard Guardrails, Interaction Patterns, every heading and intro
 * paragraph — is authored prose and is preserved verbatim.
 *
 *   <!-- GEN:<id>:start — ... -->
 *   ...generated table...
 *   <!-- GEN:<id>:end -->
 *
 * A region holds the *table only*. Headings stay authored so the document's
 * shape remains a human decision.
 *
 * DESCRIPTION CLAMPING
 * --------------------
 * Token $description fields are long-form guidance for agents (27KB across the
 * semantic layer). Emitting them whole would more than double a file loaded into
 * every session, so the Usage column takes leading *whole sentences* up to
 * DESC_BUDGET characters. That is a deterministic transform, not a summary — and
 * the full text stays authoritative and reachable through the MCP's get_token.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadTokens, resolveToken, toCssVar } from "./tokens.mjs";
import { contrastRatio } from "./assembly.mjs";
import { allIntendedPairings } from "./contrast.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const TARGET = resolve(ROOT, "ai/DESIGN.md");

/** Character budget for the Usage column. Whole sentences only — see header. */
export const DESC_BUDGET = 160;

/**
 * Sentences always kept, budget or not. Descriptions in this system open with a
 * short role label ("Tight spacing.", "Base canvas #0A0D0A.") and put the actual
 * guidance in the sentence after it, so a one-sentence cell says nothing useful.
 */
export const MIN_SENTENCES = 2;

// ── Formatting ──────────────────────────────────────────────────────────────

/** Escape a value for a markdown table cell. */
export function cell(s) {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\s*\n+\s*/g, " ")
    .trim();
}

/**
 * Leading whole sentences of a description, up to `budget` characters, never
 * fewer than `min`. Sentences are never cut mid-way — a truncated sentence
 * would make the cell say something the token does not.
 */
export function clampDescription(
  desc,
  budget = DESC_BUDGET,
  min = MIN_SENTENCES,
) {
  const text = String(desc ?? "").trim();
  if (!text) return "";
  const sentences = text.split(/(?<=\.)\s+/);
  let out = sentences[0];
  for (let i = 1; i < sentences.length; i++) {
    const next = `${out} ${sentences[i]}`;
    if (i >= min && next.length > budget) break;
    out = next;
  }
  return out;
}

/**
 * Format a resolved token value the way Style Dictionary emits it into
 * build/css, so this file and the built CSS agree literally rather than
 * approximately. Composite types are the ones that matter:
 *   typography → `300 2.5rem/1.1 Space Grotesk`   (CSS font shorthand order)
 *   transition → `120ms cubic-bezier(...) 0ms`
 *   shadow     → `0 1px 3px 0 rgba(0,0,0,0.08)`   (spread included)
 *   easing     → `cubic-bezier(0, 0, 0.58, 1)`    (comma-space, as CSS)
 */
export function fmtValue(v) {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 4 && v.every((n) => typeof n === "number")) {
      return `cubic-bezier(${v.join(", ")})`;
    }
    return v.map(fmtValue).join(" ");
  }
  if (typeof v === "object") {
    if ("fontFamily" in v) {
      return `${fmtValue(v.fontWeight)} ${fmtValue(v.fontSize)}/${fmtValue(v.lineHeight)} ${fmtValue(v.fontFamily)}`;
    }
    if ("timingFunction" in v) {
      return `${fmtValue(v.duration)} ${fmtValue(v.timingFunction)} ${fmtValue(v.delay)}`;
    }
    if ("offsetX" in v) {
      return `${fmtValue(v.offsetX)} ${fmtValue(v.offsetY)} ${fmtValue(v.blur)} ${fmtValue(v.spread)} ${fmtValue(v.color)}`;
    }
    return Object.values(v).map(fmtValue).join(" ");
  }
  return String(v);
}

/** rem → the px it renders at, for the primitive font-size table. */
export function withPx(value) {
  const m = /^([\d.]+)rem$/.exec(String(value).trim());
  return m
    ? `${value} (${Math.round(parseFloat(m[1]) * 16)}px)`
    : String(value);
}

/** Uppercase hex, so the table reads consistently whatever the source casing. */
export function fmtHex(value) {
  const s = fmtValue(value);
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s.toUpperCase() : s;
}

// ── Region markers ──────────────────────────────────────────────────────────

const GEN_NOTE =
  "regenerated by scripts/generate-design-md.mjs from tokens/ — do not hand-edit";

export function genRegion(id, body) {
  return `<!-- GEN:${id}:start — ${GEN_NOTE} -->\n${body}\n<!-- GEN:${id}:end -->`;
}

/**
 * Replace the body of an existing GEN region, preserving everything else.
 * A region the document does not declare is an error, not an append: the
 * document's shape is authored, and silently bolting a table onto the end
 * would hide a rename instead of reporting it.
 */
export function patchGenRegion(text, id, rendered) {
  const re = new RegExp(`<!-- GEN:${id}:start[\\s\\S]*?GEN:${id}:end -->`);
  if (!re.test(text)) {
    throw new Error(
      `ai/DESIGN.md has no GEN:${id} region — add the marker pair, or remove the section from generate-design-md.mjs`,
    );
  }
  return text.replace(re, rendered);
}

// ── Table rendering ─────────────────────────────────────────────────────────

/** A markdown table. `columns` are headers; `rows` are arrays of raw cells. */
export function renderTable(columns, rows) {
  const head = `| ${columns.join(" | ")} |`;
  const rule = `|${columns.map(() => "---").join("|")}|`;
  const body = rows.map((r) => `| ${r.map(cell).join(" | ")} |`);
  return [head, rule, ...body].join("\n");
}

// ── Token selection ─────────────────────────────────────────────────────────

/**
 * Tokens directly under a dotted prefix, in authored order (the Map preserves
 * each file's key order, which is the deliberate reading order — background
 * default before alt before action, not alphabetical).
 *
 * The trailing dot in the prefix match is load-bearing: "font.label" must not
 * swallow font.label-strong.*, which is its own section.
 * `exact: true` selects a single token instead (font.code, font.display).
 */
export function tokensUnder(store, prefix, { exact = false } = {}) {
  const out = [];
  for (const path of store.base.keys()) {
    if (exact ? path === prefix : path.startsWith(`${prefix}.`)) out.push(path);
  }
  return out;
}

/** Reverse index: token path → the paths whose raw value references it. */
export function referencedBy(store) {
  const map = new Map();
  for (const { ref, from } of store.baseRefs) {
    if (!map.has(ref)) map.set(ref, []);
    map.get(ref).push(from);
  }
  return map;
}

// ── Contrast ────────────────────────────────────────────────────────────────

/**
 * The contrast figure for one foreground token: the *lowest* ratio across every
 * text pairing the system intends it for, since that is the one that has to
 * hold. Pairs come from the same merged source contrast.mjs uses for the build
 * gate (convention + anatomy + tokens/pairings.json), so this column and
 * `npm run validate` §5 can never disagree about what is paired with what.
 *
 * The background is named in the cell. Without it the number is ambiguous —
 * foreground.default pairs with both surfaces and scores 12.26:1 on the canvas
 * but 9.94:1 on background.alt, and a bare "9.94:1" next to a description
 * quoting the other figure reads as a contradiction rather than two different
 * measurements.
 *
 * foreground.disabled is exempt — WCAG exempts disabled controls.
 * A token with no intended text pairing gets "—", not a number: contrast
 * against a surface nothing renders it on would be a fabricated fact.
 */
export function contrastLabel(store, fgPath, pairs) {
  if (fgPath === "color.foreground.disabled") return "exempt";
  const fgValue = resolveToken(store, fgPath)?.value;
  if (!fgValue) return "—";

  let worst = null;
  let against = null;
  for (const p of pairs) {
    if (p.fg !== fgPath || p.kind === "non-text") continue;
    const bgValue = resolveToken(store, p.bg)?.value;
    const ratio = bgValue ? contrastRatio(fgValue, bgValue) : null;
    if (ratio != null && (worst === null || ratio < worst)) {
      worst = ratio;
      against = p.bg;
    }
  }
  if (worst === null) return "—";
  const level = worst >= 7 ? "AAA" : worst >= 4.5 ? "AA" : "FAIL";
  return `${worst.toFixed(2)}:1 ${level} on \`${toCssVar(against)}\``;
}

// ── Section builders ────────────────────────────────────────────────────────

const usage = (store, path) =>
  clampDescription(store.base.get(path)?.description);

/** Colour tables: background and border carry no contrast column. */
export function renderColorTable(store, prefix) {
  const rows = tokensUnder(store, prefix).map((path) => [
    toCssVar(path),
    fmtHex(resolveToken(store, path).value),
    usage(store, path),
  ]);
  return renderTable(["CSS Property", "Hex", "Usage"], rows);
}

export function renderForegroundTable(store, pairs) {
  const rows = tokensUnder(store, "color.foreground").map((path) => [
    toCssVar(path),
    fmtHex(resolveToken(store, path).value),
    contrastLabel(store, path, pairs),
    usage(store, path),
  ]);
  return renderTable(["CSS Property", "Hex", "Contrast", "Usage"], rows);
}

/** Resolved-value tables — typography, motion, radius, shadow, icon, spacing. */
export function renderValueTable(store, paths, valueHeader = "Resolved Value") {
  const rows = paths.map((path) => [
    toCssVar(path),
    fmtValue(resolveToken(store, path).value),
    usage(store, path),
  ]);
  return renderTable(["CSS Property", valueHeader, "Usage"], rows);
}

/**
 * A primitive scale, with the semantic tokens that consume each step derived
 * from the reference graph rather than described in prose. Prose goes stale
 * silently — `primitive.font.weight.medium`'s $description claimed it was
 * "not currently mapped to any semantic token" while all four label-strong
 * tokens referenced it. A derived column cannot make that mistake.
 */
export function renderReferencedByTable(store, prefix, refs, fmt = fmtValue) {
  const rows = tokensUnder(store, prefix).map((path) => [
    toCssVar(path),
    fmt(resolveToken(store, path).value),
    (refs.get(path) ?? []).join(", ") || "—",
  ]);
  return renderTable(["CSS Property", "Value", "Referenced by"], rows);
}

/** Primitive tables that carry a bare value and no usage prose. */
export function renderPrimitiveTable(store, prefix) {
  const rows = tokensUnder(store, prefix).map((path) => [
    toCssVar(path),
    fmtValue(resolveToken(store, path).value),
  ]);
  return renderTable(["CSS Property", "Value"], rows);
}

/**
 * Every generated region, in document order. The ids are the contract between
 * this script and the markers in ai/DESIGN.md — renaming one here without
 * renaming the marker fails loudly (see patchGenRegion).
 */
export function buildRegions(store) {
  const pairs = allIntendedPairings(store);
  const refs = referencedBy(store);
  const v = (paths, header) => renderValueTable(store, paths, header);
  const under = (p) => tokensUnder(store, p);

  return [
    ["color-background", renderColorTable(store, "color.background")],
    ["color-foreground", renderForegroundTable(store, pairs)],
    ["color-border", renderColorTable(store, "color.border")],

    ["font-family", v(under("font.family"))],
    ["font-display", v(tokensUnder(store, "font.display", { exact: true }))],
    ["font-title", v(under("font.title"))],
    ["font-body", v(under("font.body"))],
    ["font-label", v(under("font.label"))],
    ["font-label-strong", v(under("font.label-strong"))],
    [
      "font-mono-label",
      v([...store.base.keys()].filter((p) => p.startsWith("font.mono-label"))),
    ],
    ["font-code", v(tokensUnder(store, "font.code", { exact: true }))],

    [
      "font-size-scale",
      renderReferencedByTable(store, "primitive.font.size", refs, withPx),
    ],
    [
      "font-weight-scale",
      renderReferencedByTable(store, "primitive.font.weight", refs),
    ],
    ["letter-spacing", v(under("letterSpacing"), "Value")],

    ["spacing-semantic", v(under("spacing"), "Resolves to")],
    ["spacing-primitives", renderPrimitiveTable(store, "primitive.space")],

    ["motion-duration", v(under("motion.duration"), "Value")],
    ["motion-easing", v(under("motion.easing"), "Value")],
    ["motion-transition", v(under("motion.transition"), "Resolves to")],

    ["radius", v(under("radius"), "Value")],
    ["shadow", v(under("shadow"), "Value")],
    ["icon", v(under("icon.size"), "Value")],
  ];
}

/**
 * Semantic tokens that no region emits. The region list is hand-maintained, so
 * a token added under a *covered* prefix appears automatically but a whole new
 * category (say an `elevation.*` scale) would silently go undocumented — the
 * same drift this generator exists to end, one level up. Rather than trust the
 * list, check it: every non-primitive token must appear in some region.
 *
 * Primitives are deliberately out of scope. DESIGN.md documents the handful
 * consumers legitimately need to reason about (font size, font weight, spacing)
 * and omits the rest, because UI code may never reference a primitive at all.
 */
export function uncoveredTokens(store, regions) {
  const emitted = regions.map(([, body]) => body).join("\n");
  const missing = [];
  for (const path of store.base.keys()) {
    if (path.startsWith("primitive.")) continue;
    if (!emitted.includes(`${toCssVar(path)} `)) missing.push(toCssVar(path));
  }
  return missing;
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function applyRegions(text, regions) {
  let out = text;
  for (const [id, body] of regions) {
    out = patchGenRegion(out, id, genRegion(id, body));
  }
  return out;
}

export async function main({ check = false } = {}) {
  const store = await loadTokens();
  const regions = buildRegions(store);

  const uncovered = uncoveredTokens(store, regions);
  if (uncovered.length) {
    console.error(
      `✗ ${uncovered.length} semantic token(s) are in tokens/ but no region emits them:\n    ${uncovered.join("\n    ")}\n` +
        "  Add them to an existing prefix, or add a region in buildRegions() + a marker pair in ai/DESIGN.md.",
    );
    process.exitCode = 1;
    return false;
  }

  const current = readFileSync(TARGET, "utf8");
  const next = applyRegions(current, regions);

  if (check) {
    if (next !== current) {
      console.error(
        "✗ ai/DESIGN.md is out of date. Run 'npm run docs:design' and commit the result.",
      );
      process.exitCode = 1;
      return false;
    }
    console.log("✓ ai/DESIGN.md is current with tokens/");
    return true;
  }

  if (next === current) {
    console.log("✓ ai/DESIGN.md already current — no changes");
    return true;
  }
  writeFileSync(TARGET, next, "utf8");
  console.log("✅  ai/DESIGN.md — token tables regenerated from tokens/");
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main({ check: process.argv.includes("--check") });
}
