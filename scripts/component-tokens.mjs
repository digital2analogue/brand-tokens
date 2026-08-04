/**
 * component-tokens.mjs — hold each component's contract to the styles it
 * actually ships (#187).
 *
 * `anatomy` is transcribed from a component's real styles by hand, and
 * `tokensUsed` was checked against nothing at all — its only reader was the
 * doc generator. So both could rot the moment someone edited a `static styles`
 * block, and every downstream consumer (per-part contrast, check_contrast,
 * validate_brand) would keep trusting the stale version.
 *
 * That mattered most right before #179–#183 promote anatomy across the
 * remaining 24 components: without this, that work multiplies an unverified
 * artifact by eight.
 *
 * Three findings, all mechanical — no inference about what a component *meant*:
 *
 *   unknown  — a `var(--x)` naming nothing the token store defines and nothing
 *              in the component's own directory declares. A typo, or a token
 *              that was renamed and not propagated. Same dangling-reference
 *              idiom as validate §3.
 *   behind   — a token the styles use that the contract never mentions.
 *   ahead    — a token the contract declares that the styles never reference.
 *
 * Pure functions only, in the shape assembly.mjs and anatomy.mjs established;
 * validate.mjs consumes findTokenDrift as a build gate.
 */

/** Every `var(--x)` referenced, including inside a fallback chain. */
export function extractStyleTokens(src) {
  const out = new Set();
  for (const m of String(src).matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
    out.add(m[1]);
  }
  return out;
}

/**
 * Custom properties *declared* by the given sources — a component's own API
 * knobs (`--rr-table-cell-padding-x`), not design tokens.
 *
 * Collected across the whole component directory, not one file: rr-table
 * declares the padding knobs that rr-table-cell consumes, so a per-file scope
 * would report the child's perfectly correct reference as an unknown token.
 */
export function localCustomProperties(sources) {
  const out = new Set();
  for (const src of sources) {
    for (const m of String(src).matchAll(/(^|[;{])\s*(--[a-zA-Z0-9-]+)\s*:/g)) {
      out.add(m[2]);
    }
  }
  return out;
}

/**
 * Every token the contract names: the flat `tokensUsed` list plus every
 * binding in the anatomy part tree, at any depth, resting or state.
 *
 * Anatomy admits two non-token values by schema — `transparent` and
 * `currentColor` (#114: CSS keywords, not colour literals). They are not
 * `var()` references and never appear in the styles set, so they are dropped
 * here rather than reported as a contract that ran ahead of the code.
 */
export function contractTokens(meta) {
  const out = new Set();
  const add = (v) => {
    for (const t of [].concat(v ?? [])) {
      if (typeof t === "string" && t.startsWith("--")) out.add(t);
    }
  };
  for (const t of meta.tokensUsed ?? []) add(t);

  const walkParts = (parts) => {
    for (const part of parts ?? []) {
      for (const v of Object.values(part.tokens ?? {})) add(v);
      for (const state of part.states ?? []) {
        for (const v of Object.values(state.tokens ?? {})) add(v);
      }
      walkParts(part.parts);
    }
  };
  walkParts(meta.anatomy?.parts);
  return out;
}

/**
 * Compare one component's contract against its styles, both directions.
 *
 * @param {object}   meta          parsed *.meta.json
 * @param {string}   componentSrc  the meta's own component source
 * @param {object}   opts
 * @param {Set<string>} opts.known     every `--token` the store defines
 * @param {Set<string>} opts.localDefs custom properties declared in the component's directory
 * @returns {{ unknown: string[], behind: string[], ahead: string[] }}
 */
export function findTokenDrift(meta, componentSrc, { known, localDefs }) {
  const referenced = extractStyleTokens(componentSrc);
  const contract = contractTokens(meta);

  // A component's own knobs are not design tokens, and primitives are the
  // no-primitive rule's business (rules.mjs, validate §2) — reporting them
  // here would tell an author to add a primitive to tokensUsed, which the
  // meta schema forbids outright.
  const styleTokens = [...referenced].filter(
    (t) => !localDefs.has(t) && !t.startsWith("--primitive-"),
  );

  return {
    unknown: styleTokens.filter((t) => !known.has(t)),
    behind: styleTokens.filter((t) => known.has(t) && !contract.has(t)),
    ahead: [...contract].filter((t) => !referenced.has(t)),
  };
}
