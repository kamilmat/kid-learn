// Sprawdzian rozumienia (obrazek → słowo) — moduł 2, Ognik i Pochodnia.

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

const { useReadingSession, MEANING_QUESTION_INDICES, generateWordMeaning } = await import('./useReadingSession')
const { useReading } = await import('../store/readingStore')

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ALL_WORDS, NO_MEANING_WORDS, getWordsByLevel } from '../data/words'
import type { Level } from '@/shared/settings/types'
import type { ReadingQuestion, WordState } from '../types'

const makeAudioBus = () => ({ play: vi.fn().mockResolvedValue(true), stop: vi.fn() })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeSettings = (questionsPerSession: number): any => ({
  secondAttempt: true,
  questionsPerSession,
  reading: { wildCelebrationFreq: 99, questionsPerSession: {} },
})

function seedWords(level: Level): void {
  const words: Record<string, WordState> = {}
  for (const w of getWordsByLevel(level)) {
    words[w.id] = {
      id: w.id, word: w.text, box: 3, lastSeen: 0, recentWrong: 0,
      totalSeen: 0, totalCorrect: 0, totalWrong: 0, level, album: false,
    }
  }
  useReading.setState({ words })
}

function correctAnswerFor(q: ReadingQuestion): string {
  switch (q.type) {
    case 'syllable-match': return q.targetSyllable
    case 'syllable-fill': return q.missingSyllable
    default: return q.targetWord
  }
}

/** Deterministyczny RNG — ten sam seed daje ten sam przebieg sesji. */
function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x1_0000_0000
  }
}

/** Przechodzi sesję do końca, zwracając typ pytania na każdym indeksie. */
function collectQuestionTypes(level: Level, questionsPerSession: number): ReadingQuestion[] {
  seedWords(level)
  const audioBus = makeAudioBus()
  const { result } = renderHook(() =>
    useReadingSession({ level, audioBus, settings: makeSettings(questionsPerSession) }),
  )
  act(() => result.current.start())

  const seen: ReadingQuestion[] = []
  for (let i = 0; i < questionsPerSession; i++) {
    const q = result.current.currentQuestion
    if (!q) break
    seen.push(q)
    act(() => result.current.submitAnswer(correctAnswerFor(q)))
    act(() => result.current.skipFeedback(false))
  }
  return seen
}

describe('word-meaning — dane', () => {
  it('każdy wpis NO_MEANING_WORDS istnieje w ALL_WORDS', () => {
    const texts = new Set(ALL_WORDS.map((w) => w.text))
    for (const word of NO_MEANING_WORDS) {
      expect(texts.has(word), `${word} nie istnieje w ALL_WORDS`).toBe(true)
    }
  })
})

describe('word-meaning — generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useReading.getState().reset()
    localStorage.clear()
  })

  it.each(['ognik', 'pochodnia'] as const)(
    '%s: pytanie na indeksie 2 to word-meaning z 4 rozróżnialnymi opcjami',
    (level) => {
      const seen = collectQuestionTypes(level, 6)
      const q = seen[2]
      expect(q?.type).toBe('word-meaning')
      if (q?.type !== 'word-meaning') throw new Error('oczekiwano word-meaning')

      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices).toContain(q.targetWord)
      expect(NO_MEANING_WORDS).not.toContain(q.targetWord)

      const chosen = q.choices.map((c) => ALL_WORDS.find((w) => w.text === c)!)
      expect(new Set(chosen.map((w) => w.albumEmoji)).size).toBe(4)
      expect(new Set(chosen.map((w) => w.syllables[0])).size).toBe(4)
    },
  )

  it.each(['ognik', 'pochodnia'] as const)(
    '%s: żadne dwie opcje nie zaczynają się tą samą sylabą — w 400 losowaniach',
    (level) => {
      // Pojedyncze pytanie trafiało kolizję w ~1,5% losowań, więc pełny przebieg
      // testów bywał czerwony mniej więcej raz na pięć uruchomień. Generator
      // wołamy tu wprost (zamiast przez hooka), bo tylko tak da się wykonać
      // setki losowań i zamienić „czasem pada" w wynik powtarzalny.
      const words = getWordsByLevel(level)
      const states: Record<string, WordState> = {}
      for (const word of words) {
        states[word.id] = {
          id: word.id, word: word.text, box: 3, lastSeen: 0, recentWrong: 0,
          totalSeen: 0, totalCorrect: 0, totalWrong: 0, level, album: false,
        }
      }
      const pool = words.map((word) => word.id)
      const rng = seededRng(20260905)
      for (let i = 0; i < 400; i++) {
        const q = generateWordMeaning(states, pool, null, rng, 1_700_000_000_000)
        const chosen = q.choices.map((c) => ALL_WORDS.find((word) => word.text === c)!)
        expect(new Set(chosen.map((word) => word.syllables[0])).size, `losowanie ${i}: ${q.choices.join(', ')}`).toBe(4)
        expect(new Set(chosen.map((word) => word.albumEmoji)).size, `losowanie ${i}: ${q.choices.join(', ')}`).toBe(4)
      }
    },
  )

  it('word-meaning pojawia się dokładnie na indeksach 2 i 5', () => {
    const seen = collectQuestionTypes('ognik', 8)
    const indices = seen
      .map((q, i) => (q.type === 'word-meaning' ? i : -1))
      .filter((i) => i >= 0)
    expect(indices).toEqual([...MEANING_QUESTION_INDICES])
  })

  it('przy questionsPerSession === 5 word-meaning jest tylko na indeksie 2', () => {
    const seen = collectQuestionTypes('ognik', 5)
    const indices = seen
      .map((q, i) => (q.type === 'word-meaning' ? i : -1))
      .filter((i) => i >= 0)
    expect(indices).toEqual([2])
  })

  it.each(['iskierka', 'plomyk'] as const)('%s: brak word-meaning', (level) => {
    const seen = collectQuestionTypes(level, 6)
    expect(seen.some((q) => q.type === 'word-meaning')).toBe(false)
  })
})

describe('word-meaning — prompt i druga próba', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useReading.getState().reset()
    localStorage.clear()
  })

  it('prompt gra tylko reading-meaning-prompt, nigdy word-*', () => {
    seedWords('ognik')
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useReadingSession({ level: 'ognik', audioBus, settings: makeSettings(6) }),
    )
    act(() => result.current.start())
    for (let i = 0; i < 2; i++) {
      const q = result.current.currentQuestion!
      act(() => result.current.submitAnswer(correctAnswerFor(q)))
      act(() => result.current.skipFeedback(false))
    }
    expect(result.current.currentQuestion?.type).toBe('word-meaning')

    audioBus.play.mockClear()
    act(() => result.current.repeatAudio())
    const keys = audioBus.play.mock.calls.map((c) => c[0] as string)
    expect(keys).toContain('reading-meaning-prompt')
    expect(keys.filter((k) => k.startsWith('word-'))).toHaveLength(0)
  })

  it('błąd → druga próba z 2 opcjami zawierającymi target', () => {
    seedWords('ognik')
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useReadingSession({ level: 'ognik', audioBus, settings: makeSettings(6) }),
    )
    act(() => result.current.start())
    for (let i = 0; i < 2; i++) {
      const q = result.current.currentQuestion!
      act(() => result.current.submitAnswer(correctAnswerFor(q)))
      act(() => result.current.skipFeedback(false))
    }
    const q = result.current.currentQuestion
    if (q?.type !== 'word-meaning') throw new Error('oczekiwano word-meaning')
    const wrong = q.choices.find((c) => c !== q.targetWord)!

    act(() => result.current.submitAnswer(wrong))
    act(() => result.current.skipFeedback(false))

    expect(result.current.status).toBe('retry')
    const retryQ = result.current.currentQuestion
    if (retryQ?.type !== 'word-meaning') throw new Error('oczekiwano word-meaning w retry')
    expect(retryQ.choices).toHaveLength(2)
    expect(retryQ.choices).toContain(q.targetWord)
    expect(retryQ.choices).toContain(wrong)
  })
})
