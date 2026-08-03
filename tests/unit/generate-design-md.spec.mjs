/**
 * generate-design-md.spec.mjs — the ai/DESIGN.md generator (#186).
 *
 * Synthetic fixtures only (#151 discipline): every token store below is
 * hand-built. Nothing asserts against the real token files, so changing a
 * token value can never invert these tests — and a test can never end up
 * pinned to a defect someone later fixes.
 */
import { describe, it, expect } from "vitest";
import {
  clampDescription,
  fmtValue,
  fmtHex,
  withPx,
  cell,
  renderTable,
  genRegion,
  patchGenRegion,
  applyRegions,
  tokensUnder,
  referencedBy,
  contrastLabel,
  uncoveredTokens,
  DESC_BUDGET,
} from "../../scripts/generate-design-md.mjs";

/** A store shaped like loadTokens()'s result, with resolved values inline. */
const storeOf = (entries, baseRefs = []) => ({
  base: new Map(
    entries.map(([path, value, description]) => [
      path,
      { value, description: description ?? "", type: null, file: "fixture" },
    ]),
  ),
  brands: new Map(),
  baseRefs,
  brandRefs: new Map(),
});

describe("clampDescription", () => {
  it("keeps the minimum sentence count even past the budget", () => {
    const long = `${"A".repeat(100)}. ${"B".repeat(100)}. ${"C".repeat(100)}.`;
    const out = clampDescription(long);
    expect(out).toContain("A".repeat(100));
    expect(out).toContain("B".repeat(100));
    expect(out).not.toContain("C".repeat(100));
  });

  it("adds further sentences only while within budget", () => {
    const d = "Role label. Short use. Another short one. And one more.";
    expect(clampDescription(d)).toBe(d);
    expect(clampDescription(d, 25)).toBe("Role label. Short use.");
  });

  it("never cuts mid-sentence", () => {
    const out = clampDescription("One. Two. Three.", 1);
    expect(out.endsWith(".")).toBe(true);
  });

  it("is empty for a missing description rather than throwing", () => {
    expect(clampDescription(undefined)).toBe("");
    expect(clampDescription("")).toBe("");
  });

  it("uses a budget that leaves table cells readable", () => {
    expect(DESC_BUDGET).toBeGreaterThan(80);
  });
});

describe("fmtValue — composite tokens format as the CSS they build into", () => {
  it("renders typography in CSS font-shorthand order", () => {
    expect(
      fmtValue({
        fontFamily: "Space Grotesk",
        fontWeight: 300,
        fontSize: "2.5rem",
        lineHeight: 1.1,
      }),
    ).toBe("300 2.5rem/1.1 Space Grotesk");
  });

  it("renders a transition as duration, easing, delay", () => {
    expect(
      fmtValue({
        duration: "120ms",
        timingFunction: [0.25, 0.1, 0.25, 1],
        delay: "0ms",
      }),
    ).toBe("120ms cubic-bezier(0.25, 0.1, 0.25, 1) 0ms");
  });

  it("keeps the shadow spread the hand-written table used to drop", () => {
    expect(
      fmtValue({
        offsetX: "0",
        offsetY: "1px",
        blur: "3px",
        spread: "0",
        color: "rgba(0,0,0,0.08)",
      }),
    ).toBe("0 1px 3px 0 rgba(0,0,0,0.08)");
  });

  it("renders a bare easing array as cubic-bezier", () => {
    expect(fmtValue([0, 0, 0.58, 1])).toBe("cubic-bezier(0, 0, 0.58, 1)");
  });

  it("passes strings and numbers through", () => {
    expect(fmtValue("16px")).toBe("16px");
    expect(fmtValue(500)).toBe("500");
    expect(fmtValue(null)).toBe("");
  });
});

describe("value formatting helpers", () => {
  it("annotates rem with the px it renders at", () => {
    expect(withPx("0.625rem")).toBe("0.625rem (10px)");
    expect(withPx("2rem")).toBe("2rem (32px)");
  });

  it("leaves non-rem values alone", () => {
    expect(withPx("16px")).toBe("16px");
  });

  it("uppercases hex and leaves other values untouched", () => {
    expect(fmtHex("#4ade6e")).toBe("#4ADE6E");
    expect(fmtHex("transparent")).toBe("transparent");
  });

  it("escapes pipes so a value cannot break the table", () => {
    expect(cell("a | b")).toBe("a \\| b");
  });

  it("flattens newlines in a description into one cell", () => {
    expect(cell("one\n  two")).toBe("one two");
  });
});

describe("renderTable", () => {
  it("emits a header, a rule, and one row per entry", () => {
    const out = renderTable(["A", "B"], [["1", "2"]]).split("\n");
    expect(out).toEqual(["| A | B |", "|---|---|", "| 1 | 2 |"]);
  });
});

describe("GEN regions", () => {
  const doc = [
    "# Title",
    "",
    "Authored prose that must survive.",
    "",
    genRegion("colors", "| old |"),
    "",
    "More authored prose.",
  ].join("\n");

  it("replaces only the region body", () => {
    const out = patchGenRegion(doc, "colors", genRegion("colors", "| new |"));
    expect(out).toContain("| new |");
    expect(out).not.toContain("| old |");
    expect(out).toContain("Authored prose that must survive.");
    expect(out).toContain("More authored prose.");
  });

  it("is idempotent — regenerating unchanged content is a no-op", () => {
    const once = applyRegions(doc, [["colors", "| new |"]]);
    const twice = applyRegions(once, [["colors", "| new |"]]);
    expect(twice).toBe(once);
  });

  it("throws on an undeclared region rather than appending silently", () => {
    expect(() => patchGenRegion(doc, "spacing", "x")).toThrow(/no GEN:spacing/);
  });
});

describe("tokensUnder", () => {
  const store = storeOf([
    ["font.label.large", "a"],
    ["font.label.small", "b"],
    ["font.label-strong.large", "c"],
    ["font.code", "d"],
  ]);

  it("does not let a prefix bleed into a sibling group", () => {
    expect(tokensUnder(store, "font.label")).toEqual([
      "font.label.large",
      "font.label.small",
    ]);
  });

  it("takes a single token with exact", () => {
    expect(tokensUnder(store, "font.code", { exact: true })).toEqual([
      "font.code",
    ]);
  });

  it("preserves authored order rather than sorting", () => {
    const s = storeOf([
      ["spacing.section", "128px"],
      ["spacing.micro", "4px"],
    ]);
    expect(tokensUnder(s, "spacing")).toEqual([
      "spacing.section",
      "spacing.micro",
    ]);
  });
});

describe("referencedBy", () => {
  it("inverts the reference graph", () => {
    const store = storeOf(
      [["primitive.font.weight.medium", 500]],
      [
        {
          from: "font.label-strong.large",
          ref: "primitive.font.weight.medium",
        },
        {
          from: "font.label-strong.small",
          ref: "primitive.font.weight.medium",
        },
      ],
    );
    expect(referencedBy(store).get("primitive.font.weight.medium")).toEqual([
      "font.label-strong.large",
      "font.label-strong.small",
    ]);
  });
});

describe("contrastLabel", () => {
  const store = storeOf([
    ["color.background.default", "#0A0D0A"],
    ["color.background.alt", "#1E241E"],
    ["color.foreground.default", "#C8CFC4"],
    ["color.foreground.disabled", "#1E241E"],
    ["color.foreground.orphan", "#FFFFFF"],
  ]);

  const pairs = [
    {
      fg: "color.foreground.default",
      bg: "color.background.default",
      kind: "text",
    },
    {
      fg: "color.foreground.default",
      bg: "color.background.alt",
      kind: "text",
    },
  ];

  it("reports the worst intended pairing, not the flattering one", () => {
    const label = contrastLabel(store, "color.foreground.default", pairs);
    // #C8CFC4 scores ~12.3:1 on the canvas but only ~9.9:1 on background.alt.
    expect(label).toMatch(/^9\.9\d:1 AAA on `--color-background-alt`$/);
  });

  it("names the background so the number is unambiguous", () => {
    expect(contrastLabel(store, "color.foreground.default", pairs)).toContain(
      "on `--color-background-alt`",
    );
  });

  it("exempts disabled text, as WCAG does", () => {
    expect(contrastLabel(store, "color.foreground.disabled", pairs)).toBe(
      "exempt",
    );
  });

  it("reports nothing for a token with no intended pairing", () => {
    expect(contrastLabel(store, "color.foreground.orphan", pairs)).toBe("—");
  });

  it("ignores non-text pairings — they carry the 3:1 threshold, not 4.5", () => {
    const nonText = [
      {
        fg: "color.foreground.orphan",
        bg: "color.background.alt",
        kind: "non-text",
      },
    ];
    expect(contrastLabel(store, "color.foreground.orphan", nonText)).toBe("—");
  });

  it("labels a failing pair FAIL rather than quietly rounding to AA", () => {
    const s = storeOf([
      ["color.background.alt", "#1E241E"],
      ["color.foreground.weak", "#2A302A"],
    ]);
    const label = contrastLabel(s, "color.foreground.weak", [
      { fg: "color.foreground.weak", bg: "color.background.alt", kind: "text" },
    ]);
    expect(label).toContain("FAIL");
  });
});

describe("uncoveredTokens", () => {
  const store = storeOf([
    ["color.background.default", "#0A0D0A"],
    ["spacing.micro", "4px"],
    ["primitive.color.green.950", "#0A0D0A"],
  ]);

  it("passes when every semantic token is emitted", () => {
    const regions = [
      ["colors", "| --color-background-default | #0A0D0A | x |"],
      ["spacing", "| --spacing-micro | 4px | y |"],
    ];
    expect(uncoveredTokens(store, regions)).toEqual([]);
  });

  it("flags a semantic token no region emits", () => {
    const regions = [
      ["colors", "| --color-background-default | #0A0D0A | x |"],
    ];
    expect(uncoveredTokens(store, regions)).toEqual(["--spacing-micro"]);
  });

  it("does not require primitives to be documented", () => {
    const regions = [
      ["colors", "| --color-background-default | #0A0D0A | x |"],
      ["spacing", "| --spacing-micro | 4px | y |"],
    ];
    expect(uncoveredTokens(store, regions)).not.toContain(
      "--primitive-color-green-950",
    );
  });

  it("does not count a prefix match as coverage", () => {
    const s = storeOf([
      ["spacing.micro", "4px"],
      ["spacing.micro-alt", "6px"],
    ]);
    const regions = [["spacing", "| --spacing-micro-alt | 6px | y |"]];
    expect(uncoveredTokens(s, regions)).toEqual(["--spacing-micro"]);
  });
});
