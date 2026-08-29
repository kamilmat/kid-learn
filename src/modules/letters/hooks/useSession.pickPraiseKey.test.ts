import { describe, it, expect } from 'vitest'
import { pickPraiseKey, PRAISE_KEYS, PRAISE_PROCESS_KEYS } from './useSession.pickers'

const ALL_PRAISE_KEYS = [...PRAISE_KEYS, ...PRAISE_PROCESS_KEYS]

describe('pickPraiseKey', () => {
  it('picks one of the outcome/process praise keys', () => {
    const key = pickPraiseKey(null, () => 0)
    expect(ALL_PRAISE_KEYS).toContain(key)
  })

  it('returns first process key when rng<0.5 (process list) and no last', () => {
    // rng=0 → pierwsze losowanie (0<0.5) wybiera listę procesową, drugie
    // (idx=0) daje jej pierwszy klucz
    const key = pickPraiseKey(null, () => 0)
    expect(key).toBe(PRAISE_PROCESS_KEYS[0])
  })

  it('skips last key — never returns it twice in a row', () => {
    const last = PRAISE_KEYS[0]
    const next = pickPraiseKey(last, () => 0)
    expect(next).not.toBe(last)
  })

  it('cycles deterministically with mock rng (rng>=0.5 → lista wynikowa)', () => {
    // Z 12 kluczy wynikowych, rng=0.5 → idx=6 (Math.floor(0.5*12) = 6)
    const next = pickPraiseKey(null, () => 0.5)
    expect(next).toBe(PRAISE_KEYS[6])
  })
})
