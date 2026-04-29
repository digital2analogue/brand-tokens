/**
 * scripts/generate-docs.mjs
 *
 * Regenerates the color primitives section in docs/index.html from the
 * token JSON source of truth. Run this after any change to
 * tokens/primitives/color.tokens.json.
 *
 * Usage: node scripts/generate-docs.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToLinear(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function chipHtml(step, hex, indent = '        ') {
  const L = hexToLinear(hex);
  const textColor = L < 0.15 ? '#C8CFC4' : '#0A0D0A';
  let borderAttr = '';
  if (L > 0.8)  borderAttr = ' border-color:rgba(0,0,0,0.12);';
  if (L < 0.05) borderAttr = ' border-color:rgba(255,255,255,0.15);';

  return [
    `${indent}<div class="prim-chip" style="background:${hex};${borderAttr}">`,
    `${indent}  <span class="prim-step" style="color:${textColor}">${step}</span>`,
    `${indent}  <span class="prim-hex" style="color:${textColor}">${hex}</span>`,
    `${indent}</div>`,
  ].join('\n');
}

function familyHtml(familyName, entries) {
  const chips = entries.map(([step, hex]) => chipHtml(step, hex)).join('\n');
  return [
    `    <div class="prim-family">`,
    `      <div class="prim-family-label">${familyName}</div>`,
    `      <div class="prim-row">`,
    chips,
    `      </div>`,
    `    </div>`,
  ].join('\n');
}

// ── Read primitives ────────────────────────────────────────────────────────

const primitivesRaw = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tokens/primitives/color.tokens.json'), 'utf8')
);
const families = primitivesRaw.primitive.color;

// Entry order: emit numeric steps in order they appear in JSON, then named slots.
// JSON key insertion order is preserved in modern JS — the file is already ordered correctly.
function extractEntries(family) {
  return Object.entries(family)
    .filter(([k]) => !k.startsWith('$'))
    .map(([step, token]) => {
      const hex = (token.$value || '').toUpperCase();
      return [step, hex];
    })
    .filter(([, hex]) => hex.startsWith('#'));
}

// ── Generate primitives section HTML ──────────────────────────────────────

const FAMILY_ORDER = ['green', 'blue', 'red', 'purple', 'gray', 'violet', 'amber', 'neutral'];

const familyBlocks = FAMILY_ORDER
  .filter((name) => families[name])
  .map((name) => familyHtml(name, extractEntries(families[name])))
  .join('\n');

const primitivesSection = `  <!-- ── 1b. PRIMITIVES ──────────────────────────────────────────────────── -->
  <section class="section anchor" id="primitives">
    <div class="section-header">
      <h2 class="section-title">Color primitives</h2>
      <span class="section-subtitle">tokens/primitives/color.tokens.json</span>
    </div>
    <p class="prim-note">Raw hex values — the single source of truth for every color in the system. Never reference these in UI code; use semantic tokens instead. Numeric scale: low&nbsp;=&nbsp;light, high&nbsp;=&nbsp;dark. Named slots (sky, navy, chip, approve, etc.) are used where a value cannot fit a monotonic numeric ramp without inversion.</p>
${familyBlocks}
  </section>`;

// ── Patch docs/index.html ──────────────────────────────────────────────────

const docsPath = path.join(ROOT, 'docs/index.html');
let html = fs.readFileSync(docsPath, 'utf8');

const START_MARKER = '  <!-- ── 1b. PRIMITIVES ──────────────────────────────────────────────────── -->';
const END_MARKER   = '  <section class="section anchor" id="color">';

const startIdx = html.indexOf(START_MARKER);
const endIdx   = html.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('❌  Could not find primitives section markers in docs/index.html');
  process.exit(1);
}

html = html.slice(0, startIdx) + primitivesSection + '\n' + html.slice(endIdx);

fs.writeFileSync(docsPath, html, 'utf8');

console.log('✅  docs/index.html — primitives section regenerated from token JSON');
