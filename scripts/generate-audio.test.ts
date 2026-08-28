import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { buildPlainSsml, buildSsml } from './azureTts'
import {
  applyPronunciationOverride,
  decideAction,
  hashEntry,
  hashEntryAzure,
  hashEntryAzurePlain,
  hashText,
  loadPronunciationOverrides,
  loadSources,
  parseCli,
} from './generate-audio'

const DEFAULT_VOICE = 'pl-PL-ZofiaNeural'
const AGNIESZKA_VOICE = 'pl-PL-AgnieszkaNeural'

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
        'letter-a': { text: 'a', voice: DEFAULT_VOICE, engine: 'edge' },
        'letter-b': { text: 'by', voice: DEFAULT_VOICE, engine: 'edge' },
        'word-balon': { text: 'balon', voice: DEFAULT_VOICE, engine: 'edge' },
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
        'iskra-test': { text: 'test', voice: 'pl-PL-MarekNeural', engine: 'edge' },
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

  it('throws on invalid _voice value', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'invalid.json')
      writeFileSync(a, JSON.stringify({ _voice: 'unknown-voice', 'test-key': 'value' }))
      expect(() => loadSources([a])).toThrow(/Unknown voice/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reads _engine metadata and precomputes IPA', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'syl.json')
      writeFileSync(a, JSON.stringify({ _voice: 'zofia', _engine: 'azure-ipa', 'cz-syl-lo': 'lo' }))
      const merged = loadSources([a])
      expect(merged['cz-syl-lo']).toEqual({
        text: 'lo',
        voice: DEFAULT_VOICE,
        engine: 'azure-ipa',
        ipa: 'l\u02C8\u0254',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('throws on unknown _engine value', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'bad.json')
      writeFileSync(a, JSON.stringify({ _engine: 'piper', 'test-key': 'value' }))
      expect(() => loadSources([a])).toThrow(/unknown _engine/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('resolves the agnieszka voice for engine azure', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'lektor.json')
      writeFileSync(
        a,
        JSON.stringify({ _voice: 'agnieszka', _engine: 'azure', 'word-ada': 'ada' }),
      )
      const merged = loadSources([a])
      expect(merged['word-ada']).toEqual({
        text: 'ada',
        voice: AGNIESZKA_VOICE,
        engine: 'azure',
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects agnieszka combined with engine edge (Azure-only voice)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const a = join(dir, 'bad-voice.json')
      writeFileSync(a, JSON.stringify({ _voice: 'agnieszka', 'test-key': 'value' }))
      expect(() => loadSources([a])).toThrow(/voice agnieszka is Azure-only/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('hashEntryAzure', () => {
  it('differs from the edge hash for the same text+voice', () => {
    expect(hashEntryAzure('lo', DEFAULT_VOICE, 'l\u02C8\u0254')).not.toBe(
      hashEntry('lo', DEFAULT_VOICE),
    )
  })

  it('changes when IPA changes', () => {
    expect(hashEntryAzure('lo', DEFAULT_VOICE, 'l\u02C8\u0254')).not.toBe(
      hashEntryAzure('lo', DEFAULT_VOICE, 'l\u0254'),
    )
  })
})

describe('hashEntryAzurePlain', () => {
  it('differs from the edge hash for the same text+voice', () => {
    expect(hashEntryAzurePlain('ada', AGNIESZKA_VOICE)).not.toBe(
      hashEntry('ada', AGNIESZKA_VOICE),
    )
  })

  it('is deterministic for the same text+voice', () => {
    expect(hashEntryAzurePlain('ada', AGNIESZKA_VOICE)).toBe(
      hashEntryAzurePlain('ada', AGNIESZKA_VOICE),
    )
  })
})

describe('AZURE_POSTPROCESS is baked into the Azure hashes', () => {
  // Reproduces the pre-trim hash formulas (no AZURE_POSTPROCESS marker) to prove
  // the current hashes differ — i.e. bumping AZURE_POSTPROCESS regenerates all
  // existing Azure files instead of hitting the old cache.
  const legacyHashEntryAzure = (text: string, voice: string, ipa: string): string =>
    createHash('sha256').update(`azure-ipa\n${voice}\n${ipa}\n${text}`, 'utf8').digest('hex')
  const legacyHashEntryAzurePlain = (text: string, voice: string): string =>
    createHash('sha256').update(`azure\n${voice}\n${text}`, 'utf8').digest('hex')

  it('hashEntryAzure differs from the pre-AZURE_POSTPROCESS formula', () => {
    expect(hashEntryAzure('lo', DEFAULT_VOICE, 'lˈɔ')).not.toBe(
      legacyHashEntryAzure('lo', DEFAULT_VOICE, 'lˈɔ'),
    )
  })

  it('hashEntryAzurePlain differs from the pre-AZURE_POSTPROCESS formula', () => {
    expect(hashEntryAzurePlain('ada', AGNIESZKA_VOICE)).not.toBe(
      legacyHashEntryAzurePlain('ada', AGNIESZKA_VOICE),
    )
  })
})

describe('parseCli', () => {
  it('parses mode without flags', () => {
    expect(parseCli(['node', 'script', 'build'])).toEqual({ mode: 'build', dryRun: false })
  })

  it('parses --dry-run in any position', () => {
    expect(parseCli(['node', 'script', '--dry-run', 'build'])).toEqual({
      mode: 'build',
      dryRun: true,
    })
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

  it('uses the azure hash when engine is azure-ipa', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text: 'lo',
        voice,
        engine: 'azure-ipa',
        ipa: 'l\u02C8\u0254',
        manifestEntry: {
          hash: hashEntryAzure('lo', voice, 'l\u02C8\u0254'),
          updatedAt: 0,
          source: 'tts',
          engine: 'azure-ipa',
        },
      }),
    ).toEqual({ kind: 'cache-hit' })
  })

  it('regenerates an azure entry whose IPA changed', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text: 'lo',
        voice,
        engine: 'azure-ipa',
        ipa: 'l\u02C8\u0254',
        manifestEntry: { hash: hashEntry('lo', voice), updatedAt: 0, source: 'tts' },
      }),
    ).toEqual({ kind: 'generate', reason: 'hash-mismatch' })
  })

  it('regenerates when a manual override was deleted (manifest still says override)', () => {
    expect(
      decideAction({
        hasOverride: false,
        hasOutputFile: true,
        text,
        voice,
        manifestEntry: { hash: hashEntry(text, voice), updatedAt: 0, source: 'override' },
      }),
    ).toEqual({ kind: 'generate', reason: 'override-removed' })
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

describe('loadPronunciationOverrides', () => {
  it('returns {} when the file does not exist', () => {
    expect(loadPronunciationOverrides('/no/such/file.json')).toEqual({})
  })

  it('parses ipa and text overrides, skipping _ comment keys', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const p = join(dir, 'pronunciation-overrides.json')
      writeFileSync(
        p,
        JSON.stringify({
          _comment: 'wyjątki wybrane przez odsłuch',
          'cz-syl-au': { text: 'au' },
          'cz-word-co': { ipa: 't͡sˈɔ' },
        }),
      )
      expect(loadPronunciationOverrides(p)).toEqual({
        'cz-syl-au': { text: 'au' },
        'cz-word-co': { ipa: 't͡sˈɔ' },
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('throws when an entry has neither ipa nor text', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const p = join(dir, 'bad.json')
      writeFileSync(p, JSON.stringify({ 'cz-syl-x': {} }))
      expect(() => loadPronunciationOverrides(p)).toThrow(/exactly one of "ipa" or "text"/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('throws when an entry has both ipa and text', () => {
    const dir = mkdtempSync(join(tmpdir(), 'iskierki-audio-'))
    try {
      const p = join(dir, 'bad.json')
      writeFileSync(p, JSON.stringify({ 'cz-syl-x': { ipa: 'a', text: 'a' } }))
      expect(() => loadPronunciationOverrides(p)).toThrow(/exactly one of "ipa" or "text"/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('applyPronunciationOverride', () => {
  it('leaves the entry untouched when there is no override', () => {
    const entry = { text: 'lo', voice: DEFAULT_VOICE, engine: 'azure-ipa' as const, ipa: 'lɔ' }
    expect(applyPronunciationOverride(entry, undefined)).toBe(entry)
  })

  it('leaves edge-engine entries untouched even with an override', () => {
    const entry = { text: 'balon', voice: DEFAULT_VOICE, engine: 'edge' as const }
    expect(applyPronunciationOverride(entry, { text: 'balon2' })).toBe(entry)
  })

  it('ipa override switches an azure (plain) entry to azure-ipa', () => {
    const entry = { text: 'co', voice: AGNIESZKA_VOICE, engine: 'azure' as const }
    const result = applyPronunciationOverride(entry, { ipa: 't͡sˈɔ' })
    expect(result).toEqual({
      text: 'co',
      voice: AGNIESZKA_VOICE,
      engine: 'azure-ipa',
      ipa: 't͡sˈɔ',
    })
  })

  it('text override switches an azure-ipa entry to plain azure with the override text', () => {
    const entry = { text: 'au', voice: AGNIESZKA_VOICE, engine: 'azure-ipa' as const, ipa: 'ˈau' }
    const result = applyPronunciationOverride(entry, { text: 'au' })
    expect(result).toEqual({ text: 'au', voice: AGNIESZKA_VOICE, engine: 'azure' })
  })

  it('an ipa override changes the expected hash vs. the un-overridden entry', () => {
    const entry = { text: 'co', voice: AGNIESZKA_VOICE, engine: 'azure' as const }
    const overridden = applyPronunciationOverride(entry, { ipa: 't͡sˈɔ' })
    const hashBefore = hashEntryAzurePlain(entry.text, entry.voice)
    const hashAfter = hashEntryAzure(overridden.text, overridden.voice, overridden.ipa ?? '')
    expect(hashAfter).not.toBe(hashBefore)
  })

  it('an ipa override is used verbatim in the SSML phoneme tag', () => {
    const entry = { text: 'co', voice: AGNIESZKA_VOICE, engine: 'azure' as const }
    const overridden = applyPronunciationOverride(entry, { ipa: 't͡sˈɔ' })
    const ssml = buildSsml({ voice: overridden.voice, ipa: overridden.ipa ?? '', text: overridden.text })
    expect(ssml).toContain('ph="t͡sˈɔ"')
  })

  it('a voice override replaces the file-level voice, changes the hash, and flows into the SSML <voice> name', () => {
    const entry = { text: 'z', voice: AGNIESZKA_VOICE, engine: 'azure' as const }
    const overridden = applyPronunciationOverride(entry, { text: 'z', voice: 'zofia' })
    expect(overridden.voice).toBe('pl-PL-ZofiaNeural')

    const hashBefore = hashEntryAzurePlain(entry.text, entry.voice)
    const hashAfter = hashEntryAzurePlain(overridden.text, overridden.voice)
    expect(hashAfter).not.toBe(hashBefore)

    const ssml = buildPlainSsml({ voice: overridden.voice, text: overridden.text })
    expect(ssml).toContain('<voice name="pl-PL-ZofiaNeural">')
  })
})
