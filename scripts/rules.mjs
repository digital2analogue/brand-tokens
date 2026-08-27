/**
 * rules.mjs — the single source of truth for design-system lint rules.
 *
 * Every checker imports from here:
 *   - scripts/validate.mjs        (lints component source on build)
 *   - scripts/drift-lint.mjs      (scans consumer repos, used by the CI Action)
 *   - packages/mcp/src/server.mjs (the agent-facing check_usage tool)
 *
 * Before this module existed, each of those re-implemented the same regexes
 * by hand and they had already drifted apart. If a rule needs to change,
 * change it once, here.
 */

// ── Patterns ────────────────────────────────────────────────────────────────

// Valid CSS hex colors: 3, 4, 6, or 8 digits. (Catches #RGBA / #RRGGBBAA too.)
//
// The leading (?<!\w) is load-bearing. `#114` and `#1234` are valid CSS hex
// shorthands, so an unguarded pattern reports every GitHub issue reference in a
// comment as a hardcoded colour — `parsimony#114` is what put lib/tokenValues.ts
// in a weekly drift report for a week (portfolio-vercel, parsimony#174). A hex
// colour is never preceded by a word character in real CSS; an issue reference
// almost always is.
const HEX = "(?<!\\w)#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b";
// Primitive token references — never allowed in UI/component code.
const PRIMITIVE = "--primitive-[a-z][a-z-]*";
// Hardcoded numeric font-size (e.g. `font-size: 14px`) — use font tokens.
const FONT_SIZE = "font-size:\\s*[0-9]";
// Hardcoded font-weight (e.g. `font-weight: 700` / `bold`) — use --font-weight-*.
// `var(--…)`, `normal`, and the CSS-wide keywords are not literals, so they
// don't match and need no allowlist entry.
const FONT_WEIGHT = "font-weight:\\s*(?:\\d+|bold|bolder|lighter)\\b";
// font-family naming anything other than a --font-family-* token, a generic
// CSS family, or one of the three approved families (hard rule #3). The negative
// lookahead lets `var(--…)`, generics, CSS-wide keywords, and the approved
// families (optionally quoted) through; anything else (e.g. `Arial`) is flagged.
// The negative lookahead sits right after the fixed `font-family:` colon and
// consumes the leading whitespace itself — if it were `\s*(?!…)` the `\s*` would
// backtrack to zero and slide the anchor onto the space, defeating the allowlist.
const FONT_FAMILY =
  "font-family:(?!\\s*['\"]?(?:var\\(|inherit|initial|unset|monospace|sans-serif|serif|system-ui|ui-monospace|Space Grotesk|Spectral|JetBrains Mono))\\s*[^;{}\\n]+";

// A transition/animation declaration, captured whole so the duration can be
// judged in the context of its own value rather than line-wide.
const DURATION_DECL =
  "(?:transition|animation)(?:-duration|-delay)?:[^;{}\\n]*";
// A bare CSS time literal (120ms, 0.8s) not embedded in an identifier — the
// lookarounds keep a keyframe name like `slide-in-2s` from reading as a time.
const RAW_TIME = /(?<![\w-])\d*\.?\d+m?s(?![\w-])/;
// `var(--x, 200ms)` uses the token; the literal is a fallback that only applies
// when the token is undefined, and is therefore not a hardcoded duration.
const stripVars = (decl) => decl.replace(/var\([^()]*\)/g, " ");

// Deprecated tokens — removed from the system; flag any lingering references and
// point at the live replacement. Replacements are grounded in ai/DECISION-ENGINE.md
// ("Tokens That Were Deleted" / "Tokens That Were Renamed"). The whole color.state.*
// category was eliminated — hover/selected route through action-hover/border-hover/
// action/background-alt now.
export const DEPRECATED_TOKENS = [
  {
    token: "--color-foreground-accent",
    replacement:
      "--color-foreground-accent-{green|blue|violet|amber} (named slots)",
  },
  {
    token: "--color-background-accent",
    replacement: "--color-background-action",
  },
  {
    token: "--color-foreground-on-accent",
    replacement: "--color-foreground-accent-on-{color} (named)",
  },
  {
    token: "--color-foreground-primary",
    replacement: "--color-foreground-default",
  },
  {
    // D-09 (2026-04-26) renamed foreground.secondary -> foreground.alt. The base
    // followed; decision-engine did not, so DE carried both names for one role
    // until 2026-08-18. Still DEFINED in the DE brand as a same-value alias so a
    // live consumer does not lose its text colour mid-migration — this entry is
    // what makes the migration visible in drift reports rather than silent.
    token: "--color-foreground-secondary",
    replacement: "--color-foreground-alt",
  },
  { token: "--color-feedback-error", replacement: "--color-foreground-danger" },
  {
    token: "--color-feedback-danger-foreground",
    replacement: "--color-foreground-danger",
  },
  {
    token: "--color-foreground-accent-red",
    replacement: "--color-foreground-danger",
  },
  {
    token: "--color-foreground-on-accent-red",
    replacement: "--color-foreground-on-danger",
  },
  {
    token: "--color-state-hover",
    replacement:
      "--color-background-action-hover (or --color-border-hover for outlines)",
  },
  {
    token: "--color-state-selected",
    replacement:
      "--color-background-action (or --color-background-alt for subtle)",
  },
];

// Fast lookup by token name → { token, replacement }. Used by the MCP get_token
// tool to answer "this token was removed; use X instead".
export const DEPRECATED = new Map(DEPRECATED_TOKENS.map((d) => [d.token, d]));

// Lines matching these are exempt from the hex rule (false positives).
export const HEX_ALLOWLIST = [
  /url\(#/, // SVG fragment IDs, e.g. fill="url(#grad)"
  /sourceMappingURL/, // source maps
];

/**
 * Blank out comment bodies before linting, preserving line count and column
 * positions so reported line numbers stay true.
 *
 * A value written in a comment is documentation, not styling — it ships no
 * colour and sets no font. Every rule here exists to stop a hardcoded value
 * reaching the rendered UI, and a comment never does.
 *
 * This is the fix for a whole class of false positive that had a consumer's
 * weekly drift report crying wolf for a week (parsimony#174): `parsimony#114`
 * read as the hex colour `#114`, `// see issue #1234` as `#1234`, and a JSDoc
 * explaining *why* a colour fails contrast ("OTKit's accent-yellow #FDAF08 is
 * 1.86:1") read as someone hardcoding it. A checker that cries wolf gets
 * ignored, which costs more than the rule enforces.
 *
 * Deliberately not stripped: string literals. A hex inside a template literal
 * may well be shipped — and where it genuinely isn't (a lint playground's
 * sample-violation snippets) that is what `.driftignore` is for.
 */
export function stripComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, blank) // /* block */ and /** jsdoc */
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (m, pre) => pre + blank(m.slice(pre.length)),
    );
}

/**
 * The canonical rule set. `id` is stable for programmatic use; `message` is
 * what humans and agents see. `test` finds matches in a string.
 */
export const RULES = [
  {
    id: "no-hex",
    hardRule: 1,
    message: "No hardcoded colors. Use var(--color-*) custom properties",
    find: (text) => matchAll(text, HEX),
    allowlist: HEX_ALLOWLIST,
  },
  {
    id: "no-primitive",
    hardRule: 9,
    message:
      "Never reference primitive tokens (--primitive-*) in UI code. Use the semantic layer",
    find: (text) => matchAll(text, PRIMITIVE),
  },
  {
    id: "no-hardcoded-font-size",
    hardRule: 8,
    message:
      "No hardcoded font sizes. Use var(--font-size-*) primitives or a font shorthand token",
    find: (text) => matchAll(text, FONT_SIZE),
  },
  {
    id: "no-hardcoded-font-weight",
    hardRule: 2,
    message:
      "No hardcoded font weights. Use var(--font-weight-*) custom properties",
    find: (text) => matchAll(text, FONT_WEIGHT),
  },
  {
    id: "no-unapproved-font-family",
    hardRule: 3,
    message:
      "Font family must be a var(--font-family-*) token (or a generic family). Only Space Grotesk, Spectral, and JetBrains Mono are approved",
    find: (text) => matchAll(text, FONT_FAMILY).map((m) => m.trim()),
  },
  {
    id: "no-component-token",
    hardRule: 9,
    message:
      "The component token tier was removed (#114). Reference the semantic token the component token aliased",
    find: (text) => matchAll(text, "--component-[a-z][a-z-]*"),
  },
  {
    id: "no-hardcoded-duration",
    hardRule: 10,
    message:
      "No hardcoded transition/animation durations. Use var(--motion-duration-*) or a var(--motion-transition-*) shorthand, so prefers-reduced-motion can zero it",
    // Sound, deliberately incomplete. Three things are NOT flagged, each for a
    // reason, and the incompleteness is the point — a checker that cries wolf
    // gets ignored, which costs more than the rule enforces (#174):
    //
    //   1. `infinite` animations. The token override cannot reach them (a
    //      zeroed duration would stop a spinner rather than damp it) and a
    //      spinner's 800ms is deliberately off-scale, so hard-10 requires them
    //      to carry their own reduce guard instead. Enforced by validate, not here.
    //   2. `var(--token, 120ms)` fallbacks — the token is what applies.
    //   3. Any file that contains a reduce guard at all (see skipFile).
    //
    // What remains is the case that is unambiguously unprotected: a literal
    // duration in a file with no reduced-motion handling anywhere in it.
    find: (text) =>
      matchAll(text, DURATION_DECL)
        .filter((decl) => !/\binfinite\b/.test(decl))
        .filter((decl) => RAW_TIME.test(stripVars(decl)))
        .map((decl) => decl.trim()),
    // Whether a hardcoded duration is protected is a cascade question, not a
    // lexical one: the guard that covers a declaration usually lives in a
    // separate @media block, sometimes selecting the element by class from far
    // away. Rather than guess at coverage, stay silent on any file that does
    // reduced-motion work at all. Measured before shipping: this reports the
    // one genuine defect across 27 components and nothing at all across the
    // consumer site, where every hit sat under an explicit guard.
    skipFile: (text) => /prefers-reduced-motion/.test(text),
  },
  {
    id: "deprecated-token",
    hardRule: null,
    message:
      'Deprecated token. See ai/DECISION-ENGINE.md "Tokens That Were Deleted"',
    // Returns matched token-name strings (shape unchanged for validate + drift-lint).
    // Boundary-aware: several deprecated names are prefixes of their own live
    // replacements (--color-background-accent vs --color-background-accent-green),
    // so a bare substring match would flag the replacement too.
    find: (text) =>
      DEPRECATED_TOKENS.filter((d) =>
        new RegExp(`${d.token}(?![-\\w])`).test(text),
      ).map((d) => d.token),
  },
];

/**
 * The other half of hard-10, kept here so both halves of the rule live in one
 * file even though only one of them is a lint rule.
 *
 * An infinite animation cannot be stopped by zeroing --motion-duration-*: a 0s
 * spinner does not damp, it vanishes. So the rule requires the source to carry
 * its own `@media (prefers-reduced-motion: reduce)` guard instead.
 *
 * Sound only where styles are self-contained — each rr-* component ships its
 * own shadow-DOM styles, so its guard must be in its own source. That does not
 * hold for a consumer stylesheet, where the guard may sit anywhere, which is
 * why validate uses this and drift-lint does not.
 */
export function missingReduceGuard(text) {
  const src = stripComments(text);
  return /\binfinite\b/.test(src) && !/prefers-reduced-motion/.test(src);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// Fresh regex per call so the global lastIndex never leaks between scans.
function matchAll(text, pattern) {
  return text.match(new RegExp(pattern, "g")) ?? [];
}

function allowlisted(rule, line) {
  return rule.allowlist?.some((re) => re.test(line)) ?? false;
}

// ── Public linters ──────────────────────────────────────────────────────────

/**
 * Lint a snippet (the agent-facing check_usage path).
 * Returns one entry per violated rule: { id, rule, matches }.
 */
export function lintSnippet(text) {
  const violations = [];
  const src = stripComments(text);
  for (const rule of RULES) {
    if (rule.skipFile?.(src)) continue;
    const matches = [...new Set(rule.find(src))];
    if (matches.length > 0) {
      violations.push({ id: rule.id, rule: rule.message, matches });
    }
  }
  return violations;
}

/**
 * Lint file content line by line (validate + drift scanning).
 * Returns one entry per offending line: { line, id, rule, match }.
 */
export function lintLines(text) {
  const violations = [];
  const src = stripComments(text);
  // Evaluated once against the whole file — a rule that opts out on file-level
  // context must not re-decide per line, where that context is invisible.
  const active = RULES.filter((rule) => !rule.skipFile?.(src));
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    for (const rule of active) {
      if (allowlisted(rule, line)) continue;
      const matches = rule.find(line);
      if (matches.length > 0) {
        violations.push({
          line: i + 1,
          id: rule.id,
          rule: rule.message,
          match: matches[0],
        });
      }
    }
  });
  return violations;
}
