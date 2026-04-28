import { describe, expect, it } from 'vitest'
import { ALL_SYLLABLES, getSyllableAudioKey } from './syllables'

describe('syllables data', () => {
  it('has 23 syllables', () => {
    expect(ALL_SYLLABLES).toHaveLength(23)
  })

  it('contains all expected core syllables', () => {
    const expected = ['MA', 'TA', 'LA', 'KO', 'MO', 'TO', 'LO', 'RA', 'RO', 'RU', 'BA', 'DA', 'DO', 'KU', 'NA', 'NO', 'SA', 'NU', 'PA', 'WA', 'DU', 'KA', 'TY']
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
})
