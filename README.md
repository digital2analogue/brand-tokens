# Brand Tokens

River Romney's cross-site design system. A single source of truth for color, typography, and spacing across all properties.

## What this repo is

This repo stores all design tokens for riverromney.com, riverromney.design, riverromney.art, and riverromney.blog in [DTCG 2025.10](https://tr.designtokens.org/format/) format. It uses [Style Dictionary v4](https://styledictionary.com/) to compile tokens into CSS custom properties.

## Repo structure

```
brand-tokens/
  tokens/
    primitives/       Raw values (colors, type scales, spacing)
    semantic/         Purpose-mapped aliases (bg, text, accent, etc.)
    brands/           Per-site overrides (dot-art, dot-blog)
  ai/
    DESIGN.md         AI-readable design system reference
    rules.md          Hard and soft design rules
  build/
    css/              Generated CSS (not committed)
  style-dictionary.config.mjs
  package.json
```

## Build

```bash
npm install
npm run build
```

This generates `build/css/variables.css` with all CSS custom properties.

## Consuming tokens

**Option 1 — Copy the CSS file** into your site's static assets and import it:
```html
<link rel="stylesheet" href="/variables.css">
```

**Option 2 — Use custom properties** directly once the file is imported:
```css
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-family-serif);
}
```

## Per-site overrides

Brand overrides live in `tokens/brands/`. To build a site-specific token set, add the relevant brand file as a source after the base tokens. The override replaces only the tokens it defines; everything else inherits from primitives and semantic layers.

## AI reference

See [ai/DESIGN.md](ai/DESIGN.md) for the full design system reference and [ai/rules.md](ai/rules.md) for hard and soft design rules.
