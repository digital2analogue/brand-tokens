/**
 * drift-scan.spec.mjs — the consumer-repo scan's file selection (#174).
 *
 * Synthetic fixtures only (#151 discipline): the trees below are written to a
 * temp dir, never read from a real consumer, so a consumer's own edits can
 * never invert these tests.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanConsumer } from "../../scripts/drift-scan.mjs";

let root;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "drift-scan-"));
  mkdirSync(join(root, "lib"), { recursive: true });
  mkdirSync(join(root, "tests/unit"), { recursive: true });

  writeFileSync(join(root, "lib/real.ts"), `const a = "color: #4ADE6E;";\n`);
  // A detector's own tests carry deliberately-bad snippets — that is what they
  // ARE. Scanning them reports the fixture as drift, every week, forever.
  writeFileSync(
    join(root, "tests/unit/rules.spec.ts"),
    `it("flags hex", () => expect(lint("color: #4ADE6E;")).toHaveLength(1));\n`,
  );
  writeFileSync(
    join(root, "lib/thing.test.ts"),
    `const bad = "font-weight: 700;";\n`,
  );
  // A comment is documentation, not styling.
  writeFileSync(
    join(root, "lib/documented.ts"),
    `// the component tier went away in parsimony#114\nexport const x = 1;\n`,
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("scanConsumer file selection", () => {
  it("scans ordinary sources", () => {
    const { violations } = scanConsumer(root);
    expect(violations.some((v) => v.file.endsWith("lib/real.ts"))).toBe(true);
  });

  it("skips *.spec.* files", () => {
    const { violations } = scanConsumer(root);
    expect(violations.some((v) => v.file.includes("rules.spec.ts"))).toBe(
      false,
    );
  });

  it("skips *.test.* files", () => {
    const { violations } = scanConsumer(root);
    expect(violations.some((v) => v.file.includes("thing.test.ts"))).toBe(
      false,
    );
  });

  it("does not report a value that only appears in a comment", () => {
    const { violations } = scanConsumer(root);
    expect(violations.some((v) => v.file.includes("documented.ts"))).toBe(
      false,
    );
  });

  it("still counts the skipped files as not scanned, not as clean", () => {
    const { scanned } = scanConsumer(root);
    // real.ts + documented.ts only — the two test files are never opened.
    expect(scanned).toBe(2);
  });

  it("honours an explicit ignore glob", () => {
    const { violations } = scanConsumer(root, { ignore: ["lib/real.ts"] });
    expect(violations).toHaveLength(0);
  });
});
