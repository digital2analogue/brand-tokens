/**
 * Build all brand CSS files including the base dark theme.
 * Usage: node scripts/build-brands.mjs
 *
 * Build order:
 *   1. base — dark phosphor theme (variables.css)
 *   2. decision-engine — light enterprise UI (decision-engine.css)
 *   3. dot-art — pure black canvas (dot-art.css)
 *   4. dot-blog — relaxed reading (dot-blog.css)
 *
 * Each brand merges: primitives + semantic tokens + brand overrides.
 * Brand override values win on any token path they define.
 * Output: build/css/{brand-name}.css
 */

import StyleDictionary from 'style-dictionary';
import baseConfig, { decisionEngineConfig, dotArtConfig, dotBlogConfig } from '../style-dictionary.config.mjs';

const brands = [
  { name: 'base',            config: baseConfig },
  { name: 'decision-engine', config: decisionEngineConfig },
  { name: 'dot-art',         config: dotArtConfig },
  { name: 'dot-blog',        config: dotBlogConfig },
];

for (const { name, config } of brands) {
  console.log(`\nBuilding brand: ${name}`);
  const sd = new StyleDictionary(config);
  await sd.buildAllPlatforms();
  const outFile = name === 'base' ? 'variables' : name;
  console.log(`✅ build/css/${outFile}.css`);
}
