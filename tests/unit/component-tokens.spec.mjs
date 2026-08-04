/**
 * component-tokens.spec.mjs — the contract ↔ styles gate (#187).
 *
 * Synthetic fixtures only (#151 discipline): every meta and source below is
 * hand-built. Nothing reads a real component, so editing one can never invert
 * these tests — and a test can never end up pinned to a defect someone fixes.
 */
import { describe, it, expect } from "vitest";
import {
  extractStyleTokens,
  localCustomProperties,
  contractTokens,
  findTokenDrift,
} from "../../scripts/component-tokens.mjs";

const KNOWN = new Set([
  "--color-background-alt",
  "--color-foreground-default",
  "--spacing-element",
  "--letter-spacing-all-caps",
  "--font-label-small",
]);

const drift = (meta, src, localDefs = []) =>
  findTokenDrift(meta, src, {
    known: KNOWN,
    localDefs: new Set(localDefs),
  });

describe("extractStyleTokens", () => {
  it("collects every var() reference", () => {
    const src = `background: var(--color-background-alt); padding: var( --spacing-element );`;
    expect([...extractStyleTokens(src)]).toEqual([
      "--color-background-alt",
      "--spacing-element",
    ]);
  });

  it("sees a token used only as a fallback", () => {
    const src = `padding: var(--rr-pad, var(--spacing-element));`;
    expect(extractStyleTokens(src).has("--spacing-element")).toBe(true);
  });

  it("returns nothing for styles that reference no token", () => {
    expect([...extractStyleTokens("display: flex;")]).toEqual([]);
  });
});

describe("localCustomProperties", () => {
  it("collects declarations, not references", () => {
    const src = `:host { --rr-pad: 8px; color: var(--color-foreground-default); }`;
    const defs = localCustomProperties([src]);
    expect(defs.has("--rr-pad")).toBe(true);
    expect(defs.has("--color-foreground-default")).toBe(false);
  });

  it("collects across every source it is given", () => {
    // rr-table declares the padding knobs rr-table-cell consumes — a per-file
    // scope would report the child's correct reference as an unknown token.
    const defs = localCustomProperties([
      `:host { --rr-table-pad: 4px; }`,
      `td { padding: var(--rr-table-pad); }`,
    ]);
    expect(defs.has("--rr-table-pad")).toBe(true);
  });

  it("handles declarations that share a line", () => {
    const defs = localCustomProperties([`:host { --a: 1px; --b: 2px; }`]);
    expect([...defs]).toEqual(["--a", "--b"]);
  });
});

describe("contractTokens", () => {
  it("unions tokensUsed with every anatomy binding, at any depth", () => {
    const meta = {
      tokensUsed: ["--font-label-small"],
      anatomy: {
        parts: [
          {
            name: "root",
            tokens: { background: "--color-background-alt" },
            states: [
              {
                when: "disabled",
                tokens: { foreground: "--color-foreground-default" },
              },
            ],
            parts: [
              { name: "label", tokens: { spacing: ["--spacing-element"] } },
            ],
          },
        ],
      },
    };
    expect([...contractTokens(meta)].sort()).toEqual([
      "--color-background-alt",
      "--color-foreground-default",
      "--font-label-small",
      "--spacing-element",
    ]);
  });

  it("drops the CSS keywords anatomy permits", () => {
    // transparent and currentColor are legal anatomy colours (#114) but are
    // not var() references, so counting them would report every component
    // that uses one as having a contract ahead of its code.
    const meta = {
      tokensUsed: [],
      anatomy: {
        parts: [
          {
            name: "root",
            tokens: { background: "transparent", border: "currentColor" },
          },
        ],
      },
    };
    expect([...contractTokens(meta)]).toEqual([]);
  });

  it("works for a meta with no anatomy at all", () => {
    expect([...contractTokens({ tokensUsed: ["--font-label-small"] })]).toEqual(
      ["--font-label-small"],
    );
  });
});

describe("findTokenDrift", () => {
  it("passes when the contract and the styles agree", () => {
    const meta = { tokensUsed: ["--color-background-alt"] };
    const src = `background: var(--color-background-alt);`;
    expect(drift(meta, src)).toEqual({ unknown: [], behind: [], ahead: [] });
  });

  it("flags a token the styles use and the contract omits", () => {
    const meta = { tokensUsed: ["--color-background-alt"] };
    const src = `background: var(--color-background-alt); letter-spacing: var(--letter-spacing-all-caps);`;
    expect(drift(meta, src).behind).toEqual(["--letter-spacing-all-caps"]);
  });

  it("flags a token the contract declares and the styles dropped", () => {
    const meta = {
      tokensUsed: ["--color-background-alt", "--spacing-element"],
    };
    const src = `background: var(--color-background-alt);`;
    expect(drift(meta, src).ahead).toEqual(["--spacing-element"]);
  });

  it("flags a var() that names no token at all", () => {
    const meta = { tokensUsed: [] };
    const src = `color: var(--color-foreground-defualt);`;
    expect(drift(meta, src).unknown).toEqual(["--color-foreground-defualt"]);
  });

  it("does not treat a component's own knob as an unknown token", () => {
    const meta = { tokensUsed: [] };
    const src = `padding: var(--rr-table-pad);`;
    expect(drift(meta, src, ["--rr-table-pad"])).toEqual({
      unknown: [],
      behind: [],
      ahead: [],
    });
  });

  it("leaves primitives to the no-primitive rule", () => {
    // Reporting one here would tell the author to add it to tokensUsed, which
    // the meta schema forbids. rules.mjs owns this violation.
    const meta = { tokensUsed: [] };
    const src = `color: var(--primitive-color-green-950);`;
    expect(drift(meta, src)).toEqual({ unknown: [], behind: [], ahead: [] });
  });

  it("counts an anatomy binding as declaring the token", () => {
    const meta = {
      tokensUsed: [],
      anatomy: {
        parts: [
          { name: "root", tokens: { background: "--color-background-alt" } },
        ],
      },
    };
    const src = `background: var(--color-background-alt);`;
    expect(drift(meta, src).behind).toEqual([]);
  });

  it("reports both directions at once", () => {
    const meta = { tokensUsed: ["--spacing-element"] };
    const src = `background: var(--color-background-alt);`;
    const out = drift(meta, src);
    expect(out.behind).toEqual(["--color-background-alt"]);
    expect(out.ahead).toEqual(["--spacing-element"]);
  });
});
