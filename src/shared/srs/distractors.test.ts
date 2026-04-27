import { describe, expect, it } from 'vitest'
import { pickDistractors } from './distractors'
import { createInitialLetterState } from './createInitialLetterState'
import type { LetterState } from './types'

function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

const PAIRS: Record<string, string[]> = {
  b: ['d', 'p'],
  d: ['b', 'p'],
  p: ['b', 'd'],
  m: ['n', 'w'],
  n: ['m', 'ń'],
  o: ['ó'],
  ó: ['o'],
  e: ['ę'],
}

describe('pickDistractors', () => {
  it('errorless start: avoids contrastive partners and same shape group for fresh box-1 letter', () => {
    const target = 'b'
    const pool = ['b', 'd', 'p', 'g', 'a', 'm', 't', 'l']
    const state: LetterState = {
      ...createInitialLetterState(target),
      box: 1,
      totalSeen: 0,
    }
    for (let seed = 0; seed < 50; seed++) {
      const distractors = pickDistractors(target, pool, state, PAIRS, makeRng(seed))
      expect(distractors).toHaveLength(3)
      expect(distractors).not.toContain(target)
      expect(new Set(distractors).size).toBe(3)
      for (const d of distractors) {
        expect(['d', 'p', 'g']).not.toContain(d)
      }
    }
  })

  it('errorless start falls back when pool too small for visually distant only', () => {
    const target = 'b'
    const pool = ['b', 'd', 'p', 'g']
    const state: LetterState = {
      ...createInitialLetterState(target),
      box: 1,
      totalSeen: 0,
    }
    const distractors = pickDistractors(target, pool, state, PAIRS, makeRng(1))
    expect(distractors).toHaveLength(3)
    expect(new Set(distractors).size).toBe(3)
    expect(distractors).not.toContain('b')
  })

  it('errorless does NOT apply once totalSeen > 2', () => {
    const target = 'b'
    const pool = ['b', 'd', 'p', 'a', 'm', 't', 'l', 'o']
    const state: LetterState = {
      ...createInitialLetterState(target),
      box: 1,
      totalSeen: 3,
    }
    let foundPartner = false
    for (let seed = 0; seed < 100; seed++) {
      const distractors = pickDistractors(target, pool, state, PAIRS, makeRng(seed))
      if (distractors.includes('d') || distractors.includes('p')) {
        foundPartner = true
        break
      }
    }
    expect(foundPartner).toBe(true)
  })

  it('respects contrastive pairs ~70% when target not errorless', () => {
    const target = 'b'
    const pool = ['b', 'd', 'p', 'a', 'm', 't', 'l', 'o', 'e']
    const state: LetterState = {
      ...createInitialLetterState(target),
      box: 3,
      totalSeen: 10,
    }
    let withPartner = 0
    const trials = 1000
    const rng = makeRng(2024)
    for (let i = 0; i < trials; i++) {
      const distractors = pickDistractors(target, pool, state, PAIRS, rng)
      if (distractors.includes('d') || distractors.includes('p')) withPartner++
    }
    const ratio = withPartner / trials
    expect(ratio).toBeGreaterThan(0.55)
    expect(ratio).toBeLessThan(0.95)
  })

  it('falls back when partner not in active pool', () => {
    const target = 'o'
    const pool = ['o', 'a', 'm', 't', 'l', 'e']
    const state: LetterState = {
      ...createInitialLetterState(target),
      box: 3,
      totalSeen: 10,
    }
    for (let seed = 0; seed < 50; seed++) {
      const distractors = pickDistractors(target, pool, state, PAIRS, makeRng(seed))
      expect(distractors).toHaveLength(3)
      expect(distractors).not.toContain('ó')
      expect(distractors).not.toContain(target)
      expect(new Set(distractors).size).toBe(3)
    }
  })

  it('works with minimal pool (4 letters)', () => {
    const target = 'a'
    const pool = ['a', 'm', 'l', 'e']
    const state: LetterState = {
      ...createInitialLetterState(target),
      box: 3,
      totalSeen: 10,
    }
    const distractors = pickDistractors(target, pool, state, PAIRS, makeRng(7))
    expect(distractors).toHaveLength(3)
    expect(new Set(distractors).size).toBe(3)
    expect(distractors).not.toContain(target)
    for (const d of distractors) {
      expect(pool).toContain(d)
    }
  })

  it('throws when active pool has fewer than 4 letters', () => {
    const target = 'a'
    const pool = ['a', 'm', 'l']
    const state = createInitialLetterState(target)
    expect(() => pickDistractors(target, pool, state, PAIRS, makeRng(1))).toThrow()
  })

  it('throws when target not in active pool', () => {
    const target = 'q'
    const pool = ['a', 'm', 'l', 'e']
    const state = createInitialLetterState(target)
    expect(() => pickDistractors(target, pool, state, PAIRS, makeRng(1))).toThrow()
  })

  it('never produces duplicates and never the target', () => {
    const target = 'b'
    const pool = ['b', 'd', 'p', 'a', 'm', 't', 'l', 'o', 'e']
    const state: LetterState = {
      ...createInitialLetterState(target),
      box: 3,
      totalSeen: 10,
    }
    for (let seed = 0; seed < 200; seed++) {
      const distractors = pickDistractors(target, pool, state, PAIRS, makeRng(seed))
      expect(distractors).toHaveLength(3)
      expect(distractors).not.toContain(target)
      expect(new Set(distractors).size).toBe(3)
    }
  })
})
