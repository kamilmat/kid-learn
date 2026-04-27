import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { decideAction, hashText, loadSources } from './generate-audio'

describe('hashText', () => {
  it('is deterministic for the same input', () => {
    expect(hashText('balon')).toBe(hashText('balon'))
  })

  it('changes when text changes', () => {
    expect(hashText('balon')).not.toBe(hashText('balony'))
  })

  it('is utf8-stable for Polish diacritics', () => {
    const a = hashText('Ą jak dąb')
    const b = hashText('Ą jak dąb')
    expect(a).toBe(b)
    expect(a).toHaveLength(64) // sha256 hex
  })
})

describe('loadSources', () => {
  it('merges multiple JSON object maps', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'a.json')
      const b = join(dir, 'b.json')
      writeFileSync(a, JSON.stringify({ 'letter-a': 'a', 'letter-b': 'by' }))
      writeFileSync(b, JSON.stringify({ 'word-balon': 'balon' }))
      const merged = loadSources([a, b])
      expect(merged).toEqual({
        'letter-a': 'a',
        'letter-b': 'by',
        'word-balon': 'balon',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('throws on duplicate keys across files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'a.json')
      const b = join(dir, 'b.json')
      writeFileSync(a, JSON.stringify({ 'letter-a': 'a' }))
      writeFileSync(b, JSON.stringify({ 'letter-a': 'A' }))
      expect(() => loadSources([a, b])).toThrow(/Duplicate audio key/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects non-string values', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'a.json')
      writeFileSync(a, JSON.stringify({ 'letter-a': 123 }))
      expect(() => loadSources([a])).toThrow(/not a string/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('decideAction', () => {
  const text = 'balon'

  it('prefers override when present', () => {
    expect(
      decideAction({
        hasOverride: true,
        hasOutputFile: false,
        text,
        manifestEntry: undefined,
      }),
    ).toEqual({ kind: 'override' })
  })

  it('generates when output file is missing', () => {
    const action = decideAction({
      hasOverride: false,
      hasOutputFile: false,
      text,
      manifestEntry: { hash: hashText(text), updatedAt: 0, source: 'tts' },
    })
    expect(action).toEqual({ kind: 'generate', reason: 'missing-file' })
  })

  it('generates when there is no manifest entry', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text,
        manifestEntry: undefined,
      }),
    ).toEqual({ kind: 'generate', reason: 'no-manifest-entry' })
  })

  it('generates on hash mismatch (text changed)', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text,
        manifestEntry: { hash: hashText('balony'), updatedAt: 0, source: 'tts' },
      }),
    ).toEqual({ kind: 'generate', reason: 'hash-mismatch' })
  })

  it('cache-hits when file exists and hash matches', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text,
        manifestEntry: { hash: hashText(text), updatedAt: 0, source: 'tts' },
      }),
    ).toEqual({ kind: 'cache-hit' })
  })
})
