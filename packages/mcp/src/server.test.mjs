/**
 * Smoke tests for MCP server tool logic.
 * Tests the data and lint functions directly without starting the MCP transport.
 * The lint logic is imported from the shared rule module — no local copy.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { lintSnippet, DEPRECATED } from "../../../scripts/rules.mjs";
import {
  loadTokens,
  resolveToken,
  findTokens,
  tokensUnder,
  toCssVar,
  getBrand,
  compareBrands,
  getScale,
} from "../../../scripts/tokens.mjs";
import { checkAssembly, contrastRatio } from "../../../scripts/assembly.mjs";
import {
  checkContrast,
  validateBrand,
  intendedPairings,
} from "../../../scripts/contrast.mjs";
import { scanConsumer } from "../../../scripts/drift-scan.mjs";
import {
  buildCemDescriptionMap,
  injectPropDescriptions,
} from "../../../scripts/cem-descriptions.mjs";
import {
  parseRules,
  loadRules,
  findRules,
  getRule,
  parseDecisions,
  loadDecisions,
  findDecisions,
  getDecision,
} from "../../../scripts/reasoning.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const designSystem = JSON.parse(
  readFileSync(resolve(ROOT, "design-system.json"), "utf8"),
);
const customElements = JSON.parse(
  readFileSync(
    resolve(ROOT, "packages/components/custom-elements.json"),
    "utf8",
  ),
);
const tokenStore = await loadTokens();
const rules = loadRules();
const decisions = loadDecisions();

// ── Tests ───────────────────────────────────────────────────────────────────

describe("list_components", () => {
  it("returns rr-badge", () => {
    const list = designSystem.components.map((c) => ({
      name: c.name,
      summary: c.summary,
    }));
    expect(list.some((c) => c.name === "rr-badge")).toBe(true);
  });
});

describe("get_component", () => {
  it("finds rr-badge by name", () => {
    const component = designSystem.components.find(
      (c) => c.name === "rr-badge",
    );
    expect(component).toBeDefined();
    expect(component.props).toHaveLength(1);
    expect(component.props[0].name).toBe("variant");
    expect(component.tokensUsed.length).toBeGreaterThan(0);
    expect(component.accessibility.wcag).toContain("1.4.3 Contrast (Minimum)");
  });

  it("returns undefined for unknown component", () => {
    const component = designSystem.components.find((c) => c.name === "rr-nope");
    expect(component).toBeUndefined();
  });
});

describe("prop descriptions (single source: JSDoc via CEM)", () => {
  it("every component prop in design-system.json has a non-empty description", () => {
    const blank = [];
    for (const c of designSystem.components) {
      for (const p of c.props ?? []) {
        if (!p.description || !p.description.trim())
          blank.push(`${c.name}.${p.name}`);
      }
    }
    expect(blank).toEqual([]);
  });

  it("descriptions match the CEM exactly (artifact stays in sync with JSDoc)", () => {
    const byTag = buildCemDescriptionMap(customElements);
    const mismatches = [];
    for (const c of designSystem.components) {
      for (const p of c.props ?? []) {
        if (byTag[c.name]?.[p.name] !== p.description)
          mismatches.push(`${c.name}.${p.name}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("resolves a kebab attribute prop via its fieldName JSDoc", () => {
    // rr-progress.value is keyed by both attribute and field name in the CEM.
    const byTag = buildCemDescriptionMap(customElements);
    expect(byTag["rr-progress"]?.value).toBe(
      "Current value (0–max). Ignored when indeterminate.",
    );
  });

  it("flags a prop with no per-property JSDoc (hard-error guard input)", () => {
    const components = [
      {
        name: "rr-progress",
        props: [{ name: "bogusNoJsdoc", type: "string" }],
      },
    ];
    const missing = injectPropDescriptions(components, customElements);
    expect(missing).toContain("rr-progress.bogusNoJsdoc");
  });

  it("injects the CEM description into a known prop in place", () => {
    const components = [
      { name: "rr-progress", props: [{ name: "value", type: "number" }] },
    ];
    const missing = injectPropDescriptions(components, customElements);
    expect(missing).toEqual([]);
    expect(components[0].props[0].description).toBe(
      "Current value (0–max). Ignored when indeterminate.",
    );
  });
});

describe("check_usage (via shared rules)", () => {
  it("detects hex literals", () => {
    const v = lintSnippet("color: #4ADE6E;");
    expect(v).toHaveLength(1);
    expect(v[0].id).toBe("no-hex");
    expect(v[0].matches).toContain("#4ADE6E");
  });

  it("detects primitive tokens", () => {
    const v = lintSnippet("var(--primitive-color-green-accent)");
    expect(v).toHaveLength(1);
    expect(v[0].id).toBe("no-primitive");
  });

  it("detects deprecated tokens", () => {
    const v = lintSnippet("var(--color-foreground-accent)");
    expect(v).toHaveLength(1);
    expect(v[0].id).toBe("deprecated-token");
  });

  it("does not flag live tokens whose name extends a deprecated prefix", () => {
    // --color-background-accent (deleted) is a prefix of its own live
    // replacement family — the detector must be boundary-aware.
    expect(lintSnippet("var(--color-background-accent-green)")).toHaveLength(0);
    expect(lintSnippet("var(--color-foreground-accent-amber)")).toHaveLength(0);
  });

  it("detects hardcoded font weights (numeric + keyword)", () => {
    expect(lintSnippet("font-weight: 700;")[0].id).toBe(
      "no-hardcoded-font-weight",
    );
    expect(lintSnippet("font-weight: bold;")[0].id).toBe(
      "no-hardcoded-font-weight",
    );
  });

  it("allows token + non-literal font weights", () => {
    expect(lintSnippet("font-weight: var(--font-weight-bold);")).toHaveLength(
      0,
    );
    expect(lintSnippet("font-weight: normal;")).toHaveLength(0);
    expect(lintSnippet("font-weight: inherit;")).toHaveLength(0);
  });

  it("detects an unapproved font family", () => {
    const v = lintSnippet("font-family: Arial, sans-serif;");
    expect(v).toHaveLength(1);
    expect(v[0].id).toBe("no-unapproved-font-family");
    expect(v[0].matches[0]).toContain("Arial");
  });

  it("allows token, generic, and approved-family font-family values", () => {
    expect(
      lintSnippet("font-family: var(--font-family-sans), sans-serif;"),
    ).toHaveLength(0);
    expect(lintSnippet("font-family: inherit;")).toHaveLength(0);
    expect(
      lintSnippet("font-family: 'Space Grotesk', sans-serif;"),
    ).toHaveLength(0);
    expect(lintSnippet("font-family: monospace;")).toHaveLength(0);
  });

  it("passes clean snippet", () => {
    const v = lintSnippet("color: var(--color-foreground-default);");
    expect(v).toHaveLength(0);
  });

  it("detects multiple violations", () => {
    const v = lintSnippet(
      "color: #fff; border: 1px solid var(--primitive-color-gray-200);",
    );
    expect(v).toHaveLength(2);
  });
});

describe("get_token (via tokens.mjs)", () => {
  it("resolves a semantic color to its primitive value", () => {
    const t = resolveToken(tokenStore, "color.background.alt");
    expect(t).not.toBeNull();
    expect(t.cssProperty).toBe("--color-background-alt");
    expect(t.value).toBe("#1E241E");
    expect(t.primitive).toBe("primitive.color.green.900");
    expect(t.usage.length).toBeGreaterThan(0);
  });

  it("surfaces sub-brand overrides", () => {
    // dot-art overrides the page canvas to pure black.
    const t = resolveToken(tokenStore, "color.background.default");
    expect(t.brands?.["dot-art"]).toBe("#000000");
  });

  it("applies a brand override layer when asked", () => {
    const base = resolveToken(tokenStore, "color.background.default");
    const art = resolveToken(tokenStore, "color.background.default", {
      brand: "dot-art",
    });
    expect(base.value).not.toBe("#000000");
    expect(art.value).toBe("#000000");
  });

  it("returns null for an unknown token", () => {
    expect(resolveToken(tokenStore, "color.background.nope")).toBeNull();
  });

  it("toCssVar round-trips a dotted path", () => {
    expect(toCssVar("color.background.action-hover")).toBe(
      "--color-background-action-hover",
    );
  });
});

describe("find_token (via tokens.mjs)", () => {
  it("finds the card background by intent, not name", () => {
    const hits = findTokens(tokenStore, "card background");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.name === "color.background.alt")).toBe(true);
  });

  it("ranks name matches ahead of usage-only matches", () => {
    const hits = findTokens(tokenStore, "spacing");
    expect(hits[0].match).toBe("name");
  });

  it("returns nothing for gibberish", () => {
    expect(findTokens(tokenStore, "zzzznotarealtoken")).toHaveLength(0);
  });
});

describe("get_spacing (via tokens.mjs)", () => {
  it("returns the full scale with resolved values and usage", () => {
    const scale = tokensUnder(tokenStore, "spacing");
    expect(scale.length).toBeGreaterThanOrEqual(10);
    const micro = scale.find((t) => t.cssProperty === "--spacing-micro");
    expect(micro.value).toBe("4px");
    expect(micro.usage.length).toBeGreaterThan(0);
  });
});

describe("toCssVar kebab-cases camelCase segments", () => {
  it("letterSpacing / lineHeight → --letter-spacing- / --line-height- (matches the build)", () => {
    expect(toCssVar("letterSpacing.body")).toBe("--letter-spacing-body");
    expect(toCssVar("lineHeight.relaxed")).toBe("--line-height-relaxed");
    expect(toCssVar("primitive.letterSpacing.wide")).toBe(
      "--primitive-letter-spacing-wide",
    );
    // all-lowercase paths are unchanged
    expect(toCssVar("color.background.action-hover")).toBe(
      "--color-background-action-hover",
    );
  });
});

describe("get_scale (via tokens.mjs)", () => {
  it("returns the radius scale with --radius-* names, resolved values, and usage", () => {
    const radius = getScale(tokenStore, "radius");
    expect(radius.length).toBe(6);
    const sm = radius.find((t) => t.token === "--radius-sm");
    expect(sm.value).toBe("4px");
    expect(sm.usage.length).toBeGreaterThan(0);
  });

  it("letter-spacing maps to the camelCase root but emits kebab CSS vars", () => {
    const ls = getScale(tokenStore, "letter-spacing");
    expect(ls.length).toBeGreaterThan(0);
    expect(ls.every((t) => t.token.startsWith("--letter-spacing-"))).toBe(true);
  });

  it("shadow values are composite (objects), not flat strings", () => {
    const shadow = getScale(tokenStore, "shadow");
    expect(shadow.find((t) => t.token === "--shadow-raised")).toBeDefined();
  });

  it('get_spacing and get_scale("spacing") agree', () => {
    expect(getScale(tokenStore, "spacing")).toEqual(
      tokensUnder(tokenStore, "spacing").map((t) => ({
        token: t.cssProperty,
        value: t.value,
        usage: t.usage,
      })),
    );
  });

  it("returns null for an unknown category", () => {
    expect(getScale(tokenStore, "nope")).toBeNull();
  });
});

describe("deprecation guidance", () => {
  it("maps removed tokens to their live replacements", () => {
    expect(DEPRECATED.get("--color-foreground-primary").replacement).toBe(
      "--color-foreground-default",
    );
    expect(DEPRECATED.get("--color-state-hover").replacement).toContain(
      "--color-background-action-hover",
    );
  });

  it("get_token not-found→guidance path: a removed token is absent from the store but present in DEPRECATED", () => {
    // This is exactly what the server's get_token handler keys on.
    expect(resolveToken(tokenStore, "color.state.hover")).toBeNull();
    expect(DEPRECATED.get(toCssVar("color.state.hover"))).toBeDefined();
  });

  it("check_usage still flags a deprecated token under the {token,replacement} shape", () => {
    const v = lintSnippet("color: var(--color-state-hover);");
    expect(
      v.some(
        (x) =>
          x.id === "deprecated-token" &&
          x.matches.includes("--color-state-hover"),
      ),
    ).toBe(true);
  });
});

describe("find_rule / get_rule (via reasoning.mjs)", () => {
  it("parses the 12 hard + 6 soft rules from ai/rules.md", () => {
    expect(rules.filter((r) => r.type === "hard")).toHaveLength(12);
    expect(rules.filter((r) => r.type === "soft")).toHaveLength(6);
  });

  it("find_rule surfaces the accent-green hard rule", () => {
    const hits = findRules(rules, "accent green");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("hard-5");
    expect(hits[0].type).toBe("hard");
    expect(hits[0].rank).toBe(1);
  });

  it("extracts the post-em-dash clause as rationale, and null when there is no dash", () => {
    expect(getRule(rules, "hard-5").rationale).toContain("interactivity");
    // Hard rule 3 ("No font families other than …") has no " — " separator.
    expect(getRule(rules, "hard-3").rationale).toBeNull();
  });

  it("get_rule fetches by id and returns null for an unknown id", () => {
    expect(getRule(rules, "hard-5").number).toBe(5);
    expect(getRule(rules, "nope")).toBeNull();
  });

  it("parseRules ignores prose sections outside the two lists", () => {
    const fixture = [
      "## Hard Rules (never break these)",
      "1. First directive — its reason",
      "## Typography Hierarchy",
      "1. Not a rule, just a numbered prose item",
      "## Soft Rules (prefer but can flex)",
      "1. A preference — why it flexes",
    ].join("\n");
    const parsed = parseRules(fixture);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((r) => r.id)).toEqual(["hard-1", "soft-1"]);
    expect(parsed[0].rationale).toBe("its reason");
  });
});

describe("find_decision / get_decision (via reasoning.mjs)", () => {
  it("parses both the dated entries and the archived ADR log", () => {
    expect(decisions.some((d) => d.source === "dated")).toBe(true);
    expect(decisions.some((d) => d.source === "archived-adr")).toBe(true);
    // D-01…D-34 are all present in the frozen archived sequence.
    expect(decisions.filter((d) => d.source === "archived-adr")).toHaveLength(
      34,
    );
  });

  it("get_decision resolves D-06 with its rejected alternative", () => {
    const d = getDecision(decisions, "D-06");
    expect(d).not.toBeNull();
    expect(d.title).toContain("Dark-first");
    expect(d.decision).toContain("dark");
    expect(d.rejected).toContain("Blue or purple");
    expect(getDecision(decisions, "nope")).toBeNull();
  });

  it("find_decision matches by topic, ranking title hits first", () => {
    const hits = findDecisions(decisions, "dark theme");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].match).toBe("title");
  });

  it("normalizes both source formats onto one shape (Decided/Alternative → decision/rejected)", () => {
    const fixture = [
      "## 2026-06-23 — Sample dated entry",
      "**Decided:** Do the thing.",
      "**Why:** Because reasons.",
      "**Alternative considered:** Not doing it.",
      "**Status:** Shipped.",
      "",
      "---",
      "",
      "## 2026-06 — Month-only dated entry",
      "**Decided:** A choice with no day in the date.",
      "",
      "# Archived ADR Log",
      "",
      "### D-99 · Sample ADR",
      "**Date:** 2026-01-01  ",
      "**Decision:** The ADR decision.",
      "**Rejected:** The ADR alternative.",
    ].join("\n");
    const parsed = parseDecisions(fixture);
    const dated = parsed.find((d) => d.title === "Sample dated entry");
    expect(dated.source).toBe("dated");
    expect(dated.decision).toBe("Do the thing.");
    expect(dated.rejected).toBe("Not doing it.");
    expect(dated.status).toBe("Shipped.");
    // A YYYY-MM-only heading still parses, with a null Status field.
    const monthOnly = parsed.find((d) => d.date === "2026-06");
    expect(monthOnly).toBeDefined();
    expect(monthOnly.status).toBeNull();
    // Archived format maps Decision/Rejected/Date onto the same shape.
    const adr = getDecision(parsed, "D-99");
    expect(adr.source).toBe("archived-adr");
    expect(adr.date).toBe("2026-01-01");
    expect(adr.decision).toBe("The ADR decision.");
    expect(adr.rejected).toBe("The ADR alternative.");
  });
});

describe("get_brand / compare_brands (via tokens.mjs)", () => {
  it("get_brand returns a brand's overrides with base vs brand values", () => {
    const art = getBrand(tokenStore, "dot-art");
    expect(art).not.toBeNull();
    expect(art.count).toBeGreaterThan(0);
    const bg = art.overrides.find((o) => o.name === "color.background.default");
    expect(bg).toBeDefined();
    expect(bg.value).toBe("#000000"); // brand override
    expect(bg.base).not.toBe("#000000"); // differs from the dark-theme base
    expect(bg.changed).toBe(true);
  });

  it("get_brand returns null for an unknown brand", () => {
    expect(getBrand(tokenStore, "nope")).toBeNull();
  });

  it("decision-engine is a substantial override layer", () => {
    const de = getBrand(tokenStore, "decision-engine");
    expect(de.count).toBeGreaterThan(5);
  });

  it("compare_brands diffs two brands and keys values by brand name", () => {
    const diff = compareBrands(tokenStore, "dot-art", "dot-blog");
    expect(diff).not.toBeNull();
    // dot-art paints the canvas black; dot-blog leaves it at base — so they differ here.
    const bg = diff.diffs.find((d) => d.name === "color.background.default");
    expect(bg).toBeDefined();
    expect(bg["dot-art"]).toBe("#000000");
    expect(bg["dot-blog"]).not.toBe("#000000");
  });

  it("compare_brands returns null when either brand is unknown", () => {
    expect(compareBrands(tokenStore, "dot-art", "nope")).toBeNull();
    expect(compareBrands(tokenStore, "nope", "dot-art")).toBeNull();
  });
});

describe("check_assembly (via assembly.mjs)", () => {
  it("contrastRatio: known anchors and non-hex guard", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#0A0D0A", "#0A0D0A")).toBeCloseTo(1, 5);
    expect(contrastRatio("#4ADE6E", "linear-gradient(...)")).toBeNull();
  });

  it("rule 1: within-element spacing between distinct components is flagged", () => {
    const r = checkAssembly(tokenStore, {
      components: ["rr-input", "rr-button"],
      tokens: ["--spacing-tight"],
    });
    expect(r.valid).toBe(false);
    expect(r.suggestions.some((s) => s.includes("--spacing-component"))).toBe(
      true,
    );
    // A single component carries no between-components opinion.
    const one = checkAssembly(tokenStore, {
      components: ["rr-button"],
      tokens: ["--spacing-tight"],
    });
    expect(
      one.suggestions.some((s) => s.includes("within a single element")),
    ).toBe(false);
  });

  it("rule 2: flags a sub-AA foreground/background pairing, passes a good one", () => {
    // foreground-disabled (#1E241E) on background-default (#0A0D0A) ≈ 1.23:1.
    const bad = checkAssembly(tokenStore, {
      tokens: ["--color-foreground-disabled", "--color-background-default"],
    });
    expect(bad.valid).toBe(false);
    expect(bad.suggestions.some((s) => s.includes("WCAG AA"))).toBe(true);
    // foreground-default on the same canvas ≈ 12.26:1 — no pairing suggestion.
    const good = checkAssembly(tokenStore, {
      tokens: ["--color-foreground-default", "--color-background-default"],
    });
    expect(good.suggestions.some((s) => s.includes("WCAG AA"))).toBe(false);
  });

  it("rule 3: flags deprecated and unknown tokens", () => {
    const dep = checkAssembly(tokenStore, {
      tokens: ["--color-foreground-accent"],
    });
    expect(dep.suggestions.some((s) => s.includes("deprecated"))).toBe(true);
    const unk = checkAssembly(tokenStore, {
      tokens: ["--color-not-a-real-token"],
    });
    expect(
      unk.suggestions.some((s) => s.includes("not a known design token")),
    ).toBe(true);
  });

  it("a clean assembly is valid, with no suggestions, and echoes context", () => {
    const r = checkAssembly(tokenStore, {
      components: ["rr-button"],
      tokens: ["--color-foreground-on-action", "--color-background-action"], // ≈ 11.13:1
      context: "primary CTA",
    });
    expect(r.valid).toBe(true);
    expect(r.suggestions).toHaveLength(0);
    expect(r.context).toBe("primary CTA");
  });
});

describe("check_contrast (via contrast.mjs)", () => {
  it("resolves tokens (CSS var or dotted path) and passes a high-contrast pair", () => {
    const r = checkContrast(tokenStore, {
      foreground: "--color-foreground-default",
      background: "color.background.default",
    });
    expect(r.ratio).toBeGreaterThan(12);
    expect(r.passesAA).toBe(true);
    expect(r.threshold).toBe(4.5);
  });

  it("accepts raw hex and applies the normal-text AA threshold", () => {
    // #777 on #fff ≈ 4.48:1 — just under AA for normal text.
    const r = checkContrast(tokenStore, {
      foreground: "#777777",
      background: "#ffffff",
    });
    expect(r.ratio).toBeCloseTo(4.48, 1);
    expect(r.passesAA).toBe(false);
  });

  it("switches to the large-text threshold (3:1) for big text", () => {
    const small = checkContrast(tokenStore, {
      foreground: "#777777",
      background: "#ffffff",
    });
    expect(small.passesAA).toBe(false);
    const large = checkContrast(tokenStore, {
      foreground: "#777777",
      background: "#ffffff",
      fontSize: "24px",
    });
    expect(large.largeText).toBe(true);
    expect(large.threshold).toBe(3);
    expect(large.passesAA).toBe(true);
  });

  it("errors on an unknown token", () => {
    expect(
      checkContrast(tokenStore, { foreground: "--nope", background: "#fff" })
        .error,
    ).toBeTruthy();
  });
});

describe("validate_brand (via contrast.mjs)", () => {
  it("intendedPairings covers only the unambiguous on-<role>/base-text pairs (no accent family)", () => {
    const pairs = intendedPairings(tokenStore);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.every((p) => !p.fg.includes("accent"))).toBe(true);
    expect(
      pairs.some(
        (p) =>
          p.fg === "color.foreground.on-warning" &&
          p.bg === "color.background.warning",
      ),
    ).toBe(true);
  });

  it("decision-engine passes clean now that on-warning is dark (#66, fixed 2026-07-02)", () => {
    const r = validateBrand(tokenStore, "decision-engine");
    expect(r.checkedPairs).toBeGreaterThan(0);
    expect(r.failures).toEqual([]);
    expect(r.valid).toBe(true);
  });

  it("catches a sub-AA regression: synthetic brand reverting on-warning to white on amber (≈ 3.19)", () => {
    // Reconstructs the pre-#66 defect in a throwaway brand so the
    // catch-a-regression path stays covered now that the real brand is valid.
    const broken = new Map(tokenStore.brands.get("decision-engine"));
    broken.set("color.foreground.on-warning", {
      value: "{primitive.color.neutral.white}",
      type: "color",
      description: "synthetic regression fixture",
      file: "synthetic",
    });
    const store = {
      ...tokenStore,
      brands: new Map(tokenStore.brands).set("decision-engine-broken", broken),
    };
    const r = validateBrand(store, "decision-engine-broken");
    expect(r.valid).toBe(false);
    const warn = r.failures.find(
      (f) => f.background === "--color-background-warning",
    );
    expect(warn).toBeDefined();
    expect(warn.ratio).toBeLessThan(4.5);
  });

  it("every reported failure is genuinely below the AA threshold", () => {
    const r = validateBrand(tokenStore, "dot-art");
    expect(r.checkedPairs).toBeGreaterThan(0);
    expect(r.failures.every((f) => f.ratio < 4.5)).toBe(true);
  });

  it("returns null for an unknown brand", () => {
    expect(validateBrand(tokenStore, "nope")).toBeNull();
  });

  it("the explicit pairing map extends the union with accent + non-text pairs (#87)", async () => {
    const { allIntendedPairings } =
      await import("../../../scripts/contrast.mjs");
    const all = allIntendedPairings(tokenStore);
    expect(all.some((p) => p.fg.includes("accent"))).toBe(true);
    expect(all.some((p) => p.kind === "non-text")).toBe(true);
    // Convention-only derivation stays accent-free (asserted above); the map
    // is strictly additive.
    expect(all.length).toBeGreaterThan(intendedPairings(tokenStore).length);
  });

  it("excludeBrands scopes map pairs per brand (DE never renders the base accent-tint pairs)", async () => {
    const { allIntendedPairings } =
      await import("../../../scripts/contrast.mjs");
    const de = allIntendedPairings(tokenStore, "decision-engine");
    expect(
      de.some(
        (p) =>
          p.fg === "color.foreground.accent-green" &&
          p.bg === "color.background.accent-green",
      ),
    ).toBe(false);
    // ...while non-excluded map pairs still apply to DE.
    expect(de.some((p) => p.kind === "non-text")).toBe(true);
  });
});

describe("lint_consumer (via drift-scan.mjs)", () => {
  const fixtures = resolve(import.meta.dirname, "__fixtures__", "drift");

  it("flags a real violation and respects .driftignore", () => {
    const r = scanConsumer(fixtures);
    expect(r.clean).toBe(false);
    // bad.css's hex literal is flagged…
    const hex = r.violations.find((v) => v.file === "bad.css");
    expect(hex).toBeDefined();
    expect(hex.id).toBe("no-hex");
    expect(hex.match).toBe("#ff0000");
    // …but ignored.css (also hex) is exempted by the fixture .driftignore.
    expect(r.violations.some((v) => v.file === "ignored.css")).toBe(false);
    // groups carry the rule metadata used by the CLI/Action report.
    expect(r.groups.find((g) => g.id === "no-hex").hardRule).toBe(1);
  });

  it("extra ignore globs suppress a file", () => {
    const r = scanConsumer(fixtures, { ignore: ["bad.css"] });
    expect(r.clean).toBe(true);
  });

  it("a single clean file scans clean", () => {
    const r = scanConsumer(resolve(fixtures, "clean.css"));
    expect(r.scanned).toBe(1);
    expect(r.clean).toBe(true);
  });

  it("throws on a path that does not exist", () => {
    expect(() =>
      scanConsumer(resolve(fixtures, "nope-does-not-exist")),
    ).toThrow();
  });
});
