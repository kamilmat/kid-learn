import { describe, expect, it } from 'vitest'

import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import type { LetterState } from '@/shared/srs/types'

import { dayKey, pickDailyLetter } from './dailyLetter'

function stateFor(letter: string, overrides: Partial<LetterState> = {}): LetterState {
  return { ...createInitialLetterState(letter), ...overrides }
}

describe('dayKey', () => {
  it('jest stabilny w obrębie doby lokalnej', () => {
    const morning = new Date(2026, 7, 29, 6, 30, 0).getTime()
    const night = new Date(2026, 7, 29, 23, 59, 59).getTime()
    expect(dayKey(morning)).toBe(dayKey(night))
    expect(dayKey(morning)).toBe('2026-08-29')
  })

  it('zmienia się o północy lokalnej', () => {
    const before = new Date(2026, 7, 29, 23, 59, 59).getTime()
    const after = new Date(2026, 7, 30, 0, 0, 1).getTime()
    expect(dayKey(after)).not.toBe(dayKey(before))
    expect(dayKey(after)).toBe('2026-08-30')
  })
})

describe('pickDailyLetter', () => {
  const now = Date.now()

  it('wybiera literę o najwyższym scoreItem', () => {
    const letters: Record<string, LetterState> = {
      a: stateFor('a', { box: 5, totalSeen: 10, lastSeen: now - 1000 }),
      b: stateFor('b', { box: 1, recentWrong: 3, totalSeen: 4, lastSeen: now - 1000 }),
      c: stateFor('c', { box: 3, totalSeen: 6, lastSeen: now - 1000 }),
    }
    expect(pickDailyLetter(letters, ['a', 'b', 'c'], now)).toBe('b')
  })

  it('daje pierwszeństwo literze jeszcze niewidzianej', () => {
    const letters: Record<string, LetterState> = {
      a: stateFor('a', { box: 1, recentWrong: 3, totalSeen: 4, lastSeen: now - 1000 }),
    }
    expect(pickDailyLetter(letters, ['a', 'z'], now)).toBe('z')
  })

  it('pusta pula → null', () => {
    expect(pickDailyLetter({}, [], now)).toBeNull()
  })
})
