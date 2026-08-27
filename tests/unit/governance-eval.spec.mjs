/**
 * governance-eval.spec.mjs — the #153 scorer's classification logic.
 * Synthetic fixtures only (#151 discipline): the token set and component
 * index are hand-built, never loaded from live data.
 */
import { describe, it, expect } from "vitest";
import { scoreSnippet, aggregate } from "../../scripts/governance-eval.mjs";

const KNOWN = new Set([
  "--color-background-alt",
  "--color-foreground-default",
  "--spacing-element",
]);

const INDEX = new Map([
  [
    "rr-fixture-button",
    {
      name: "rr-fixture-button",
      props: [{ name: "variant" }, { name: "disabled" }],
    },
  ],
]);

const score = (s) => scoreSnippet(s, KNOWN, INDEX);

describe("scoreSnippet", () => {
  it("a compliant snippet is clean", () => {
    const r = score(
      `<div style="background: var(--color-background-alt); padding: var(--spacing-element)">
         <rr-fixture-button variant="primary" disabled class="x" aria-label="Save" data-test="y">Save</rr-fixture-button>
       </div>`,
    );
    expect(r).toMatchObject({
      clean: true,
      ruleViolations: [],
      fabricatedTokens: [],
      fabricatedProps: [],
    });
  });

  it("flags rule violations via the shared detectors", () => {
    const r = score(`<style>.x { color: #4ADE6E; font-weight: 700; }</style>`);
    expect(r.clean).toBe(false);
    expect(r.ruleViolations.map((v) => v.id)).toEqual(
      expect.arrayContaining(["no-hex", "no-hardcoded-font-weight"]),
    );
  });

  it("flags a fabricated token, once, and skips primitives (their own rule)", () => {
    const r = score(
      `<div style="color: var(--color-text-main); background: var(--color-text-main); padding: var(--primitive-space-md)">x</div>`,
    );
    expect(r.fabricatedTokens).toEqual(["--color-text-main"]);
    expect(r.ruleViolations.map((v) => v.id)).toContain("no-primitive");
  });

  it("flags a fabricated prop and an unknown rr-* component", () => {
    const r = score(
      `<rr-fixture-button size="lg">x</rr-fixture-button><rr-imaginary>y</rr-imaginary>`,
    );
    expect(r.fabricatedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: "rr-fixture-button", attr: "size" }),
        expect.objectContaining({
          tag: "rr-imaginary",
          reason: "unknown component",
        }),
      ]),
    );
  });

  it("allows globals, aria-*, and data-* on known components", () => {
    const r = score(
      `<rr-fixture-button variant="ghost" id="a" slot="footer" role="button" tabindex="0">x</rr-fixture-button>`,
    );
    expect(r.fabricatedProps).toEqual([]);
  });
});

describe("aggregate", () => {
  it("computes clean rate, mean violations, and per-class totals", () => {
    const runs = [
      score(`<div style="color: var(--color-foreground-default)">ok</div>`),
      score(`<style>.x { color: #fff; }</style>`),
      score(`<div style="color: var(--color-made-up)">x</div>`),
    ];
    const a = aggregate(runs);
    expect(a.runs).toBe(3);
    expect(a.cleanRuns).toBe(1);
    expect(a.cleanRate).toBe(33);
    expect(a.byClass.rule).toBe(1);
    expect(a.byClass.fabricatedToken).toBe(1);
    expect(a.meanViolations).toBeCloseTo(0.67, 2);
  });

  it("handles the empty-arm edge without dividing by zero", () => {
    expect(aggregate([])).toMatchObject({
      runs: 0,
      cleanRate: null,
      meanViolations: null,
    });
  });
});
