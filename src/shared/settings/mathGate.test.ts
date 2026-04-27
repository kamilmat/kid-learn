import { describe, expect, it } from 'vitest'

import {
  COOLDOWN_MS,
  applyAttempt,
  cooldownRemainingMs,
  generateMathProblem,
  initialMathGateState,
  isCooldown,
  validateAnswer,
} from './mathGate'

describe('generateMathProblem', () => {
  // Deterministic RNG dla powtarzalnych testów.
  const seqRng = (values: number[]): (() => number) => {
    let i = 0
    return () => {
      const v = values[i % values.length]
      i++
      return v
    }
  }

  it('generates a problem where a + b > 10', () => {
    // Sprawdzamy szeroki zakres przy domyślnym Math.random.
    for (let i = 0; i < 500; i++) {
      const p = generateMathProblem()
      expect(p.a).toBeGreaterThanOrEqual(1)
      expect(p.a).toBeLessThanOrEqual(9)
      expect(p.b).toBeGreaterThanOrEqual(1)
      expect(p.b).toBeLessThanOrEqual(9)
      expect(p.c).toBeGreaterThanOrEqual(1)
      expect(p.c).toBeLessThanOrEqual(9)
      expect(p.a + p.b).toBeGreaterThan(10)
      expect(p.answer).toBe(p.a + p.b - p.c)
    }
  })

  it('expression formats as "a + b - c"', () => {
    const p = generateMathProblem(seqRng([0.999, 0.999, 0.999]))
    expect(p.expression).toBe(`${p.a} + ${p.b} - ${p.c}`)
  })

  it('uses injected RNG deterministically', () => {
    // 0.5 → randInt(1,9) = floor(0.5*9)+1 = 5; potem b z bMin=11-5=6
    //        → randInt(6,9) = floor(0.5*4)+6 = 8; c=5
    const p = generateMathProblem(seqRng([0.5, 0.5, 0.5]))
    expect(p.a).toBe(5)
    expect(p.b).toBe(8)
    expect(p.c).toBe(5)
    expect(p.answer).toBe(8)
  })
})

describe('validateAnswer', () => {
  const problem = { a: 7, b: 8, c: 5 } // answer = 10

  it('accepts the correct answer', () => {
    expect(validateAnswer(problem, '10')).toBe(true)
    expect(validateAnswer(problem, ' 10 ')).toBe(true)
  })

  it('rejects wrong numbers', () => {
    expect(validateAnswer(problem, '11')).toBe(false)
    expect(validateAnswer(problem, '0')).toBe(false)
    expect(validateAnswer(problem, '-10')).toBe(false)
  })

  it('rejects non-numeric inputs', () => {
    expect(validateAnswer(problem, '')).toBe(false)
    expect(validateAnswer(problem, '   ')).toBe(false)
    expect(validateAnswer(problem, 'abc')).toBe(false)
    expect(validateAnswer(problem, '10.0')).toBe(false)
    expect(validateAnswer(problem, '10a')).toBe(false)
    expect(validateAnswer(problem, '7+8-5')).toBe(false)
  })

  it('handles negative correct answer', () => {
    const p = { a: 6, b: 5, c: 9 } // answer = 2; brzeg
    expect(validateAnswer(p, '2')).toBe(true)
    const p2 = { a: 6, b: 5, c: 9 }
    expect(validateAnswer(p2, '-2')).toBe(false)
  })
})

describe('applyAttempt — backoff state machine', () => {
  it('resets state on success', () => {
    const state = { failedAttempts: 2, cooldownUntil: 0 }
    const next = applyAttempt(state, true, 1_000)
    expect(next).toEqual({ failedAttempts: 0, cooldownUntil: 0 })
  })

  it('increments failedAttempts on first and second fail', () => {
    let state = initialMathGateState
    state = applyAttempt(state, false, 1_000)
    expect(state.failedAttempts).toBe(1)
    expect(state.cooldownUntil).toBe(0)
    state = applyAttempt(state, false, 2_000)
    expect(state.failedAttempts).toBe(2)
    expect(state.cooldownUntil).toBe(0)
  })

  it('triggers 60s cooldown on third fail and resets attempts', () => {
    let state = initialMathGateState
    state = applyAttempt(state, false, 1_000)
    state = applyAttempt(state, false, 2_000)
    state = applyAttempt(state, false, 3_000)
    expect(state.failedAttempts).toBe(0)
    expect(state.cooldownUntil).toBe(3_000 + COOLDOWN_MS)
  })

  it('isCooldown correctly reports active cooldown window', () => {
    const state = { failedAttempts: 0, cooldownUntil: 100_000 }
    expect(isCooldown(state, 99_999)).toBe(true)
    expect(isCooldown(state, 100_000)).toBe(false)
    expect(isCooldown(state, 100_001)).toBe(false)
  })

  it('cooldown expires after 60s', () => {
    let state = initialMathGateState
    state = applyAttempt(state, false, 0)
    state = applyAttempt(state, false, 1_000)
    state = applyAttempt(state, false, 2_000)
    expect(isCooldown(state, 2_000)).toBe(true)
    expect(isCooldown(state, 2_000 + COOLDOWN_MS - 1)).toBe(true)
    expect(isCooldown(state, 2_000 + COOLDOWN_MS)).toBe(false)
    expect(cooldownRemainingMs(state, 2_000)).toBe(COOLDOWN_MS)
    expect(cooldownRemainingMs(state, 2_000 + COOLDOWN_MS + 5_000)).toBe(0)
  })

  it('success after partial failures resets attempts', () => {
    let state = initialMathGateState
    state = applyAttempt(state, false, 0)
    state = applyAttempt(state, false, 500)
    state = applyAttempt(state, true, 1_000)
    expect(state.failedAttempts).toBe(0)
    expect(state.cooldownUntil).toBe(0)
  })
})
