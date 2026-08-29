import { describe, it, expect } from 'vitest'
import { pickPraiseMixed } from './pickPraiseMixed'

const OUT = ['o1', 'o2', 'o3'] as const
const PROC = ['p1', 'p2', 'p3'] as const

describe('pickPraiseMixed', () => {
  it('rng < 0.5 → lista procesowa', () => {
    expect(PROC).toContain(pickPraiseMixed(OUT, PROC, null, () => 0.1))
  })

  it('rng >= 0.5 → lista wynikowa', () => {
    expect(OUT).toContain(pickPraiseMixed(OUT, PROC, null, () => 0.9))
  })

  it('nigdy nie powtarza poprzedniego klucza, także między listami', () => {
    const seq = [0.1, 0.2, 0.1, 0.3, 0.9, 0.4]
    let i = 0
    let last: 'o1' | 'o2' | 'o3' | 'p1' | 'p2' | 'p3' | null = 'p1'
    for (let n = 0; n < 3; n++) {
      const k = pickPraiseMixed(OUT, PROC, last, () => seq[i++]!)
      expect(k).not.toBe(last)
      last = k
    }
  })
})
