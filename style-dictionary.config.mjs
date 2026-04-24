import StyleDictionary from 'style-dictionary'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { designMdFormat } from './formats/design-md.mjs'

const BRANDS_DIR = 'tokens/brands'

const BASE_SOURCES = [
  'tokens/primitives/**/*.tokens.json',
  'tokens/semantic/**/*.tokens.json',
]

function cssPlatform(destination) {
  return {
    transformGroup: 'css',
    buildPath: 'build/css/',
    files: [
      {
        destination,
        format: 'css/variables',
        options: { selector: ':root', outputReferences: true },
      },
    ],
  }
}

// Default theme — primitives + semantic only
const defaultSD = new StyleDictionary({
  usesDtcg: true,
  source: BASE_SOURCES,
  platforms: {
    css: cssPlatform('variables.css'),
    designMd: {
      // No transformGroup — keep composite token values as objects
      // so the formatter can extract fontFamily, fontSize, etc.
      transforms: ['name/kebab'],
      buildPath: 'build/',
      files: [
        {
          destination: 'DESIGN.md',
          format: 'design-md',
        },
      ],
    },
  },
})
defaultSD.registerFormat(designMdFormat)
await defaultSD.buildAllPlatforms()

// Per-brand themes — primitives + semantic (as include) + brand overrides (as source)
const brandFiles = readdirSync(BRANDS_DIR).filter((f) => f.endsWith('.tokens.json'))

for (const file of brandFiles) {
  const brandName = path.basename(file, '.tokens.json')
  // Map "dot-art" → "variables-art", "dot-blog" → "variables-blog", etc.
  const cssFileName = brandName.startsWith('dot-')
    ? `variables-${brandName.slice(4)}.css`
    : `${brandName}.css`
  const brandSD = new StyleDictionary({
    usesDtcg: true,
    include: BASE_SOURCES,
    source: [`${BRANDS_DIR}/${file}`],
    platforms: { css: cssPlatform(cssFileName) },
  })
  await brandSD.buildAllPlatforms()
}
