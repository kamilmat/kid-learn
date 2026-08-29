import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { blendAudioKeys, syllablesForWord } from './blendSequence'
import { ALL_WORDS } from '../data/words'
import { AUDIO_KEY_RE } from '@/shared/audio/slugPl'

// `process.cwd()` to root repo (vitest odpala z root) — `import.meta.url`
// pod jsdom nie jest schematem `file:`.
const AUDIO_DIR = join(process.cwd(), 'public', 'audio')

describe('blendSequence', () => {
  it('prefiks, sylaby w kolejności, potem całe słowo', () => {
    expect(blendAudioKeys('MAMA')).toEqual(['reading-blend-prefix', 'syl-ma', 'syl-ma', 'word-mama'])
  })

  it('każda sylaba każdego słowa ma poprawny klucz audio i plik', () => {
    for (const w of ALL_WORDS) {
      const keys = blendAudioKeys(w.text)
      expect(keys.length, w.text).toBe(w.syllables.length + 2)
      // Klucz CAŁEGO słowa (ostatni) jest wyjęty spod AUDIO_KEY_RE: `word-*`
      // niesie polskie znaki od czasów modułu 2 (`word-żaba.mp3`), a Task 1
      // zmigrował na `slugPl` tylko `syl-*`. Zamiast zgadywać nazwę, której
      // nie ma na dysku, sprawdzamy że KAŻDY klucz ma swój plik.
      for (const k of keys.slice(0, -1)) expect(k, `${w.text} ${k}`).toMatch(AUDIO_KEY_RE)
      for (const k of keys) expect(existsSync(join(AUDIO_DIR, `${k}.mp3`)), `${w.text} ${k}`).toBe(true)
    }
  })

  it('nieznane słowo → pusto (nie zgadujemy podziału)', () => {
    expect(blendAudioKeys('XYZ')).toEqual([])
    expect(syllablesForWord('XYZ')).toEqual([])
  })
})
