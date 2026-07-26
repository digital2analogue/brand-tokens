/**
 * assembly.mjs — check_assembly (MCP) logic.
 *
 * Validates a set of components + tokens used *together* against an enumerated
 * rule set (docs/mcp-expansion-prd.md; rule 4 added by #154). This is
 * deliberately NOT general design-intent inference: anything outside these
 * rules yields no opinion.
 *
 *   1. Spacing relationship — ≥2 distinct components joined by a within-element
 *      spacing token (micro/tight/inline) get a suggestion to step up to
 *      --spacing-component, since those tokens are for gaps *inside* one element.
 *   2. WCAG pairing — every foreground×background colour token pair present is
 *      checked for ≥4.5:1 contrast (resolved values); failing pairs are flagged.
 *   3. Deprecated/unknown token — flags removed tokens (with their replacement,
 *      from the shared DEPRECATED registry) and tokens that resolve to nothing.
 *   4. Slot composition — a placement ({ component, parent, slot? }) whose
 *      parent slot declares `accepts` is checked against it; a slot with no
 *      `accepts` (or "*") is unconstrained and yields no opinion. Slot
 *      contracts come from the caller-supplied component index (meta.json via
 *      design-system.json) — this module holds no component data of its own.
 *
 * Single-source: colour resolution comes from tokens.mjs, deprecation from
 * rules.mjs — no logic is re-implemented here beyond the contrast math.
 */

import { resolveToken, toCssVar } from "./tokens.mjs";
import { DEPRECATED } from "./rules.mjs";

// Within-element spacing — gaps *inside* one element, not between components.
const WITHIN_ELEMENT_SPACING = new Set([
  "--spacing-micro", // 4px
  "--spacing-tight", // 8px
  "--spacing-inline", // 12px
]);

const AA_NORMAL = 4.5; // WCAG AA contrast for normal-size text

/**
 * WCAG relative-luminance contrast ratio between two #rrggbb colours.
 * Returns a number ≥ 1, or null if either value isn't a 6-digit hex (e.g. a
 * gradient or color-mix() — then we have no opinion on the pairing).
 */
export function contrastRatio(hexA, hexB) {
  const luminance = (hex) => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
    if (!m) return null;
    const int = parseInt(m[1], 16);
    const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map(
      (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      },
    );
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const la = luminance(hexA);
  const lb = luminance(hexB);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Metas name the default slot inconsistently ("default", "(default)", "");
// normalize so callers and contracts always meet on "default".
const slotKey = (name) =>
  !name || name === "default" || name === "(default)" ? "default" : name;

/**
 * @param {object} store  result of loadTokens()
 * @param {object} input  { components?: string[], tokens?: string[] (CSS vars),
 *                          placements?: { component, parent, slot? }[], context?: string }
 * @param {Map<string, object>} componentIndex  name → meta (from design-system.json);
 *                          only rule 4 consumes it, so it stays optional.
 * @returns {{ valid: boolean, suggestions: string[], context?: string }}
 */
export function checkAssembly(
  store,
  { components = [], tokens = [], placements = [], context } = {},
  componentIndex = new Map(),
) {
  const suggestions = [];

  // CSS property → dotted path, so we can resolve the CSS-var tokens callers pass.
  const cssToPath = new Map();
  for (const path of store.base.keys()) cssToPath.set(toCssVar(path), path);
  const resolve = (cssVar) => {
    const path = cssToPath.get(cssVar);
    return path ? resolveToken(store, path) : null;
  };

  // ── Rule 3: deprecated / unknown tokens ──
  for (const t of tokens) {
    if (DEPRECATED.has(t)) {
      suggestions.push(
        `${t} is deprecated — use ${DEPRECATED.get(t).replacement} instead.`,
      );
    } else if (!cssToPath.has(t) && !t.startsWith("--primitive-")) {
      // Unknown semantic token. (Primitive misuse is check_usage's job, not this.)
      suggestions.push(`${t} is not a known design token.`);
    }
  }

  // ── Rule 1: spacing between distinct components ──
  const distinct = [...new Set(components)];
  if (distinct.length >= 2) {
    for (const t of tokens) {
      if (!WITHIN_ELEMENT_SPACING.has(t)) continue;
      const px = resolve(t)?.value ?? "";
      const val = px ? ` (${px})` : "";
      suggestions.push(
        `${t}${val} is for gaps within a single element; for space between distinct components ` +
          `(${distinct.join(", ")}) step up to --spacing-component (24px) or larger.`,
      );
    }
  }

  // ── Rule 2: WCAG foreground/background pairing ──
  const foregrounds = tokens.filter((t) => t.startsWith("--color-foreground-"));
  const backgrounds = tokens.filter((t) => t.startsWith("--color-background-"));
  for (const fg of foregrounds) {
    for (const bg of backgrounds) {
      const fgVal = resolve(fg)?.value;
      const bgVal = resolve(bg)?.value;
      if (!fgVal || !bgVal) continue; // unknown/non-hex → no opinion
      const ratio = contrastRatio(fgVal, bgVal);
      if (ratio !== null && ratio < AA_NORMAL) {
        suggestions.push(
          `${fg} on ${bg} is ${ratio.toFixed(2)}:1 — below WCAG AA (${AA_NORMAL}:1) for normal text.`,
        );
      }
    }
  }

  // ── Rule 4: slot composition ──
  for (const p of placements) {
    const parent = componentIndex.get(p.parent);
    if (!parent) {
      suggestions.push(`${p.parent} is not a known component.`);
      continue;
    }
    const want = slotKey(p.slot);
    const slot = (parent.slots ?? []).find((s) => slotKey(s.name) === want);
    if (!slot) {
      const names =
        (parent.slots ?? []).map((s) => slotKey(s.name)).join(", ") || "none";
      suggestions.push(`${p.parent} has no "${want}" slot (slots: ${names}).`);
      continue;
    }
    if (!slot.accepts || slot.accepts.includes("*")) continue; // unconstrained → no opinion
    if (!slot.accepts.includes(p.component)) {
      suggestions.push(
        `${p.parent}'s "${want}" slot accepts only ${slot.accepts.join(", ")} — ` +
          `${p.component} does not belong there.`,
      );
    }
  }

  return {
    valid: suggestions.length === 0,
    suggestions,
    ...(context ? { context } : {}),
  };
}
