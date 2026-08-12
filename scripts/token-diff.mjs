/**
 * token-diff.mjs — the one place that knows how to compare two sets of built
 * brand CSS (#88).
 *
 * Extracted from check-publish-fresh.mjs so the freshness gate and the
 * changelog generator cannot disagree about what counts as a change. Same
 * discipline as scripts/rules.mjs: a comparison implemented twice is a
 * comparison that will drift.
 */

/** Every `--token: value;` declaration in a brand CSS file. */
export function parseTokens(css) {
  const map = {};
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(css))) map[m[1]] = m[2].trim();
  return map;
}

/**
 * Compare two token maps.
 * @returns {{ added: [name, value][], changed: [name, from, to][], removed: string[] }}
 */
export function diffTokenMaps(before, after) {
  const added = [];
  const changed = [];
  const removed = [];
  for (const k of Object.keys(after)) {
    if (!(k in before)) added.push([k, after[k]]);
    else if (before[k] !== after[k]) changed.push([k, before[k], after[k]]);
  }
  for (const k of Object.keys(before)) if (!(k in after)) removed.push(k);
  added.sort((a, b) => a[0].localeCompare(b[0]));
  changed.sort((a, b) => a[0].localeCompare(b[0]));
  removed.sort();
  return { added, changed, removed };
}

export const isEmptyDiff = (d) =>
  d.added.length === 0 && d.changed.length === 0 && d.removed.length === 0;

/**
 * Render one brand's diff as changelog markdown. Semantic tokens lead —
 * they are what a consumer writes — with primitives folded into a details
 * block, since a primitive change a consumer never references is noise to
 * them and detail to us.
 */
export function renderBrandDiff(file, diff) {
  if (isEmptyDiff(diff)) return "";
  const semantic = (n) => !n.startsWith("--primitive-");
  const lines = [];
  const section = (title, rows) => {
    if (rows.length) lines.push(`**${title}**`, "", ...rows, "");
  };

  section(
    "Added",
    diff.added
      .filter(([n]) => semantic(n))
      .map(([n, v]) => `- \`${n}\` → \`${v}\``),
  );
  section(
    "Changed",
    diff.changed
      .filter(([n]) => semantic(n))
      .map(([n, a, b]) => `- \`${n}\`: \`${a}\` → \`${b}\``),
  );
  section(
    "Removed",
    diff.removed.filter(semantic).map((n) => `- \`${n}\``),
  );

  const prim = [
    ...diff.added
      .filter(([n]) => !semantic(n))
      .map(([n, v]) => `- added \`${n}\` → \`${v}\``),
    ...diff.changed
      .filter(([n]) => !semantic(n))
      .map(([n, a, b]) => `- changed \`${n}\`: \`${a}\` → \`${b}\``),
    ...diff.removed
      .filter((n) => !semantic(n))
      .map((n) => `- removed \`${n}\``),
  ];
  if (prim.length) {
    lines.push(
      "<details><summary>Primitive-layer changes</summary>",
      "",
      ...prim,
      "",
      "</details>",
      "",
    );
  }
  return lines.length ? `#### ${file}\n\n${lines.join("\n")}` : "";
}
