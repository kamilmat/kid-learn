import { describe, it, expect } from 'vitest'
import { pickCorrectionPrefix, CORRECTION_PREFIX_KEYS } from './useSession.pickers'

describe('pickCorrectionPrefix', () => {
  const pairs = { b: ['d', 'p'], d: ['b'], m: ['w'], w: ['m'] }

  it('returns contrastive when chosen is in CONTRASTIVE_PAIRS[target]', () => {
    expect(pickCorrectionPrefix('b', 'd', pairs, () => 0)).toBe(
      'correction-prefix-contrastive',
    )
    expect(pickCorrectionPrefix('m', 'w', pairs, () => 0.5)).toBe(
      'correction-prefix-contrastive',
    )
  })

  it('returns one of 1/2/3 random when chosen is not contrastive', () => {
    const result = pickCorrectionPrefix('a', 'z', pairs, () => 0)
    expect(CORRECTION_PREFIX_KEYS).toContain(result)
    expect(result).not.toBe('correction-prefix-contrastive')
  })

  it('handles target with no entry in pairs', () => {
    const result = pickCorrectionPrefix('x', 'y', pairs, () => 0)
    expect(CORRECTION_PREFIX_KEYS).toContain(result)
  })

  it('rng=0 → first prefix', () => {
    const result = pickCorrectionPrefix('a', 'z', pairs, () => 0)
    expect(result).toBe(CORRECTION_PREFIX_KEYS[0])
  })

  it('rng=0.99 → last prefix', () => {
    const result = pickCorrectionPrefix('a', 'z', pairs, () => 0.99)
    expect(result).toBe(CORRECTION_PREFIX_KEYS[2])
  })
})
