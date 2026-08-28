import { describe, expect, it } from 'vitest'
import { ALL_SYLLABLES, getSyllableAudioKey } from './syllables'
import { ALL_WORDS } from './words'

describe('syllables data', () => {
  it('has 24 syllables', () => {
    expect(ALL_SYLLABLES).toHaveLength(24)
  })

  it('contains all expected core syllables', () => {
    const expected = ['MA', 'TA', 'LA', 'KO', 'MO', 'TO', 'LO', 'RA', 'RO', 'RU', 'BA', 'DA', 'DO', 'KU', 'NA', 'NO', 'SA', 'SO', 'NU', 'PA', 'WA', 'DU', 'KA', 'TY']
    for (const syl of expected) {
      expect(ALL_SYLLABLES.map(s => s.text)).toContain(syl)
    }
  })

  it('audio key uses syl- prefix', () => {
    expect(getSyllableAudioKey('MA')).toBe('syl-MA')
  })

  it('all syllables have unique ids', () => {
    const ids = ALL_SYLLABLES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Płomyk (word-assembly) buduje kafelki z `word.syllables` i dobiera dystraktory
  // z ALL_SYLLABLES — sylaba spoza tej puli nie ma stanu SRS ani pliku `syl-*.mp3`
  // (regresja: SOWA używała 'SO', którego brakowało w ALL_SYLLABLES).
  // Ognik/Pochodnia rozbijają słowa na sylaby ad hoc (ALL_WORD_SYLLABLES) i nie
  // odtwarzają audio sylab — te poziomy celowo nie są tu sprawdzane.
  it('every syllable of a Płomyk word exists in ALL_SYLLABLES', () => {
    const known = new Set(ALL_SYLLABLES.map((s) => s.text))
    const missing: string[] = []
    for (const word of ALL_WORDS) {
      if (word.level !== 'plomyk') continue
      for (const syl of word.syllables) {
        if (!known.has(syl)) missing.push(`${word.text}: ${syl}`)
      }
    }
    expect(missing).toEqual([])
  })
})
