/**
 * assembly-slots.spec.mjs — rule 4 (slot composition) of check_assembly (#154).
 *
 * Synthetic fixtures only (#151 discipline): the component index and token
 * store below are hand-built, never loaded from live design-system.json —
 * so enriching a real meta.json can never invert these tests.
 */
import { describe, it, expect } from "vitest";
import { checkAssembly, unresolvedAccepts } from "../../scripts/assembly.mjs";

// Minimal store: rule 4 never resolves tokens, rules 1–3 see empty inputs.
const STORE = { base: new Map() };

const INDEX = new Map(
  [
    {
      name: "rr-fixture-menu",
      slots: [
        { name: "trigger", description: "unconstrained opener" },
        { name: "(default)", accepts: ["rr-fixture-item"] },
      ],
    },
    {
      name: "rr-fixture-icon",
      slots: [{ name: "default", accepts: ["svg"] }],
    },
    {
      name: "rr-fixture-open",
      slots: [{ name: "default", accepts: ["*"] }],
    },
  ].map((c) => [c.name, c]),
);

const check = (placements) => checkAssembly(STORE, { placements }, INDEX);

describe("check_assembly rule 4: slot composition", () => {
  it("flags a component a slot's accepts excludes", () => {
    const { valid, suggestions } = check([
      { component: "rr-fixture-badge", parent: "rr-fixture-menu" },
    ]);
    expect(valid).toBe(false);
    expect(suggestions[0]).toMatch(/accepts only rr-fixture-item/);
    expect(suggestions[0]).toMatch(/rr-fixture-badge/);
  });

  it("passes an accepted component", () => {
    const { valid } = check([
      { component: "rr-fixture-item", parent: "rr-fixture-menu" },
    ]);
    expect(valid).toBe(true);
  });

  it("accepts plain element tags (svg), not just rr-*", () => {
    expect(check([{ component: "svg", parent: "rr-fixture-icon" }]).valid).toBe(
      true,
    );
    expect(check([{ component: "img", parent: "rr-fixture-icon" }]).valid).toBe(
      false,
    );
  });

  it("has no opinion on slots without accepts, or with '*'", () => {
    expect(
      check([
        {
          component: "rr-anything",
          parent: "rr-fixture-menu",
          slot: "trigger",
        },
        { component: "rr-anything", parent: "rr-fixture-open" },
      ]).valid,
    ).toBe(true);
  });

  it('normalizes default-slot spellings ("default", "(default)", omitted)', () => {
    // Contract says "(default)"; caller says nothing / "default" — same slot.
    for (const slot of [undefined, "default", "(default)"]) {
      const { valid } = check([
        { component: "rr-fixture-item", parent: "rr-fixture-menu", slot },
      ]);
      expect(valid, `slot spelling: ${slot}`).toBe(true);
    }
  });

  it("names an unknown parent instead of guessing", () => {
    const { suggestions } = check([
      { component: "rr-fixture-item", parent: "rr-nonexistent" },
    ]);
    expect(suggestions[0]).toBe("rr-nonexistent is not a known component.");
  });

  it("names a missing slot and lists the real ones", () => {
    const { suggestions } = check([
      {
        component: "rr-fixture-item",
        parent: "rr-fixture-menu",
        slot: "footer",
      },
    ]);
    expect(suggestions[0]).toMatch(/no "footer" slot/);
    expect(suggestions[0]).toMatch(/trigger, default/);
  });

  it("stays backward compatible: no placements → rule 4 silent", () => {
    const { valid, suggestions } = checkAssembly(STORE, {}, INDEX);
    expect(valid).toBe(true);
    expect(suggestions).toEqual([]);
  });
});

describe("unresolvedAccepts (the validate.mjs build gate)", () => {
  it("flags an rr-* accepts entry that names no component", () => {
    const metas = [
      {
        name: "rr-fixture-menu",
        slots: [{ name: "(default)", accepts: ["rr-fixture-itme"] }], // typo
      },
    ];
    expect(unresolvedAccepts(metas)).toEqual([
      {
        component: "rr-fixture-menu",
        slot: "default",
        entry: "rr-fixture-itme",
      },
    ]);
  });

  it("passes when the referenced component exists", () => {
    const metas = [
      {
        name: "rr-fixture-menu",
        slots: [{ name: "default", accepts: ["rr-fixture-item"] }],
      },
      { name: "rr-fixture-item", slots: [] },
    ];
    expect(unresolvedAccepts(metas)).toEqual([]);
  });

  it("ignores plain element tags, '*', and '#text' — they are not component refs", () => {
    const metas = [
      {
        name: "rr-fixture-icon",
        slots: [{ name: "default", accepts: ["svg", "*", "#text"] }],
      },
    ];
    expect(unresolvedAccepts(metas)).toEqual([]);
  });

  it("handles metas with no slots or no accepts", () => {
    const metas = [
      { name: "rr-fixture-plain" },
      { name: "rr-fixture-open", slots: [{ name: "default" }] },
    ];
    expect(unresolvedAccepts(metas)).toEqual([]);
  });
});
