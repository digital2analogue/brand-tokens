/**
 * token-diff.spec.mjs — the shared comparison behind the publish-freshness gate
 * and the token changelog (#88). Synthetic fixtures only (#151).
 */
import { describe, it, expect } from "vitest";
import {
  parseTokens,
  diffTokenMaps,
  isEmptyDiff,
  renderBrandDiff,
} from "../../scripts/token-diff.mjs";

describe("parseTokens", () => {
  it("reads every declaration in a :root block", () => {
    const css = `:root {\n  --color-foreground-default: #C8CFC4;\n  --spacing-tight: var(--primitive-space-xs);\n}`;
    expect(parseTokens(css)).toEqual({
      "--color-foreground-default": "#C8CFC4",
      "--spacing-tight": "var(--primitive-space-xs)",
    });
  });

  it("keeps a comment-trailed value intact up to the semicolon", () => {
    // Built brand CSS puts the token description in a trailing comment.
    const css = `--spacing-align: var(--primitive-space-3xs); /** Optical alignment. */`;
    expect(parseTokens(css)["--spacing-align"]).toBe(
      "var(--primitive-space-3xs)",
    );
  });
});

describe("diffTokenMaps", () => {
  const before = { "--a": "1", "--b": "2", "--c": "3" };
  const after = { "--a": "1", "--b": "22", "--d": "4" };

  it("separates added, changed and removed", () => {
    const d = diffTokenMaps(before, after);
    expect(d.added).toEqual([["--d", "4"]]);
    expect(d.changed).toEqual([["--b", "2", "22"]]);
    expect(d.removed).toEqual(["--c"]);
  });

  it("reports nothing when the two sides match", () => {
    expect(isEmptyDiff(diffTokenMaps(before, before))).toBe(true);
  });

  it("is directional — swapping the arguments swaps added and removed", () => {
    const fwd = diffTokenMaps(before, after);
    const rev = diffTokenMaps(after, before);
    expect(rev.added.map(([n]) => n)).toEqual(fwd.removed);
    expect(rev.removed).toEqual(fwd.added.map(([n]) => n));
  });

  it("sorts each bucket so output is deterministic", () => {
    const d = diffTokenMaps({}, { "--z": "1", "--a": "2" });
    expect(d.added.map(([n]) => n)).toEqual(["--a", "--z"]);
  });
});

describe("renderBrandDiff", () => {
  it("leads with semantic tokens and folds primitives into a details block", () => {
    const d = diffTokenMaps(
      { "--primitive-space-3xs": "2px" },
      {
        "--spacing-align": "var(--primitive-space-3xs)",
        "--primitive-space-3xs": "3px",
      },
    );
    const md = renderBrandDiff("variables.css", d);
    expect(md).toContain("#### variables.css");
    expect(md).toContain("**Added**");
    expect(md).toContain("`--spacing-align`");
    // The primitive change is present but demoted.
    expect(md).toContain("<details><summary>Primitive-layer changes</summary>");
    expect(md).toContain("`--primitive-space-3xs`");
    // The semantic bullet must appear before the details block.
    expect(md.indexOf("`--spacing-align`")).toBeLessThan(
      md.indexOf("<details>"),
    );
  });

  it("renders nothing for an unchanged brand", () => {
    expect(
      renderBrandDiff(
        "dot-art.css",
        diffTokenMaps({ "--a": "1" }, { "--a": "1" }),
      ),
    ).toBe("");
  });

  it("omits the details block when only semantic tokens moved", () => {
    const d = diffTokenMaps({}, { "--spacing-align": "2px" });
    expect(renderBrandDiff("variables.css", d)).not.toContain("<details>");
  });
});
