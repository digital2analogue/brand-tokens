// Code Connect ↔ component parity — parsing helpers.
//
// The 2026-07-15 ds-inspection found button.figma.ts emitting
// variant="ghost" while button.ts had no ghost variant: Code Connect
// happily generates code that doesn't exist, and nothing failed. These
// helpers let validate.mjs assert that every string value a *.figma.ts
// enum mapping can emit appears in a literal union of the paired
// component source, so that class of drift fails a PR instead of an
// inspection.
//
// Kept separate from validate.mjs so the parsers can be unit-tested
// against synthetic fixtures (tests/unit/code-connect.spec.ts).

/**
 * Extract every string value a `figma.enum('Prop', { key: 'value' })`
 * mapping can emit. Non-string values (e.g. `disabled: true`) are
 * ignored — they map to boolean props, not literal unions.
 *
 * @param {string} figmaSrc  Source text of a *.figma.ts file
 * @returns {{ prop: string, value: string }[]}
 */
export function extractEnumEmissions(figmaSrc) {
  const emissions = [];
  const enumRe = /figma\.enum\(\s*['"]([^'"]+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;
  let m;
  while ((m = enumRe.exec(figmaSrc))) {
    const prop = m[1];
    const valRe = /:\s*['"]([^'"]+)['"]/g;
    let v;
    while ((v = valRe.exec(m[2]))) emissions.push({ prop, value: v[1] });
  }
  return emissions;
}

/**
 * Collect every string literal that participates in a literal union
 * (`'a' | 'b' | …`) in a component source — covers both exported type
 * aliases (`export type ButtonVariant = 'primary' | …`) and inline
 * prop annotations (`type: 'button' | 'submit' | 'reset'`).
 *
 * @param {string} componentSrc  Source text of the component *.ts file
 * @returns {Set<string>}
 */
export function extractUnionLiterals(componentSrc) {
  const literals = new Set();
  const unionRe = /(['"])(?:(?!\1).)+\1(?:\s*\|\s*(['"])(?:(?!\2).)+\2)+/g;
  let m;
  while ((m = unionRe.exec(componentSrc))) {
    const litRe = /['"]((?:[^'"\\]|\\.)+)['"]/g;
    let l;
    while ((l = litRe.exec(m[0]))) literals.add(l[1]);
  }
  return literals;
}

/**
 * Check one figma.ts / component.ts pair. Returns the emissions whose
 * value appears in no literal union of the component source.
 *
 * @param {string} figmaSrc
 * @param {string} componentSrc
 * @returns {{ prop: string, value: string }[]}  offending emissions
 */
export function findUnmappedEmissions(figmaSrc, componentSrc) {
  const unions = extractUnionLiterals(componentSrc);
  return extractEnumEmissions(figmaSrc).filter(
    ({ value }) => !unions.has(value),
  );
}

/**
 * Extract every `codeProp: figma.enum('Property', {...})` mapping from a
 * *.figma.ts, including boolean derivations (`disabled: figma.enum('State',
 * { disabled: true })`) that extractEnumEmissions deliberately skips.
 *
 * @param {string} figmaSrc
 * @returns {{ codeProp: string, property: string, entries: Record<string, string|boolean> }[]}
 */
export function extractEnumBindings(figmaSrc) {
  const out = [];
  const re =
    /([\w-]+|'[^']+'|"[^"]+")\s*:\s*figma\.enum\(\s*['"]([^'"]+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;
  let m;
  while ((m = re.exec(figmaSrc))) {
    const codeProp = m[1].replace(/^['"]|['"]$/g, "");
    const entries = {};
    const entryRe =
      /(?:['"]([^'"]+)['"]|([\w-]+))\s*:\s*(?:['"]([^'"]*)['"]|(true|false))/g;
    let e;
    while ((e = entryRe.exec(m[3]))) {
      const key = e[1] ?? e[2];
      entries[key] = e[3] !== undefined ? e[3] : e[4] === "true";
    }
    out.push({ codeProp, property: m[2], entries });
  }
  return out;
}

/**
 * Cross-check a meta.json's prop `bindings` (#152) against the component's
 * *.figma.ts. Opt-in: a meta with no bindings returns no findings — roll-out
 * is per-component. Once any prop declares a binding, agreement is
 * bidirectional: every VARIANT binding must match a figma.enum (same Figma
 * property, identical valueMap), and every figma.enum must be covered by a
 * binding. BOOLEAN/TEXT/INSTANCE_SWAP kinds have no figma.ts counterpart to
 * parse, so they are schema-validated only.
 *
 * @param {object} meta      parsed *.meta.json
 * @param {string} figmaSrc  concatenated *.figma.ts source for the component dir
 * @returns {string[]}       human-readable mismatch descriptions (empty = agree)
 */
export function findBindingMismatches(meta, figmaSrc) {
  const mismatches = [];
  const bound = (meta.props ?? []).filter((p) => p.bindings);
  if (bound.length === 0) return mismatches;

  const ccByProp = new Map(
    extractEnumBindings(figmaSrc).map((b) => [b.codeProp, b]),
  );

  for (const p of bound) {
    const { code, figma } = p.bindings;
    if (code.prop !== p.name) {
      mismatches.push(
        `prop "${p.name}": bindings.code.prop is "${code.prop}" — must equal the prop name`,
      );
    }
    if (figma.kind !== "VARIANT") continue; // nothing in figma.ts to compare
    const cc = ccByProp.get(p.name);
    if (!cc) {
      mismatches.push(
        `prop "${p.name}": bound to Figma "${figma.property}" but no figma.enum maps it in the component's *.figma.ts`,
      );
      continue;
    }
    if (cc.property !== figma.property) {
      mismatches.push(
        `prop "${p.name}": binding says Figma property "${figma.property}", *.figma.ts says "${cc.property}"`,
      );
    }
    const want = figma.valueMap ?? {};
    const got = cc.entries;
    const keys = new Set([...Object.keys(want), ...Object.keys(got)]);
    for (const k of keys) {
      if (!(k in want)) {
        mismatches.push(
          `prop "${p.name}": *.figma.ts maps ${figma.property}=${k} → ${JSON.stringify(got[k])} but the binding's valueMap omits it`,
        );
      } else if (!(k in got)) {
        mismatches.push(
          `prop "${p.name}": binding maps ${figma.property}=${k} but *.figma.ts does not`,
        );
      } else if (want[k] !== got[k]) {
        mismatches.push(
          `prop "${p.name}": ${figma.property}=${k} maps to ${JSON.stringify(want[k])} in the binding but ${JSON.stringify(got[k])} in *.figma.ts`,
        );
      }
    }
  }

  // Reverse arrow: figma.ts mappings the meta doesn't bind.
  for (const [codeProp, cc] of ccByProp) {
    if (!bound.some((p) => p.name === codeProp)) {
      mismatches.push(
        `*.figma.ts maps prop "${codeProp}" via Figma "${cc.property}" but the meta declares no binding for it`,
      );
    }
  }

  return mismatches;
}
