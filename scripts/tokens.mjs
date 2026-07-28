/**
 * tokens.mjs — shared token loading + resolution.
 *
 * The single source of truth for reading the DTCG token files. Imported by:
 *   - scripts/validate.mjs        (build gate: every {ref} must resolve)
 *   - packages/mcp/src/server.mjs (the agent-facing get_token / find_token / get_spacing tools)
 *
 * Before this module existed, validate.mjs walked the token tree inline. The MCP
 * server needed the same walk plus value resolution; rather than write a second
 * parser that could drift from the first, both now import from here.
 *
 * Token values and usage prose both come from the *.tokens.json files — the
 * `$description` fields are authoritative and co-located with `$value`, so they
 * cannot drift the way a parallel DESIGN.md table can. DESIGN.md is only used as
 * an optional drift cross-check (see designMdCoverage), never as a value source.
 */

import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { glob } from "node:fs/promises";

const ROOT = resolve(import.meta.dirname, "..");

// ── Tree walking ──────────────────────────────────────────────────────────────

const REF_RE = /\{([^}]+)\}/g;

/** Pull {a.b.c} references from a token value's string leaves only. Composite
 *  values (typography, transition) are objects whose own structure must be
 *  recursed into — never stringified, or their braces look like references. */
export function extractRefs(value, out = []) {
  if (typeof value === "string") {
    for (const m of value.matchAll(REF_RE)) out.push(m[1]);
  } else if (Array.isArray(value)) {
    value.forEach((v) => extractRefs(v, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => extractRefs(v, out));
  }
  return out;
}

/** Walk a token tree. For every token (a node with $value) record its dotted
 *  path in `nodes` (path → { value, type, description, file }) and every
 *  {reference} found in its value in `refs` ({ ref, from, file }). */
export function collectTokenNodes(obj, prefix, nodes, refs, file) {
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    if (val && typeof val === "object") {
      const path = prefix ? `${prefix}.${key}` : key;
      if ("$value" in val) {
        nodes.set(path, {
          value: val.$value,
          type: val.$type ?? null,
          description: val.$description ?? "",
          file,
        });
        for (const ref of extractRefs(val.$value))
          refs.push({ ref, from: path, file });
      } else {
        collectTokenNodes(val, path, nodes, refs, file);
      }
    }
  }
}

async function scan(globPattern, nodes, refs) {
  for await (const entry of glob(globPattern, { cwd: ROOT })) {
    const file = relative(ROOT, resolve(ROOT, entry));
    const data = JSON.parse(readFileSync(resolve(ROOT, entry), "utf8"));
    collectTokenNodes(data, "", nodes, refs, file);
  }
}

// ── Loading ───────────────────────────────────────────────────────────────────

/**
 * Load the whole token system into layered maps.
 * Returns { base, brands, baseRefs, brandRefs } where:
 *   - base       : Map<path, node>  — primitives + semantic + components
 *   - brands     : Map<brandName, Map<path, node>>  — brand override layer only
 *   - baseRefs   : [{ ref, from, file }]  — references found in the base layer
 *   - brandRefs  : Map<brandName, [{ ref, from, file }]>
 * Mirrors the layering validate.mjs enforces: brands resolve against base ∪ self.
 */
export async function loadTokens() {
  const base = new Map();
  const baseRefs = [];
  await scan("tokens/primitives/**/*.tokens.json", base, baseRefs);
  await scan("tokens/semantic/**/*.tokens.json", base, baseRefs);
  // The component tier was removed in #114 — two tiers only: primitives → semantic.

  const brands = new Map();
  const brandRefs = new Map();
  for await (const entry of glob("tokens/brands/**/*.tokens.json", {
    cwd: ROOT,
  })) {
    const file = relative(ROOT, resolve(ROOT, entry));
    const name = file.replace(/^.*[/\\]/, "").replace(/\.tokens\.json$/, "");
    const nodes = new Map();
    const refs = [];
    const data = JSON.parse(readFileSync(resolve(ROOT, entry), "utf8"));
    collectTokenNodes(data, "", nodes, refs, file);
    brands.set(name, nodes);
    brandRefs.set(name, refs);
  }

  return { base, brands, baseRefs, brandRefs };
}

// ── Resolution ──────────────────────────────────────────────────────────────

/** dotted token path → CSS custom property name. color.background.alt → --color-background-alt.
 *  camelCase segments are kebab-cased to match Style Dictionary's built output —
 *  letterSpacing.body → --letter-spacing-body, lineHeight.relaxed → --line-height-relaxed
 *  (a plain dot→dash replace would wrongly emit --letterSpacing-body). */
export function toCssVar(path) {
  return `--${path
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\./g, "-")
    .toLowerCase()}`;
}

/** The inverse index: CSS custom property name → dotted token path. Built from the
 *  base layer, which carries every path a brand can override. Shared by every
 *  caller that starts from a `--token-name` (contrast inputs, anatomy bindings). */
export function cssVarToPathMap(store) {
  const m = new Map();
  for (const path of store.base.keys()) m.set(toCssVar(path), path);
  return m;
}

/** Look a token up in the brand layer first, then the base layer. */
function lookup({ base, brands }, path, brand) {
  if (brand && brands.get(brand)?.has(path)) return brands.get(brand).get(path);
  return base.get(path) ?? null;
}

/** Resolve a value, following {refs} to their final values. Composite values
 *  (objects/arrays) are resolved leaf by leaf. Guards against reference cycles. */
function resolveValue(value, store, brand, seen = new Set()) {
  if (typeof value === "string") {
    // A value that is exactly one reference resolves to whatever the target
    // holds — including composite objects (shadow tokens). Routing these
    // through String.replace would coerce objects to "[object Object]".
    const whole = /^\{([^}]+)\}$/.exec(value);
    if (whole) {
      const ref = whole[1];
      if (seen.has(ref)) return value; // cycle — leave the ref visible
      const node = lookup(store, ref, brand);
      if (!node) return value; // dangling — leave visible (validate catches these)
      return resolveValue(node.value, store, brand, new Set([...seen, ref]));
    }
    return value.replace(REF_RE, (_, ref) => {
      if (seen.has(ref)) return `{${ref}}`; // cycle — leave the ref visible
      const node = lookup(store, ref, brand);
      if (!node) return `{${ref}}`; // dangling — leave visible (validate catches these)
      return resolveValue(node.value, store, brand, new Set([...seen, ref]));
    });
  }
  if (Array.isArray(value))
    return value.map((v) => resolveValue(v, store, brand, seen));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        resolveValue(v, store, brand, seen),
      ]),
    );
  }
  return value;
}

/** The terminal primitive a token bottoms out at, if any. Follows the first
 *  reference chain down to a `primitive.*` path. Returns the dotted primitive
 *  path (e.g. "primitive.color.green.900") or null for tokens with raw values. */
function terminalPrimitive(value, store, brand, seen = new Set()) {
  const refs = extractRefs(value);
  for (const ref of refs) {
    if (seen.has(ref)) continue;
    if (ref.startsWith("primitive.")) {
      // Follow further in case a primitive aliases another primitive.
      const node = lookup(store, ref, brand);
      const deeper = node
        ? terminalPrimitive(node.value, store, brand, new Set([...seen, ref]))
        : null;
      return deeper ?? ref;
    }
    const node = lookup(store, ref, brand);
    if (node) {
      const deeper = terminalPrimitive(
        node.value,
        store,
        brand,
        new Set([...seen, ref]),
      );
      if (deeper) return deeper;
    }
  }
  return null;
}

/**
 * Resolve one token to a structured record.
 * @param {object} store  result of loadTokens()
 * @param {string} path   dotted token path, e.g. "color.background.alt"
 * @param {object} [opts] { brand } — apply a sub-brand's override layer
 * @returns {object|null} null if the token does not exist
 */
export function resolveToken(store, path, { brand } = {}) {
  const node = lookup(store, path, brand);
  if (!node) return null;

  // Per-brand overrides that actually change this token's resolved value.
  const brandOverrides = {};
  for (const [name, nodes] of store.brands) {
    if (nodes.has(path)) {
      brandOverrides[name] = resolveValue(nodes.get(path).value, store, name);
    }
  }

  return {
    name: path,
    cssProperty: toCssVar(path),
    value: resolveValue(node.value, store, brand),
    raw: node.value,
    primitive: terminalPrimitive(node.value, store, brand),
    type: node.type,
    usage: node.description,
    definedIn: node.file,
    ...(Object.keys(brandOverrides).length ? { brands: brandOverrides } : {}),
  };
}

/**
 * Find tokens by intent. Case-insensitive, word-level AND match (every word in
 * the query must appear somewhere in the token's name, CSS property, or usage
 * description) — so "card background" matches color.background.alt even though
 * "background" is in the name and "card" is in the description. No embeddings.
 * Returns [{ name, cssProperty, usage, match }] ranked: tokens where the whole
 * query is satisfied by the name rank ahead of those relying on the description.
 */
export function findTokens(store, query, { brand, limit = 10 } = {}) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const hits = [];
  for (const [path, node] of store.base) {
    const css = toCssVar(path);
    const nameHay = `${path} ${css}`.toLowerCase();
    const fullHay = `${nameHay} ${node.description}`.toLowerCase();
    if (!terms.every((t) => fullHay.includes(t))) continue;
    const match = terms.every((t) => nameHay.includes(t)) ? "name" : "usage";
    hits.push({ name: path, cssProperty: css, usage: node.description, match });
  }
  // Name matches first, then shorter path (more specific roots rank higher).
  hits.sort((a, b) => {
    if (a.match !== b.match) return a.match === "name" ? -1 : 1;
    return a.name.length - b.name.length;
  });
  return hits.slice(0, limit);
}

/**
 * Semantic scale categories → their token path prefix. Backs get_scale, the
 * generalization of get_spacing across every scale. `letter-spacing` and
 * `typography` map to the camelCase / `font` roots the tokens actually live under.
 */
export const SCALE_CATEGORIES = {
  spacing: "spacing",
  radius: "radius",
  shadow: "shadow",
  motion: "motion",
  icon: "icon",
  "letter-spacing": "letterSpacing",
  typography: "font",
};

/**
 * Every semantic token in a scale category, resolved to { token, value, usage } —
 * the same shape get_spacing returns, generalized to radius/shadow/motion/icon/
 * letter-spacing/typography. `value` may be a composite object (shadow, typography
 * shorthands). Returns null for an unknown category.
 */
export function getScale(store, category, { brand } = {}) {
  const prefix = SCALE_CATEGORIES[category];
  if (!prefix) return null;
  return tokensUnder(store, prefix, { brand }).map((t) => ({
    token: t.cssProperty,
    value: t.value,
    usage: t.usage,
  }));
}

/** All tokens under a dotted prefix (e.g. "spacing"), resolved. Used by get_spacing. */
export function tokensUnder(store, prefix, { brand } = {}) {
  const out = [];
  for (const path of store.base.keys()) {
    if (path === prefix || path.startsWith(`${prefix}.`)) {
      out.push(resolveToken(store, path, { brand }));
    }
  }
  return out;
}

// ── Brand awareness ───────────────────────────────────────────────────────────

/**
 * The full override set a sub-brand applies on top of the base dark theme.
 * For every token the brand file declares, reports the base-resolved value and
 * the brand-resolved value side by side, so callers see exactly what changes.
 * `base` is null for tokens the brand *adds* (not present in the base layer).
 * @returns {object|null} null if the brand is unknown
 */
export function getBrand(store, name) {
  const layer = store.brands.get(name);
  if (!layer) return null;
  const overrides = [];
  for (const path of layer.keys()) {
    const brandTok = resolveToken(store, path, { brand: name });
    const baseTok = resolveToken(store, path); // null → token added by the brand
    overrides.push({
      name: path,
      cssProperty: toCssVar(path),
      base: baseTok ? baseTok.value : null,
      value: brandTok.value,
      changed:
        !baseTok ||
        JSON.stringify(baseTok.value) !== JSON.stringify(brandTok.value),
      usage: brandTok.usage || (baseTok && baseTok.usage) || "",
    });
  }
  overrides.sort((a, b) => a.name.localeCompare(b.name));
  return { brand: name, overrides, count: overrides.length };
}

/**
 * Diff two sub-brands: the tokens whose resolved value differs between them.
 * Considers the union of paths either brand overrides — tokens neither touches
 * resolve to the same base value and can't differ. Each diff carries both
 * brands' resolved values (keyed by brand name; null where a brand has no such
 * token at all).
 * @returns {object|null} null if either brand is unknown
 */
export function compareBrands(store, a, b) {
  if (!store.brands.has(a) || !store.brands.has(b)) return null;
  const paths = new Set([
    ...store.brands.get(a).keys(),
    ...store.brands.get(b).keys(),
  ]);
  const diffs = [];
  for (const path of paths) {
    const va = resolveToken(store, path, { brand: a })?.value ?? null;
    const vb = resolveToken(store, path, { brand: b })?.value ?? null;
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      diffs.push({ name: path, cssProperty: toCssVar(path), [a]: va, [b]: vb });
    }
  }
  diffs.sort((x, y) => x.name.localeCompare(y.name));
  return { brands: [a, b], diffs, count: diffs.length };
}
