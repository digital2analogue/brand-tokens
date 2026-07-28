/**
 * anatomy.spec.mjs — the `anatomy` section: schema, build gates, and the
 * pairings it contributes to contrast (#156 stage 2).
 *
 * Synthetic fixtures only (#151 discipline): every meta and token store below
 * is hand-built. Nothing reads design-system.json or the real token files, so
 * enriching a real component's anatomy can never invert these tests — and a
 * test can never end up pinned to a defect that someone later fixes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  flattenParts,
  unresolvedAnatomyTokens,
  unresolvedAnatomyStates,
  anatomyPairings,
  findPartPairing,
  partPaths,
} from "../../scripts/anatomy.mjs";
import { allIntendedPairings } from "../../scripts/contrast.mjs";

// A store is only asked "does this path exist" here — no value resolution.
const storeOf = (...paths) => ({
  base: new Map(paths.map((p) => [p, {}])),
  brands: new Map(),
});

const STORE = storeOf(
  "color.background.default",
  "color.background.alt",
  "color.background.sunk",
  "color.foreground.default",
  "color.foreground.alt",
  "color.foreground.disabled",
  "color.background.disabled",
  "spacing.tight",
  "font.label.medium",
);

const meta = (anatomy, props = []) => ({
  name: "rr-fixture",
  props,
  anatomy,
});

describe("flattenParts", () => {
  it("walks the tree depth-first with dotted paths", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          parts: [
            { name: "field", parts: [{ name: "placeholder" }] },
            { name: "helper" },
          ],
        },
      ],
    });
    expect(flattenParts(m).map((p) => p.path)).toEqual([
      "root",
      "root.field",
      "root.field.placeholder",
      "root.helper",
    ]);
  });

  it("returns nothing for a meta with no anatomy", () => {
    expect(flattenParts({ name: "rr-plain" })).toEqual([]);
  });
});

describe("unresolvedAnatomyTokens (validate §3b)", () => {
  it("flags a binding whose token does not exist", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          tokens: { background: "--color-background-defualt" }, // typo
        },
      ],
    });
    expect(unresolvedAnatomyTokens([m], STORE)).toEqual([
      {
        component: "rr-fixture",
        part: "root",
        state: null,
        key: "background",
        token: "--color-background-defualt",
      },
    ]);
  });

  it("passes bindings that resolve, including nested parts and arrays", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          tokens: {
            background: "--color-background-default",
            spacing: ["--spacing-tight"],
            font: "--font-label-medium",
          },
          parts: [
            { name: "child", tokens: { foreground: "--color-foreground-alt" } },
          ],
        },
      ],
    });
    expect(unresolvedAnatomyTokens([m], STORE)).toEqual([]);
  });

  it("checks state overlays too, and names the state", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          states: [
            {
              when: ":hover",
              tokens: { background: "--color-background-nope" },
            },
          ],
        },
      ],
    });
    const [hit] = unresolvedAnatomyTokens([m], STORE);
    expect(hit.state).toBe(":hover");
    expect(hit.token).toBe("--color-background-nope");
  });

  it("skips the permitted non-token literals", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          tokens: { background: "transparent", border: "currentColor" },
        },
      ],
    });
    expect(unresolvedAnatomyTokens([m], STORE)).toEqual([]);
  });
});

describe("unresolvedAnatomyStates (validate §1c)", () => {
  const withStates = (...whens) =>
    meta(
      { parts: [{ name: "root", states: whens.map((when) => ({ when })) }] },
      [{ name: "variant" }, { name: "disabled" }],
    );

  it("flags a `when` naming a prop the component does not declare", () => {
    expect(unresolvedAnatomyStates([withStates("varaint=success")])).toEqual([
      {
        component: "rr-fixture",
        part: "root",
        when: "varaint=success",
        prop: "varaint",
      },
    ]);
  });

  it("passes declared props in both the prop=value and bare forms", () => {
    expect(
      unresolvedAnatomyStates([withStates("variant=success", "disabled")]),
    ).toEqual([]);
  });

  it("does not check pseudo-classes or data-* state attributes", () => {
    expect(
      unresolvedAnatomyStates([
        withStates(":hover", ":focus-visible", "data-invalid"),
      ]),
    ).toEqual([]);
  });
});

describe("anatomyPairings", () => {
  it("derives a pair only when one part declares both sides", () => {
    const both = meta({
      parts: [
        {
          name: "root",
          tokens: {
            foreground: "--color-foreground-default",
            background: "--color-background-default",
          },
        },
      ],
    });
    const fgOnly = meta({
      parts: [
        { name: "root", tokens: { foreground: "--color-foreground-alt" } },
      ],
    });
    expect(anatomyPairings([both], STORE)).toHaveLength(1);
    expect(anatomyPairings([fgOnly], STORE)).toEqual([]);
  });

  it("never inherits a background from an ancestor part", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          tokens: { background: "--color-background-alt" },
          parts: [
            { name: "text", tokens: { foreground: "--color-foreground-alt" } },
          ],
        },
      ],
    });
    expect(anatomyPairings([m], STORE)).toEqual([]);
  });

  it("lets a state overlay inherit the resting bindings it does not override", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          tokens: {
            foreground: "--color-foreground-default",
            background: "--color-background-default",
          },
          states: [
            {
              when: ":hover",
              tokens: { background: "--color-background-sunk" },
            },
          ],
        },
      ],
    });
    const pairs = anatomyPairings([m], STORE);
    expect(pairs.map((p) => p.bg)).toEqual([
      "color.background.default",
      "color.background.sunk",
    ]);
    // the hover pair keeps the resting foreground
    expect(pairs[1].fg).toBe("color.foreground.default");
  });

  it("exempts disabled states (WCAG exempts disabled controls)", () => {
    const m = meta({
      parts: [
        {
          name: "root",
          states: [
            {
              when: "disabled",
              tokens: {
                foreground: "--color-foreground-disabled",
                background: "--color-background-disabled",
              },
            },
          ],
        },
      ],
    });
    expect(anatomyPairings([m], STORE)).toEqual([]);
  });

  it("yields no pair for a non-token literal or an unresolvable token", () => {
    const literal = meta({
      parts: [
        {
          name: "root",
          tokens: {
            foreground: "--color-foreground-default",
            background: "transparent",
          },
        },
      ],
    });
    const dangling = meta({
      parts: [
        {
          name: "root",
          tokens: {
            foreground: "--color-foreground-default",
            background: "--color-background-ghost",
          },
        },
      ],
    });
    expect(anatomyPairings([literal], STORE)).toEqual([]);
    expect(anatomyPairings([dangling], STORE)).toEqual([]);
  });

  it("dedupes a pair two parts happen to share", () => {
    const tokens = {
      foreground: "--color-foreground-default",
      background: "--color-background-default",
    };
    const m = meta({
      parts: [
        { name: "a", tokens },
        { name: "b", tokens },
      ],
    });
    expect(anatomyPairings([m], STORE)).toHaveLength(1);
  });
});

describe("findPartPairing / partPaths (check_contrast contract mode)", () => {
  const m = meta({
    parts: [
      {
        name: "root",
        parts: [
          {
            name: "field",
            tokens: {
              foreground: "--color-foreground-default",
              background: "--color-background-default",
            },
            states: [
              {
                when: ":hover",
                tokens: { background: "--color-background-sunk" },
              },
            ],
          },
        ],
      },
    ],
  });

  it("resolves by full path or by leaf name", () => {
    for (const part of ["root.field", "field"]) {
      expect(findPartPairing([m], "rr-fixture", part)).toEqual({
        foreground: "--color-foreground-default",
        background: "--color-background-default",
      });
    }
  });

  it("applies a state overlay over the resting bindings", () => {
    expect(findPartPairing([m], "rr-fixture", "field", ":hover")).toEqual({
      foreground: "--color-foreground-default",
      background: "--color-background-sunk",
    });
  });

  it("returns null rather than guessing at an unknown component/part/state", () => {
    expect(findPartPairing([m], "rr-nope", "field")).toBeNull();
    expect(findPartPairing([m], "rr-fixture", "footer")).toBeNull();
    expect(findPartPairing([m], "rr-fixture", "field", ":active")).toBeNull();
  });

  it("lists the real parts for the error message", () => {
    expect(partPaths([m], "rr-fixture")).toEqual(["root", "root.field"]);
    expect(partPaths([m], "rr-nope")).toEqual([]);
  });
});

describe("allIntendedPairings: excludeBrands beats every source", () => {
  // The regression this guards: excludeBrands used to be honoured by skipping
  // the *add*, which only works while no other source names the same pair.
  // Anatomy contributes exactly the pairs decision-engine is excluded from.
  const excluded = meta({
    parts: [
      {
        name: "root",
        tokens: {
          foreground: "--color-foreground-alt",
          background: "--color-background-alt",
        },
      },
    ],
  });
  const MAP = [
    {
      fg: "color.foreground.alt",
      bg: "color.background.alt",
      kind: "text",
      context: "fixture pair",
      excludeBrands: ["fixture-brand"],
    },
  ];
  const has = (pairs) =>
    pairs.some(
      (p) => p.fg === "color.foreground.alt" && p.bg === "color.background.alt",
    );

  it("drops an anatomy-contributed pair the map excludes for that brand", () => {
    const pairs = allIntendedPairings(STORE, "fixture-brand", {
      metas: [excluded],
      pairings: MAP,
    });
    expect(has(pairs)).toBe(false);
  });

  it("keeps it for a brand the map does not exclude, and for base", () => {
    for (const brand of ["other-brand", null]) {
      const pairs = allIntendedPairings(STORE, brand, {
        metas: [excluded],
        pairings: MAP,
      });
      expect(has(pairs), `brand: ${brand}`).toBe(true);
    }
  });
});

describe("meta.schema.json: anatomy", () => {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(
    JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../schemas/meta.schema.json"),
        "utf8",
      ),
    ),
  );

  // Minimal meta carrying every required top-level field.
  const withAnatomy = (anatomy) => ({
    metaVersion: "1.0.0",
    status: "stable",
    name: "rr-fixture",
    summary: "Fixture.",
    package: "@digital2analogue2/parsimony-components",
    props: [],
    slots: [],
    tokensUsed: ["--color-background-default"],
    examples: [{ title: "Default", html: "<rr-fixture></rr-fixture>" }],
    accessibility: { ariaPattern: "https://example.com/pattern", wcag: [] },
    anatomy,
  });

  const ok = (anatomy) => validate(withAnatomy(anatomy));

  it("accepts a nested part tree with states", () => {
    expect(
      ok({
        parts: [
          {
            name: "root",
            element: ":host",
            tokens: {
              background: "--color-background-default",
              spacing: ["--spacing-tight", "--spacing-element"],
              font: "--font-label-medium",
            },
            states: [
              {
                when: "variant=success",
                tokens: { foreground: "--color-foreground-success" },
              },
            ],
            parts: [{ name: "label", cssPart: "label" }],
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects primitive and component-tier tokens (#114 stays dead)", () => {
    for (const token of [
      "--primitive-color-green-500",
      "--component-badge-background",
    ]) {
      expect(
        ok({ parts: [{ name: "root", tokens: { background: token } }] }),
        token,
      ).toBe(false);
    }
  });

  it("rejects a token from the wrong family for its key", () => {
    expect(
      ok({ parts: [{ name: "root", tokens: { spacing: "--radius-full" } }] }),
    ).toBe(false);
    expect(
      ok({
        parts: [{ name: "root", tokens: { font: "--color-foreground-alt" } }],
      }),
    ).toBe(false);
  });

  it("allows transparent/currentColor but no other bare value", () => {
    expect(
      ok({ parts: [{ name: "root", tokens: { background: "transparent" } }] }),
    ).toBe(true);
    expect(
      ok({ parts: [{ name: "root", tokens: { border: "currentColor" } }] }),
    ).toBe(true);
    expect(
      ok({ parts: [{ name: "root", tokens: { background: "#4ADE6E" } }] }),
    ).toBe(false);
  });

  it("rejects an unknown binding key and a malformed `when`", () => {
    expect(
      ok({
        parts: [{ name: "root", tokens: { outline: "--color-border-focus" } }],
      }),
    ).toBe(false);
    expect(
      ok({
        parts: [
          {
            name: "root",
            states: [
              {
                when: "variant = success",
                tokens: { background: "--color-background-alt" },
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });
});
