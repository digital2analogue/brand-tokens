import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Sanity checks on the token source files themselves. scripts/validate.mjs
// does deep schema validation; these tests are a fast, always-on guard that
// the token tree stays parseable and structurally sound so a bad merge
// can't silently break every downstream consumer.

const tokensRoot = resolve(__dirname, '../../tokens')

function jsonFilesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f))
}

type TokenNode = { value?: unknown; $value?: unknown } & Record<string, unknown>

function collectLeaves(node: TokenNode, path: string[] = []): Array<{ path: string; value: unknown }> {
  if ('value' in node || '$value' in node) {
    return [{ path: path.join('.'), value: node.value ?? node.$value }]
  }
  return Object.entries(node)
    .filter(([, v]) => typeof v === 'object' && v !== null)
    .flatMap(([key, v]) => collectLeaves(v as TokenNode, [...path, key]))
}

describe('token source tree', () => {
  const files = jsonFilesUnder(tokensRoot)

  it('has the expected top-level groups (two tiers + brands — no component tier, #114)', () => {
    const groups = readdirSync(tokensRoot)
    expect(groups).toEqual(expect.arrayContaining(['primitives', 'semantic', 'brands']))
    expect(groups).not.toContain('components')
  })

  it('contains token files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('every token file parses as JSON', () => {
    for (const file of files) {
      expect(() => JSON.parse(readFileSync(file, 'utf8')), file).not.toThrow()
    }
  })

  it('no token has an empty value', () => {
    for (const file of files) {
      const leaves = collectLeaves(JSON.parse(readFileSync(file, 'utf8')))
      for (const leaf of leaves) {
        expect(leaf.value, `${file} → ${leaf.path}`).not.toBe('')
        expect(leaf.value, `${file} → ${leaf.path}`).not.toBeNull()
        expect(leaf.value, `${file} → ${leaf.path}`).not.toBeUndefined()
      }
    }
  })
})

describe('semantic layer', () => {
  // Brands are partial overlays — the semantic layer is what guarantees
  // every consumer gets the core roles regardless of brand.
  it('defines the core semantic roles', () => {
    const leaves = jsonFilesUnder(join(tokensRoot, 'semantic')).flatMap((file) =>
      collectLeaves(JSON.parse(readFileSync(file, 'utf8')))
    )
    const paths = new Set(leaves.map((l) => l.path))
    for (const role of [
      'color.background.default',
      'color.foreground.default',
      'color.border.default',
      'radius.default',
    ]) {
      expect(paths.has(role), `semantic layer missing ${role}`).toBe(true)
    }
  })
})

describe('brand token files', () => {
  // Brand files override deltas only, so no specific token is required —
  // but an empty/unparseable brand file means a broken brand build.
  it('each brand defines at least one token', () => {
    for (const file of jsonFilesUnder(join(tokensRoot, 'brands'))) {
      const leaves = collectLeaves(JSON.parse(readFileSync(file, 'utf8')))
      expect(leaves.length, `${file} defines no tokens`).toBeGreaterThan(0)
    }
  })
})
