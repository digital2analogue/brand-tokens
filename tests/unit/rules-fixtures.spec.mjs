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
  missingReduceGuard,
  stripComments,
} from "../../scripts/rules.mjs";
import { loadRules, getRule } from "../../scripts/reasoning.mjs";

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
  "no-hardcoded-duration": {
    violating: [
      "transition: border-color 120ms ease;",
      "transition: all 0.2s;",
      "animation-delay: 640ms;",
      "transition-duration: 40ms;",
      // A token supplies the easing but the duration is still a literal — the
      // reduce override zeroes durations, so this half is what matters.
      "transition: opacity 300ms var(--motion-easing-enter);",
    ],
    clean: [
      "transition: border-color var(--motion-duration-instant) var(--motion-easing-default);",
      "transition: var(--motion-transition-standard);",
      // A var() fallback is not a hardcoded duration: the token is what
      // applies, and the literal is dead unless the token is undefined.
      "transition: transform var(--motion-duration-standard, 200ms) ease;",
      // Infinite animations are outside the token override's reach by design
      // and carry their own reduce guard instead (hard-10, second clause).
      "animation: rr-spin 0.8s linear infinite;",
      // A time-like fragment inside an identifier is not a duration.
      "animation-name: slide-in-2s-variant;",
      // Not a duration property at all.
      "transition-property: transform;",
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

// ── hard-10: the file-level half of the motion rule ────────────────────────
// Whether a hardcoded duration is protected is a cascade question, not a
// lexical one, so the detector stays silent on any file that does
// reduced-motion work at all. These pin that opt-out in both directions.

describe("no-hardcoded-duration opts out of files that handle reduced motion", () => {
  const withGuard = [
    ".rise { animation: rise 640ms ease forwards; }",
    "@media (prefers-reduced-motion: reduce) { .rise { animation: none; } }",
  ].join("\n");

  const withoutGuard = ".rise { animation: rise 640ms ease forwards; }";

  it("flags a literal duration when the file has no guard anywhere", () => {
    expect(lintLines(withoutGuard).map((v) => v.id)).toContain(
      "no-hardcoded-duration",
    );
  });

  it("stays silent once the file carries a reduce guard", () => {
    expect(lintLines(withGuard).map((v) => v.id)).not.toContain(
      "no-hardcoded-duration",
    );
  });

  it("decides per file, not per line", () => {
    // The guard is on a different line from the violation. A rule evaluated
    // line-by-line would never see it and would flag every such file — which
    // is how a checker starts crying wolf (#174).
    const perLine = withGuard
      .split("\n")
      .flatMap((line) => lintLines(line).map((v) => v.id));
    expect(perLine).toContain("no-hardcoded-duration");
    expect(lintLines(withGuard).map((v) => v.id)).not.toContain(
      "no-hardcoded-duration",
    );
  });

  it("does not disable the other rules for a guarded file", () => {
    // skipFile is scoped to the one rule that declares it.
    const text = [
      "@media (prefers-reduced-motion: reduce) { .x { animation: none; } }",
      "color: #ff0000;",
    ].join("\n");
    expect(lintLines(text).map((v) => v.id)).toContain("no-hex");
  });
});

describe("missingReduceGuard (the validate gate for infinite animations)", () => {
  it("flags an infinite animation with no guard", () => {
    expect(missingReduceGuard("animation: rr-spin 0.8s linear infinite;")).toBe(
      true,
    );
  });

  it("passes once the source carries a guard", () => {
    expect(
      missingReduceGuard(
        [
          "animation: rr-spin 0.8s linear infinite;",
          "@media (prefers-reduced-motion: reduce) { :host { animation: none; } }",
        ].join("\n"),
      ),
    ).toBe(false);
  });

  it("ignores sources with no infinite animation", () => {
    expect(missingReduceGuard("transition: opacity 120ms ease;")).toBe(false);
  });

  it("does not accept a guard that exists only in a comment", () => {
    expect(
      missingReduceGuard(
        [
          "// TODO: add a prefers-reduced-motion guard",
          "animation: rr-spin 0.8s linear infinite;",
        ].join("\n"),
      ),
    ).toBe(true);
  });
});

// ── #189: a `lint` claim must have a detector behind it ────────────────────
// ai/rules.md now declares HOW each rule is verified. `lint` is a promise that
// scripts/rules.mjs catches it; this is the eval behind that claim, in both
// directions, so the annotation cannot drift from the detector set.

describe("verification modes are backed by the detector set", () => {
  const rules = loadRules();
  const lintRules = rules.filter((r) => r.verify === "lint");
  const detectorHardRules = new Set(
    RULES.map((r) => r.hardRule).filter((n) => typeof n === "number"),
  );

  it("annotates every rule with a verification mode", () => {
    expect(rules.filter((r) => !r.verify)).toEqual([]);
  });

  it("only uses modes the file documents", () => {
    for (const r of rules) {
      expect(["lint", "gate", "schema", "manual"]).toContain(r.verify);
    }
  });

  it("has a detector for every rule claiming lint", () => {
    const unbacked = lintRules
      .filter((r) => r.type === "hard" && !detectorHardRules.has(r.number))
      .map((r) => r.id);
    expect(unbacked).toEqual([]);
  });

  it("marks every rule a detector targets as lint, not manual", () => {
    // The reverse arrow: a detector exists, so the rule must not claim to be
    // unenforced. Otherwise an agent does judgement work a gate already does.
    const understated = [...detectorHardRules]
      .map((n) => rules.find((r) => r.type === "hard" && r.number === n))
      .filter((r) => r && r.verify !== "lint")
      .map((r) => r.id);
    expect(understated).toEqual([]);
  });

  it("keeps the statically-undetectable rules honest", () => {
    // hard-4 (display/title weight) and hard-5 (accent green as resting text)
    // need semantic context. CLAUDE.md admitted this in prose; now it is data,
    // and an agent can see its own judgement is the only thing enforcing them.
    expect(getRule(rules, "hard-4").verify).toBe("manual");
    expect(getRule(rules, "hard-5").verify).toBe("manual");
  });

  it("strips the marker from the rule text", () => {
    for (const r of rules) expect(r.rule).not.toMatch(/^\*\*\[/);
  });
});
