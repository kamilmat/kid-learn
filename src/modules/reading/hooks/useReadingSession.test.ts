// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// We polyfill an in-memory Storage here so persist middleware can write.
// Identyczny pattern jak w readingStore.test.ts.
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

const { useReadingSession, MIN_FEEDBACK_MS } = await import('./useReadingSession')
const { useReading } = await import('../store/readingStore')

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// play() zwraca Promise<boolean> (true = klip dograł do końca) — patrz AudioBus
const mockAudioBus = { play: vi.fn().mockResolvedValue(true), stop: vi.fn() }
const mockSettings = { reading: { wildCelebrationFreq: 8, questionsPerSession: {} } } as any

describe('useReadingSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useReading.getState().reset()
    localStorage.clear()
  })

  it('starts in idle status', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    expect(result.current.status).toBe('idle')
  })

  it('Iskierka session starts with status=asking after start()', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    expect(result.current.status).toBe('idle')
    act(() => result.current.start())
    expect(result.current.status).toBe('asking')
    expect(result.current.totalQuestions).toBe(8)
    expect(result.current.currentQuestion?.type).toBe('syllable-match')
  })

  it('Iskierka question has 4 choices', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.currentQuestion?.type).toBe('syllable-match')
    if (result.current.currentQuestion?.type === 'syllable-match') {
      expect(result.current.currentQuestion.choices).toHaveLength(4)
    }
  })

  it('Iskierka question contains the target in choices', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    if (result.current.currentQuestion?.type === 'syllable-match') {
      const q = result.current.currentQuestion
      expect(q.choices).toContain(q.targetSyllable)
    }
  })

  it('Płomyk question has type word-assembly with target syllables', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'plomyk', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.currentQuestion?.type).toBe('word-assembly')
    if (result.current.currentQuestion?.type === 'word-assembly') {
      expect(result.current.currentQuestion.syllables.length).toBeGreaterThanOrEqual(2)
      expect(result.current.currentQuestion.distractors.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('Ognik question has type word-choice with 4 choices', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'ognik', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.currentQuestion?.type).toBe('word-choice')
    if (result.current.currentQuestion?.type === 'word-choice') {
      expect(result.current.currentQuestion.choices).toHaveLength(4)
    }
  })

  it('Ognik question contains target word in choices', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'ognik', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    if (result.current.currentQuestion?.type === 'word-choice') {
      const q = result.current.currentQuestion
      expect(q.choices).toContain(q.targetWord)
    }
  })

  it('Pochodnia question has type syllable-fill with missing position', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'pochodnia', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.currentQuestion?.type).toBe('syllable-fill')
    if (result.current.currentQuestion?.type === 'syllable-fill') {
      expect(['first', 'middle', 'last']).toContain(result.current.currentQuestion.missingPosition)
      expect(result.current.currentQuestion.missingSyllable).toBeTruthy()
    }
  })

  it('Pochodnia choices contain the missing syllable', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'pochodnia', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    if (result.current.currentQuestion?.type === 'syllable-fill') {
      const q = result.current.currentQuestion
      expect(q.choices).toContain(q.missingSyllable)
    }
  })

  it('submitAnswer correct sets feedbackVariant=correct', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    const target = result.current.currentQuestion?.type === 'syllable-match' ? result.current.currentQuestion.targetSyllable : null
    if (target) {
      act(() => result.current.submitAnswer(target))
      expect(result.current.feedbackVariant).toBe('correct')
    }
  })

  it('submitAnswer wrong sets feedbackVariant=wrong', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    expect(result.current.feedbackVariant).toBe('wrong')
  })

  it('submitDontKnow sets feedbackVariant=dontKnow', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.submitDontKnow())
    expect(result.current.feedbackVariant).toBe('dontKnow')
  })

  it('status is feedback after submitAnswer', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    expect(result.current.status).toBe('feedback')
  })

  it('skipFeedback advances to next question', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    const target = result.current.currentQuestion?.type === 'syllable-match' ? result.current.currentQuestion.targetSyllable : null
    if (target) {
      act(() => result.current.submitAnswer(target))
      act(() => result.current.skipFeedback())
      expect(result.current.currentQuestionIndex).toBe(1)
      expect(result.current.status).toBe('asking')
    }
  })

  it('currentQuestionIndex is 0 on first question', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.currentQuestionIndex).toBe(0)
  })

  it('after 8 questions session completes', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    for (let i = 0; i < 8; i++) {
      const target = result.current.currentQuestion?.type === 'syllable-match' ? result.current.currentQuestion.targetSyllable : null
      if (target) {
        act(() => result.current.submitAnswer(target))
        act(() => result.current.skipFeedback())
      } else { break }
    }
    expect(result.current.status).toBe('complete')
    expect(result.current.results).not.toBeNull()
    expect(result.current.results?.iskierkiEarned).toBeGreaterThanOrEqual(0)
  })

  it('results contains correct count after perfect session', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    for (let i = 0; i < 8; i++) {
      const target = result.current.currentQuestion?.type === 'syllable-match' ? result.current.currentQuestion.targetSyllable : null
      if (target) {
        act(() => result.current.submitAnswer(target))
        act(() => result.current.skipFeedback())
      } else { break }
    }
    expect(result.current.results?.iskierkiEarned).toBe(8)
  })

  it('pause/resume changes paused flag', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.pause())
    expect(result.current.paused).toBe(true)
    act(() => result.current.resume())
    expect(result.current.paused).toBe(false)
  })

  it('pause sets status=paused', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')
  })

  it('resume from pause restores asking status', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.pause())
    act(() => result.current.resume())
    expect(result.current.status).toBe('asking')
  })

  it('repeatAudio calls audioBus.play', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    mockAudioBus.play.mockClear()
    act(() => result.current.repeatAudio())
    expect(mockAudioBus.play).toHaveBeenCalled()
  })

  it('audioBus.stop called on start to clear leftover audio', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(mockAudioBus.stop).toHaveBeenCalled()
  })

  it('recordDropError does not advance question', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'plomyk', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.currentQuestionIndex).toBe(0)
    act(() => result.current.recordDropError())
    expect(result.current.currentQuestionIndex).toBe(0)
    expect(result.current.status).toBe('asking')
  })

  it('pickedScene is null before any correct answer', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'plomyk', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.pickedScene).toBeNull()
  })

  it('start() zeruje persistowany wildCelebrationCounter z poprzedniej sesji', () => {
    useReading.setState({ wildCelebrationCounter: 7 })
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(useReading.getState().wildCelebrationCounter).toBe(0)
  })

  it('triggers wild celebration when correct count >= wildCelebrationFreq + jitter', () => {
    const settings = { reading: { wildCelebrationFreq: 2, questionsPerSession: {} } } as any
    // rng=0.5 → jitter = Math.floor(0.5*5) - 2 = 0; trigger at counter >= 2
    const { result } = renderHook(() => useReadingSession({
      level: 'iskierka',
      audioBus: mockAudioBus,
      settings,
      rng: () => 0.5,
    }))
    act(() => result.current.start())

    // Submit 1st correct (counter goes 0→1, no wild)
    let target = result.current.currentQuestion?.type === 'syllable-match'
      ? result.current.currentQuestion.targetSyllable : null
    if (target) {
      act(() => result.current.submitAnswer(target))
      expect(result.current.feedbackVariant).toBe('correct')  // not 'wild' yet
      act(() => result.current.skipFeedback())
    }

    // Submit 2nd correct (counter goes 1→2, threshold 2 hit, should be 'wild')
    target = result.current.currentQuestion?.type === 'syllable-match'
      ? result.current.currentQuestion.targetSyllable : null
    if (target) {
      act(() => result.current.submitAnswer(target))
      expect(result.current.feedbackVariant).toBe('wild')
    }
  })

  it('Pochodnia low-box (3+ syl) never picks first position', () => {
    // Run multiple sessions with deterministic rng to verify distribution
    const positions = new Set<string>()
    for (let seed = 0; seed < 30; seed++) {
      const { result } = renderHook(() => useReadingSession({
        level: 'pochodnia',
        audioBus: mockAudioBus,
        settings: mockSettings,
        rng: () => (seed * 0.137) % 1,  // varied but deterministic
      }))
      act(() => result.current.start())
      if (result.current.currentQuestion?.type === 'syllable-fill') {
        const q = result.current.currentQuestion
        // Only count for 3+ syllable words at low box (initial state, all box=1)
        // Total syllables = visibleSyllables.length + 1 (the missing one)
        if (q.visibleSyllables.length + 1 >= 3) {
          positions.add(q.missingPosition)
        }
      }
    }
    // Expect 'first' NOT to appear when low-box (box=1) for 3+syl words
    expect(positions.has('first')).toBe(false)
  })

  it('iskierkiEarned starts at 0 and increments on correct answer', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.iskierkiEarned).toBe(0)
    const target = result.current.currentQuestion?.type === 'syllable-match' ? result.current.currentQuestion.targetSyllable : null
    if (target) {
      act(() => result.current.submitAnswer(target))
      expect(result.current.iskierkiEarned).toBe(1)
    }
  })

  it('iskierkiEarned does not increment on wrong answer', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    expect(result.current.iskierkiEarned).toBe(0)
  })

  it('questionOutcomes starts empty and gains entry after skipFeedback', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(result.current.questionOutcomes).toHaveLength(0)
    const target = result.current.currentQuestion?.type === 'syllable-match' ? result.current.currentQuestion.targetSyllable : null
    if (target) {
      act(() => result.current.submitAnswer(target))
      expect(result.current.questionOutcomes).toHaveLength(0)  // nie pushowane przed skipFeedback
      act(() => result.current.skipFeedback())
      expect(result.current.questionOutcomes).toHaveLength(1)
      expect(result.current.questionOutcomes[0]).toBe('correct')
    }
  })

  it('questionOutcomes records wrong outcome correctly', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    act(() => result.current.skipFeedback())
    expect(result.current.questionOutcomes[0]).toBe('wrong')
  })

  it('questionOutcomes records dontKnow outcome correctly', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.submitDontKnow())
    act(() => result.current.skipFeedback())
    expect(result.current.questionOutcomes[0]).toBe('dontKnow')
  })

  it('pause during feedback → resume powtarza korektę i dopiero potem idzie dalej', async () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())

    // Wywołaj odpowiedź żeby wejść w feedback
    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    expect(result.current.status).toBe('feedback')

    // Pauza podczas feedback
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')
    expect(result.current.paused).toBe(true)

    // `pause()` zrobiło stop() — po wznowieniu korekta ("spróbuj jeszcze raz"
    // + cel) leci PONOWNIE, inaczej dziecko nigdy nie usłyszy odpowiedzi.
    mockAudioBus.play.mockClear()
    await act(async () => {
      result.current.resume()
    })
    expect(mockAudioBus.play).toHaveBeenCalledWith('reading-wrong-prefix')

    // Dalej przechodzimy dopiero gdy kolejka korekty wybrzmi
    await act(async () => {
      await result.current.waitForFeedbackAudio()
    })
    expect(result.current.paused).toBe(false)
    expect(result.current.status).toBe('asking')
    expect(result.current.currentQuestionIndex).toBe(1)
    expect(result.current.questionOutcomes).toHaveLength(1)
  })

  it('pause podczas wild celebration → resume nie zakleszcza sesji (po MIN_FEEDBACK_MS)', () => {
    vi.useFakeTimers()
    try {
      const settings = {
        reading: { wildCelebrationFreq: 1, questionsPerSession: { iskierka: 5 }, wordAnimations: 'off' },
      } as any
      const { result } = renderHook(() =>
        useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings, rng: () => 0.5 }),
      )
      act(() => result.current.start())
      const target = result.current.currentQuestion
      expect(target?.type).toBe('syllable-match')
      if (target?.type !== 'syllable-match') return
      act(() => result.current.submitAnswer(target.targetSyllable))
      expect(result.current.feedbackVariant).toBe('wild')

      act(() => result.current.pause())
      act(() => result.current.resume())
      // Bez audio do powtórzenia advance() nie leci w tej samej klatce —
      // dziecko musi jeszcze zobaczyć feedback przez (resztę) MIN_FEEDBACK_MS.
      expect(result.current.status).toBe('feedback')
      act(() => {
        vi.advanceTimersByTime(MIN_FEEDBACK_MS)
      })
      expect(result.current.status).toBe('asking')
      expect(result.current.feedbackVariant).toBeNull()
      expect(result.current.currentQuestionIndex).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('resume z pauzy w trakcie feedbacku "correct" czeka resztę MIN_FEEDBACK_MS zanim przejdzie dalej', () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() =>
        useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }),
      )
      act(() => result.current.start())
      const target = result.current.currentQuestion
      expect(target?.type).toBe('syllable-match')
      if (target?.type !== 'syllable-match') return
      act(() => result.current.submitAnswer(target.targetSyllable))
      expect(result.current.feedbackVariant).toBe('correct')

      // 400ms widoczne PRZED pauzą powinny liczyć się do minimum.
      act(() => {
        vi.advanceTimersByTime(400)
      })
      act(() => result.current.pause())
      act(() => result.current.resume())
      expect(result.current.status).toBe('feedback')

      // Reszta (MIN_FEEDBACK_MS - 400) jeszcze nie wystarcza.
      act(() => {
        vi.advanceTimersByTime(MIN_FEEDBACK_MS - 400 - 1)
      })
      expect(result.current.status).toBe('feedback')

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.status).toBe('asking')
      expect(result.current.currentQuestionIndex).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('totalQuestions honors settings.reading.questionsPerSession[level]', () => {
    const settings = {
      reading: { wildCelebrationFreq: 8, questionsPerSession: { iskierka: 3 } },
    } as any
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings }))
    act(() => result.current.start())
    expect(result.current.totalQuestions).toBe(3)
    for (let i = 0; i < 3; i++) {
      act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
      act(() => result.current.skipFeedback())
    }
    expect(result.current.status).toBe('complete')
  })

  it('start() kolejkuje intro poziomu i pali flage dopiero po odtworzeniu', async () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    expect(mockAudioBus.play).toHaveBeenCalledWith('reading-iskierka-intro')
    await act(async () => { await Promise.resolve() })
    expect(useReading.getState().hasSeenIntro('reading-iskierka-intro')).toBe(true)
  })

  it('start() nie pali flagi intro gdy play() zostalo anulowane', async () => {
    const bus = { play: vi.fn().mockResolvedValue(false), stop: vi.fn() }
    const { result } = renderHook(() => useReadingSession({ level: 'ognik', audioBus: bus, settings: mockSettings }))
    act(() => result.current.start())
    await act(async () => { await Promise.resolve() })
    expect(useReading.getState().hasSeenIntro('reading-ognik-intro')).toBe(false)
  })

  it('pause() ucisza kolejke przed nav-pause', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    mockAudioBus.stop.mockClear()
    act(() => result.current.pause())
    expect(mockAudioBus.stop).toHaveBeenCalled()
    expect(mockAudioBus.play).toHaveBeenCalledWith('nav-pause')
  })

  it('skipFeedback(true) gra cue nav-tap, auto-advance nie', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    mockAudioBus.play.mockClear()
    act(() => result.current.skipFeedback(true))
    expect(mockAudioBus.play).toHaveBeenCalledWith('nav-tap')

    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    mockAudioBus.play.mockClear()
    act(() => result.current.skipFeedback())
    expect(mockAudioBus.play).not.toHaveBeenCalledWith('nav-tap')
  })

  it('sesja zapisuje eventy per pytanie do session logu', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())
    for (let i = 0; i < 8; i++) {
      act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
      act(() => result.current.skipFeedback())
    }
    const sessions = useReading.getState().sessions
    expect(sessions).toHaveLength(1)
    const log = sessions[0]!
    expect(log.events).toHaveLength(8)
    expect(log.events[0]?.outcome).toBe('wrong')
    expect(log.events[0]?.exerciseType).toBe('syllable-match')
    expect(log.events[0]?.targetId).toMatch(/^syl-/)
    expect(log.events[0]?.responseMs).toBeGreaterThanOrEqual(0)
  })

  it('quit() zapisuje czesciowe wyniki, jest idempotentne i nie loguje pustej sesji', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())

    // wyjscie bez zadnej odpowiedzi — brak wpisu w historii
    act(() => result.current.quit())
    expect(useReading.getState().sessions).toHaveLength(0)

    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    act(() => result.current.skipFeedback())
    act(() => result.current.quit())
    expect(useReading.getState().sessions).toHaveLength(1)
    expect(useReading.getState().sessions[0]?.events).toHaveLength(1)
    // SRS czastkowy zapisany
    const wrongId = useReading.getState().sessions[0]?.events[0]?.targetId as string
    expect(useReading.getState().syllables[wrongId]?.totalWrong).toBe(1)

    act(() => result.current.quit())
    expect(useReading.getState().sessions).toHaveLength(1)
  })

  it('flush() zapisuje raz, nie ucisza audio i nie dubluje po quit()', () => {
    const { result } = renderHook(() => useReadingSession({ level: 'iskierka', audioBus: mockAudioBus, settings: mockSettings }))
    act(() => result.current.start())

    // Pusta sesja — flush nic nie zapisuje (i nie zamyka sesji na przyszłość)
    act(() => result.current.flush())
    expect(useReading.getState().sessions).toHaveLength(0)

    act(() => result.current.submitAnswer('NIE-ISTNIEJE'))
    act(() => result.current.skipFeedback())

    // flush nie robi stop() — inaczej zjadłby świeże cue `nav-back`/`nav-home`
    mockAudioBus.stop.mockClear()
    act(() => result.current.flush())
    act(() => result.current.flush())
    expect(mockAudioBus.stop).not.toHaveBeenCalled()
    expect(useReading.getState().sessions).toHaveLength(1)

    // quit() po flushu też nie dokłada drugiego wpisu
    act(() => result.current.quit())
    expect(useReading.getState().sessions).toHaveLength(1)
  })

  it('Pochodnia distractors match target syllable length within ±2', () => {
    // Weryfikuje że dystraktorzy nie są drastycznie krótsi/dłużsi od brakującej sylaby
    // (fix buga: MA/TA nie powinny być dystraktorami dla DŹWIEDŹ/NIĄDZ)
    for (let seed = 0; seed < 30; seed++) {
      const { result } = renderHook(() => useReadingSession({
        level: 'pochodnia',
        audioBus: mockAudioBus,
        settings: mockSettings,
        rng: () => (seed * 0.137) % 1,
      }))
      act(() => result.current.start())
      if (result.current.currentQuestion?.type === 'syllable-fill') {
        const q = result.current.currentQuestion
        const targetLen = q.missingSyllable.length
        const distractors = q.choices.filter((c) => c !== q.missingSyllable)
        for (const d of distractors) {
          expect(Math.abs(d.length - targetLen)).toBeLessThanOrEqual(2)
        }
      }
    }
  })
})
