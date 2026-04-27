import { describe, expect, it } from 'vitest'
import { updateLetterState } from './update'
import { createInitialLetterState } from './createInitialLetterState'
import type { LetterState } from './types'

const NOW = 1_000_000_000

describe('updateLetterState', () => {
  it('handles correct outcome: box+1, decays recentWrong, increments counts', () => {
    const start: LetterState = {
      ...createInitialLetterState('b'),
      box: 2,
      recentWrong: 1,
    }
    const [next, meta] = updateLetterState(start, 'correct', 1500, NOW, 'print', 'lower')
    expect(next.box).toBe(3)
    expect(next.recentWrong).toBeCloseTo(0.67, 6)
    expect(next.totalSeen).toBe(1)
    expect(next.totalCorrect).toBe(1)
    expect(next.lastSeen).toBe(NOW)
    expect(next.avgResponseMs).toBe(1500)
    expect(next.perStyle.print.correct).toBe(1)
    expect(next.perCase.lower.correct).toBe(1)
    expect(meta.firstMastery).toBe(false)
  })

  it('handles wrong outcome: box-2, recentWrong+1', () => {
    const start: LetterState = { ...createInitialLetterState('b'), box: 4 }
    const [next] = updateLetterState(start, 'wrong', 800, NOW, 'print', 'upper', 'd')
    expect(next.box).toBe(2)
    expect(next.recentWrong).toBe(1)
    expect(next.totalWrong).toBe(1)
    expect(next.confusedWith['d']).toBe(1)
    expect(next.perStyle.print.wrong).toBe(1)
    expect(next.perCase.upper.wrong).toBe(1)
  })

  it('handles dontKnow outcome: box-1, recentWrong+1', () => {
    const start: LetterState = { ...createInitialLetterState('b'), box: 3 }
    const [next] = updateLetterState(start, 'dontKnow', 5000, NOW, 'handwritten', 'lower')
    expect(next.box).toBe(2)
    expect(next.recentWrong).toBe(1)
    expect(next.totalDontKnow).toBe(1)
    expect(next.perStyle.handwritten.correct).toBe(0)
    expect(next.perStyle.handwritten.wrong).toBe(0)
  })

  it('handles timeout outcome: box-2, recentWrong+1, flagged in counts', () => {
    const start: LetterState = { ...createInitialLetterState('b'), box: 3 }
    const [next] = updateLetterState(start, 'timeout', 15000, NOW, 'print', 'lower')
    expect(next.box).toBe(1)
    expect(next.recentWrong).toBe(1)
    expect(next.totalTimeout).toBe(1)
  })

  it('clamps box at 1 lower bound and 5 upper bound', () => {
    const lo: LetterState = { ...createInitialLetterState('a'), box: 1 }
    const [nextLo] = updateLetterState(lo, 'wrong', 100, NOW, 'print', 'lower')
    expect(nextLo.box).toBe(1)
    const hi: LetterState = { ...createInitialLetterState('a'), box: 5 }
    const [nextHi] = updateLetterState(hi, 'correct', 100, NOW, 'print', 'lower')
    expect(nextHi.box).toBe(5)
  })

  it('sets masteredAt only on first entry to box 5 (firstMastery=true once)', () => {
    let state: LetterState = { ...createInitialLetterState('a'), box: 4 }
    const [s1, m1] = updateLetterState(state, 'correct', 100, NOW, 'print', 'lower')
    expect(s1.box).toBe(5)
    expect(s1.masteredAt).toBe(NOW)
    expect(m1.firstMastery).toBe(true)

    state = { ...s1, box: 3 }
    const [s2, m2] = updateLetterState(state, 'correct', 100, NOW + 1000, 'print', 'lower')
    expect(s2.box).toBe(4)
    expect(s2.masteredAt).toBe(NOW)
    expect(m2.firstMastery).toBe(false)

    state = { ...s2 }
    const [s3, m3] = updateLetterState(state, 'correct', 100, NOW + 2000, 'print', 'lower')
    expect(s3.box).toBe(5)
    expect(s3.masteredAt).toBe(NOW)
    expect(m3.firstMastery).toBe(false)
  })

  it('decays recentWrong by 0.33 per correct, never below 0', () => {
    let state: LetterState = { ...createInitialLetterState('a'), recentWrong: 0.5 }
    const [s1] = updateLetterState(state, 'correct', 100, NOW, 'print', 'lower')
    expect(s1.recentWrong).toBeCloseTo(0.17, 6)
    state = { ...s1 }
    const [s2] = updateLetterState(state, 'correct', 100, NOW, 'print', 'lower')
    expect(s2.recentWrong).toBe(0)
    state = { ...s2 }
    const [s3] = updateLetterState(state, 'correct', 100, NOW, 'print', 'lower')
    expect(s3.recentWrong).toBe(0)
  })

  it('updates avgResponseMs using running mean', () => {
    let state = createInitialLetterState('a')
    const [s1] = updateLetterState(state, 'correct', 1000, NOW, 'print', 'lower')
    expect(s1.avgResponseMs).toBe(1000)
    state = s1
    const [s2] = updateLetterState(state, 'correct', 2000, NOW, 'print', 'lower')
    expect(s2.avgResponseMs).toBe(1500)
    state = s2
    const [s3] = updateLetterState(state, 'correct', 3000, NOW, 'print', 'lower')
    expect(s3.avgResponseMs).toBe(2000)
  })

  it('tracks confusedWith only on wrong with chosenLetter different from target', () => {
    const start = createInitialLetterState('b')
    const [s1] = updateLetterState(start, 'wrong', 100, NOW, 'print', 'lower', 'd')
    expect(s1.confusedWith['d']).toBe(1)
    const [s2] = updateLetterState(s1, 'wrong', 100, NOW, 'print', 'lower', 'd')
    expect(s2.confusedWith['d']).toBe(2)
    const [s3] = updateLetterState(s2, 'wrong', 100, NOW, 'print', 'lower')
    expect(s3.confusedWith['d']).toBe(2)
    const [s4] = updateLetterState(s3, 'wrong', 100, NOW, 'print', 'lower', 'b')
    expect(s4.confusedWith['b']).toBeUndefined()
  })

  it('tracks perStyle separately for print and handwritten on correct/wrong', () => {
    let state = createInitialLetterState('b')
    const [s1] = updateLetterState(state, 'correct', 100, NOW, 'print', 'lower')
    state = s1
    const [s2] = updateLetterState(state, 'wrong', 100, NOW, 'handwritten', 'lower', 'd')
    state = s2
    expect(state.perStyle.print).toEqual({ correct: 1, wrong: 0 })
    expect(state.perStyle.handwritten).toEqual({ correct: 0, wrong: 1 })
  })

  it('skips perCase tracking for "pair"', () => {
    const start = createInitialLetterState('b')
    const [next] = updateLetterState(start, 'correct', 100, NOW, 'print', 'pair')
    expect(next.perCase.upper).toEqual({ correct: 0, wrong: 0 })
    expect(next.perCase.lower).toEqual({ correct: 0, wrong: 0 })
  })

  it('returns a new object (immutable update)', () => {
    const start = createInitialLetterState('b')
    const [next] = updateLetterState(start, 'wrong', 100, NOW, 'print', 'lower', 'd')
    expect(next).not.toBe(start)
    expect(next.confusedWith).not.toBe(start.confusedWith)
    expect(next.perStyle).not.toBe(start.perStyle)
    expect(next.perCase).not.toBe(start.perCase)
    expect(start.totalSeen).toBe(0)
    expect(start.lastSeen).toBe(0)
    expect(start.confusedWith).toEqual({})
  })

  it('updates lastSeen and totalSeen on every outcome', () => {
    const start = createInitialLetterState('a')
    const outcomes = ['correct', 'wrong', 'dontKnow', 'timeout'] as const
    let state = start
    for (const o of outcomes) {
      const [next] = updateLetterState(state, o, 100, NOW + 100, 'print', 'lower')
      expect(next.lastSeen).toBe(NOW + 100)
      state = next
    }
    expect(state.totalSeen).toBe(4)
  })
})
