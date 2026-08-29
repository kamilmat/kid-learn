// Druga próba po błędzie (moduł 2) — kontrakt jak w `useSession.retry.test.ts`
// modułu liter: pierwsza pomyłka rusza SRS i liczniki, poprawka w drugiej
// próbie nie rusza niczego poza logiem (`attempt: 2`).

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number { return this.store.size }
  clear(): void { this.store.clear() }
  getItem(key: string): string | null { return this.store.has(key) ? (this.store.get(key) as string) : null }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string): void { this.store.delete(key) }
  setItem(key: string, value: string): void { this.store.set(key, String(value)) }
}

if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const memStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { value: memStorage, configurable: true, writable: true })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: memStorage, configurable: true, writable: true })
  }
}

const { useReadingSession } = await import('./useReadingSession')
const { useReading } = await import('../store/readingStore')
const { getWordsByLevel } = await import('../data/words')

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { WordState } from '../types'

const makeAudioBus = () => ({ play: vi.fn().mockResolvedValue(true), stop: vi.fn() })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeSettings = (secondAttempt: boolean): any => ({
  secondAttempt,
  reading: { wildCelebrationFreq: 99, questionsPerSession: {} },
})

/** Box 3 na starcie — inaczej `wrong` (box − 2) utknąłby na dolnym progu 1. */
function seedOgnikWordsAtBox3(): void {
  const words: Record<string, WordState> = {}
  for (const w of getWordsByLevel('ognik')) {
    words[w.id] = {
      id: w.id,
      word: w.text,
      box: 3,
      lastSeen: 0,
      recentWrong: 0,
      totalSeen: 0,
      totalCorrect: 0,
      totalWrong: 0,
      level: 'ognik',
      album: false,
    }
  }
  useReading.setState({ words })
}

describe('useReadingSession — druga próba po błędzie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useReading.getState().reset()
    localStorage.clear()
  })

  it('błąd w word-choice → status retry z 2 opcjami; poprawka nie rusza SRS ani liczników', () => {
    seedOgnikWordsAtBox3()
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useReadingSession({ level: 'ognik', audioBus, settings: makeSettings(true) }),
    )

    act(() => result.current.start())
    const q = result.current.currentQuestion
    expect(q?.type).toBe('word-choice')
    if (q?.type !== 'word-choice') throw new Error('oczekiwano word-choice')
    const target = q.targetWord
    const wrong = q.choices.find((c) => c !== target)!

    act(() => result.current.submitAnswer(wrong))
    expect(result.current.status).toBe('feedback')
    expect(audioBus.play).toHaveBeenCalledWith('try-again')

    // Overlay feedbacku wybrzmiał → ekran drugiej próby.
    act(() => result.current.skipFeedback(false))
    expect(result.current.status).toBe('retry')
    const retryQ = result.current.currentQuestion
    if (retryQ?.type !== 'word-choice') throw new Error('oczekiwano word-choice')
    expect(retryQ.choices).toHaveLength(2)
    expect(retryQ.choices).toContain(target)
    expect(retryQ.choices).toContain(wrong)
    expect(retryQ.targetWord).toBe(target)

    // Poprawka: cicha pochwała, bez dinga i bez pochwały z puli.
    audioBus.play.mockClear()
    act(() => result.current.submitAnswer(target))
    expect(audioBus.play).toHaveBeenCalledWith('retry-correct')
    expect(audioBus.play).not.toHaveBeenCalledWith('sfx-correct-ding')
    // Iskierka należy się tylko za pierwsze podejście.
    expect(result.current.iskierkiEarned).toBe(0)

    act(() => result.current.skipFeedback(false))
    act(() => result.current.quit())

    const wordId = getWordsByLevel('ognik').find((w) => w.text === target)!.id
    const state = useReading.getState().words[wordId]!
    // Box zmieniony DOKŁADNIE raz (3 → 1 za błąd); retry-correct go nie podnosi.
    expect(state.box).toBe(1)
    expect(state.recentWrong).toBe(1)
    expect(state.totalSeen).toBe(1)
    expect(state.totalWrong).toBe(1)
    expect(state.totalCorrect).toBe(0)

    // Log: dwie odpowiedzi, druga oznaczona `attempt: 2`.
    const events = useReading.getState().sessions.at(-1)!.events
    expect(events).toHaveLength(2)
    expect(events[0]!.attempt).toBeUndefined()
    expect(events[0]!.outcome).toBe('wrong')
    expect(events[1]!.attempt).toBe(2)
    expect(events[1]!.outcome).toBe('correct')
    // Kropka postępu opisuje pierwsze podejście — poprawka nie zamalowuje błędu.
    expect(result.current.questionOutcomes[0]).toBe('wrong')
  })

  it('secondAttempt: false → po błędzie od razu następne pytanie', () => {
    seedOgnikWordsAtBox3()
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useReadingSession({ level: 'ognik', audioBus, settings: makeSettings(false) }),
    )

    act(() => result.current.start())
    const q = result.current.currentQuestion
    if (q?.type !== 'word-choice') throw new Error('oczekiwano word-choice')
    const wrong = q.choices.find((c) => c !== q.targetWord)!

    act(() => result.current.submitAnswer(wrong))
    expect(audioBus.play).not.toHaveBeenCalledWith('try-again')
    act(() => result.current.skipFeedback(false))
    expect(result.current.status).toBe('asking')
    expect(result.current.currentQuestionIndex).toBe(1)
  })
})

describe('useReadingSession — pauza w trakcie retry / hiperkorekcja', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useReading.getState().reset()
    localStorage.clear()
  })

  it('pauza złapana z zaplanowanym retry (status feedback) → po wznowieniu nadal wchodzi w retry', async () => {
    seedOgnikWordsAtBox3()
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useReadingSession({ level: 'ognik', audioBus, settings: makeSettings(true) }),
    )

    act(() => result.current.start())
    const q = result.current.currentQuestion
    if (q?.type !== 'word-choice') throw new Error('oczekiwano word-choice')
    const target = q.targetWord
    const wrong = q.choices.find((c) => c !== target)!

    act(() => result.current.submitAnswer(wrong))
    expect(result.current.status).toBe('feedback')

    // Pauza łapie ekran ZANIM overlay feedbacku wybrzmiał (retry wciąż zaplanowane).
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')

    await act(async () => {
      result.current.resume()
      // resume() powtarza korektę i doczepia finishFeedback() do jej Promise.all —
      // odczekaj kilka mikrotasków, żeby ten łańcuch się rozstrzygnął.
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('retry')
    const retryQ = result.current.currentQuestion
    if (retryQ?.type !== 'word-choice') throw new Error('oczekiwano word-choice')
    expect(retryQ.choices).toContain(target)
    expect(retryQ.choices).toContain(wrong)
  })

  it('druga pomyłka w retry (hiperkorekcja) nie planuje trzeciej próby', () => {
    seedOgnikWordsAtBox3()
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useReadingSession({ level: 'ognik', audioBus, settings: makeSettings(true) }),
    )

    act(() => result.current.start())
    const q = result.current.currentQuestion
    if (q?.type !== 'word-choice') throw new Error('oczekiwano word-choice')
    const target = q.targetWord
    const wrong = q.choices.find((c) => c !== target)!

    act(() => result.current.submitAnswer(wrong))
    act(() => result.current.skipFeedback(false))
    expect(result.current.status).toBe('retry')

    // Druga pomyłka: dziecko znów wybiera złą odpowiedź w retry.
    act(() => result.current.submitAnswer(wrong))
    expect(result.current.status).toBe('feedback')

    // Overlay wybrzmiewa — brak trzeciej próby, sesja idzie dalej do kolejnego pytania.
    act(() => result.current.skipFeedback(false))
    expect(result.current.status).toBe('asking')
    expect(result.current.currentQuestionIndex).toBe(1)
  })
})
