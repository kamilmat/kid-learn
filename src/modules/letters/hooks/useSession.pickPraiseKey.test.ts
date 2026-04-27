import { describe, it, expect } from 'vitest'
import { pickPraiseKey, PRAISE_KEYS } from './useSession.pickers'

describe('pickPraiseKey', () => {
  it('picks one of the 12 praise keys', () => {
    const key = pickPraiseKey(null, () => 0)
    expect(PRAISE_KEYS).toContain(key)
  })

  it('returns first key when rng=0 and no last', () => {
    const key = pickPraiseKey(null, () => 0)
    expect(key).toBe(PRAISE_KEYS[0])
  })

  it('skips last key — never returns it twice in a row', () => {
    const last = PRAISE_KEYS[0]
    // rng=0 zwykle zwróciłby PRAISE_KEYS[0], ale ten jest "last" → skip do następnego
    const next = pickPraiseKey(last, () => 0)
    expect(next).not.toBe(last)
  })

  it('cycles deterministically with mock rng', () => {
    // Z 12 kluczy, rng=0.5 → idx=6 (Math.floor(0.5*12) = 6)
    const next = pickPraiseKey(null, () => 0.5)
    expect(next).toBe(PRAISE_KEYS[6])
  })
})
