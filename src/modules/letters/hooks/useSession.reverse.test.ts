import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { REVERSE_PROMPT_KEY, useSession } from './useSession'
import type { UseSessionConfig } from './useSession'

function makeAudioBus() {
  return {
    play: vi.fn(() => Promise.resolve(true)),
    stop: vi.fn(),
  }
}

function makeConfig(overrides: Partial<UseSessionConfig> = {}): UseSessionConfig {
  return {
    level: 'iskierka',
    activeLetters: ['a', 'm', 'l', 'e', 'o', 't'],
    sessionLength: 12,
    timeLimit: 'off',
    showCountdownBar: false,
    caseMode: 'tylko-male',
    styleMode: 'tylko-drukowane',
    celebrationTempo: 'medium',
    tilesPerQuestion: 4,
    secondAttempt: false,
    audioBus: makeAudioBus(),
    rng: () => 0,
    now: () => 1_000_000,
    uuid: () => 'test-reverse',
    ...overrides,
  }
}

/** Przechodzi przez feedback i wchodzi w następne pytanie (secondAttempt: false). */
function advanceToNextQuestion() {
  act(() => {
    vi.advanceTimersByTime(10_000)
  })
}

describe('useSession — wariant odwrotny „widzisz literę → wybierz dźwięk"', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('pytania o indeksach 4 i 9 są odwrotne, reszta podstawowa', () => {
    const { result } = renderHook(() => useSession(makeConfig()))
    act(() => {
      result.current.start()
    })

    const kinds: string[] = []
    for (let i = 0; i < 10; i += 1) {
      const q = result.current.currentQuestion
      expect(q).not.toBeNull()
      expect(q!.index).toBe(i)
      kinds.push(q!.kind)
      act(() => {
        result.current.answer(q!.targetLetter, q!.targetSlot)
      })
      advanceToNextQuestion()
    }

    expect(kinds).toEqual([
      'sound-to-letter',
      'sound-to-letter',
      'sound-to-letter',
      'sound-to-letter',
      'letter-to-sound',
      'sound-to-letter',
      'sound-to-letter',
      'sound-to-letter',
      'sound-to-letter',
      'letter-to-sound',
    ])
  })

  it('pytanie odwrotne ma 3 kafelki i gra prompt zamiast dźwięku litery', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() => useSession(makeConfig({ audioBus })))
    act(() => {
      result.current.start()
    })

    for (let i = 0; i < 4; i += 1) {
      const q = result.current.currentQuestion!
      act(() => {
        result.current.answer(q.targetLetter, q.targetSlot)
      })
      advanceToNextQuestion()
    }

    const reverse = result.current.currentQuestion!
    expect(reverse.kind).toBe('letter-to-sound')
    expect(reverse.tiles).toHaveLength(3)
    expect(reverse.tiles[reverse.targetSlot]).toBe(reverse.targetLetter)

    const played = audioBus.play.mock.calls.map((c) => c[0])
    expect(played).toContain(REVERSE_PROMPT_KEY)
    // Prompt odwrotny nie zdradza dźwięku szukanej litery — to jest pytanie.
    const afterPrompt = played.slice(played.lastIndexOf(REVERSE_PROMPT_KEY))
    expect(afterPrompt).toHaveLength(1)
  })

  it('`forceReverseIndices` wymusza wariant odwrotny poza rytmem `reverseEvery`', () => {
    const { result } = renderHook(() =>
      useSession(makeConfig({ sessionLength: 4, forceReverseIndices: [1] })),
    )
    act(() => {
      result.current.start()
    })

    const kinds: string[] = []
    for (let i = 0; i < 4; i += 1) {
      const q = result.current.currentQuestion!
      kinds.push(q.kind)
      act(() => {
        result.current.answer(q.targetLetter, q.targetSlot)
      })
      advanceToNextQuestion()
    }

    expect(kinds).toEqual([
      'sound-to-letter',
      'letter-to-sound',
      'sound-to-letter',
      'sound-to-letter',
    ])
  })

  it('pytanie odwrotne nie dostaje odliczania — odsłuch kandydatów nie jest timeoutem', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useSession(
        makeConfig({ audioBus, timeLimit: '15s', showCountdownBar: true, sessionLength: 6 }),
      ),
    )
    act(() => {
      result.current.start()
    })

    // Pytanie podstawowe: pasek odliczania jest.
    expect(result.current.countdownMs).not.toBeNull()

    for (let i = 0; i < 4; i += 1) {
      const q = result.current.currentQuestion!
      act(() => {
        result.current.answer(q.targetLetter, q.targetSlot)
      })
      advanceToNextQuestion()
    }

    const reverse = result.current.currentQuestion!
    expect(reverse.kind).toBe('letter-to-sound')
    expect(result.current.countdownMs).toBeNull()

    // Dziecko słucha kandydatów dłużej niż limit — pytanie ma zostać na ekranie.
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current.status).toBe('playing')
    expect(result.current.currentQuestion).toBe(reverse)
    expect(result.current.timeoutCount).toBe(0)
  })

  it('korekta po błędzie w wariancie odwrotnym nie zdradza dźwięku litery', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useSession(makeConfig({ audioBus, secondAttempt: true })),
    )
    act(() => {
      result.current.start()
    })

    for (let i = 0; i < 4; i += 1) {
      const q = result.current.currentQuestion!
      act(() => {
        result.current.answer(q.targetLetter, q.targetSlot)
      })
      advanceToNextQuestion()
    }

    const reverse = result.current.currentQuestion!
    expect(reverse.kind).toBe('letter-to-sound')
    const wrongSlot = reverse.targetSlot === 0 ? 1 : 0
    audioBus.play.mockClear()
    act(() => {
      result.current.answer(reverse.tiles[wrongSlot]!, wrongSlot)
    })

    const played = audioBus.play.mock.calls.map((c) => c[0])
    // Dźwięk celu = odpowiedź na pytanie; w drugiej próbie (2 kafelki)
    // wystarczyłoby dopasować to, co przed chwilą zabrzmiało.
    expect(played).not.toContain(`letter-${reverse.targetLetter}`)
    expect(played.length).toBeGreaterThan(0)
  })

  it('`reverseEvery: 0` wyłącza wariant odwrotny', () => {
    const { result } = renderHook(() => useSession(makeConfig({ reverseEvery: 0 })))
    act(() => {
      result.current.start()
    })

    for (let i = 0; i < 6; i += 1) {
      const q = result.current.currentQuestion!
      expect(q.kind).toBe('sound-to-letter')
      act(() => {
        result.current.answer(q.targetLetter, q.targetSlot)
      })
      advanceToNextQuestion()
    }
  })
})
