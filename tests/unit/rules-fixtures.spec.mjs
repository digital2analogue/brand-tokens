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
import {
  RULES,
  lintSnippet,
  lintLines,
  stripComments,
} from "../../scripts/rules.mjs";

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
  "no-component-token": {
    violating: [
      "background: var(--component-badge-success-background);",
      "height: var(--component-avatar-size-lg);",
    ],
    clean: [
      // The semantic roles the tier aliased — the correct post-#114 form.
      "background: var(--color-background-success-alt);",
      "height: 40px;",
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

// ── Comments are documentation, not styling (#174) ──────────────────────────
// A weekly consumer drift report was 100% false positives for a week: an issue
// reference read as a hex colour, and a JSDoc explaining why a colour fails
// contrast read as someone hardcoding it. A checker that cries wolf gets
// ignored, which costs more than the rule enforces.

describe("stripComments", () => {
  it("blanks a block comment but keeps the line count", () => {
    expect(stripComments("/* a\n b */\nx").split("\n")).toHaveLength(3);
  });

  it("blanks a line comment", () => {
    expect(stripComments("// hi").trim()).toBe("");
  });

  it("leaves the code that precedes a trailing comment", () => {
    expect(stripComments("color: red; // note")).toMatch(/color: red;/);
  });

  it("does not treat a URL's // as a comment", () => {
    const src = `const u = "https://example.com/x";`;
    expect(stripComments(src)).toBe(src);
  });

  it("leaves string literals alone — a hex in one may well ship", () => {
    const src = `const c = "#4ADE6E";`;
    expect(stripComments(src)).toBe(src);
  });
});

describe("lintLines ignores values written in comments", () => {
  const notFlagged = (src) => expect(lintLines(src)).toEqual([]);

  it("does not read a GitHub issue reference as a hex colour", () => {
    notFlagged("// the component tier was removed (parsimony#114)");
    notFlagged("// see issue #1234 for the rationale");
  });

  it("does not flag a JSDoc that explains why a colour is wrong", () => {
    notFlagged(
      "/** OTKit's accent-yellow #FDAF08 is 1.86:1, hence the darkened #A97405. */",
    );
  });

  it("does not flag any rule's value inside a comment", () => {
    notFlagged("/* font-weight: 700; font-family: Inter, sans-serif; */");
    notFlagged("// padding: var(--primitive-space-md);");
  });

  it("still flags real code on a line that also carries a comment", () => {
    const v = lintLines("color: #fff; // TODO: tokenise");
    expect(v.map((x) => x.match)).toEqual(["#fff"]);
  });

  it("reports the true line number after stripping", () => {
    const v = lintLines("/* a\n b */\ncolor: #abc;");
    expect(v[0].line).toBe(3);
  });

  it("still flags a hex in a string literal", () => {
    expect(lintLines(`const c = "#4ADE6E";`).map((x) => x.match)).toEqual([
      "#4ADE6E",
    ]);
  });
});

describe("lintSnippet applies the same preprocessing as lintLines", () => {
  // check_usage (MCP) and validate/drift-lint must agree about the same text.
  // Two tools disagreeing is worse than either being wrong alone.
  it("ignores a commented-out value", () => {
    expect(
      lintSnippet("/* was #4ADE6E */\ncolor: var(--color-foreground-action);"),
    ).toEqual([]);
  });

  it("still flags the value when it is real code", () => {
    expect(lintSnippet("color: #4ADE6E;").map((v) => v.id)).toEqual(["no-hex"]);
  });
});

describe("hex is not preceded by a word character", () => {
  it("ignores a bare issue reference outside a comment", () => {
    expect(lintLines("const ref = mkRef`parsimony#114`;")).toEqual([]);
  });

  it("still flags a hex that directly follows a colon", () => {
    expect(lintLines("background:#fff;").map((x) => x.match)).toEqual(["#fff"]);
  });
});
