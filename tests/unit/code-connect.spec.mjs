// Fixture-based tests for scripts/code-connect.mjs — the Code Connect ↔
// component parity parsers used by validate.mjs section 4.
//
// Synthetic fixtures only (per the repo rule from 2026-07-02: tests that
// assert live repo data invert when someone fixes the data). The "ghost"
// fixture reproduces the exact drift class the 2026-07-15 inspection found.

import { describe, it, expect } from "vitest";
import {
  extractEnumEmissions,
  extractUnionLiterals,
  findUnmappedEmissions,
} from "../../scripts/code-connect.mjs";

const FIGMA_SRC = `
figma.connect('https://figma.com/design/x?node-id=1-2', {
  props: {
    variant: figma.enum('Variant', {
      primary:   'primary',
      secondary: 'secondary',
      ghost:     'ghost',
    }),
    size: figma.enum('Size', {
      sm: 'small',
      md: 'medium',
      lg: 'large',
    }),
    disabled: figma.enum('State', {
      disabled: true,
    }),
  },
});
`;

const COMPONENT_WITHOUT_GHOST = `
export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';
class X {
  @property() type: 'button' | 'submit' | 'reset' = 'button';
}
`;

const COMPONENT_WITH_GHOST = COMPONENT_WITHOUT_GHOST.replace(
  "'danger'",
  "'danger' | 'ghost'",
);

describe("extractEnumEmissions", () => {
  it("collects every string value across all figma.enum blocks", () => {
    const emissions = extractEnumEmissions(FIGMA_SRC);
    expect(emissions).toContainEqual({ prop: "Variant", value: "ghost" });
    expect(emissions).toContainEqual({ prop: "Size", value: "small" });
    expect(emissions).toHaveLength(6);
  });

  it("ignores non-string mappings like disabled: true", () => {
    const values = extractEnumEmissions(FIGMA_SRC).map((e) => e.value);
    expect(values).not.toContain("true");
    expect(values).not.toContain(true);
  });

  it("returns empty for source with no enum mappings", () => {
    expect(extractEnumEmissions("const x = 1;")).toEqual([]);
  });
});

describe("extractUnionLiterals", () => {
  it("collects literals from exported type aliases", () => {
    const unions = extractUnionLiterals(COMPONENT_WITHOUT_GHOST);
    expect(unions.has("primary")).toBe(true);
    expect(unions.has("danger")).toBe(true);
  });

  it("collects literals from inline prop annotations", () => {
    const unions = extractUnionLiterals(COMPONENT_WITHOUT_GHOST);
    expect(unions.has("submit")).toBe(true);
    expect(unions.has("reset")).toBe(true);
  });

  it("does not collect lone (non-union) string literals", () => {
    const unions = extractUnionLiterals(`const name = 'rr-button';`);
    expect(unions.has("rr-button")).toBe(false);
  });
});

describe("findUnmappedEmissions", () => {
  it("flags the ghost drift: figma emits a variant the component lacks", () => {
    const offending = findUnmappedEmissions(FIGMA_SRC, COMPONENT_WITHOUT_GHOST);
    expect(offending).toEqual([{ prop: "Variant", value: "ghost" }]);
  });

  it("passes once the component implements the emitted variant", () => {
    expect(findUnmappedEmissions(FIGMA_SRC, COMPONENT_WITH_GHOST)).toEqual([]);
  });
});

// ── #152: bindings parsing + meta ↔ figma.ts consistency ────────────────────

import {
  extractEnumBindings,
  findBindingMismatches,
} from "../../scripts/code-connect.mjs";

describe("extractEnumBindings", () => {
  it("captures code prop, Figma property, and full entry map — booleans included", () => {
    expect(extractEnumBindings(FIGMA_SRC)).toEqual([
      {
        codeProp: "variant",
        property: "Variant",
        entries: { primary: "primary", secondary: "secondary", ghost: "ghost" },
      },
      {
        codeProp: "size",
        property: "Size",
        entries: { sm: "small", md: "medium", lg: "large" },
      },
      {
        codeProp: "disabled",
        property: "State",
        entries: { disabled: true },
      },
    ]);
  });

  it("handles quoted keys with hyphens", () => {
    const src = `x: figma.enum('Variant', { 'accent-green': 'accent-green' })`;
    expect(extractEnumBindings(src)[0].entries).toEqual({
      "accent-green": "accent-green",
    });
  });

  it("returns [] for source with no enums", () => {
    expect(extractEnumBindings("figma.connect('url', {})")).toEqual([]);
  });
});

describe("findBindingMismatches", () => {
  const binding = (prop, property, valueMap) => ({
    name: prop,
    type: "string",
    bindings: {
      code: { prop },
      figma: { kind: "VARIANT", property, valueMap },
    },
  });

  const AGREEING_META = {
    name: "rr-fixture",
    props: [
      binding("variant", "Variant", {
        primary: "primary",
        secondary: "secondary",
        ghost: "ghost",
      }),
      binding("size", "Size", { sm: "small", md: "medium", lg: "large" }),
      binding("disabled", "State", { disabled: true }),
    ],
  };

  it("agreeing meta and figma.ts produce no findings", () => {
    expect(findBindingMismatches(AGREEING_META, FIGMA_SRC)).toEqual([]);
  });

  it("is opt-in: a meta without bindings has no opinion", () => {
    const meta = {
      name: "rr-fixture",
      props: [{ name: "variant", type: "string" }],
    };
    expect(findBindingMismatches(meta, FIGMA_SRC)).toEqual([]);
  });

  it("flags a valueMap entry figma.ts lacks, and vice versa", () => {
    const meta = structuredClone(AGREEING_META);
    delete meta.props[0].bindings.figma.valueMap.ghost; // binding behind figma.ts
    meta.props[1].bindings.figma.valueMap.xl = "xlarge"; // binding ahead of figma.ts
    const msgs = findBindingMismatches(meta, FIGMA_SRC);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatch(/Variant=ghost .* valueMap omits it/);
    expect(msgs[1]).toMatch(/Size=xl but \*\.figma\.ts does not/);
  });

  it("flags a value that differs between binding and figma.ts", () => {
    const meta = structuredClone(AGREEING_META);
    meta.props[1].bindings.figma.valueMap.sm = "tiny";
    const msgs = findBindingMismatches(meta, FIGMA_SRC);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(
      /Size=sm maps to "tiny" .* "small" in \*\.figma\.ts/,
    );
  });

  it("flags a Figma property-name disagreement (the ghost/danger drift class)", () => {
    const meta = structuredClone(AGREEING_META);
    meta.props[0].bindings.figma.property = "Kind";
    const msgs = findBindingMismatches(meta, FIGMA_SRC);
    expect(
      msgs.some((m) => /property "Kind", \*\.figma\.ts says "Variant"/.test(m)),
    ).toBe(true);
  });

  it("flags bindings.code.prop that differs from the prop name", () => {
    const meta = structuredClone(AGREEING_META);
    meta.props[0].bindings.code.prop = "kind";
    const msgs = findBindingMismatches(meta, FIGMA_SRC);
    expect(msgs.some((m) => /bindings\.code\.prop is "kind"/.test(m))).toBe(
      true,
    );
  });

  it("flags a figma.enum mapping the meta does not bind (reverse arrow)", () => {
    const meta = structuredClone(AGREEING_META);
    meta.props.pop(); // drop the disabled binding
    const msgs = findBindingMismatches(meta, FIGMA_SRC);
    expect(
      msgs.some((m) =>
        /maps prop "disabled" via Figma "State" but the meta declares no binding/.test(
          m,
        ),
      ),
    ).toBe(true);
  });

  it("flags a VARIANT binding with no figma.enum at all", () => {
    const meta = {
      name: "rr-fixture",
      props: [binding("variant", "Variant", { primary: "primary" })],
    };
    const msgs = findBindingMismatches(meta, "");
    expect(msgs[0]).toMatch(/no figma\.enum maps it/);
  });
});
