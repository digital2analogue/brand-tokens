/**
 * token-changelog.mjs — a semantic diff between two published token releases (#88).
 *
 * Usage:
 *   npm run changelog -- <from> [to]     # e.g. 0.6.1 0.7.0
 *   npm run changelog -- <from>          # <from> vs the current source build
 *
 * The fifth-pass inspection scored Station 7 partly on this: there is no
 * CHANGELOG for either published package, so a consumer going 0.6.1 -> 0.7.0
 * has nothing to read. On 2026-08-11 the only way to learn that `spacing.align`
 * had been added was to download both tarballs and diff them by hand — which is
 * literally what that session did. This turns that into one command.
 *
 * Reuses scripts/token-diff.mjs, shared with check-publish-fresh, so the
 * freshness gate and the changelog can never disagree about what changed.
 * Prints markdown to stdout; it never edits CHANGELOG.md itself, so the entry
 * lands through a reviewed diff like every other artifact here.
 */

import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  parseTokens,
  diffTokenMaps,
  isEmptyDiff,
  renderBrandDiff,
} from "./token-diff.mjs";

const PKG = "@digital2analogue2/parsimony";
const ROOT = resolve(import.meta.dirname, "..");

/** Unpack a published version and return its css/ directory. */
function fetchPublished(version) {
  const tmp = mkdtempSync(join(tmpdir(), `tokens-${version}-`));
  execSync(`npm pack ${PKG}@${version} --pack-destination "${tmp}"`, {
    stdio: "ignore",
  });
  const tgz = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  if (!tgz) throw new Error(`npm pack produced no tarball for ${version}`);
  execSync(`tar -xzf "${join(tmp, tgz)}" -C "${tmp}"`, { stdio: "ignore" });
  return join(tmp, "package", "css");
}

/** The current source build. */
function buildSource() {
  execSync("node scripts/build-brands.mjs", { cwd: ROOT, stdio: "ignore" });
  return resolve(ROOT, "build/css");
}

const [from, to] = process.argv.slice(2);
if (!from) {
  console.error("usage: npm run changelog -- <fromVersion> [toVersion]");
  process.exit(2);
}

let fromDir, toDir, toLabel;
try {
  fromDir = fetchPublished(from);
  if (to) {
    toDir = fetchPublished(to);
    toLabel = to;
  } else {
    toDir = buildSource();
    toLabel = `${JSON.parse(readFileSync(resolve(ROOT, "packages/tokens/package.json"), "utf8")).version} (unpublished source)`;
  }
} catch (e) {
  console.error(`Could not fetch a version: ${e.message}`);
  process.exit(2);
}

const files = readdirSync(toDir)
  .filter((f) => f.endsWith(".css"))
  .sort();
const sections = [];
let anyChange = false;

for (const file of files) {
  const after = parseTokens(readFileSync(join(toDir, file), "utf8"));
  const beforePath = join(fromDir, file);
  if (!existsSync(beforePath)) {
    sections.push(
      `#### ${file}\n\n**Added** — new brand file in this release.\n`,
    );
    anyChange = true;
    continue;
  }
  const diff = diffTokenMaps(
    parseTokens(readFileSync(beforePath, "utf8")),
    after,
  );
  if (isEmptyDiff(diff)) continue;
  anyChange = true;
  sections.push(renderBrandDiff(file, diff));
}

console.log(`## ${toLabel}\n`);
if (!anyChange) {
  console.log(`No token changes since \`${from}\`.\n`);
} else {
  console.log(`Token changes since \`${from}\`.\n`);
  console.log(sections.join("\n"));
}
