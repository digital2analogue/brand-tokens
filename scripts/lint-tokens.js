#!/usr/bin/env node

/**
 * lint-tokens.js — CSS token linter for the River Romney design system
 *
 * Scans CSS files for hardcoded values that should use design token
 * custom properties. The allowlist is auto-generated from DTCG token
 * JSON files — never manually maintained.
 *
 * Usage:
 *   node scripts/lint-tokens.js path/to/file.css
 *   node scripts/lint-tokens.js path/to/dir/
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const ROOT = resolve(__dirname, '..');

// ─── Token Loading ──────────────────────────────────────────────────────────

function loadJSON(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    console.warn(`  ⚠  Token file not found: ${relPath}`);
    return null;
  }
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

/**
 * Recursively walk a DTCG token object and collect leaf tokens.
 * Returns an array of { path: ['primitive','color','green','200'], value, type }
 */
function collectTokens(obj, path = []) {
  const results = [];
  if (obj === null || typeof obj !== 'object') return results;

  // Leaf token: has $value
  if ('$value' in obj) {
    const type = obj.$type || inferTypeFromAncestors(path);
    results.push({ path: [...path], value: obj.$value, type });
    return results; // don't recurse into $value children for composite tokens
  }

  for (const [key, child] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // skip $type, $description, etc.
    results.push(...collectTokens(child, [...path, key]));
  }
  return results;
}

function inferTypeFromAncestors(path) {
  if (path.includes('color')) return 'color';
  if (path.includes('space') || path.includes('spacing')) return 'dimension';
  if (path.includes('radius')) return 'dimension';
  if (path.includes('shadow')) return 'shadow';
  if (path.includes('duration')) return 'duration';
  if (path.includes('easing')) return 'cubicBezier';
  if (path.includes('font')) return 'typography';
  return 'unknown';
}

/**
 * Convert a DTCG token path to the CSS custom property name that
 * Style Dictionary generates. E.g.:
 *   ['primitive', 'color', 'green', '200'] → '--primitive-color-green-200'
 *   ['color', 'background', 'default']     → '--color-background-default'
 */
function pathToCSSVar(path) {
  return '--' + path.join('-');
}

// ─── Build Lookup Tables ────────────────────────────────────────────────────

function buildLookups() {
  const tokenFiles = [
    'tokens/primitives/color.tokens.json',
    'tokens/primitives/typography.tokens.json',
    'tokens/primitives/spacing.tokens.json',
    'tokens/primitives/radius.tokens.json',
    'tokens/primitives/shadow.tokens.json',
    'tokens/primitives/motion.tokens.json',
    'tokens/primitives/letter-spacing.tokens.json',
    'tokens/semantic/color.tokens.json',
    'tokens/semantic/typography.tokens.json',
    'tokens/semantic/spacing.tokens.json',
    'tokens/semantic/radius.tokens.json',
    'tokens/semantic/shadow.tokens.json',
    'tokens/semantic/motion.tokens.json',
    'tokens/semantic/letter-spacing.tokens.json',
  ];

  const allTokens = [];
  for (const file of tokenFiles) {
    const data = loadJSON(file);
    if (!data) continue;
    allTokens.push(...collectTokens(data));
  }

  // ── Colors: hex → CSS var suggestions ──
  // Map lowercase hex to array of semantic CSS vars (prefer semantic over primitive)
  const colorMap = new Map(); // hex (lowercase, 6-digit) → [{ cssVar, isSemantic }]

  // ── Font families: name (lowercase) → CSS var
  const fontFamilyMap = new Map();

  // ── Font sizes: value string → CSS var
  const fontSizeMap = new Map();

  // ── Font weights: number string → CSS var
  const fontWeightMap = new Map();

  // ── Spacing: px string → CSS var (only semantic)
  const spacingMap = new Map(); // "8px" → var(--spacing-tight)

  // ── Radius: value string → CSS var
  const radiusMap = new Map();

  // ── Duration: value string → CSS var
  const durationMap = new Map();

  // ── Shadow: serialized → CSS var
  const shadowMap = new Map();

  for (const token of allTokens) {
    const cssVar = pathToCSSVar(token.path);
    const isSemantic = !token.path.includes('primitive');

    // Skip tokens that reference other tokens (semantic refs like "{primitive.color.green.950}")
    // We only want resolved values for matching
    if (typeof token.value === 'string' && token.value.startsWith('{')) {
      // Still register the CSS var name for suggestions
      // We'll resolve references below
      continue;
    }

    const pathStr = token.path.join('.');

    // Color tokens
    if (pathStr.match(/color/) && typeof token.value === 'string' && token.value.startsWith('#')) {
      const hex = normalizeHex(token.value);
      if (!colorMap.has(hex)) colorMap.set(hex, []);
      colorMap.get(hex).push({ cssVar, isSemantic });
    }

    // Font family
    if (pathStr.match(/font\.?family|font.*family/i) || token.type === 'fontFamily') {
      if (typeof token.value === 'string') {
        fontFamilyMap.set(token.value.toLowerCase().replace(/['"]/g, ''), cssVar);
      }
    }

    // Font weight
    if (pathStr.match(/font\.?weight|font.*weight/i) || token.type === 'fontWeight') {
      if (typeof token.value === 'number' || typeof token.value === 'string') {
        fontWeightMap.set(String(token.value), cssVar);
      }
    }

    // Font size
    if ((pathStr.match(/font\.?size|font.*size/i) || token.type === 'dimension') &&
        pathStr.match(/size/i)) {
      if (typeof token.value === 'string') {
        fontSizeMap.set(token.value, cssVar);
      }
    }

    // Spacing (primitive space values — we'll use these for matching)
    if (pathStr.match(/^primitive\.space\./)) {
      if (typeof token.value === 'string') {
        spacingMap.set(token.value, cssVar);
      }
    }

    // Radius
    if (pathStr.match(/^primitive\.radius\./)) {
      if (typeof token.value === 'string') {
        radiusMap.set(token.value, cssVar);
      }
    }

    // Duration
    if (pathStr.match(/duration/)) {
      if (typeof token.value === 'string') {
        durationMap.set(token.value, cssVar);
      }
    }

    // Shadow (composite)
    if (token.type === 'shadow' && typeof token.value === 'object' && token.value !== null) {
      const key = serializeShadow(token.value);
      if (key) shadowMap.set(key, cssVar);
    }
  }

  // Now build semantic mapping for spacing and radius by resolving references
  const semanticSpacing = new Map();
  const semanticRadius = new Map();
  const semanticDuration = new Map();
  const semanticShadow = new Map();
  const semanticColor = new Map();

  // Re-process semantic tokens that use references
  for (const token of allTokens) {
    const cssVar = pathToCSSVar(token.path);
    const isSemantic = !token.path.includes('primitive');
    if (!isSemantic) continue;

    const pathStr = token.path.join('.');

    if (typeof token.value === 'string' && token.value.startsWith('{')) {
      const resolved = resolveTokenRef(token.value, allTokens);
      if (resolved === null) continue;

      // Semantic color
      if (pathStr.match(/color/)) {
        const hex = typeof resolved === 'string' ? normalizeHex(resolved) : null;
        if (hex) {
          if (!colorMap.has(hex)) colorMap.set(hex, []);
          // Add semantic entry if not already present
          if (!colorMap.get(hex).some(e => e.cssVar === cssVar)) {
            colorMap.get(hex).push({ cssVar, isSemantic: true });
          }
        }
      }

      // Semantic spacing
      if (pathStr.match(/^spacing\./)) {
        if (typeof resolved === 'string') {
          semanticSpacing.set(resolved, cssVar);
        }
      }

      // Semantic radius
      if (pathStr.match(/^radius\./)) {
        if (typeof resolved === 'string') {
          semanticRadius.set(resolved, cssVar);
        }
      }

      // Semantic duration
      if (pathStr.match(/duration/)) {
        if (typeof resolved === 'string') {
          semanticDuration.set(resolved, cssVar);
        }
      }
    }
  }

  return {
    colorMap,
    fontFamilyMap,
    fontSizeMap,
    fontWeightMap,
    spacingMap,
    semanticSpacing,
    radiusMap,
    semanticRadius,
    durationMap,
    semanticDuration,
    shadowMap,
  };
}

function resolveTokenRef(ref, allTokens) {
  // ref is like "{primitive.color.green.950}"
  const refPath = ref.replace(/[{}]/g, '').split('.');
  const match = allTokens.find(t =>
    t.path.length === refPath.length &&
    t.path.every((seg, i) => seg === refPath[i])
  );
  if (!match) return null;
  if (typeof match.value === 'string' && match.value.startsWith('{')) {
    return resolveTokenRef(match.value, allTokens);
  }
  return match.value;
}

function normalizeHex(hex) {
  if (!hex || !hex.startsWith('#')) return null;
  hex = hex.toLowerCase();
  // Expand 3-digit hex to 6-digit
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.slice(0, 7); // strip alpha if 8-digit
}

function serializeShadow(val) {
  if (!val || typeof val !== 'object') return null;
  const { offsetX = '0', offsetY = '0', blur = '0', spread = '0', color = '' } = val;
  return `${offsetX} ${offsetY} ${blur} ${spread} ${color}`.replace(/\s+/g, ' ').trim().toLowerCase();
}

// ─── CSS Parsing & Linting ──────────────────────────────────────────────────

const SKIP_VALUES = new Set([
  '0', 'inherit', 'initial', 'unset', 'none', 'auto', 'currentcolor',
  'transparent', 'revert', 'revert-layer',
]);

function lintCSS(cssContent, lookups) {
  const violations = [];
  const lines = cssContent.split('\n');

  let inComment = false;
  let inRoot = false;
  let rootBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;

    // Track block comments
    let processedLine = '';
    let j = 0;
    while (j < line.length) {
      if (inComment) {
        const endIdx = line.indexOf('*/', j);
        if (endIdx === -1) {
          j = line.length; // rest of line is comment
        } else {
          j = endIdx + 2;
          inComment = false;
        }
      } else {
        const startIdx = line.indexOf('/*', j);
        const lineCommentIdx = line.indexOf('//', j);

        if (startIdx !== -1 && (lineCommentIdx === -1 || startIdx < lineCommentIdx)) {
          processedLine += line.slice(j, startIdx);
          const endIdx = line.indexOf('*/', startIdx + 2);
          if (endIdx === -1) {
            inComment = true;
            j = line.length;
          } else {
            j = endIdx + 2;
          }
        } else if (lineCommentIdx !== -1 && (startIdx === -1 || lineCommentIdx < startIdx)) {
          processedLine += line.slice(j, lineCommentIdx);
          j = line.length;
        } else {
          processedLine += line.slice(j);
          j = line.length;
        }
      }
    }

    line = processedLine.trim();
    if (!line) continue;

    // Track :root { ... } blocks — skip custom property definitions
    if (line.match(/:root\s*\{/)) {
      inRoot = true;
      rootBraceDepth = 1;
      // Check if closing brace on same line
      const afterOpen = line.slice(line.indexOf('{') + 1);
      rootBraceDepth += (afterOpen.match(/\{/g) || []).length;
      rootBraceDepth -= (afterOpen.match(/\}/g) || []).length;
      if (rootBraceDepth <= 0) inRoot = false;
      continue;
    }
    if (inRoot) {
      rootBraceDepth += (line.match(/\{/g) || []).length;
      rootBraceDepth -= (line.match(/\}/g) || []).length;
      if (rootBraceDepth <= 0) inRoot = false;
      continue;
    }

    // Skip lines that are pure selectors or closing braces
    if (!line.includes(':') || line.endsWith('{') || line === '}') continue;

    // Skip CSS custom property declarations (--foo: value)
    if (line.match(/^\s*--[\w-]+\s*:/)) continue;

    // Parse property: value
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const property = line.slice(0, colonIdx).trim().toLowerCase();
    let value = line.slice(colonIdx + 1).trim().replace(/;$/, '').trim();

    // Skip if value is entirely a var() reference or a skippable keyword
    if (value.match(/^\s*var\(/) && !value.match(/,\s*[^)]+\)/)) continue;
    if (SKIP_VALUES.has(value.toLowerCase())) continue;

    // ── Check colors ──
    checkColors(property, value, lineNum, line, lookups, violations);

    // ── Check font-family ──
    checkFontFamily(property, value, lineNum, line, lookups, violations);

    // ── Check font-size ──
    checkFontSize(property, value, lineNum, line, lookups, violations);

    // ── Check font-weight ──
    checkFontWeight(property, value, lineNum, line, lookups, violations);

    // ── Check spacing (padding, margin, gap) ──
    checkSpacing(property, value, lineNum, line, lookups, violations);

    // ── Check border-radius ──
    checkRadius(property, value, lineNum, line, lookups, violations);

    // ── Check box-shadow ──
    checkShadow(property, value, lineNum, line, lookups, violations);

    // ── Check transition/animation duration ──
    checkDuration(property, value, lineNum, line, lookups, violations);
  }

  return violations;
}

// ── Individual Check Functions ───────────────────────────────────────────────

function checkColors(property, value, lineNum, rawLine, lookups, violations) {
  // Skip color checks inside shadow declarations — shadows have their own check
  if (property === 'box-shadow') return;

  // Check hex colors
  const hexPattern = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  let match;
  while ((match = hexPattern.exec(value)) !== null) {
    const hex = normalizeHex(match[0]);
    if (!hex) continue;
    const entries = lookups.colorMap.get(hex);
    if (entries && entries.length > 0) {
      const suggestion = pickBestSuggestion(entries);
      violations.push({
        line: lineNum,
        property,
        found: match[0],
        message: `Hardcoded color ${match[0]} — use var(${suggestion})`,
      });
    }
  }

  // Check rgb/rgba/hsl/hsla
  const funcPattern = /(rgba?|hsla?)\([^)]+\)/gi;
  while ((match = funcPattern.exec(value)) !== null) {
    const colorStr = match[0];
    const hex = colorFuncToHex(colorStr);
    if (!hex) continue;
    const entries = lookups.colorMap.get(hex);
    if (entries && entries.length > 0) {
      const suggestion = pickBestSuggestion(entries);
      violations.push({
        line: lineNum,
        property,
        found: colorStr,
        message: `Hardcoded color ${colorStr} — use var(${suggestion})`,
      });
    }
  }
}

function checkFontFamily(property, value, lineNum, rawLine, lookups, violations) {
  if (!property.match(/^font(-family)?$/)) return;
  // Skip var() references
  if (value.includes('var(')) return;

  for (const [familyName, cssVar] of lookups.fontFamilyMap) {
    // Check for the family name in the value (case-insensitive, with or without quotes)
    const escaped = familyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`['"]?${escaped}['"]?`, 'i');
    if (pattern.test(value)) {
      violations.push({
        line: lineNum,
        property,
        found: value,
        message: `Hardcoded font-family "${familyName}" — use var(${cssVar})`,
      });
      break; // one violation per line for font-family
    }
  }
}

function checkFontSize(property, value, lineNum, rawLine, lookups, violations) {
  if (!property.match(/^font(-size)?$/)) return;
  if (value.includes('var(')) return;

  // Extract font-size value — for shorthand `font:`, it's more complex
  let sizeValue = value;
  if (property === 'font') {
    // font shorthand: [style] [variant] [weight] size[/line-height] family
    // We just look for rem values
    const remMatch = value.match(/[\d.]+rem/);
    if (remMatch) sizeValue = remMatch[0];
    else return;
  }

  sizeValue = sizeValue.trim();
  if (lookups.fontSizeMap.has(sizeValue)) {
    violations.push({
      line: lineNum,
      property,
      found: sizeValue,
      message: `Hardcoded font-size ${sizeValue} — use var(${lookups.fontSizeMap.get(sizeValue)})`,
    });
  }
}

function checkFontWeight(property, value, lineNum, rawLine, lookups, violations) {
  if (!property.match(/^font(-weight)?$/)) return;
  if (value.includes('var(')) return;

  let weightValue = value;
  if (property === 'font') {
    // Look for bare numbers (300, 400, etc.) in font shorthand
    const weightMatch = value.match(/\b(100|200|300|400|500|600|700|800|900)\b/);
    if (weightMatch) weightValue = weightMatch[1];
    else return;
  }

  weightValue = weightValue.trim();
  if (lookups.fontWeightMap.has(weightValue)) {
    violations.push({
      line: lineNum,
      property,
      found: weightValue,
      message: `Hardcoded font-weight ${weightValue} — use var(${lookups.fontWeightMap.get(weightValue)})`,
    });
  }
}

function checkSpacing(property, value, lineNum, rawLine, lookups, violations) {
  if (!property.match(/^(padding|margin|gap|row-gap|column-gap|padding-(top|right|bottom|left)|margin-(top|right|bottom|left)|inset)$/)) return;
  if (value.includes('var(')) return;

  // Split multi-value shorthand (e.g., "16px 24px")
  const parts = value.split(/\s+/);
  for (const part of parts) {
    if (SKIP_VALUES.has(part.toLowerCase())) continue;
    if (part.includes('var(')) continue;

    // Match px values against the spacing scale
    const pxMatch = part.match(/^(\d+)px$/);
    if (!pxMatch) continue;

    const pxVal = part;
    // Prefer semantic spacing tokens
    if (lookups.semanticSpacing.has(pxVal)) {
      violations.push({
        line: lineNum,
        property,
        found: pxVal,
        message: `Hardcoded spacing ${pxVal} — use var(${lookups.semanticSpacing.get(pxVal)})`,
      });
    } else if (lookups.spacingMap.has(pxVal)) {
      violations.push({
        line: lineNum,
        property,
        found: pxVal,
        message: `Hardcoded spacing ${pxVal} — use var(${lookups.spacingMap.get(pxVal)})`,
      });
    }
  }
}

function checkRadius(property, value, lineNum, rawLine, lookups, violations) {
  if (!property.match(/^border(-radius)?$/)) return;
  if (property === 'border' && !property.includes('radius')) return;
  if (!property.match(/border-radius/)) return;
  if (value.includes('var(')) return;

  const parts = value.split(/\s+/);
  for (const part of parts) {
    if (SKIP_VALUES.has(part.toLowerCase())) continue;

    // Check semantic radius first
    if (lookups.semanticRadius.has(part)) {
      violations.push({
        line: lineNum,
        property,
        found: part,
        message: `Hardcoded border-radius ${part} — use var(${lookups.semanticRadius.get(part)})`,
      });
    } else if (lookups.radiusMap.has(part)) {
      violations.push({
        line: lineNum,
        property,
        found: part,
        message: `Hardcoded border-radius ${part} — use var(${lookups.radiusMap.get(part)})`,
      });
    }
  }
}

function checkShadow(property, value, lineNum, rawLine, lookups, violations) {
  if (property !== 'box-shadow') return;
  if (value.includes('var(')) return;
  if (SKIP_VALUES.has(value.toLowerCase())) return;

  // Normalize and try to match
  const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
  for (const [shadowKey, cssVar] of lookups.shadowMap) {
    if (normalized === shadowKey || normalized.includes(shadowKey)) {
      violations.push({
        line: lineNum,
        property,
        found: value,
        message: `Hardcoded box-shadow — use var(${cssVar})`,
      });
      return;
    }
  }
}

function checkDuration(property, value, lineNum, rawLine, lookups, violations) {
  if (!property.match(/^(transition|animation|transition-duration|animation-duration)$/)) return;
  if (value.includes('var(')) return;

  // Extract ms values
  const msPattern = /\b(\d+)ms\b/g;
  let match;
  while ((match = msPattern.exec(value)) !== null) {
    const msVal = match[0];
    if (lookups.semanticDuration.has(msVal)) {
      violations.push({
        line: lineNum,
        property,
        found: msVal,
        message: `Hardcoded duration ${msVal} — use var(${lookups.semanticDuration.get(msVal)})`,
      });
    } else if (lookups.durationMap.has(msVal)) {
      violations.push({
        line: lineNum,
        property,
        found: msVal,
        message: `Hardcoded duration ${msVal} — use var(${lookups.durationMap.get(msVal)})`,
      });
    }
  }

  // Also check second-based values
  const sPattern = /\b(0?\.?\d+)s\b/g;
  while ((match = sPattern.exec(value)) !== null) {
    if (match[0].endsWith('ms')) continue; // already handled
    const seconds = parseFloat(match[1]);
    const ms = Math.round(seconds * 1000);
    const msVal = `${ms}ms`;
    if (lookups.semanticDuration.has(msVal)) {
      violations.push({
        line: lineNum,
        property,
        found: match[0],
        message: `Hardcoded duration ${match[0]} (${msVal}) — use var(${lookups.semanticDuration.get(msVal)})`,
      });
    } else if (lookups.durationMap.has(msVal)) {
      violations.push({
        line: lineNum,
        property,
        found: match[0],
        message: `Hardcoded duration ${match[0]} (${msVal}) — use var(${lookups.durationMap.get(msVal)})`,
      });
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pickBestSuggestion(entries) {
  // Prefer semantic tokens over primitives
  const semantic = entries.filter(e => e.isSemantic);
  if (semantic.length > 0) {
    // If there are multiple semantic matches, list them all so the
    // developer can choose the right one for their context.
    if (semantic.length > 1) {
      return semantic.map(e => e.cssVar).join(' or ');
    }
    return semantic[0].cssVar;
  }
  return entries[0].cssVar;
}

function colorFuncToHex(str) {
  // Parse rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (r > 255 || g > 255 || b > 255) return null;
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  // Parse hsl(h, s%, l%) — basic conversion
  const hslMatch = str.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const hex = hslToHex(h, s, l);
    return hex;
  }

  return null;
}

function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return '#' + [r, g, b].map(c =>
    Math.round(c * 255).toString(16).padStart(2, '0')
  ).join('');
}

// ─── File Discovery ─────────────────────────────────────────────────────────

function collectCSSFiles(targetPath) {
  const abs = resolve(targetPath);
  const stat = statSync(abs);

  if (stat.isFile()) {
    if (extname(abs) === '.css') return [abs];
    console.error(`  ✗  Not a CSS file: ${abs}`);
    process.exit(1);
  }

  if (stat.isDirectory()) {
    const files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip node_modules and hidden dirs
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
          walk(full);
        } else if (entry.isFile() && extname(entry.name) === '.css') {
          files.push(full);
        }
      }
    };
    walk(abs);
    return files;
  }

  console.error(`  ✗  Path is neither file nor directory: ${abs}`);
  process.exit(1);
}

// ─── Output ─────────────────────────────────────────────────────────────────

function formatViolations(violations, filePath, basePath) {
  const relPath = relative(basePath || process.cwd(), filePath);
  const output = [];
  for (const v of violations) {
    output.push(`  ${relPath}:${v.line}  ${v.message}`);
  }
  return output;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/lint-tokens.js <file.css|directory>');
    console.log('');
    console.log('Scans CSS for hardcoded values that should use design token custom properties.');
    process.exit(0);
  }

  const targetPath = args[0];
  if (!existsSync(targetPath)) {
    console.error(`  ✗  Path not found: ${targetPath}`);
    process.exit(1);
  }

  // Build lookups from token files
  const lookups = buildLookups();

  // Collect CSS files
  const files = collectCSSFiles(targetPath);
  if (files.length === 0) {
    console.log('  No CSS files found.');
    process.exit(0);
  }

  let totalViolations = 0;
  const allOutput = [];

  for (const file of files) {
    const css = readFileSync(file, 'utf-8');
    const violations = lintCSS(css, lookups);
    totalViolations += violations.length;

    if (violations.length > 0) {
      allOutput.push(...formatViolations(violations, file, ROOT));
    }
  }

  // Output
  if (totalViolations === 0) {
    console.log(`  ✓  ${files.length} file${files.length === 1 ? '' : 's'} scanned — no token violations found.`);
    process.exit(0);
  } else {
    console.log('');
    console.log(`  Token violations found:`);
    console.log('');
    for (const line of allOutput) {
      console.log(line);
    }
    console.log('');
    console.log(`  ✗  ${totalViolations} violation${totalViolations === 1 ? '' : 's'} in ${files.length} file${files.length === 1 ? '' : 's'}`);
    process.exit(1);
  }
}

main();
