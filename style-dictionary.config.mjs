import StyleDictionary from 'style-dictionary'
import { readdirSync } from 'node:fs'
import path from 'node:path'

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
  platforms: { css: cssPlatform('variables.css') },
})
await defaultSD.buildAllPlatforms()

// Per-brand themes — primitives + semantic (as include) + brand overrides (as source)
const brandFiles = readdirSync(BRANDS_DIR).filter((f) => f.endsWith('.tokens.json'))

for (const file of brandFiles) {
  const brandName = path.basename(file, '.tokens.json')
  const brandSD = new StyleDictionary({
    usesDtcg: true,
    include: BASE_SOURCES,
    source: [`${BRANDS_DIR}/${file}`],
    platforms: { css: cssPlatform(`${brandName}.css`) },
  })
  await brandSD.buildAllPlatforms()
}
