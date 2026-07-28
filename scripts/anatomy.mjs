/**
 * anatomy.mjs — the `anatomy` section of *.meta.json (#156 stage 2).
 *
 * A component's anatomy is a named part tree; each part binds semantic tokens
 * for background / foreground / border / spacing / font, with optional state
 * overlays (`variant=success`, `disabled`, `:hover`). It is *transcribed* from
 * the component's real styles — this module never infers one.
 *
 * Pure functions only, in the shape assembly.mjs established: validate.mjs
 * consumes the `unresolved*` checks as build gates, contrast.mjs consumes
 * anatomyPairings() as a third source of intended fg/bg pairs alongside the
 * convention set and tokens/pairings.json.
 */

import { cssVarToPathMap } from "./tokens.mjs";

/** Colour values that are deliberately not tokens (#114: `transparent` is a keyword). */
const COLOR_LITERALS = new Set(["transparent", "currentColor"]);

/** The binding keys whose values are colours — the ones contrast cares about. */
const COLOR_KEYS = new Set(["background", "foreground", "border"]);

/**
 * Walk a meta's part tree depth-first.
 * @returns {Array<{ path: string, part: object }>} dotted part paths, e.g. "root.button.label"
 */
export function flattenParts(meta) {
  const out = [];
  const walk = (parts, prefix) => {
    for (const part of parts ?? []) {
      const path = prefix ? `${prefix}.${part.name}` : part.name;
      out.push({ path, part });
      walk(part.parts, path);
    }
  };
  walk(meta?.anatomy?.parts, "");
  return out;
}

/** Every token binding on a part: its resting set plus one entry per state overlay. */
function bindingSets(part) {
  const sets = [];
  if (part.tokens) sets.push({ state: null, tokens: part.tokens });
  for (const s of part.states ?? []) {
    if (s.tokens) sets.push({ state: s.when, tokens: s.tokens });
  }
  return sets;
}

/** A binding value is one token, a list of them, or a non-token literal. */
function tokenValues(value) {
  return (Array.isArray(value) ? value : [value]).filter(
    (v) => typeof v === "string" && !COLOR_LITERALS.has(v),
  );
}

/**
 * Every anatomy token binding must resolve to a token that exists — the same
 * idiom as validate.mjs §3 for {a.b.c} references. A dangling binding is a
 * rename that wasn't propagated; it fails the build instead of shipping.
 * @returns {Array<{ component, part, state, key, token }>}
 */
export function unresolvedAnatomyTokens(metas, store) {
  const cssToPath = cssVarToPathMap(store);
  const out = [];
  for (const meta of metas) {
    for (const { path, part } of flattenParts(meta)) {
      for (const { state, tokens } of bindingSets(part)) {
        for (const [key, value] of Object.entries(tokens)) {
          for (const token of tokenValues(value)) {
            if (!cssToPath.has(token)) {
              out.push({
                component: meta.name,
                part: path,
                state,
                key,
                token,
              });
            }
          }
        }
      }
    }
  }
  return out;
}

/**
 * The condition a state overlay fires on. `:hover` → pseudo-class (not checked
 * against anything); `variant=success` / `disabled` → a declared prop; `data-*`
 * → an internal state attribute the component sets itself, not a public prop.
 */
function parseWhen(when) {
  if (when.startsWith(":")) return { kind: "pseudo", name: when.slice(1) };
  const name = when.split("=")[0];
  if (name.startsWith("data-")) return { kind: "attribute", name };
  return { kind: "prop", name };
}

/**
 * A state overlay whose `when` names a prop the component doesn't declare is a
 * typo that would silently never fire. Same fencing principle as the slot
 * `accepts` check (validate.mjs §1b).
 * @returns {Array<{ component, part, when, prop }>}
 */
export function unresolvedAnatomyStates(metas) {
  const out = [];
  for (const meta of metas) {
    const props = new Set((meta.props ?? []).map((p) => p.name));
    for (const { path, part } of flattenParts(meta)) {
      for (const state of part.states ?? []) {
        const { kind, name } = parseWhen(state.when);
        if (kind === "prop" && !props.has(name)) {
          out.push({
            component: meta.name,
            part: path,
            when: state.when,
            prop: name,
          });
        }
      }
    }
  }
  return out;
}

/**
 * The foreground/background pairs the components actually declare — contrast
 * checked against the contract instead of naming convention.
 *
 * Deliberately narrow, and the narrowness is the point:
 *   - Text pairs only. A part's `border` is compared against nothing here: a
 *     badge's border equals its own fill, so self-comparison is meaningless,
 *     and the surrounding surface isn't knowable from the contract. Non-text
 *     (SC 1.4.11) edges stay with tokens/pairings.json.
 *   - Both sides must be declared on the same part. No inheriting a background
 *     from an ancestor — that would invent a pairing the code never states.
 *   - `disabled` states are exempt (WCAG exempts disabled controls; the system
 *     pairs foreground.disabled with background.disabled at 1:1 on purpose).
 *   - Non-token literals (`transparent`) yield no pair.
 *   - Unresolvable tokens yield no pair — unresolvedAnatomyTokens already
 *     reports those by name rather than guessing at a value here.
 *
 * A state overlay inherits the part's resting bindings for keys it doesn't
 * override, so `:hover { background }` still pairs against the resting text.
 *
 * @returns {Array<{ fg, bg, kind, context, component, part, state }>} deduped by fg|bg
 */
export function anatomyPairings(metas, store) {
  const cssToPath = cssVarToPathMap(store);
  const seen = new Map();
  for (const meta of metas) {
    for (const { path, part } of flattenParts(meta)) {
      const resting = part.tokens ?? {};
      const overlays = [
        { state: null, tokens: resting },
        ...(part.states ?? []).map((s) => ({
          state: s.when,
          tokens: { ...resting, ...s.tokens },
        })),
      ];
      for (const { state, tokens } of overlays) {
        if (state && parseWhen(state).name === "disabled") continue;
        const fg = cssToPath.get(tokens.foreground);
        const bg = cssToPath.get(tokens.background);
        if (!fg || !bg) continue;
        const key = `${fg}|${bg}`;
        if (seen.has(key)) continue;
        seen.set(key, {
          fg,
          bg,
          kind: "text",
          context: `${meta.name} anatomy: ${path}${state ? ` (${state})` : ""}`,
          component: meta.name,
          part: path,
          state,
        });
      }
    }
  }
  return [...seen.values()];
}

/**
 * Look one declared pairing up by component + part (+ state) — backs
 * check_contrast's contract mode. Returns null when the component, the part,
 * or the pairing doesn't exist; the caller names what was missing.
 */
export function findPartPairing(metas, component, part, state = null) {
  const meta = metas.find((m) => m.name === component);
  if (!meta) return null;
  const hit = flattenParts(meta).find(
    ({ path, part: p }) => path === part || p.name === part,
  );
  if (!hit) return null;
  const resting = hit.part.tokens ?? {};
  if (!state) {
    return resting.foreground && resting.background
      ? { foreground: resting.foreground, background: resting.background }
      : null;
  }
  const overlay = (hit.part.states ?? []).find((s) => s.when === state);
  if (!overlay) return null;
  const tokens = { ...resting, ...overlay.tokens };
  return tokens.foreground && tokens.background
    ? { foreground: tokens.foreground, background: tokens.background }
    : null;
}

/** The parts a component declares, for error messages that list real options. */
export function partPaths(metas, component) {
  const meta = metas.find((m) => m.name === component);
  return meta ? flattenParts(meta).map(({ path }) => path) : [];
}
