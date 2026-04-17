#!/usr/bin/env node
// One-shot refactor helper. Wraps every primitive file under a "primitive" root
// and rewrites semantic/brand references to point at the new prefixed paths.
//
// Usage: node scripts/namespace-primitives.mjs
//
// Safe to delete after this refactor lands.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const PRIMITIVE_DIR = 'tokens/primitives'
const CONSUMER_DIRS = ['tokens/semantic', 'tokens/brands']

// Walk a DTCG token object, collect every path that has a $value (i.e. a token).
// Also collects every group path along the way so we can distinguish primitive
// paths from semantic paths that happen to share a top-level namespace.
function collectPaths(obj, prefix = '') {
  const paths = new Set()
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue
    if (val && typeof val === 'object') {
      const here = prefix ? `${prefix}.${key}` : key
      paths.add(here)
      for (const p of collectPaths(val, here)) paths.add(p)
    }
  }
  return paths
}

// 1. Read each primitive file, record all paths, then wrap the file under "primitive"
const primitivePaths = new Set()
const primitiveFiles = readdirSync(PRIMITIVE_DIR).filter((f) => f.endsWith('.tokens.json'))

for (const file of primitiveFiles) {
  const full = path.join(PRIMITIVE_DIR, file)
  const data = JSON.parse(readFileSync(full, 'utf8'))
  for (const p of collectPaths(data)) primitivePaths.add(p)
  const wrapped = { primitive: data }
  writeFileSync(full, JSON.stringify(wrapped, null, 2) + '\n')
  console.log(`wrapped  ${full}`)
}

// 2. For each consumer file, rewrite {path.to.thing} references whose path is a
//    known primitive path. Semantic-to-semantic refs (e.g. {color.background.alt})
//    are left alone because those paths aren't in the primitive set.
const REF = /\{([a-zA-Z0-9.-]+)\}/g

for (const dir of CONSUMER_DIRS) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.tokens.json'))
  for (const file of files) {
    const full = path.join(dir, file)
    const before = readFileSync(full, 'utf8')
    let changed = 0
    const after = before.replace(REF, (_, ref) => {
      if (ref.startsWith('primitive.')) return `{${ref}}` // already prefixed
      if (primitivePaths.has(ref)) {
        changed++
        return `{primitive.${ref}}`
      }
      return `{${ref}}`
    })
    if (changed > 0) {
      writeFileSync(full, after)
      console.log(`rewrote  ${full} (${changed} refs)`)
    } else {
      console.log(`skipped  ${full} (no primitive refs)`)
    }
  }
}

console.log('\nDone. Run `npm run build` to verify.')
