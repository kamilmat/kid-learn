import { describe, expect, it } from 'vitest'
import { buildChoices, NEAR_MISS_OFFSETS } from './buildChoices'

// Deterministyczny rng — pozwala powtórzyć 50 seedów bez zgadywania wyniku.
function seededRng(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

describe('buildChoices — regresja near-miss (NEAR_MISS_OFFSETS)', () => {
  it('dla 50 seedów: zawiera 6, każda wartość jest w ±3 od 6 i w [1,10]', () => {
    for (let seed = 0; seed < 50; seed++) {
      const choices = buildChoices(6, { min: 1, max: 10, offsets: NEAR_MISS_OFFSETS, rng: seededRng(seed) })
      expect(choices).toContain(6)
      for (const c of choices) {
        expect(Math.abs(c - 6)).toBeLessThanOrEqual(3)
        expect(c).toBeGreaterThanOrEqual(1)
        expect(c).toBeLessThanOrEqual(10)
      }
    }
  })

  it('dla correct = 1 wynik ma 4 różne opcje mimo ciasnego zakresu dolnego', () => {
    for (let seed = 0; seed < 50; seed++) {
      const choices = buildChoices(1, { min: 1, max: 10, offsets: NEAR_MISS_OFFSETS, rng: seededRng(seed) })
      expect(choices).toContain(1)
      expect(new Set(choices).size).toBe(choices.length)
      expect(choices).toHaveLength(4)
    }
  })
})
