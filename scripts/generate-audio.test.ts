import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { decideAction, hashEntry, hashText, loadSources } from './generate-audio'

const DEFAULT_VOICE = 'pl-PL-ZofiaNeural'

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

describe('hashEntry', () => {
  it('is deterministic for the same text+voice', () => {
    expect(hashEntry('balon', DEFAULT_VOICE)).toBe(hashEntry('balon', DEFAULT_VOICE))
  })

  it('changes when text changes', () => {
    expect(hashEntry('balon', DEFAULT_VOICE)).not.toBe(hashEntry('balony', DEFAULT_VOICE))
  })

  it('changes when voice changes', () => {
    expect(hashEntry('balon', 'pl-PL-ZofiaNeural')).not.toBe(
      hashEntry('balon', 'pl-PL-MarekNeural'),
    )
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
        'letter-a': { text: 'a', voice: DEFAULT_VOICE },
        'letter-b': { text: 'by', voice: DEFAULT_VOICE },
        'word-balon': { text: 'balon', voice: DEFAULT_VOICE },
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('respects _voice metadata field', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'a.json')
      writeFileSync(a, JSON.stringify({ _voice: 'marek', 'iskra-test': 'test' }))
      const merged = loadSources([a])
      expect(merged).toEqual({
        'iskra-test': { text: 'test', voice: 'pl-PL-MarekNeural' },
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('skips keys starting with _', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'a.json')
      writeFileSync(a, JSON.stringify({ _voice: 'zofia', _meta: 'ignored', 'real-key': 'value' }))
      const merged = loadSources([a])
      expect(Object.keys(merged)).toEqual(['real-key'])
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
  const voice = DEFAULT_VOICE

  it('prefers override when present', () => {
    expect(
      decideAction({
        hasOverride: true,
        hasOutputFile: false,
        text,
        voice,
        manifestEntry: undefined,
      }),
    ).toEqual({ kind: 'override' })
  })

  it('generates when output file is missing', () => {
    const action = decideAction({
      hasOverride: false,
      hasOutputFile: false,
      text,
      voice,
      manifestEntry: { hash: hashEntry(text, voice), updatedAt: 0, source: 'tts' },
    })
    expect(action).toEqual({ kind: 'generate', reason: 'missing-file' })
  })

  it('generates when there is no manifest entry', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text,
        voice,
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
        voice,
        manifestEntry: { hash: hashEntry('balony', voice), updatedAt: 0, source: 'tts' },
      }),
    ).toEqual({ kind: 'generate', reason: 'hash-mismatch' })
  })

  it('generates on hash mismatch (voice changed)', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text,
        voice,
        manifestEntry: {
          hash: hashEntry(text, 'pl-PL-MarekNeural'),
          updatedAt: 0,
          source: 'tts',
        },
      }),
    ).toEqual({ kind: 'generate', reason: 'hash-mismatch' })
  })

  it('cache-hits when file exists and hash matches', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text,
        voice,
        manifestEntry: { hash: hashEntry(text, voice), updatedAt: 0, source: 'tts' },
      }),
    ).toEqual({ kind: 'cache-hit' })
  })
})
