import { beforeEach, describe, expect, it } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// We polyfill an in-memory Storage here so persist middleware can write.
// Identyczny pattern jak w lettersStore.test.ts / ReportScreen.test.tsx.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.clear !== 'function'
) {
  const memStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: memStorage,
    configurable: true,
    writable: true,
  })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: memStorage,
      configurable: true,
      writable: true,
    })
  }
}

const { useLetters } = await import('@/modules/letters/store/lettersStore')
const { useReading } = await import('@/modules/reading/store/readingStore')
const { useNumbers } = await import('@/modules/numbers/store/numbersStore')
const { hasEnoughForToday } = await import('./enoughForToday')

const NOW = new Date(2026, 7, 29, 10, 0, 0).getTime()

function lettersSessionWithQuestions(questions: number) {
  return {
    id: `letters-${questions}`,
    startedAt: NOW,
    endedAt: NOW + 60_000,
    level: 'iskierka' as const,
    events: Array.from({ length: questions }, (_, i) => ({
      type: 'answer' as const,
      ts: NOW + i * 1000,
      outcome: 'correct' as const,
      responseMs: 1000,
    })),
  }
}

function readingSessionWithQuestions(questions: number) {
  return {
    startedAt: NOW,
    endedAt: NOW + 60_000,
    level: 'plomyk' as const,
    events: Array.from({ length: questions }, (_, i) => ({
      questionIndex: i,
      exerciseType: 'word-assembly' as const,
      targetId: 'word-SOWA',
      outcome: 'correct' as const,
      responseMs: 1000,
      timestamp: NOW + i * 1000,
    })),
  }
}

const reset = (): void => {
  localStorage.clear()
  useLetters.setState({
    letters: {},
    sessions: [],
    seenIntros: [],
    lastUsedLevel: null,
  })
  useReading.setState({
    syllables: {},
    words: {},
    sessions: [],
    seenIntros: [],
    lastUsedLevel: null,
  })
  useNumbers.setState({
    facts: {},
    concepts: {},
    sessions: [],
    seenIntros: [],
    lastUsedLevel: null,
    wildCelebrationCounter: 0,
  })
}

describe('hasEnoughForToday', () => {
  beforeEach(() => {
    reset()
  })

  it('false gdy tylko 1 ukończona sesja dziś', () => {
    useLetters.setState({ sessions: [lettersSessionWithQuestions(3)] })
    expect(hasEnoughForToday(NOW)).toBe(false)
  })

  it('true gdy 2 ukończone sesje dziś (różne moduły)', () => {
    useLetters.setState({ sessions: [lettersSessionWithQuestions(3)] })
    useReading.setState({ sessions: [readingSessionWithQuestions(3)] })
    expect(hasEnoughForToday(NOW)).toBe(true)
  })
})
