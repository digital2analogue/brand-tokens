/**
 * component-parity.spec.mjs — the parity differ's classification logic
 * (#152 PR 2). Synthetic fixtures only (#151 discipline): metas and variant
 * dumps below are hand-built — updating the real Figma file or metas can
 * never invert these tests.
 */
import { describe, it, expect } from "vitest";
import {
  parseVariantAxes,
  diffComponent,
  diffAll,
} from "../../scripts/component-parity.mjs";

const bind = (prop, property, valueMap) => ({
  name: prop,
  type: "string",
  bindings: { code: { prop }, figma: { kind: "VARIANT", property, valueMap } },
});

// A contract in full agreement with FIXTURE_VARIANTS below.
const META = {
  name: "rr-fixture-button",
  props: [
    bind("variant", "Variant", { primary: "primary", danger: "danger" }),
    bind("disabled", "State", { disabled: true }),
  ],
  figma: {
    nodeId: "1:1",
    ignoredOptions: { State: ["default", "hover"] },
  },
};

const FIXTURE_VARIANTS = [
  "Variant=primary,State=default",
  "Variant=primary,State=hover",
  "Variant=primary,State=disabled",
  "Variant=danger,State=default",
  "Variant=danger,State=hover",
  "Variant=danger,State=disabled",
];

const axesOf = (variants) => parseVariantAxes(variants);

describe("parseVariantAxes", () => {
  it("derives property → option sets from symbol names", () => {
    const axes = axesOf(FIXTURE_VARIANTS);
    expect([...axes.get("Variant")]).toEqual(["primary", "danger"]);
    expect([...axes.get("State")]).toEqual(["default", "hover", "disabled"]);
  });

  it("handles single-axis names and stray whitespace", () => {
    const axes = parseVariantAxes(["Variant=solo", " State = focus "]);
    expect(axes.get("Variant").has("solo")).toBe(true);
    expect(axes.get("State").has("focus")).toBe(true);
  });
});

describe("diffComponent", () => {
  it("full agreement produces no findings", () => {
    expect(diffComponent(META, axesOf(FIXTURE_VARIANTS))).toEqual([]);
  });

  it("classifies a whole unbound Figma axis as ahead", () => {
    const axes = axesOf([...FIXTURE_VARIANTS.map((v) => v + ",Theme=dark")]);
    const f = diffComponent(META, axes);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ class: "ahead", property: "Theme" });
  });

  it("classifies a bound property Figma lacks as behind", () => {
    const axes = axesOf(["State=default", "State=hover", "State=disabled"]);
    const f = diffComponent(META, axes);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ class: "behind", property: "Variant" });
  });

  it("classifies option drift on a shared axis as mismatched — both directions", () => {
    // Figma renamed danger → ghost: binding maps an option Figma lacks
    // (contract side) AND Figma has an option nothing covers (design side).
    const axes = axesOf([
      "Variant=primary,State=default",
      "Variant=ghost,State=default",
      "Variant=primary,State=hover",
      "Variant=primary,State=disabled",
    ]);
    const f = diffComponent(META, axes);
    const classes = f.map((x) => [x.class, x.property, x.option].join(":"));
    expect(classes).toContain("mismatched:Variant:danger"); // binding-only
    expect(classes).toContain("mismatched:Variant:ghost"); // Figma-only
    expect(f).toHaveLength(2);
  });

  it("ignoredOptions suppress design-only states, but stale ignores are behind", () => {
    // "hover" removed from Figma → the ignore for it is stale.
    const axes = axesOf([
      "Variant=primary,State=default",
      "Variant=danger,State=disabled",
    ]);
    const f = diffComponent(META, axes);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({
      class: "behind",
      property: "State",
      option: "hover",
    });
    expect(f[0].detail).toMatch(/stale ignore/);
  });
});

describe("diffAll", () => {
  const dump = {
    exported: "2026-01-01",
    components: [
      { name: "rr-fixture-button", nodeId: "1:1", variants: FIXTURE_VARIANTS },
    ],
  };

  it("only diffs metas that declare bindings (opt-in, mirrors validate §4b)", () => {
    const unbound = {
      name: "rr-fixture-card",
      props: [{ name: "x", type: "string" }],
    };
    const { findings, checked } = diffAll([META, unbound], dump);
    expect(findings).toEqual([]);
    expect(checked).toEqual(["rr-fixture-button"]);
  });

  it("a bound meta missing from the dump is a named finding, not a skip", () => {
    const orphan = structuredClone(META);
    orphan.name = "rr-fixture-orphan";
    orphan.figma.nodeId = "9:9";
    const { findings } = diffAll([orphan], dump);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      class: "behind",
      component: "rr-fixture-orphan",
    });
    expect(findings[0].detail).toMatch(/no matching component set/);
  });
});
