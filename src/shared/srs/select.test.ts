import { describe, expect, it } from 'vitest'
import { pickNextLetter } from './select'
import { createInitialLetterState } from './createInitialLetterState'
import type { LetterState } from './types'

function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function makeStates(letters: string[]): LetterState[] {
  return letters.map((l) => createInitialLetterState(l))
}

describe('pickNextLetter', () => {
  const now = 1_000_000_000
  const pool = ['a', 'm', 'l', 'e', 'o', 't']

  it('returns a letter from the active pool', () => {
    const rng = makeRng(42)
    const states = makeStates(pool)
    for (let i = 0; i < 100; i++) {
      const letter = pickNextLetter(states, pool, null, now, rng)
      expect(pool).toContain(letter)
    }
  })

  it('does not repeat the same letter as last target when alternatives exist', () => {
    const rng = makeRng(7)
    const states = makeStates(pool)
    let last: string | null = null
    for (let i = 0; i < 200; i++) {
      const letter = pickNextLetter(states, pool, last, now, rng)
      if (last !== null) {
        expect(letter).not.toBe(last)
      }
      last = letter
    }
  })

  it('returns the only letter when pool size is 1', () => {
    const states = makeStates(['a'])
    expect(pickNextLetter(states, ['a'], 'a', now, makeRng(1))).toBe('a')
  })

  it('throws when active pool is empty', () => {
    expect(() => pickNextLetter([], [], null, now, makeRng(1))).toThrow()
  })

  it('biases toward letters with high recentWrong', () => {
    const rng = makeRng(123)
    const states: LetterState[] = pool.map((l) => {
      if (l === 'm') {
        return { ...createInitialLetterState(l), recentWrong: 5 }
      }
      return createInitialLetterState(l)
    })
    const counts: Record<string, number> = {}
    for (let i = 0; i < 2000; i++) {
      const picked = pickNextLetter(states, pool, null, now, rng)
      counts[picked] = (counts[picked] ?? 0) + 1
    }
    const others = pool.filter((l) => l !== 'm')
    const otherAvg =
      others.reduce((acc, l) => acc + (counts[l] ?? 0), 0) / others.length
    expect(counts['m'] ?? 0).toBeGreaterThan(otherAvg * 2)
  })

  it('uses jitter to occasionally pick from box 4-5', () => {
    const rng = makeRng(99)
    const states: LetterState[] = pool.map((l) => {
      if (l === 'a' || l === 'e') {
        return { ...createInitialLetterState(l), box: 5 }
      }
      return { ...createInitialLetterState(l), recentWrong: 5 }
    })
    let highBoxHits = 0
    const iterations = 4000
    for (let i = 0; i < iterations; i++) {
      const picked = pickNextLetter(states, pool, null, now, rng)
      if (picked === 'a' || picked === 'e') highBoxHits++
    }
    const ratio = highBoxHits / iterations
    expect(ratio).toBeGreaterThan(0.05)
    expect(ratio).toBeLessThan(0.5)
  })

  it('throws when no states match the pool', () => {
    const states = makeStates(['x'])
    expect(() => pickNextLetter(states, ['a'], null, now, makeRng(1))).toThrow()
  })
})
