import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSession } from './useSession'
import type { UseSessionConfig } from './useSession'
import type { LetterState, SessionLog } from '@/modules/letters/types'

function makeAudioBus() {
  return {
    play: vi.fn(() => Promise.resolve(true)),
    stop: vi.fn(),
  }
}

type Captured = {
  log: SessionLog
  states: Record<string, LetterState>
}

function makeConfig(
  overrides: Partial<UseSessionConfig> = {},
): UseSessionConfig {
  return {
    level: 'iskierka',
    activeLetters: ['a', 'm', 'l', 'e', 'o', 't'],
    sessionLength: 5,
    timeLimit: 'off',
    showCountdownBar: false,
    caseMode: 'tylko-male',
    styleMode: 'tylko-drukowane',
    celebrationTempo: 'medium',
    tilesPerQuestion: 4,
    secondAttempt: true,
    audioBus: makeAudioBus(),
    rng: () => 0,
    now: () => 1_000_000,
    uuid: () => 'test-retry',
    ...overrides,
  }
}

/** Feedback błędu (5500ms) + margines — po nim odpala się ekran drugiej próby. */
const PAST_WRONG_FEEDBACK_MS = 7000

describe('useSession — druga próba po błędzie', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('po błędzie pokazuje to samo pytanie z 2 kafelkami: poprawnym i wybranym', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() => useSession(makeConfig({ audioBus })))

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion
    expect(q).not.toBeNull()
    const target = q!.targetLetter
    const wrongIdx = q!.tiles.findIndex((t) => t !== target)
    const wrong = q!.tiles[wrongIdx]!

    act(() => {
      result.current.answer(wrong, wrongIdx)
    })
    expect(result.current.status).toBe('feedback')
    expect(audioBus.play).toHaveBeenCalledWith('try-again')

    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS)
    })

    expect(result.current.status).toBe('retry')
    const retryQ = result.current.currentQuestion!
    expect(retryQ.tiles).toHaveLength(2)
    expect(retryQ.tiles).toContain(target)
    expect(retryQ.tiles).toContain(wrong)
    expect(retryQ.targetLetter).toBe(target)
    expect(retryQ.tiles[retryQ.targetSlot]).toBe(target)
    // Retry jest bez presji czasu — nawet gdyby poziom miał timer.
    expect(result.current.countdownMs).toBeNull()
  })

  it('poprawka nie rusza SRS ani liczników — box zmienia się dokładnie raz', () => {
    const captured: Captured[] = []
    const onSessionEnd = (log: SessionLog, states: Record<string, LetterState>) => {
      captured.push({ log, states })
    }
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useSession(makeConfig({ audioBus, onSessionEnd })),
    )

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const target = q.targetLetter
    const wrongIdx = q.tiles.findIndex((t) => t !== target)
    const wrong = q.tiles[wrongIdx]!

    act(() => {
      result.current.answer(wrong, wrongIdx)
    })
    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS)
    })
    expect(result.current.status).toBe('retry')

    const retryQ = result.current.currentQuestion!
    const targetSlot = retryQ.targetSlot
    act(() => {
      result.current.answer(target, targetSlot)
    })

    // Poprawka nie dosypuje iskierki, a błąd z pierwszej próby zostaje policzony.
    expect(result.current.iskierki).toBe(0)
    expect(result.current.wrongCount).toBe(1)
    expect(audioBus.play).toHaveBeenCalledWith('retry-correct')

    act(() => {
      result.current.quit()
    })
    const withRetry = captured[0]!

    // Kontrola: ta sama sekwencja bez drugiej próby (tylko pierwszy, błędny tap).
    const control: Captured[] = []
    const { result: r2 } = renderHook(() =>
      useSession(
        makeConfig({
          secondAttempt: false,
          onSessionEnd: (log, states) => control.push({ log, states }),
        }),
      ),
    )
    act(() => {
      r2.current.start()
    })
    const q2 = r2.current.currentQuestion!
    const wrongIdx2 = q2.tiles.findIndex((t) => t !== q2.targetLetter)
    act(() => {
      r2.current.answer(q2.tiles[wrongIdx2]!, wrongIdx2)
    })
    act(() => {
      r2.current.quit()
    })
    const withoutRetry = control[0]!

    expect(q2.targetLetter).toBe(target)
    expect(withRetry.states[target]!.box).toBe(withoutRetry.states[target]!.box)
    expect(withRetry.states[target]!.recentWrong).toBe(
      withoutRetry.states[target]!.recentWrong,
    )
  })

  it('loguje poprawkę jako attempt: 2, a pierwszą pomyłkę bez attempt', () => {
    const captured: Captured[] = []
    const { result } = renderHook(() =>
      useSession(
        makeConfig({
          onSessionEnd: (log, states) => captured.push({ log, states }),
        }),
      ),
    )

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const target = q.targetLetter
    const wrongIdx = q.tiles.findIndex((t) => t !== target)

    act(() => {
      result.current.answer(q.tiles[wrongIdx]!, wrongIdx)
    })
    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS)
    })
    act(() => {
      result.current.answer(target, result.current.currentQuestion!.targetSlot)
    })
    act(() => {
      result.current.quit()
    })

    const answers = captured[0]!.log.events.filter((e) => e.type === 'answer')
    expect(answers).toHaveLength(2)
    expect(answers[0]).toMatchObject({ outcome: 'wrong' })
    expect(answers[0]).not.toHaveProperty('attempt')
    expect(answers[1]).toMatchObject({ outcome: 'correct', attempt: 2 })
  })

  it('🤷 w drugiej próbie liczy się jako retry-wrong i kończy pytanie', () => {
    const { result } = renderHook(() => useSession(makeConfig()))

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const wrongIdx = q.tiles.findIndex((t) => t !== q.targetLetter)
    act(() => {
      result.current.answer(q.tiles[wrongIdx]!, wrongIdx)
    })
    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS)
    })
    expect(result.current.status).toBe('retry')

    act(() => {
      result.current.dontKnow()
    })
    // Druga pomyłka nie robi trzeciej próby — feedback i lecimy dalej.
    expect(result.current.status).toBe('feedback')
    expect(result.current.dontKnowCount).toBe(0)
    expect(result.current.wrongCount).toBe(1)

    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS + 2000)
    })
    expect(result.current.status).toBe('playing')
    expect(result.current.currentQuestion!.tiles).toHaveLength(4)
  })

  it('secondAttempt=false zachowuje stare zachowanie (wprost do następnego pytania)', () => {
    const { result } = renderHook(() =>
      useSession(makeConfig({ secondAttempt: false })),
    )

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const wrongIdx = q.tiles.findIndex((t) => t !== q.targetLetter)
    act(() => {
      result.current.answer(q.tiles[wrongIdx]!, wrongIdx)
    })
    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS + 2000)
    })
    expect(result.current.status).toBe('playing')
    expect(result.current.questionNumber).toBe(2)
  })

  it('„Dalej" w trakcie feedbacku błędu skraca czekanie, ale nie kasuje retry', () => {
    const { result } = renderHook(() => useSession(makeConfig()))

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const wrongIdx = q.tiles.findIndex((t) => t !== q.targetLetter)
    act(() => {
      result.current.answer(q.tiles[wrongIdx]!, wrongIdx)
    })
    act(() => {
      result.current.skipFeedback()
    })
    expect(result.current.status).toBe('retry')
    expect(result.current.currentQuestion!.tiles).toHaveLength(2)
  })

  it('pauza między błędem a retry wciąż prowadzi do drugiej próby', () => {
    const { result } = renderHook(() => useSession(makeConfig()))

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const wrongIdx = q.tiles.findIndex((t) => t !== q.targetLetter)
    act(() => {
      result.current.answer(q.tiles[wrongIdx]!, wrongIdx)
    })
    act(() => {
      result.current.pause('manual')
    })
    act(() => {
      result.current.resume()
    })
    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS)
    })
    expect(result.current.status).toBe('retry')
    expect(result.current.currentQuestion!.tiles).toHaveLength(2)
  })

  it('pauza w drugiej próbie wraca do retry i powtarza try-again', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() => useSession(makeConfig({ audioBus })))

    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const wrongIdx = q.tiles.findIndex((t) => t !== q.targetLetter)
    act(() => {
      result.current.answer(q.tiles[wrongIdx]!, wrongIdx)
    })
    act(() => {
      vi.advanceTimersByTime(PAST_WRONG_FEEDBACK_MS)
    })
    expect(result.current.status).toBe('retry')

    act(() => {
      result.current.pause('manual')
    })
    expect(result.current.status).toBe('paused')

    audioBus.play.mockClear()
    act(() => {
      result.current.resume()
    })
    expect(result.current.status).toBe('retry')
    expect(audioBus.play).toHaveBeenCalledWith('try-again')
    expect(result.current.currentQuestion!.tiles).toHaveLength(2)
  })
})
