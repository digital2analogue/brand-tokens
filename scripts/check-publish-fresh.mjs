/**
 * check-publish-fresh.mjs — is the published @digital2analogue2/parsimony behind the source?
 *
 * Builds the brand CSS from the current token source, then compares its token
 * declarations against the latest PUBLISHED package on npm. If any token was
 * added, removed, or changed in value, the package is stale and needs a
 * republish.
 *
 * Closes the "source → published" staleness arrow: a token edit that never gets
 * published would otherwise silently ship old values to every consumer.
 *
 * Comparison is by token declaration (--name: value), not raw text, so comments,
 * ordering, and whitespace don't cause false positives — only real value drift.
 *
 *   --md   emit a Markdown report (for GitHub step summaries / issue bodies).
 *
 * Exit: 0 = in sync, 1 = stale (republish), 2 = setup/fetch error.
 */

import { execSync } from "node:child_process";
import { parseTokens, diffTokenMaps } from "./token-diff.mjs";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const PKG = "@digital2analogue2/parsimony";
const ROOT = resolve(import.meta.dirname, "..");
const BUILD_CSS = resolve(ROOT, "build/css");
const asMarkdown = process.argv.includes("--md");

// 1. Build fresh CSS from the current token source.
execSync("node scripts/build-brands.mjs", { cwd: ROOT, stdio: "ignore" });

// 2. Download the latest published package and unpack it.
const tmp = mkdtempSync(join(tmpdir(), "pub-tokens-"));
let publishedVersion;
try {
  publishedVersion = execSync(`npm view ${PKG} version`, {
    encoding: "utf8",
  }).trim();
  execSync(`npm pack ${PKG}@${publishedVersion} --pack-destination "${tmp}"`, {
    stdio: "ignore",
  });
  const tgz = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  if (!tgz) throw new Error("npm pack produced no tarball");
  execSync(`tar -xzf "${join(tmp, tgz)}" -C "${tmp}"`, { stdio: "ignore" });
} catch (e) {
  console.error(`Could not fetch the published ${PKG}: ${e.message}`);
  process.exit(2);
}
const PUB_CSS = join(tmp, "package", "css");

// 3. Compare each brand CSS, token by token.
const files = readdirSync(BUILD_CSS)
  .filter((f) => f.endsWith(".css"))
  .sort();
const drift = [];
for (const file of files) {
  const fresh = parseTokens(readFileSync(join(BUILD_CSS, file), "utf8"));
  const pubPath = join(PUB_CSS, file);
  if (!existsSync(pubPath)) {
    drift.push({
      file,
      changes: [
        "(file is in the source build but not in the published package)",
      ],
    });
    continue;
  }
  const pub = parseTokens(readFileSync(pubPath, "utf8"));
  // Shared with token-changelog.mjs (#88) — one definition of "what changed".
  const d = diffTokenMaps(pub, fresh);
  const changes = [
    ...d.added.map(([k, v]) => `+ ${k}: ${v}`),
    ...d.changed.map(([k, a, b]) => `~ ${k}: ${a}  ->  ${b}`),
    ...d.removed.map((k) => `- ${k} (removed)`),
  ];
  if (changes.length) drift.push({ file, changes });
}

// 4. Report.
if (drift.length === 0) {
  console.log(
    asMarkdown
      ? `## Publish freshness: in sync\n\nPublished \`${PKG}@${publishedVersion}\` matches the current token source.`
      : `PASS  Published ${PKG}@${publishedVersion} matches the current token source.`,
  );
  process.exit(0);
}

if (asMarkdown) {
  console.log("## Publish freshness: STALE\n");
  console.log(
    `The token source has changed since \`${PKG}@${publishedVersion}\` was published. Run the publish workflow to ship the new values.\n`,
  );
  for (const d of drift) {
    console.log(`### ${d.file}\n`);
    console.log("```");
    console.log(d.changes.join("\n"));
    console.log("```\n");
  }
} else {
  console.error(
    `STALE  Source differs from published ${PKG}@${publishedVersion}. Republish.\n`,
  );
  for (const d of drift) {
    console.error(`${d.file}:`);
    console.error(d.changes.join("\n"));
    console.error("");
  }
}
process.exit(1);
