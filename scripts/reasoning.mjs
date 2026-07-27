/**
 * reasoning.mjs — shared parsing + querying for the design-reasoning layer.
 *
 * The single source for reading the two human-authored rationale files. Imported by:
 *   - packages/mcp/src/server.mjs (the find_rule / get_rule / find_decision / get_decision tools)
 *
 * Same principle as scripts/rules.mjs (lint rules) and scripts/tokens.mjs (token
 * resolution): the parse lives once, the server is a thin wrapper, and the tests
 * import these functions directly rather than starting the MCP transport.
 *
 * Two query/lookup pairs, mirroring tokens.mjs (findTokens search + direct lookup):
 *   - rules     ← ai/rules.md       (the hard + soft rules)
 *   - decisions ← docs/decisions.md (dated entries + the archived ADR D-NN section)
 *
 * find_* answers a topic query with a ranked array; get_* answers an exact id
 * lookup (`hard-5`, `D-06`) with a single record. This is the MCP shape-follows-verb
 * convention (find/search → list, get → one), the same split Phase 1 used for
 * find_token vs get_token.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

// ── Shared text helpers ───────────────────────────────────────────────────────

/** Collapse whitespace and drop a trailing `---` horizontal rule left by the split. */
function clean(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/\s*-{3,}\s*$/, "")
    .trim();
}

/** A stable, url-ish slug from a heading title (used to id same-day dated entries). */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Pull `**Label:** content` fields out of a markdown block. A field runs from its
 * `**Label:**` marker to the next marker (or the end of the block), so multi-line
 * and multi-paragraph values are captured whole. Returns { [label]: cleanedText }.
 */
function extractFields(block) {
  const re = /\*\*([^*]+?):\*\*/g;
  const markers = [];
  let m;
  while ((m = re.exec(block))) {
    markers.push({
      label: m[1].trim(),
      contentStart: re.lastIndex,
      markerStart: m.index,
    });
  }
  const fields = {};
  for (let i = 0; i < markers.length; i++) {
    const end =
      i + 1 < markers.length ? markers[i + 1].markerStart : block.length;
    fields[markers[i].label] = clean(block.slice(markers[i].contentStart, end));
  }
  return fields;
}

// ── Rules (ai/rules.md) ───────────────────────────────────────────────────────

/**
 * Parse the Hard Rules and Soft Rules numbered lists out of ai/rules.md.
 * Pure — takes the markdown text so tests can pass fixtures.
 * Returns Rule[] of { id, type, number, rule, rationale } where:
 *   - id        : `${type}-${number}`, e.g. "hard-5"
 *   - type      : "hard" | "soft"
 *   - rule      : the full rule text
 *   - rationale : the clause after the first " — " separator, or null
 * Scope is the hard + soft lists only (Typography Hierarchy / Per-Site Variations
 * are usage prose, served by the token tools, not rule queries).
 */
export function parseRules(markdown) {
  const rules = [];
  let type = null; // "hard" | "soft" | null (outside the two lists)
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      const h = heading[1].toLowerCase();
      type = h.startsWith("hard rules")
        ? "hard"
        : h.startsWith("soft rules")
          ? "soft"
          : null;
      continue;
    }
    if (!type) continue;
    const item = line.match(/^(\d+)\.\s+(.+?)\s*$/);
    if (!item) continue;
    const number = Number(item[1]);
    const text = item[2].trim();
    const parts = text.split(/\s*—\s*/); // em-dash separates directive from its inline reason
    const rationale =
      parts.length > 1 ? parts.slice(1).join(" — ").trim() : null;
    rules.push({
      id: `${type}-${number}`,
      type,
      number,
      rule: text,
      rationale,
    });
  }
  return rules;
}

/** Read + parse ai/rules.md from the repo root. */
export function loadRules() {
  return parseRules(readFileSync(resolve(ROOT, "ai", "rules.md"), "utf8"));
}

/**
 * Find rules by topic. Case-insensitive, word-level AND match over the rule text
 * (same approach as findTokens). Returns matches with a 1-based `rank` and the
 * `matchedOn` terms, ranked by rule order (hard before soft, ascending number).
 */
export function findRules(rules, topic, { limit = 10 } = {}) {
  const terms = topic.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return rules
    .filter((r) => {
      const hay = `${r.id} ${r.rule}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1, matchedOn: terms }));
}

/** Exact-id lookup, e.g. getRule(rules, "hard-5"). Case-insensitive. Null if absent. */
export function getRule(rules, id) {
  const key = String(id).toLowerCase();
  return rules.find((r) => r.id.toLowerCase() === key) ?? null;
}

// ── Decisions (docs/decisions.md) ─────────────────────────────────────────────

const DATE_RE = /^(\d{4}-\d{2}(?:-\d{2})?)\b/; // several entries are YYYY-MM only

/** Map a raw `**Label:** → content` field bag onto the normalized decision shape. */
function normalizeFields(f) {
  return {
    decision: f["Decided"] ?? f["Decision"] ?? null,
    why: f["Why"] ?? null,
    rejected: f["Alternative considered"] ?? f["Rejected"] ?? null,
    status: f["Status"] ?? null,
  };
}

/**
 * Parse docs/decisions.md into a uniform Decision[] across both formats:
 *   - dated entries      (## YYYY-MM[-DD] — Title, with **Decided:** / **Alternative considered:**)
 *   - archived ADR log   (### D-NN · Title, with **Decision:** / **Rejected:** / **Date:**)
 * Pure — takes the markdown text. Returns { id, date, title, source, decision,
 * why, rejected, status }, newest dated entries first, then D-01…D-NN.
 */
export function parseDecisions(markdown) {
  const split = markdown.split(/\n#\s+Archived ADR Log/);
  const datedPart = split[0];
  const archivedPart = split[1] ?? "";
  const decisions = [];

  // Dated entries: split on `## ` headings, keep those whose title starts with a date.
  for (const chunk of datedPart.split(/(?:^|\n)##\s+/).slice(1)) {
    const nl = chunk.indexOf("\n");
    const headingText = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const dateMatch = headingText.match(DATE_RE);
    if (!dateMatch) continue;
    const date = dateMatch[1];
    const title = headingText
      .replace(DATE_RE, "")
      .replace(/^\s*—\s*/, "")
      .trim();
    const body = nl === -1 ? "" : chunk.slice(nl + 1);
    decisions.push({
      id: `${date}-${slugify(title)}`,
      date,
      title,
      source: "dated",
      ...normalizeFields(extractFields(body)),
    });
  }

  // Archived ADR entries: split on `### ` headings, keep those titled `D-NN · …`.
  for (const chunk of archivedPart.split(/(?:^|\n)###\s+/).slice(1)) {
    const nl = chunk.indexOf("\n");
    const headingText = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const adr = headingText.match(/^(D-\d+)\s*·\s*(.+)$/);
    if (!adr) continue;
    const body = nl === -1 ? "" : chunk.slice(nl + 1);
    const fields = extractFields(body);
    decisions.push({
      id: adr[1],
      date: fields["Date"] ?? null,
      title: adr[2].trim(),
      source: "archived-adr",
      ...normalizeFields(fields),
    });
  }

  return decisions;
}

/** Read + parse docs/decisions.md from the repo root. */
export function loadDecisions() {
  return parseDecisions(
    readFileSync(resolve(ROOT, "docs", "decisions.md"), "utf8"),
  );
}

/**
 * Find decisions by topic. Case-insensitive, word-level AND match across title +
 * all normalized fields. Title/id matches rank ahead of body-only matches (the
 * findTokens name-vs-usage idea). Returns matches with `rank` and `match`
 * ("title" | "body"), original order (newest first) preserved within each tier.
 */
export function findDecisions(decisions, topic, { limit = 10 } = {}) {
  const terms = topic.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const hits = [];
  for (const d of decisions) {
    const titleHay = `${d.id} ${d.title}`.toLowerCase();
    const fullHay =
      `${titleHay} ${d.decision ?? ""} ${d.why ?? ""} ${d.rejected ?? ""} ${d.status ?? ""}`.toLowerCase();
    if (!terms.every((t) => fullHay.includes(t))) continue;
    hits.push({
      ...d,
      match: terms.every((t) => titleHay.includes(t)) ? "title" : "body",
    });
  }
  hits.sort((a, b) => (a.match === b.match ? 0 : a.match === "title" ? -1 : 1));
  return hits
    .slice(0, limit)
    .map((d, i) => ({ ...d, rank: i + 1, matchedOn: terms }));
}

/** Exact-id lookup, e.g. getDecision(decisions, "D-06"). Case-insensitive. Null if absent. */
export function getDecision(decisions, id) {
  const key = String(id).toLowerCase();
  return decisions.find((d) => d.id.toLowerCase() === key) ?? null;
}
