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
const HEX = "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b";
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
  for (const rule of RULES) {
    const matches = [...new Set(rule.find(text))];
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
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
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
