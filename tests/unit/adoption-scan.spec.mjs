/**
 * adoption-scan.spec.mjs — #106's scanner, against synthetic fixtures only.
 *
 * Per the repo's #151 discipline: never assert against live repo data. A test
 * pinned to portfolio-vercel's real token usage would invert the day someone
 * adopts another token, which is the opposite of a regression test.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  scanAdoption,
  versionReport,
  semanticTokenSet,
} from "../../scripts/adoption-scan.mjs";

const COMPONENTS = ["rr-badge", "rr-button", "rr-table", "rr-table-row"];
const TOKENS = new Set([
  "--color-foreground-default",
  "--spacing-element",
  "--radius-sm",
]);

let dir;
beforeAll(() => {
  dir = mkdtempSync(resolve(tmpdir(), "adoption-"));
  mkdirSync(resolve(dir, "src"));
  // real markup usage
  writeFileSync(
    resolve(dir, "src/page.tsx"),
    `export const P = () => <rr-button size="md">Go</rr-button>;\n`,
  );
  // token references, one repeated
  writeFileSync(
    resolve(dir, "src/app.css"),
    `.a { color: var(--color-foreground-default); padding: var(--spacing-element); }\n` +
      `.b { color: var(--color-foreground-default); }\n`,
  );
  // prose mentioning a component name but not using it
  writeFileSync(
    resolve(dir, "src/prose.ts"),
    `export const copy = "The agent calls get_component('rr-badge') and reads the contract.";\n`,
  );
  writeFileSync(
    resolve(dir, "package.json"),
    JSON.stringify({
      dependencies: { "@digital2analogue2/parsimony": "^0.7.0" },
    }),
  );
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const scan = () =>
  scanAdoption(dir, { components: COMPONENTS, tokens: TOKENS });

describe("component detection", () => {
  it("counts a component used as markup", () => {
    expect(scan().components.used).toContain("rr-button");
  });

  it("does NOT count a bare name mentioned in prose", () => {
    // The first version of this scan reported portfolio-vercel as using
    // rr-badge because the string appeared in an image alt-text.
    expect(scan().components.used).not.toContain("rr-badge");
  });

  it("does not let a prefix match a longer sibling", () => {
    // `rr-table` must not match `<rr-table-row`.
    const d = mkdtempSync(resolve(tmpdir(), "adoption-prefix-"));
    writeFileSync(
      resolve(d, "x.tsx"),
      `<rr-table-row selected></rr-table-row>`,
    );
    const r = scanAdoption(d, { components: COMPONENTS, tokens: TOKENS });
    expect(r.components.used).toEqual(["rr-table-row"]);
    rmSync(d, { recursive: true, force: true });
  });

  it("reports where each component was found, so the count is auditable", () => {
    expect(scan().components.where["rr-button"]).toEqual(["src/page.tsx"]);
  });

  it("lists the unused remainder", () => {
    expect(scan().components.unused).toContain("rr-table");
  });
});

describe("token detection", () => {
  it("counts only known semantic tokens", () => {
    expect(scan().tokens.used).toEqual([
      "--color-foreground-default",
      "--spacing-element",
    ]);
  });

  it("counts every reference, not every file", () => {
    expect(scan().tokens.counts["--color-foreground-default"]).toBe(2);
  });

  it("reports tokens the consumer never touches", () => {
    expect(scan().tokens.unused).toEqual(["--radius-sm"]);
  });
});

describe("semanticTokenSet", () => {
  it("excludes primitives — referencing one is drift, not adoption", () => {
    const store = {
      base: new Map([
        ["color.foreground.default", {}],
        ["primitive.color.green.500", {}],
      ]),
    };
    const set = semanticTokenSet(store);
    expect(set.has("--color-foreground-default")).toBe(true);
    expect(set.has("--primitive-color-green-500")).toBe(false);
  });
});

describe("versionReport", () => {
  it("reads the declared range and reports the source version", () => {
    const v = versionReport(dir, "@digital2analogue2/parsimony", "0.7.0");
    expect(v.declared).toBe("^0.7.0");
    expect(v.source).toBe("0.7.0");
    expect(v.installed).toBeNull(); // nothing installed in the fixture
  });
});
