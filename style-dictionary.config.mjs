export default {
  usesDtcg: true,
  // Base build — dark/phosphor theme, all properties
  source: [
    'tokens/primitives/**/*.tokens.json',
    'tokens/semantic/**/*.tokens.json',
    'tokens/components/**/*.tokens.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'variables.css',
          format: 'css/variables',
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
      ],
    },
  },
  // Brand-specific builds are defined as separate top-level configs
  // Run: style-dictionary build --config style-dictionary.config.mjs
  // Each brand merges base primitives + semantic tokens + brand overrides.
  // The brand override file wins on any token path it defines.
};

// ─── Brand configs (exported as named exports for multi-build scripts) ────────
// To build all brands, run: node scripts/build-brands.mjs

export const decisionEngineConfig = {
  usesDtcg: true,
  source: [
    'tokens/primitives/**/*.tokens.json',
    'tokens/semantic/**/*.tokens.json',
    'tokens/components/**/*.tokens.json',
    'tokens/brands/decision-engine.tokens.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'decision-engine.css',
          format: 'css/variables',
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
      ],
    },
  },
};

export const dotArtConfig = {
  usesDtcg: true,
  source: [
    'tokens/primitives/**/*.tokens.json',
    'tokens/semantic/**/*.tokens.json',
    'tokens/components/**/*.tokens.json',
    'tokens/brands/dot-art.tokens.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'dot-art.css',
          format: 'css/variables',
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
      ],
    },
  },
};

export const dotBlogConfig = {
  usesDtcg: true,
  source: [
    'tokens/primitives/**/*.tokens.json',
    'tokens/semantic/**/*.tokens.json',
    'tokens/components/**/*.tokens.json',
    'tokens/brands/dot-blog.tokens.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'build/css/',
      files: [
        {
          destination: 'dot-blog.css',
          format: 'css/variables',
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
      ],
    },
  },
};
