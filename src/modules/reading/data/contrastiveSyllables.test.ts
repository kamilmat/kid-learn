import { describe, expect, it } from 'vitest'
import { CONTRASTIVE_SYLLABLES } from './contrastiveSyllables'
import { ALL_SYLLABLES } from './syllables'

describe('CONTRASTIVE_SYLLABLES', () => {
  it('has an entry for every syllable in ALL_SYLLABLES (choćby pusty)', () => {
    for (const syllable of ALL_SYLLABLES) {
      expect(CONTRASTIVE_SYLLABLES).toHaveProperty(syllable.text)
      expect(Array.isArray(CONTRASTIVE_SYLLABLES[syllable.text])).toBe(true)
    }
  })

  it('has no keys outside ALL_SYLLABLES (mapa zamknięta)', () => {
    const validTexts = new Set(ALL_SYLLABLES.map((s) => s.text))
    for (const key of Object.keys(CONTRASTIVE_SYLLABLES)) {
      expect(validTexts.has(key)).toBe(true)
    }
  })

  it('values only reference known syllables (mapa zamknięta)', () => {
    const validTexts = new Set(ALL_SYLLABLES.map((s) => s.text))
    for (const [key, partners] of Object.entries(CONTRASTIVE_SYLLABLES)) {
      for (const partner of partners) {
        expect(validTexts.has(partner)).toBe(true)
        expect(partner).not.toBe(key)
      }
    }
  })

  it('is symmetric: b ∈ map[a] ⇒ a ∈ map[b]', () => {
    for (const [a, partners] of Object.entries(CONTRASTIVE_SYLLABLES)) {
      for (const b of partners) {
        expect(CONTRASTIVE_SYLLABLES[b]).toContain(a)
      }
    }
  })

  it('has no self-references', () => {
    for (const [key, partners] of Object.entries(CONTRASTIVE_SYLLABLES)) {
      expect(partners).not.toContain(key)
    }
  })

  it('has no duplicate partners within a single entry', () => {
    for (const partners of Object.values(CONTRASTIVE_SYLLABLES)) {
      expect(new Set(partners).size).toBe(partners.length)
    }
  })
})
