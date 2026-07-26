/**
 * MCP server for the River Romney design system.
 *
 * Read-only tools:
 *   Components (from design-system.json):
 *     - list_components  → names + summaries
 *     - get_component    → full metadata for one component
 *     - check_usage      → lint a CSS/HTML snippet for violations
 *   Tokens (from tokens/ *.tokens.json, resolved):       [v0.2.0]
 *     - get_token        → resolve a token: value, primitive, brand overrides, usage
 *     - find_token       → search tokens by intent (substring over name + usage)
 *     - get_spacing      → the semantic spacing scale with usage descriptions
 *   Design reasoning (from ai/rules.md + docs/decisions.md):  [v0.3.0]
 *     - find_rule        → query the hard/soft rules by topic (ranked array)
 *     - get_rule         → one rule by id, e.g. "hard-5"
 *     - find_decision    → query the decision log by topic (ranked array)
 *     - get_decision     → one decision by id, e.g. "D-06"
 *   Brand awareness (from tokens/brands/ *.tokens.json):     [v0.4.0]
 *     - get_brand        → a sub-brand's full override set vs base
 *     - compare_brands   → diff two sub-brands' resolved values
 *   Assembly (components + tokens used together):            [v0.5.0]
 *     - check_assembly   → enumerated 3-rule design-intent check (spacing
 *                          relationship, WCAG pairing, deprecated/unknown token)
 *
 * Token values AND usage prose come from the *.tokens.json files (the
 * `$description` fields are authoritative and co-located with `$value`).
 * For external agents without the repo checked out, this is the path to the
 * foundations; in-repo sessions still get them as always-on context via AGENTS.md.
 *
 * The reasoning tools follow the MCP shape-follows-verb convention: find_* answers
 * a topic query with a ranked array; get_* answers an exact-id lookup with one
 * record — the same split as find_token / get_token above.
 *
 * Usage: node packages/mcp/src/server.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { lintSnippet, DEPRECATED } from "../../../scripts/rules.mjs";
import {
  loadTokens,
  resolveToken,
  findTokens,
  tokensUnder,
  toCssVar,
  getBrand,
  compareBrands,
  getScale,
  SCALE_CATEGORIES,
} from "../../../scripts/tokens.mjs";
import {
  loadRules,
  findRules,
  getRule,
  loadDecisions,
  findDecisions,
  getDecision,
} from "../../../scripts/reasoning.mjs";
import { checkAssembly } from "../../../scripts/assembly.mjs";
import { checkContrast, validateBrand } from "../../../scripts/contrast.mjs";
import { scanConsumer } from "../../../scripts/drift-scan.mjs";

// ── Load design-system.json ─────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const DS_PATH = resolve(ROOT, "design-system.json");

let designSystem;
try {
  designSystem = JSON.parse(readFileSync(DS_PATH, "utf8"));
} catch (e) {
  console.error(`Failed to load design-system.json: ${e.message}`);
  process.exit(1);
}

// Version guard: MCP refuses to serve if schema version doesn't match
const EXPECTED_MAJOR = "1";
const actualMajor = designSystem.$schemaVersion?.split(".")[0];
if (actualMajor !== EXPECTED_MAJOR) {
  console.error(
    `Schema version mismatch: expected major ${EXPECTED_MAJOR}, got ${designSystem.$schemaVersion}. ` +
      `Regenerate design-system.json or update the MCP server.`,
  );
  process.exit(1);
}

// Lint rules for check_usage live in scripts/rules.mjs — the single source of
// truth shared with validate.mjs and the drift Action.

// ── Load tokens ───────────────────────────────────────────────────────────────
// Token walking + resolution lives in scripts/tokens.mjs (shared with validate).

const tokenStore = await loadTokens();

// Reverse index: CSS property → dotted path, so get_token accepts either form.
// (toCssVar is lossy to reverse — segments like "action-hover" contain hyphens —
// so we build the map rather than string-munging.)
const cssToPath = new Map();
for (const path of tokenStore.base.keys()) cssToPath.set(toCssVar(path), path);

// Drift cross-check: semantic tokens whose CSS property never appears in
// ai/DESIGN.md. Informational only (never fatal) — flags doc drift the Figma
// audit doesn't cover. Scoped to documented semantic families to avoid noise.
const DOCUMENTED_FAMILIES = [
  "color",
  "spacing",
  "font",
  "radius",
  "shadow",
  "motion",
  "icon",
];
try {
  const designMd = readFileSync(resolve(ROOT, "ai", "DESIGN.md"), "utf8");
  const undocumented = [...tokenStore.base.keys()].filter(
    (p) =>
      DOCUMENTED_FAMILIES.includes(p.split(".")[0]) &&
      !designMd.includes(toCssVar(p)),
  );
  if (undocumented.length) {
    console.error(
      `[tokens] ${undocumented.length} semantic token(s) not documented in ai/DESIGN.md (drift check)`,
    );
  }
} catch {
  // DESIGN.md missing is not fatal — the token JSON is the source of truth.
}

// ── Load design reasoning ─────────────────────────────────────────────────────
// Rules (ai/rules.md) + decisions (docs/decisions.md) parsing lives once in
// scripts/reasoning.mjs (shared with the tests). Small files — parsed at startup.

const rules = loadRules();
const decisions = loadDecisions();

// ── MCP Server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "riverromney-design-system",
  version: "0.9.0",
});

// ── list_components ─────────────────────────────────────────────────────────

server.tool(
  "list_components",
  "List all components in the design system with names and summaries",
  {},
  async () => {
    const list = designSystem.components.map((c) => ({
      name: c.name,
      summary: c.summary,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
    };
  },
);

// ── get_component ───────────────────────────────────────────────────────────

server.tool(
  "get_component",
  "Get full metadata for a component by name (props, slots, tokens, examples, accessibility)",
  { name: z.string().describe('Component name, e.g. "rr-badge"') },
  async ({ name }) => {
    const component = designSystem.components.find((c) => c.name === name);
    if (!component) {
      const available = designSystem.components.map((c) => c.name).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Component "${name}" not found. Available: ${available || "(none)"}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(component, null, 2) }],
    };
  },
);

// ── check_usage ─────────────────────────────────────────────────────────────

server.tool(
  "check_usage",
  "Lint a CSS/HTML snippet for design system violations: hex literals, primitive token refs, hardcoded font sizes, hardcoded font weights, unapproved font families, and deprecated tokens",
  { snippet: z.string().describe("CSS or HTML string to check") },
  async ({ snippet }) => {
    // lintSnippet returns { id, rule, matches }[]; expose rule + matches.
    const violations = lintSnippet(snippet).map(({ rule, matches }) => ({
      rule,
      matches,
    }));

    if (violations.length === 0) {
      return {
        content: [{ type: "text", text: "No violations found." }],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ violations }, null, 2),
        },
      ],
    };
  },
);

// ── get_token ─────────────────────────────────────────────────────────────────

server.tool(
  "get_token",
  'Resolve a design token by name or CSS property. Returns the resolved value, the primitive it bottoms out at, any sub-brand overrides, and usage guidance. Accepts a dotted path ("color.background.alt") or a CSS property ("--color-background-alt").',
  {
    name: z
      .string()
      .describe("Token name — dotted path or CSS custom property"),
    brand: z
      .string()
      .optional()
      .describe(
        'Sub-brand whose override layer to apply, e.g. "decision-engine"',
      ),
  },
  async ({ name, brand }) => {
    if (brand && !tokenStore.brands.has(brand)) {
      const brands = [...tokenStore.brands.keys()].join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Unknown brand "${brand}". Available: ${brands || "(none)"}`,
          },
        ],
        isError: true,
      };
    }
    const path = tokenStore.base.has(name)
      ? name
      : (cssToPath.get(name) ?? name);
    const token = resolveToken(tokenStore, path, { brand });
    if (!token) {
      // Removed token? Point at the live replacement rather than a fuzzy guess.
      const dep = DEPRECATED.get(name) ?? DEPRECATED.get(toCssVar(path));
      if (dep) {
        return {
          content: [
            {
              type: "text",
              text: `Token "${name}" was removed (deprecated). Use ${dep.replacement} instead.`,
            },
          ],
          isError: true,
        };
      }
      const near = findTokens(tokenStore, name, { limit: 5 }).map(
        (t) => t.name,
      );
      const hint = near.length ? ` Did you mean: ${near.join(", ")}?` : "";
      return {
        content: [{ type: "text", text: `Token "${name}" not found.${hint}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(token, null, 2) }],
    };
  },
);

// ── find_token ──────────────────────────────────────────────────────────────

server.tool(
  "find_token",
  'Find tokens by intent rather than exact name. Substring search over token names and usage descriptions — e.g. "card background" surfaces color.background.alt. Returns ranked matches; use get_token for the full resolved record.',
  {
    query: z
      .string()
      .describe(
        'What the token is for, e.g. "card background", "focus ring", "section gap"',
      ),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Max results (default 10)"),
  },
  async ({ query, limit }) => {
    const hits = findTokens(tokenStore, query, { limit: limit ?? 10 });
    if (hits.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No tokens match "${query}". Try a broader term.`,
          },
        ],
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(hits, null, 2) }] };
  },
);

// ── get_spacing ─────────────────────────────────────────────────────────────

server.tool(
  "get_spacing",
  "Return the full semantic spacing scale with resolved values and usage descriptions, so layout gaps come from the scale instead of arbitrary pixels.",
  {
    brand: z.string().optional().describe("Sub-brand override layer to apply"),
  },
  async ({ brand }) => {
    if (brand && !tokenStore.brands.has(brand)) {
      const brands = [...tokenStore.brands.keys()].join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Unknown brand "${brand}". Available: ${brands || "(none)"}`,
          },
        ],
        isError: true,
      };
    }
    const scale = getScale(tokenStore, "spacing", { brand });
    return {
      content: [{ type: "text", text: JSON.stringify(scale, null, 2) }],
    };
  },
);

// ── get_scale ─────────────────────────────────────────────────────────────────

server.tool(
  "get_scale",
  `Return a full semantic scale with resolved values and usage descriptions — the generalization of get_spacing across every scale, so type, rounding, elevation, motion, and icon sizing all come from the system instead of arbitrary values. Categories: ${Object.keys(SCALE_CATEGORIES).join(", ")}. shadow and typography values are composite objects.`,
  {
    category: z
      .enum(Object.keys(SCALE_CATEGORIES))
      .describe("Which scale to return"),
    brand: z.string().optional().describe("Sub-brand override layer to apply"),
  },
  async ({ category, brand }) => {
    if (brand && !tokenStore.brands.has(brand)) {
      const brands = [...tokenStore.brands.keys()].join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Unknown brand "${brand}". Available: ${brands || "(none)"}`,
          },
        ],
        isError: true,
      };
    }
    const scale = getScale(tokenStore, category, { brand });
    if (!scale) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown scale "${category}". Available: ${Object.keys(SCALE_CATEGORIES).join(", ")}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(scale, null, 2) }],
    };
  },
);

// ── find_rule ─────────────────────────────────────────────────────────────────

server.tool(
  "find_rule",
  'Query the design system\'s hard (never break) and soft (prefer) rules by topic. Returns ranked matches with the rule text, whether it is "hard" or "soft", and the inline rationale. e.g. topic "accent green" surfaces the rule that accent green signals interactivity only. Use get_rule for one rule by id.',
  {
    topic: z
      .string()
      .describe(
        'What the rule is about, e.g. "accent green", "spacing", "font weight"',
      ),
  },
  async ({ topic }) => {
    const matches = findRules(rules, topic);
    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No rules match "${topic}". Try a broader term, or list ids with get_rule.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ matches, total: matches.length }, null, 2),
        },
      ],
    };
  },
);

// ── get_rule ──────────────────────────────────────────────────────────────────

server.tool(
  "get_rule",
  'Get one rule by id (e.g. "hard-5", "soft-2"). Ids are "hard-N" / "soft-N" by list position. Use find_rule to search by topic.',
  { id: z.string().describe('Rule id, e.g. "hard-5"') },
  async ({ id }) => {
    const rule = getRule(rules, id);
    if (!rule) {
      const available = rules.map((r) => r.id).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Rule "${id}" not found. Available: ${available}`,
          },
        ],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify(rule, null, 2) }] };
  },
);

// ── find_decision ─────────────────────────────────────────────────────────────

server.tool(
  "find_decision",
  'Query the decision log (why the system took the turns it did) by topic. Returns ranked matches with what was decided, why, and the alternative that was rejected — across both the dated entries and the archived ADR (D-NN) log. e.g. topic "dark theme" surfaces the dark-first single-accent decision. Use get_decision for one decision by id.',
  {
    topic: z
      .string()
      .describe(
        'What the decision is about, e.g. "dark theme", "npm publish", "deprecation"',
      ),
  },
  async ({ topic }) => {
    const matches = findDecisions(decisions, topic);
    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No decisions match "${topic}". Try a broader term, or fetch one by id with get_decision.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ matches, total: matches.length }, null, 2),
        },
      ],
    };
  },
);

// ── get_decision ──────────────────────────────────────────────────────────────

server.tool(
  "get_decision",
  'Get one decision by id. Archived ADR entries use "D-NN" (e.g. "D-06"); dated entries use "YYYY-MM-DD-slug". Use find_decision to search by topic.',
  { id: z.string().describe('Decision id, e.g. "D-06"') },
  async ({ id }) => {
    const decision = getDecision(decisions, id);
    if (!decision) {
      return {
        content: [
          {
            type: "text",
            text: `Decision "${id}" not found. Search by topic with find_decision, or use a "D-NN" id from the archived ADR log.`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(decision, null, 2) }],
    };
  },
);

// ── get_brand ─────────────────────────────────────────────────────────────────

server.tool(
  "get_brand",
  "Get the full override set a sub-brand applies on top of the base dark theme — every token it changes, with the base value and the brand value side by side (base is null for tokens the brand adds). Brands: decision-engine, dot-art, dot-blog. Use compare_brands to diff two brands.",
  { brand: z.string().describe('Sub-brand name, e.g. "decision-engine"') },
  async ({ brand }) => {
    const result = getBrand(tokenStore, brand);
    if (!result) {
      const brands = [...tokenStore.brands.keys()].join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Unknown brand "${brand}". Available: ${brands || "(none)"}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── compare_brands ──────────────────────────────────────────────────────────────

server.tool(
  "compare_brands",
  "Diff two sub-brands: the tokens whose resolved value differs between them (each diff shows both brands' values, keyed by brand name). Tokens neither brand overrides resolve to the same base value and are omitted. Brands: decision-engine, dot-art, dot-blog.",
  {
    a: z.string().describe('First sub-brand, e.g. "decision-engine"'),
    b: z.string().describe('Second sub-brand, e.g. "dot-art"'),
  },
  async ({ a, b }) => {
    const result = compareBrands(tokenStore, a, b);
    if (!result) {
      const brands = [...tokenStore.brands.keys()].join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Unknown brand in (${a}, ${b}). Available: ${brands || "(none)"}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── check_assembly ──────────────────────────────────────────────────────────────

const componentIndex = new Map(designSystem.components.map((c) => [c.name, c]));

server.tool(
  "check_assembly",
  "Validate a set of components + tokens used together for design intent (beyond check_usage's syntax linting). Runs exactly four checks: (1) distinct components joined by a within-element spacing token (micro/tight/inline) → step up to --spacing-component; (2) foreground/background colour pairs below WCAG AA 4.5:1; (3) deprecated or unknown tokens; (4) slot composition — placements are checked against the parent slot's `accepts` contract from meta.json (slots without `accepts` are unconstrained). Returns { valid, suggestions }. Anything outside these four returns no opinion.",
  {
    components: z
      .array(z.string())
      .optional()
      .describe(
        'Component names used together, e.g. ["rr-input", "rr-button"]',
      ),
    tokens: z
      .array(z.string())
      .optional()
      .describe(
        'CSS custom properties used together, e.g. ["--spacing-tight", "--color-foreground-default", "--color-background-default"]',
      ),
    placements: z
      .array(
        z.object({
          component: z
            .string()
            .describe('The element being slotted, e.g. "rr-button"'),
          parent: z
            .string()
            .describe('The component it is slotted into, e.g. "rr-menu"'),
          slot: z
            .string()
            .optional()
            .describe("Slot name; omit for the default slot"),
        }),
      )
      .optional()
      .describe(
        'Parent/child slot placements to check against slot `accepts` contracts, e.g. [{ "component": "rr-button", "parent": "rr-menu" }]',
      ),
    context: z
      .string()
      .optional()
      .describe(
        'Optional free-text context, e.g. "login form" (informational; echoed back)',
      ),
  },
  async ({ components, tokens, placements, context }) => {
    const result = checkAssembly(
      tokenStore,
      { components, tokens, placements, context },
      componentIndex,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── check_contrast ────────────────────────────────────────────────────────────

server.tool(
  "check_contrast",
  "Compute the WCAG contrast ratio for a foreground/background pair and report AA/AAA pass-fail. Each colour may be a token (--color-foreground-default or color.foreground.default) or a #rrggbb hex. Pass brand to apply a sub-brand's overrides, and fontSize (+ bold) to use the large-text threshold (3:1) instead of normal (4.5:1). Returns { ratio, threshold, passesAA, passesAAA }; no opinion if a value resolves to a non-flat-hex (gradient, color-mix).",
  {
    foreground: z.string().describe("Foreground colour: token name or #rrggbb"),
    background: z.string().describe("Background colour: token name or #rrggbb"),
    brand: z
      .string()
      .optional()
      .describe('Sub-brand to resolve against, e.g. "decision-engine"'),
    fontSize: z
      .union([z.string(), z.number()])
      .optional()
      .describe(
        'Text size for the large-text threshold, e.g. "24px", "1.5rem", or 24',
      ),
    bold: z
      .boolean()
      .optional()
      .describe(
        "Whether the text is bold (lowers the large-text threshold to 18.66px)",
      ),
  },
  async ({ foreground, background, brand, fontSize, bold }) => {
    const result = checkContrast(tokenStore, {
      foreground,
      background,
      brand,
      fontSize,
      bold,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      ...(result.error ? { isError: true } : {}),
    };
  },
);

// ── validate_brand ────────────────────────────────────────────────────────────

server.tool(
  "validate_brand",
  "Check that every intended foreground/background text pairing still meets WCAG AA (4.5:1) once a sub-brand's overrides are applied — catches the classic regression where a brand re-tints a background but not its on-colour. Intended pairs are derived by naming convention (on-<role>↔background.<role>, accent text↔accent fills, base text↔base surfaces); disabled is exempt. Returns { checkedPairs, failures, valid }. Brands: decision-engine, dot-art, dot-blog.",
  { brand: z.string().describe('Sub-brand name, e.g. "decision-engine"') },
  async ({ brand }) => {
    const result = validateBrand(tokenStore, brand);
    if (!result) {
      const brands = [...tokenStore.brands.keys()].join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Unknown brand "${brand}". Available: ${brands || "(none)"}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ── lint_consumer ─────────────────────────────────────────────────────────────

server.tool(
  "lint_consumer",
  "Scan a consumer repo (or a single file) for design-system rule violations — the same rules as check_usage, but at file/repo level instead of a snippet. Walks the path, skipping node_modules/build/dist and built token CSS, and honours a .driftignore at the path root. Returns { scanned, clean, violations: [{ file, line, id, rule, match }] }. Pass an absolute path — a relative one resolves against the server's working directory.",
  {
    path: z
      .string()
      .describe(
        "Absolute path to a consumer repo directory (or a single source file) to scan",
      ),
    ignore: z
      .array(z.string())
      .optional()
      .describe(
        'Extra ignore globs relative to path, e.g. ["src/legacy/**"] (merged with any .driftignore)',
      ),
  },
  async ({ path, ignore = [] }) => {
    try {
      const result = scanConsumer(path, { ignore });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e) {
      return {
        content: [
          { type: "text", text: `Cannot scan "${path}": ${e.message}` },
        ],
        isError: true,
      };
    }
  },
);

// ── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
