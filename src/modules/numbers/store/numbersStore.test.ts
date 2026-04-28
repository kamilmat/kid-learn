import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// Polyfill an in-memory Storage here so persist middleware can write.
// Identyczny pattern jak w readingStore.test.ts / lettersStore.test.ts.
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

const { useNumbers } = await import('./numbersStore')

describe('numbersStore', () => {
  beforeEach(() => {
    useNumbers.getState().reset()
    localStorage.clear()
  })

  afterEach(() => {
    useNumbers.getState().reset()
  })

  it('initializes with empty facts and concepts', () => {
    const s = useNumbers.getState()
    expect(s.facts).toEqual({})
    expect(s.concepts).toEqual({})
    expect(s.seenIntros).toEqual([])
  })

  it('ensureFactInitialized creates a new fact with box=1', () => {
    useNumbers.getState().ensureFactInitialized('add-5-2', 'plomyk-addsub-10')
    const fact = useNumbers.getState().facts['add-5-2']
    expect(fact).toEqual({
      id: 'add-5-2',
      conceptId: 'plomyk-addsub-10',
      box: 1,
      lastSeen: 0,
      recentWrong: 0,
    })
  })

  it('does not overwrite existing fact', () => {
    useNumbers.getState().ensureFactInitialized('add-5-2', 'plomyk-addsub-10')
    useNumbers.setState({
      facts: {
        'add-5-2': {
          id: 'add-5-2',
          conceptId: 'plomyk-addsub-10',
          box: 4,
          lastSeen: 12345,
          recentWrong: 1,
        },
      },
    })
    useNumbers.getState().ensureFactInitialized('add-5-2', 'plomyk-addsub-10')
    expect(useNumbers.getState().facts['add-5-2']?.box).toBe(4)
  })

  it('markIntroSeen + hasSeenIntro work', () => {
    expect(useNumbers.getState().hasSeenIntro('intro-iskierka-counting')).toBe(false)
    useNumbers.getState().markIntroSeen('intro-iskierka-counting')
    expect(useNumbers.getState().hasSeenIntro('intro-iskierka-counting')).toBe(true)
  })

  it('markIntroSeen is idempotent', () => {
    useNumbers.getState().markIntroSeen('x')
    useNumbers.getState().markIntroSeen('x')
    expect(useNumbers.getState().seenIntros).toEqual(['x'])
  })

  it('applySessionResults merges facts, concepts, and appends session log', () => {
    useNumbers.getState().applySessionResults(
      {
        'add-1-1': { id: 'add-1-1', conceptId: 'plomyk-addsub-10', box: 2, lastSeen: 100, recentWrong: 0 },
      },
      {
        'plomyk-addsub-10': { state: 'learning', firstSeenAt: 50, lastSeenAt: 100, correctStreak: 1, factsTouched: ['add-1-1'] },
      },
      { startedAt: 50, endedAt: 100, level: 'plomyk', events: [] },
    )
    const s = useNumbers.getState()
    expect(s.facts['add-1-1']?.box).toBe(2)
    expect(s.concepts['plomyk-addsub-10']?.state).toBe('learning')
    expect(s.sessions).toHaveLength(1)
  })
})
