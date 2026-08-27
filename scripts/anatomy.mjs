/**
 * anatomy.mjs — the `anatomy` section of *.meta.json (#156 stage 2).
 *
 * A component's anatomy is a named part tree; each part binds semantic tokens
 * for background / foreground / border / spacing / font / radius / shadow /
 * motion / focus, with optional state overlays (`variant=success`, `disabled`,
 * `:hover`, or several of those ANDed). It is *transcribed* from the
 * component's real styles — this module never infers one.
 *
 * v2 (#178 items 1-2) added the last four keys and compound/negated conditions.
 * Together they took the count of tokens declared in `tokensUsed` but attached
 * to no part from 29 to zero, which is what unblocks deriving `tokensUsed` from
 * anatomy (#188). `focus` is bound by role rather than by the CSS that draws it
 * — see the schema for why.
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
    if (s.tokens) sets.push({ state: stateLabel(s.when), tokens: s.tokens });
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
 * One condition term. `:hover` → pseudo-class (not checked against anything);
 * `variant=success` / `disabled` → a declared prop; `data-*` → an internal
 * state attribute the component sets itself, not a public prop.
 *
 * A leading `!` negates the term and is stripped before classification — a
 * misspelled prop is a typo whether the selector guards on its presence or its
 * absence, so negation must not become an escape hatch from the prop check.
 */
export function parseCondition(term) {
  const when = term.startsWith("!") ? term.slice(1) : term;
  if (when.startsWith(":")) return { kind: "pseudo", name: when.slice(1) };
  const name = when.split("=")[0];
  if (name.startsWith("data-")) return { kind: "attribute", name };
  return { kind: "prop", name };
}

/**
 * A state's `when` as a list of terms. One string is a single-term condition;
 * an array is several ANDed (#178 item 2). Callers always see a list, so the
 * two forms need no branching downstream.
 */
export function whenTerms(when) {
  return Array.isArray(when) ? when : [when];
}

/**
 * Canonical string form of a condition, for display and for lookup by name.
 * Terms cannot contain spaces (the schema pattern forbids them), so " + " is an
 * unambiguous join: `["variant=secondary", ":hover"]` → "variant=secondary + :hover".
 */
export function stateLabel(when) {
  return whenTerms(when).join(" + ");
}

/**
 * What a part actually renders under one state overlay.
 *
 * A compound state is a *refinement* of the simpler states it contains, not an
 * independent overlay on the resting set — `:host([variant='secondary'])
 * button:hover` cascades over both `button:hover` and
 * `:host([variant='secondary']) button`. Composing it against resting alone
 * pairs the hover background with the resting foreground, a combination that
 * never renders: for rr-button that produced `foreground.on-action` on
 * `background.alt` at 1.23:1 and failed the build with a defect that does not
 * exist. Confident wrong answers are the failure mode anatomy is supposed to
 * avoid, so the cascade is modelled rather than approximated.
 *
 * Applied in authored order, narrower states last — matching CSS, where the
 * more specific rule appears later in the sheet.
 */
export function effectiveTokens(resting, states, target) {
  const targetTerms = new Set(whenTerms(target.when));
  const applies = states.filter(
    (s) =>
      s !== target &&
      whenTerms(s.when).every((t) => targetTerms.has(t)) &&
      whenTerms(s.when).length < targetTerms.size,
  );
  const inherited = applies.reduce((acc, s) => ({ ...acc, ...s.tokens }), {
    ...resting,
  });
  return { ...inherited, ...target.tokens };
}

/**
 * Whether a condition means the control is disabled — WCAG exempts disabled
 * controls from contrast, so anatomyPairings skips these overlays.
 *
 * Any non-negated `disabled` term qualifies, at any position in a compound.
 * `!disabled` does NOT: it asserts the control is *enabled*, and treating it as
 * exempt would silently drop a pairing that has to hold.
 */
export function isDisabledState(when) {
  return whenTerms(when).some(
    (t) => !t.startsWith("!") && parseCondition(t).name === "disabled",
  );
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
        // Every term of a compound condition is checked, not just the first —
        // otherwise a typo hides behind a valid leading term.
        for (const term of whenTerms(state.when)) {
          const { kind, name } = parseCondition(term);
          if (kind === "prop" && !props.has(name)) {
            out.push({
              component: meta.name,
              part: path,
              when: term,
              prop: name,
            });
          }
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
      const states = part.states ?? [];
      const overlays = [
        { state: null, tokens: resting },
        ...states.map((s) => ({
          state: stateLabel(s.when),
          when: s.when,
          tokens: effectiveTokens(resting, states, s),
        })),
      ];
      for (const { state, when, tokens } of overlays) {
        if (when && isDisabledState(when)) continue;
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
  // Compared by canonical label, so a caller can name a compound condition as
  // either the array or the joined string check_contrast reports back to them.
  const wanted = stateLabel(state);
  const overlay = (hit.part.states ?? []).find(
    (s) => stateLabel(s.when) === wanted,
  );
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
