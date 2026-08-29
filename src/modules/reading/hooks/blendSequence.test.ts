import { describe, it, expect } from 'vitest'
import { blendAudioKeys, syllablesForWord } from './blendSequence'
import { ALL_WORDS } from '../data/words'
import { AUDIO_KEY_RE } from '@/shared/audio/slugPl'

describe('blendSequence', () => {
  it('prefiks, sylaby w kolejności, potem całe słowo', () => {
    expect(blendAudioKeys('MAMA')).toEqual(['reading-blend-prefix', 'syl-ma', 'syl-ma', 'word-mama'])
  })

  it('każde słowo daje komplet kluczy w poprawnym formacie', () => {
    for (const w of ALL_WORDS) {
      const keys = blendAudioKeys(w.text)
      expect(keys.length, w.text).toBe(w.syllables.length + 2)
      // Klucz CAŁEGO słowa (ostatni) jest wyjęty spod AUDIO_KEY_RE: `word-*`
      // niesie polskie znaki od czasów modułu 2 (`word-żaba.mp3`), a Task 1
      // zmigrował na `slugPl` tylko `syl-*`. Istnienie plików sprawdza
      // `data/audioManifest.test.ts`.
      for (const k of keys.slice(0, -1)) expect(k, `${w.text} ${k}`).toMatch(AUDIO_KEY_RE)
    }
  })

  it('nieznane słowo → pusto (nie zgadujemy podziału)', () => {
    expect(blendAudioKeys('XYZ')).toEqual([])
    expect(syllablesForWord('XYZ')).toEqual([])
  })
})
