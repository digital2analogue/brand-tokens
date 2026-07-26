/**
 * component-parity.mjs — the code↔Figma parity differ (#152 PR 2).
 *
 * Diffs the Figma component sets (figma/components.dump.json, exported via
 * the Figma MCP — see that file's $comment) against the prop `bindings`
 * declared in each component's meta.json (read from design-system.json).
 * Every divergence is classified, never guessed at:
 *
 *   ahead      — Figma has a variant property, or an option on a shared
 *                property, that no binding (and no ignoredOptions entry)
 *                covers. Figma is ahead of the contract.
 *   behind     — a binding (or ignoredOptions entry) references a property
 *                or option the Figma component set no longer has. Figma is
 *                behind the contract.
 *   mismatched — same property on both sides, but an option exists on
 *                exactly one side (the ghost/danger drift class, #46).
 *                Reported per option with the side that has it.
 *
 * Scope mirrors validate §4b: opt-in — only components whose meta declares
 * bindings are diffed; a bound meta missing from the dump (or vice versa)
 * is itself a finding. The differ REPORTS (exit 1 on findings) and never
 * auto-fixes: promotion into the contract is a reviewed change.
 *
 * Usage: node scripts/component-parity.mjs [dumpPath] [--json]
 *        npm run parity
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

/**
 * Parse variant symbol names ("Variant=primary,Size=sm,State=default")
 * into { property: Set<option> }.
 *
 * @param {string[]} variantNames
 * @returns {Map<string, Set<string>>}
 */
export function parseVariantAxes(variantNames) {
  const axes = new Map();
  for (const name of variantNames) {
    for (const pair of name.split(",")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const prop = pair.slice(0, eq).trim();
      const option = pair.slice(eq + 1).trim();
      if (!axes.has(prop)) axes.set(prop, new Set());
      axes.get(prop).add(option);
    }
  }
  return axes;
}

/**
 * Diff one component's bindings against its Figma variant axes.
 *
 * @param {object} meta  component meta (from design-system.json)
 * @param {Map<string, Set<string>>} axes  from parseVariantAxes
 * @returns {{ component: string, class: 'ahead'|'behind'|'mismatched', property: string, option?: string, detail: string }[]}
 */
export function diffComponent(meta, axes) {
  const findings = [];
  const name = meta.name;
  const push = (cls, property, option, detail) =>
    findings.push({ component: name, class: cls, property, option, detail });

  // Contract side: Figma property → union of option names covered by
  // bindings (valueMap keys) across all props bound to that property.
  const covered = new Map();
  for (const p of meta.props ?? []) {
    const f = p.bindings?.figma;
    if (!f || f.kind !== "VARIANT") continue;
    if (!covered.has(f.property)) covered.set(f.property, new Set());
    for (const opt of Object.keys(f.valueMap ?? {}))
      covered.get(f.property).add(opt);
  }
  const ignored = meta.figma?.ignoredOptions ?? {};

  // Contract → Figma: bound/ignored things Figma no longer has.
  for (const [property, options] of covered) {
    const axis = axes.get(property);
    if (!axis) {
      push(
        "behind",
        property,
        undefined,
        `bindings map Figma property "${property}" but the component set has no such variant axis`,
      );
      continue;
    }
    for (const opt of options) {
      if (!axis.has(opt)) {
        push(
          "mismatched",
          property,
          opt,
          `binding maps ${property}=${opt} but the Figma component set has no such option`,
        );
      }
    }
  }
  for (const [property, opts] of Object.entries(ignored)) {
    const axis = axes.get(property);
    for (const opt of opts) {
      if (!axis?.has(opt)) {
        push(
          "behind",
          property,
          opt,
          `figma.ignoredOptions lists ${property}=${opt} but the Figma component set has no such option — stale ignore`,
        );
      }
    }
  }

  // Figma → contract: axes/options nothing covers.
  for (const [property, axis] of axes) {
    const boundOpts = covered.get(property);
    const ignoredOpts = new Set(ignored[property] ?? []);
    if (!boundOpts && ignoredOpts.size === 0) {
      push(
        "ahead",
        property,
        undefined,
        `Figma has variant axis "${property}" (${[...axis].join(", ")}) that no binding covers`,
      );
      continue;
    }
    for (const opt of axis) {
      if (!boundOpts?.has(opt) && !ignoredOpts.has(opt)) {
        push(
          boundOpts ? "mismatched" : "ahead",
          property,
          opt,
          `Figma has ${property}=${opt} but no binding maps it and figma.ignoredOptions does not cover it`,
        );
      }
    }
  }

  return findings;
}

/**
 * Run the full diff: every meta with bindings against the dump.
 *
 * @param {object[]} metas  design-system.json components
 * @param {object} dump     parsed figma/components.dump.json
 * @returns {{ findings: object[], checked: string[] }}
 */
export function diffAll(metas, dump) {
  const findings = [];
  const checked = [];
  const dumpByNode = new Map(dump.components.map((c) => [c.nodeId, c]));

  for (const meta of metas) {
    if (!(meta.props ?? []).some((p) => p.bindings)) continue;
    const nodeId = meta.figma?.nodeId;
    const entry = nodeId && dumpByNode.get(nodeId);
    if (!entry) {
      findings.push({
        component: meta.name,
        class: "behind",
        property: undefined,
        option: undefined,
        detail: `meta declares bindings (nodeId ${nodeId ?? "unset"}) but the dump has no matching component set — re-export the dump or fix figma.nodeId`,
      });
      continue;
    }
    checked.push(meta.name);
    findings.push(...diffComponent(meta, parseVariantAxes(entry.variants)));
  }
  return { findings, checked };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const isMain = process.argv[1] === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const dumpPath =
    args.find((a) => !a.startsWith("--")) ?? "figma/components.dump.json";

  const dump = JSON.parse(readFileSync(resolve(ROOT, dumpPath), "utf8"));
  const { components } = JSON.parse(
    readFileSync(resolve(ROOT, "design-system.json"), "utf8"),
  );

  const { findings, checked } = diffAll(components, dump);

  if (json) {
    console.log(JSON.stringify({ checked, findings }, null, 2));
  } else {
    console.log(
      `Parity: ${checked.length} bound component(s) vs ${dumpPath} (exported ${dump.exported})\n`,
    );
    for (const f of findings) {
      console.error(`  ✗ [${f.class}] ${f.component}: ${f.detail}`);
    }
    console.log(
      findings.length === 0
        ? `  ✓ code and Figma agree for: ${checked.join(", ")}`
        : `\n${findings.length} finding(s) — promote into the contract or fix the lagging surface; never sync side-to-side.`,
    );
  }
  process.exit(findings.length === 0 ? 0 : 1);
}
