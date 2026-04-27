import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSession } from './useSession'
import type { UseSessionConfig } from './useSession'

function makeAudioBus() {
  return {
    play: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  }
}

function makeRng(seed: number): () => number {
  // LCG deterministyczny — wystarcza do testów
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 0x100000000
    return s / 0x100000000
  }
}

function makeConfig(
  overrides: Partial<UseSessionConfig> = {},
): UseSessionConfig {
  return {
    level: 'iskierka',
    activeLetters: ['a', 'm', 'l', 'e', 'o', 't'],
    sessionLength: 3,
    timeLimit: 'off',
    showCountdownBar: true,
    caseMode: 'tylko-male',
    styleMode: 'tylko-drukowane',
    celebrationTempo: 'medium',
    audioBus: makeAudioBus(),
    rng: makeRng(42),
    now: () => 1_000_000,
    uuid: () => 'test-session',
    ...overrides,
  }
}

describe('useSession — lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in preparing status', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    expect(result.current.status).toBe('preparing')
  })

  it('moves to playing and generates the first question on start', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    expect(result.current.status).toBe('playing')
    expect(result.current.currentQuestion).not.toBeNull()
    expect(result.current.currentQuestion?.tiles).toHaveLength(4)
  })

  it('plays the letter audio prompt on first question', () => {
    const audioBus = makeAudioBus()
    const cfg = makeConfig({ audioBus })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    const target = result.current.currentQuestion!.targetLetter
    expect(audioBus.play).toHaveBeenCalledWith(`letter-${target}`)
  })

  it('handles correct answer: increments iskierki + records event', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    act(() => {
      result.current.answer(q.targetLetter, q.targetSlot)
    })
    expect(result.current.iskierki).toBe(1)
    expect(result.current.status).toBe('feedback')
    expect(result.current.lastFeedback?.variant).toBe('correct')
    const ev = result.current.sessionEvents.find((e) => e.type === 'answer')
    expect(ev?.type === 'answer' && ev.outcome).toBe('correct')
  })

  it('handles wrong answer: marks feedback wrong, no iskierka', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const wrongLetter = q.tiles.find((l) => l !== q.targetLetter)!
    const wrongSlot = q.tiles.indexOf(wrongLetter)
    act(() => {
      result.current.answer(wrongLetter, wrongSlot as 0 | 1 | 2 | 3)
    })
    expect(result.current.iskierki).toBe(0)
    expect(result.current.lastFeedback?.variant).toBe('wrong')
  })

  it('handles dontKnow: status becomes feedback with dontKnow variant', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.dontKnow()
    })
    expect(result.current.lastFeedback?.variant).toBe('dontKnow')
  })

  it('advances to next question after feedback duration', () => {
    const cfg = makeConfig({ celebrationTempo: 'medium' })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    const q1 = result.current.currentQuestion!
    act(() => {
      result.current.answer(q1.targetLetter, q1.targetSlot)
    })
    expect(result.current.status).toBe('feedback')
    // correct @ medium: durationMs=5500ms + POST_FEEDBACK_BREATH_MS=500ms = 6000ms total
    act(() => {
      vi.advanceTimersByTime(5500)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.status).toBe('playing')
    expect(result.current.questionNumber).toBe(2)
  })

  it('finishes after the configured number of questions', () => {
    const cfg = makeConfig({ sessionLength: 2 })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    // q1 (non-last) — correct @ medium: 5500ms feedback + 500ms breath = 6000ms
    let q = result.current.currentQuestion!
    act(() => {
      result.current.answer(q.targetLetter, q.targetSlot)
    })
    act(() => {
      vi.advanceTimersByTime(5500)
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    // q2 (last) — correct @ medium: 5500ms only (finishSession called directly)
    q = result.current.currentQuestion!
    act(() => {
      result.current.answer(q.targetLetter, q.targetSlot)
    })
    act(() => {
      vi.advanceTimersByTime(5500)
    })
    expect(result.current.status).toBe('finished')
  })

  it('calls onSessionEnd with log + updated states on finish', () => {
    const onSessionEnd = vi.fn()
    const cfg = makeConfig({ sessionLength: 1, onSessionEnd })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    act(() => {
      result.current.answer(q.targetLetter, q.targetSlot)
    })
    // sessionLength=1 → last question → finishSession after 5500ms (no breath)
    act(() => {
      vi.advanceTimersByTime(5500)
    })
    expect(onSessionEnd).toHaveBeenCalledTimes(1)
    const [log, states] = onSessionEnd.mock.calls[0]!
    expect(log.id).toBe('test-session')
    expect(log.events.some((e: { type: string }) => e.type === 'question-start')).toBe(true)
    expect(states[q.targetLetter].totalCorrect).toBe(1)
  })

  it('plays praise audio on correct answer', () => {
    const audioBus = makeAudioBus()
    const cfg = makeConfig({ audioBus })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    audioBus.play.mockClear()
    act(() => {
      result.current.answer(q.targetLetter, q.targetSlot)
    })
    const calls = audioBus.play.mock.calls.map((c) => c[0])
    expect(calls).toContain('sfx-correct-ding')
    expect(calls.some((k) => k.startsWith('praise-'))).toBe(true)
  })

  it('plays correction prefix sequence on wrong answer', () => {
    const audioBus = makeAudioBus()
    const cfg = makeConfig({ audioBus })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    const q = result.current.currentQuestion!
    const wrong = q.tiles.find((l) => l !== q.targetLetter)!
    audioBus.play.mockClear()
    act(() => {
      result.current.answer(wrong, q.tiles.indexOf(wrong) as 0 | 1 | 2 | 3)
    })
    const calls = audioBus.play.mock.calls.map((c) => c[0])
    expect(calls.some((k) => k.startsWith('correction-prefix-'))).toBe(true)
    expect(calls).toContain(`letter-${q.targetLetter}`)
  })
})

describe('useSession — pause / resume', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves to paused on pause()', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.pause('manual')
    })
    expect(result.current.status).toBe('paused')
  })

  it('logs pause/resume events with reasons', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.pause('idle')
    })
    act(() => {
      result.current.resume()
    })
    const types = result.current.sessionEvents.map((e) => e.type)
    expect(types).toContain('pause')
    expect(types).toContain('resume')
  })

  it('returns to playing on resume()', () => {
    const cfg = makeConfig()
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.pause()
    })
    act(() => {
      result.current.resume()
    })
    expect(result.current.status).toBe('playing')
  })
})

describe('useSession — timer / timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes countdownMs equal to timeLimit on question start', () => {
    let nowVal = 1_000_000
    const cfg = makeConfig({
      timeLimit: 10,
      now: () => nowVal,
    })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    // before any tick, countdownMs may still be initial; trigger one interval
    act(() => {
      nowVal += 0
      vi.advanceTimersByTime(0)
    })
    expect(result.current.countdownMs).toBe(10000)
  })

  it('triggers timeout outcome when timer expires', () => {
    let nowVal = 1_000_000
    const cfg = makeConfig({
      timeLimit: 10,
      now: () => nowVal,
    })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    // Advance just enough to fire the countdown tick (>=10s elapsed) but
    // NOT the subsequent feedback timer (3s in 'medium' tempo).
    act(() => {
      nowVal += 10_001
      vi.advanceTimersByTime(200)
    })
    expect(result.current.lastFeedback?.variant).toBe('timeout')
  })

  it('plays warning cue at 3s remaining', () => {
    const audioBus = makeAudioBus()
    let nowVal = 1_000_000
    const cfg = makeConfig({
      timeLimit: 10,
      now: () => nowVal,
      audioBus,
    })
    const { result } = renderHook(() => useSession(cfg))
    act(() => {
      result.current.start()
    })
    audioBus.play.mockClear()
    act(() => {
      nowVal += 7_100
      vi.advanceTimersByTime(7_100)
    })
    expect(audioBus.play.mock.calls.map((c) => c[0])).toContain('cue-warning-3s')
  })
})
