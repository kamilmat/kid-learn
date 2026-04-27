import { describe, expect, it } from 'vitest'
import { boxWeight, scoreLetter } from './scoring'
import { createInitialLetterState } from './createInitialLetterState'
import type { LetterState } from './types'

describe('boxWeight', () => {
  it('maps boxes to expected weights', () => {
    expect(boxWeight(1)).toBe(5.0)
    expect(boxWeight(2)).toBe(3.0)
    expect(boxWeight(3)).toBe(1.5)
    expect(boxWeight(4)).toBe(1.0)
    expect(boxWeight(5)).toBe(0.4)
  })

  it('lowers weight as box increases', () => {
    expect(boxWeight(1)).toBeGreaterThan(boxWeight(2))
    expect(boxWeight(2)).toBeGreaterThan(boxWeight(3))
    expect(boxWeight(3)).toBeGreaterThan(boxWeight(4))
    expect(boxWeight(4)).toBeGreaterThan(boxWeight(5))
  })
})

describe('scoreLetter', () => {
  const now = 1_000_000_000

  it('returns recency=1.0 for fresh state (lastSeen=0)', () => {
    const fresh = createInitialLetterState('a')
    const s = scoreLetter(fresh, now)
    expect(s).toBeCloseTo(boxWeight(1) * 1.0 * 1.0, 6)
    expect(s).toBeCloseTo(5.0, 6)
  })

  it('box 1 fresh letter scores higher than box 5 fresh letter', () => {
    const a = createInitialLetterState('a')
    const z: LetterState = { ...createInitialLetterState('z'), box: 5 }
    expect(scoreLetter(a, now)).toBeGreaterThan(scoreLetter(z, now))
  })

  it('recentWrong boost increases score multiplicatively', () => {
    const base: LetterState = { ...createInitialLetterState('a'), recentWrong: 0 }
    const wrong5: LetterState = { ...createInitialLetterState('a'), recentWrong: 5 }
    expect(scoreLetter(wrong5, now) / scoreLetter(base, now)).toBeCloseTo(11, 6)
  })

  it('recency grows linearly within cap', () => {
    const oneHour = 60 * 60 * 1000
    const state: LetterState = {
      ...createInitialLetterState('a'),
      lastSeen: now - oneHour,
    }
    expect(scoreLetter(state, now)).toBeCloseTo(boxWeight(1) * 1.3, 6)
  })

  it('caps recency at 3.0 even after >24h', () => {
    const tenHours = 10 * 60 * 60 * 1000
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const stateA: LetterState = {
      ...createInitialLetterState('a'),
      lastSeen: now - tenHours,
    }
    const stateB: LetterState = {
      ...createInitialLetterState('a'),
      lastSeen: now - sevenDays,
    }
    expect(scoreLetter(stateA, now)).toBeCloseTo(boxWeight(1) * 3.0, 6)
    expect(scoreLetter(stateB, now)).toBeCloseTo(boxWeight(1) * 3.0, 6)
  })

  it('combines all three multipliers', () => {
    const oneHour = 60 * 60 * 1000
    const state: LetterState = {
      ...createInitialLetterState('a'),
      box: 2,
      recentWrong: 1,
      lastSeen: now - oneHour,
    }
    expect(scoreLetter(state, now)).toBeCloseTo(3.0 * 1.3 * 3, 6)
  })
})
