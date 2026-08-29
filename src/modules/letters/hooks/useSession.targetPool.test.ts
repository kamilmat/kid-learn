import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSession } from './useSession'
import type { UseSessionConfig } from './useSession'

// Repro białego ekranu z CR: „Trudne literki" / „Literka dnia" wybierają cele z
// CAŁEGO postępu SRS (ż/ź/ń), a config poziomu potrafi spaść do Iskierki (6
// liter) — historia sesji przycięta do 50 wpisów zgubiła wpisy poziomowe.
// Cel spoza `activeLetters` nie ma `LetterState` i sesja rzucała wyjątkiem.

const ISKIERKA: string[] = ['a', 'm', 'l', 'e', 'o', 't']

function makeConfig(overrides: Partial<UseSessionConfig> = {}): UseSessionConfig {
  return {
    level: 'iskierka',
    activeLetters: ISKIERKA,
    sessionLength: 4,
    timeLimit: 'off',
    showCountdownBar: false,
    caseMode: 'tylko-male',
    styleMode: 'tylko-drukowane',
    celebrationTempo: 'medium',
    tilesPerQuestion: 4,
    secondAttempt: false,
    audioBus: { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() },
    rng: () => 0.5,
    now: () => 1_000_000,
    uuid: () => 'test-target-pool',
    ...overrides,
  }
}

describe('useSession — targetPool przecięty z activeLetters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('targetPool rozłączny z pulą poziomu nie wysadza sesji — fallback na activeLetters', () => {
    const { result } = renderHook(() =>
      useSession(makeConfig({ targetPool: ['ż', 'ź', 'ń'] })),
    )
    expect(() =>
      act(() => {
        result.current.start()
      }),
    ).not.toThrow()

    for (let i = 0; i < 3; i += 1) {
      const q = result.current.currentQuestion
      expect(q).not.toBeNull()
      expect(ISKIERKA).toContain(q!.targetLetter)
      act(() => {
        result.current.answer(q!.targetLetter, q!.targetSlot)
        vi.advanceTimersByTime(10_000)
      })
    }
  })

  it('częściowe pokrycie zawęża cele do części wspólnej', () => {
    const { result } = renderHook(() =>
      useSession(makeConfig({ targetPool: ['ż', 'a', 'ń'] })),
    )
    act(() => {
      result.current.start()
    })

    for (let i = 0; i < 3; i += 1) {
      const q = result.current.currentQuestion!
      expect(q.targetLetter).toBe('a')
      act(() => {
        result.current.answer(q.targetLetter, q.targetSlot)
        vi.advanceTimersByTime(10_000)
      })
    }
  })
})
