/**
 * rules-fixtures.spec.mjs — the fixture-per-detector fence (#151).
 *
 * Every rule in scripts/rules.mjs must ship a synthetic fixture pair here:
 * `violating` snippets the rule MUST flag, `clean` snippets that MUST produce
 * zero violations across the whole rule set. The coverage tests fail when a
 * rule is added without fixtures — or when fixtures outlive a removed rule —
 * so a detector can never land (or disappear) unproven.
 *
 * Fixtures are synthetic by design: never pin them to live token data, which
 * inverts when the data is fixed (CLAUDE.md, Branch & PR Workflow §3). The MCP
 * workspace tests cover the check_usage *tool* surface; this suite is the
 * rule-level fence that stays put even if the tool's shape changes.
 */
import { describe, it, expect } from "vitest";
import { RULES, lintSnippet, lintLines } from "../../scripts/rules.mjs";

const FIXTURES = {
  "no-hex": {
    violating: [
      "color: #4ADE6E;",
      "background: #fff;",
      "border-color: #C8002EAA;", // 8-digit RRGGBBAA form
    ],
    clean: [
      "color: var(--color-foreground-action);",
      "background: var(--color-background-alt);",
    ],
  },
  "no-primitive": {
    violating: [
      "padding: var(--primitive-space-md);",
      "color: var(--primitive-color-green-500);",
    ],
    clean: ["padding: var(--spacing-element);", "gap: var(--spacing-tight);"],
  },
  "no-hardcoded-font-size": {
    violating: ["font-size: 14px;", "font-size: 0.875rem;"],
    clean: [
      "font-size: var(--font-size-sm);",
      "font: var(--font-label-medium);",
    ],
  },
  "no-hardcoded-font-weight": {
    violating: [
      "font-weight: 700;",
      "font-weight: bold;",
      "font-weight: lighter;",
    ],
    clean: [
      "font-weight: var(--font-weight-medium);",
      "font-weight: normal;", // not a literal weight — needs no token
      "font-weight: inherit;",
    ],
  },
  "no-unapproved-font-family": {
    violating: [
      "font-family: Arial, sans-serif;",
      'font-family: "Helvetica Neue", sans-serif;',
    ],
    clean: [
      "font-family: var(--font-family-sans);",
      'font-family: "JetBrains Mono", monospace;', // approved family, quoted
      "font-family: system-ui;", // generic families pass
    ],
  },
  "deprecated-token": {
    violating: [
      "color: var(--color-state-hover);",
      "color: var(--color-foreground-accent);",
    ],
    clean: [
      // Boundary fence: these live tokens are prefix-extensions of deprecated
      // names and must NOT flag (the 2026-07-16 substring-match regression).
      "background: var(--color-background-accent-green);",
      "color: var(--color-foreground-accent-amber);",
    ],
  },
};

describe("fixture coverage is mechanical", () => {
  it("every rule has a violating + clean fixture pair", () => {
    for (const rule of RULES) {
      const f = FIXTURES[rule.id];
      expect(f, `rule "${rule.id}" has no fixtures — add a pair`).toBeDefined();
      expect(f.violating.length, `rule "${rule.id}" violating`).toBeGreaterThan(
        0,
      );
      expect(f.clean.length, `rule "${rule.id}" clean`).toBeGreaterThan(0);
    }
  });

  it("no fixture outlives its rule", () => {
    const ids = new Set(RULES.map((r) => r.id));
    for (const key of Object.keys(FIXTURES)) {
      expect(ids.has(key), `fixture "${key}" has no matching rule`).toBe(true);
    }
  });
});

describe.each(Object.entries(FIXTURES))("%s", (id, { violating, clean }) => {
  it.each(violating)("flags: %s", (snippet) => {
    const hit = lintSnippet(snippet).find((v) => v.id === id);
    expect(hit, `expected "${id}" to flag`).toBeDefined();
    expect(hit.matches.length).toBeGreaterThan(0);
  });

  // Clean fixtures must be clean against the WHOLE rule set, not just their
  // own rule — a fixture that trips a neighbouring rule is a bad fixture.
  it.each(clean)("passes: %s", (snippet) => {
    expect(lintSnippet(snippet)).toEqual([]);
  });
});

describe("lintLines (the validate/drift-lint path)", () => {
  it("reports 1-based line numbers per offending line", () => {
    const text = [
      "color: var(--color-foreground-default);",
      "",
      "background: #fff;",
    ].join("\n");
    const v = lintLines(text);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ line: 3, id: "no-hex" });
  });

  it("honours the hex allowlist for SVG fragment refs", () => {
    // "#abc" is a valid 3-digit hex match, but url(# lines are exempt.
    expect(lintLines('fill="url(#abc)"')).toEqual([]);
  });

  it("allowlist is line-scoped, not file-scoped", () => {
    const text = ['fill="url(#abc)"', "color: #abc;"].join("\n");
    const v = lintLines(text);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ line: 2, id: "no-hex" });
  });
});
