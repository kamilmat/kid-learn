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

const { useReadingSession } = await import('./useReadingSession')
const { useReading } = await import('../store/readingStore')

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockAudioBus = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }
const mockSettings = { reading: { wildCelebrationFreq: 8 } } as any

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
})
