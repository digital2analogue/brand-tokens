/**
 * contrast.mjs — check_contrast + validate_brand (MCP) logic.
 *
 * The design system is WCAG-AA-first (ai/rules.md hard rule #6; the consumer
 * repos run their own check-contrast gates). These two tools expose that check
 * directly through the MCP instead of as a side effect of check_assembly.
 *
 * Single-source: the WCAG relative-luminance math lives once in assembly.mjs
 * (contrastRatio); colour resolution comes from tokens.mjs. Nothing is
 * re-implemented here.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveToken, toCssVar, cssVarToPathMap } from "./tokens.mjs";
import { contrastRatio } from "./assembly.mjs";
import { anatomyPairings, findPartPairing, partPaths } from "./anatomy.mjs";

// WCAG 2.x thresholds.
const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;
const AAA_NORMAL = 7.0;
const AAA_LARGE = 4.5;

// WCAG "large text": ≥ 24px, or ≥ 18.66px (14pt) when bold.
const LARGE_PX = 24;
const LARGE_BOLD_PX = 18.66;

const HEX6 = /^#?[0-9a-fA-F]{6}$/;

/** A CSS length string/number → px (rem/em assume a 16px root). null if unparseable. */
function toPx(fontSize) {
  if (fontSize == null) return null;
  if (typeof fontSize === "number") return fontSize;
  const m = /^([\d.]+)\s*(px|rem|em)?$/.exec(String(fontSize).trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}

/**
 * Resolve a colour input to a #rrggbb value. Accepts a hex literal, a CSS custom
 * property (--color-…), or a dotted token path (color.…). Applies a sub-brand's
 * overrides when `brand` is given.
 * @returns {{ value: string, token: string|null }|null} null if the token is unknown
 */
function resolveColor(store, cssToPath, input, brand) {
  const s = String(input).trim();
  if (HEX6.test(s))
    return { value: s.startsWith("#") ? s : `#${s}`, token: null };
  const path = s.startsWith("--")
    ? cssToPath.get(s)
    : store.base.has(s)
      ? s
      : null;
  if (!path) return null;
  const tok = resolveToken(store, path, { brand });
  return tok ? { value: tok.value, token: toCssVar(path) } : null;
}

// The CSS-var → dotted-path index lives once, in tokens.mjs (cssVarToPathMap).

/**
 * Contrast ratio + AA/AAA verdict for a foreground/background pair.
 *
 * Two input modes. Name both colours directly, or — when the metas are passed —
 * name a declared pairing: { component, part, state? } resolves the pair from
 * that component's anatomy contract (#156 stage 2) instead of the caller having
 * to know which two tokens the component actually puts together.
 *
 * @param {object} store   loadTokens() result
 * @param {object} input   { foreground, background } | { component, part, state? }, + { brand?, fontSize?, bold? }
 * @param {Array}  metas   component metas (design-system.json components), for contract mode
 * @returns {object} verdict, or { error } for an unknown token/part, or
 *   { opinion:false } when a value isn't a flat hex (gradient / color-mix).
 */
export function checkContrast(
  store,
  {
    foreground,
    background,
    component,
    part,
    state,
    brand,
    fontSize,
    bold = false,
  } = {},
  metas = [],
) {
  const cssToPath = cssVarToPathMap(store);

  // Contract mode: resolve the declared pairing, naming what's missing rather
  // than guessing at one (the honest-degradation rule).
  let source = null;
  if (component || part) {
    if (!component || !part)
      return { error: "Contract mode needs both component and part." };
    const declared = findPartPairing(metas, component, part, state ?? null);
    if (!declared) {
      const parts = partPaths(metas, component);
      return {
        error: parts.length
          ? `No declared foreground/background pairing for ${component} part "${part}"${state ? ` state "${state}"` : ""}. Parts: ${parts.join(", ")}`
          : `${component} declares no anatomy.`,
      };
    }
    foreground = declared.foreground;
    background = declared.background;
    source = { component, part, ...(state ? { state } : {}) };
  }

  const fg = resolveColor(store, cssToPath, foreground, brand);
  const bg = resolveColor(store, cssToPath, background, brand);
  if (!fg) return { error: `Unknown colour or token: ${foreground}` };
  if (!bg) return { error: `Unknown colour or token: ${background}` };

  const px = toPx(fontSize);
  const largeText =
    px != null && (px >= LARGE_PX || (bold && px >= LARGE_BOLD_PX));
  const ratio = contrastRatio(fg.value, bg.value);

  const base = {
    foreground: fg.token ?? fg.value,
    background: bg.token ?? bg.value,
    foregroundValue: fg.value,
    backgroundValue: bg.value,
    ...(brand ? { brand } : {}),
    ...(source ? { declaredBy: source } : {}),
    largeText,
  };

  if (ratio === null) {
    // A resolved value wasn't a flat 6-digit hex (gradient, color-mix, …).
    return {
      ...base,
      opinion: false,
      note: "One value is not a flat hex colour — no contrast opinion.",
    };
  }

  const aa = largeText ? AA_LARGE : AA_NORMAL;
  const aaa = largeText ? AAA_LARGE : AAA_NORMAL;
  return {
    ...base,
    ratio: Math.round(ratio * 100) / 100,
    threshold: aa,
    passesAA: ratio >= aa,
    passesAAA: ratio >= aaa,
  };
}

// Resting content surfaces — the backgrounds prose and labels actually sit on.
// NOT a list of every background token: fills (action, danger, success…) are
// covered by the on-<role> convention below, and background.inverted is a dark
// surface whose text is foreground.on-inverted, likewise on-<role>.
//
// `elevated` and `hover` exist only in decision-engine, and their absence here
// was a real hole (#216). DE renders most of its content on background.elevated
// — its consumer's contrast script literally nicknames that token WHITE — so a
// base-shaped list of {default, alt} meant validate_brand('decision-engine')
// checked ZERO pairs on the surface the brand mostly uses. A pair that fails
// there would have passed the gate in silence, which is exactly how the DE
// success-green bug (#215) survived on background.alt until that surface
// happened to be in scope.
const SURFACE_ROLES = ["default", "alt", "elevated", "hover"];

// Text roles meant for those surfaces. `secondary` and `tertiary` are DE-only;
// listing them here costs nothing for brands that lack them (see `has` below)
// and closes the second half of the same hole — DE had a text role the base
// list had never heard of.
//
// Deliberately absent: `disabled` and `inactive` (WCAG exempts inactive
// controls), `inverse`/`on-*` (they belong to fills and dark surfaces, handled
// by the on-<role> convention), and the accent family (its fg/bg names are not
// cleanly parallel — see the note on intendedPairings).
const TEXT_ROLES = [
  "default",
  "alt",
  "muted",
  "action",
  "secondary",
  "tertiary",
];

/**
 * The foreground/background token pairs the system *intends* to be used together,
 * derived by naming convention. Covers only the pairings where a failure is
 * unambiguously a bug:
 *   - foreground.on-<role>  →  background.<role>   ("text ON the <role> fill")
 *   - TEXT_ROLES  →  SURFACE_ROLES                 (text on resting surfaces)
 * foreground.disabled is exempt (WCAG exempts disabled controls).
 *
 * BRAND-AWARE (#216). The token universe is base ∪ the brand's own overrides, so
 * a role that exists only in a sub-brand is still paired. Before this, both the
 * iteration and the existence check read `store.base` alone, which meant every
 * DE-only surface and text role was invisible to the gate — see SURFACE_ROLES.
 * Passing no brand reproduces the base-only behaviour exactly.
 *
 * Deliberately NOT covered: the accent family (foreground.accent-* /
 * accent-on-* over background.accent-* / accent-*-bold). The accent taxonomy has
 * both subtle (`accent-green`) and bold (`accent-green-bold`) fills and its
 * fg/bg names aren't cleanly parallel, so convention-derived pairing mis-matches
 * (producing impossible <2:1 "failures"). Auditing accent pairings needs an
 * explicit pairing map — see the contrast-tooling decision entry. Same "no
 * opinion outside the known rules" stance as check_assembly.
 */
export function intendedPairings(store, brand = null) {
  const brandTokens = brand ? store.brands.get(brand) : null;
  const has = (p) => store.base.has(p) || Boolean(brandTokens?.has(p));
  const pairs = [];
  const seen = new Set();
  const add = (fg, bg) => {
    const k = `${fg}|${bg}`;
    if (has(fg) && has(bg) && !seen.has(k)) {
      seen.add(k);
      pairs.push({ fg, bg });
    }
  };

  // A brand override and its base definition are the same role, so walk the
  // union of names — otherwise a DE-only role is never reached, and a role the
  // brand overrides would be visited twice (hence `seen`).
  const names = new Set([...store.base.keys(), ...(brandTokens?.keys() ?? [])]);
  for (const path of names) {
    if (!path.startsWith("color.foreground.")) continue;
    const seg = path.slice("color.foreground.".length);
    if (seg.startsWith("on-")) {
      add(path, `color.background.${seg.slice(3)}`);
    } else if (TEXT_ROLES.includes(seg)) {
      for (const role of SURFACE_ROLES) add(path, `color.background.${role}`);
    }
    // accent-* and disabled: out of convention scope — the explicit pairing
    // map (tokens/pairings.json) carries them. See loadPairingMap().
  }
  return pairs;
}

/**
 * The explicit pairing map (#87): tokens/pairings.json. Carries the pairs
 * convention can't derive — the accent family, alert-surface text, and the
 * non-text (SC 1.4.11, 3:1) interactive edges. Each entry:
 *   { fg, bg, kind: 'text'|'non-text', context, excludeBrands? }
 * Returns [] when the file is absent (older checkouts, consumer copies).
 */
export function loadPairingMap(root = resolve(import.meta.dirname, "..")) {
  try {
    const { pairs } = JSON.parse(
      readFileSync(resolve(root, "tokens/pairings.json"), "utf8"),
    );
    return Array.isArray(pairs) ? pairs : [];
  } catch {
    return [];
  }
}

/**
 * Pairs a brand is scoped out of *whatever named them* (#216). Each entry:
 *   { fg, bg, brands: [...], reason }
 *
 * This is the escape hatch for a pair the convention derives but the brand does
 * not render. It exists because widening SURFACE_ROLES/TEXT_ROLES necessarily
 * generates some combinations nobody draws — `excludeBrands` on a map entry
 * cannot reach those, since convention pairs have no map entry to hang it on.
 *
 * It is NOT a place to park a failing pair. Every entry must say who confirmed
 * the pair is unrendered and carry the measured ratio, so a later reader can
 * tell "we never draw this" from "this was red and we looked away" — and knows
 * exactly what they would be inheriting if they ever did draw it.
 */
export function loadPairingExclusions(
  root = resolve(import.meta.dirname, ".."),
) {
  try {
    const { exclusions } = JSON.parse(
      readFileSync(resolve(root, "tokens/pairings.json"), "utf8"),
    );
    return Array.isArray(exclusions) ? exclusions : [];
  } catch {
    return [];
  }
}

/**
 * Union of three sources, deduped by fg|bg in increasing authority:
 *   1. convention-derived pairs (intendedPairings)
 *   2. pairs the components *declare* in their anatomy (#156 stage 2)
 *   3. the explicit map (tokens/pairings.json)
 *
 * `excludeBrands` is then applied as a filter over the merged set, not as a
 * skip while building it. That distinction is load-bearing: a skip only keeps
 * an excluded pair out if no *other* source contributes it, and anatomy
 * contributes exactly the four accent-tint pairs decision-engine is excluded
 * from (rr-badge's accent variants). Scoping a pair out of a brand has to mean
 * the brand isn't checked on it, whoever named it.
 *
 * The same is true of `exclusions` (#216), applied last for the same reason —
 * and it has to be a separate list rather than an `excludeBrands` on a map
 * entry, because the pairs it scopes out are convention-derived and have no map
 * entry to hang a flag on.
 *
 * @param {object} opts.metas       component metas, for the anatomy source
 * @param {Array}  opts.pairings    override the explicit map (tests inject synthetic pairs)
 * @param {Array}  opts.exclusions  override the exclusion list (tests likewise)
 */
export function allIntendedPairings(
  store,
  brand = null,
  { metas = [], pairings = null, exclusions = null } = {},
) {
  const map = pairings ?? loadPairingMap();
  const excluded = exclusions ?? loadPairingExclusions();
  const merged = new Map();
  const key = (p) => `${p.fg}|${p.bg}`;

  for (const p of intendedPairings(store, brand)) {
    merged.set(key(p), { ...p, kind: "text" });
  }
  for (const p of anatomyPairings(metas, store)) {
    merged.set(key(p), {
      fg: p.fg,
      bg: p.bg,
      kind: p.kind,
      context: p.context,
    });
  }
  for (const p of map) {
    if (brand && p.excludeBrands?.includes(brand)) continue;
    merged.set(key(p), {
      fg: p.fg,
      bg: p.bg,
      kind: p.kind ?? "text",
      context: p.context,
    });
  }
  if (brand) {
    for (const p of map) {
      if (p.excludeBrands?.includes(brand)) merged.delete(key(p));
    }
    for (const e of excluded) {
      if (e.brands?.includes(brand)) merged.delete(key(e));
    }
  }
  return [...merged.values()];
}

/**
 * Validate that every intended foreground/background pairing keeps WCAG AA
 * (4.5:1, normal text) once a sub-brand's overrides are applied. Catches the
 * classic regression: a brand re-tints a background but not its on-colour.
 * @returns {object|null} null if the brand is unknown
 */
export function validateBrand(store, brand, metas = []) {
  if (!store.brands.has(brand)) return null;
  const failures = [];
  const pairs = allIntendedPairings(store, brand, { metas });
  for (const { fg, bg, kind } of pairs) {
    const fgVal = resolveToken(store, fg, { brand })?.value;
    const bgVal = resolveToken(store, bg, { brand })?.value;
    const ratio = fgVal && bgVal ? contrastRatio(fgVal, bgVal) : null;
    const threshold = kind === "non-text" ? AA_LARGE : AA_NORMAL;
    if (ratio !== null && ratio < threshold) {
      failures.push({
        foreground: toCssVar(fg),
        background: toCssVar(bg),
        kind,
        ratio: Math.round(ratio * 100) / 100,
        threshold,
      });
    }
  }
  failures.sort((a, b) => a.ratio - b.ratio);
  return {
    brand,
    checkedPairs: pairs.length,
    failures,
    valid: failures.length === 0,
  };
}

/**
 * Gate-facing sweep: every intended pairing (convention + explicit map) is
 * checked against the BASE theme and every brand. Returns one row per
 * failure; empty array = the whole system passes. Used by validate.mjs.
 */
export function validateAllPairings(store, metas = []) {
  const failures = [];
  for (const brand of [null, ...store.brands.keys()]) {
    const pairs = allIntendedPairings(store, brand, { metas });
    for (const { fg, bg, kind } of pairs) {
      const opt = brand ? { brand } : {};
      const fgVal = resolveToken(store, fg, opt)?.value;
      const bgVal = resolveToken(store, bg, opt)?.value;
      const ratio = fgVal && bgVal ? contrastRatio(fgVal, bgVal) : null;
      const threshold = kind === "non-text" ? AA_LARGE : AA_NORMAL;
      if (ratio === null) {
        failures.push({
          brand: brand ?? "base",
          fg,
          bg,
          kind,
          ratio: null,
          threshold,
          reason: "unresolvable token",
        });
      } else if (ratio < threshold) {
        failures.push({
          brand: brand ?? "base",
          fg,
          bg,
          kind,
          ratio: Math.round(ratio * 100) / 100,
          threshold,
        });
      }
    }
  }
  return failures;
}
