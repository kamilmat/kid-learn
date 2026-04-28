import { describe, expect, it, beforeEach } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// We polyfill an in-memory Storage here so persist middleware can write.
// Identyczny pattern jak w lettersStore.test.ts.
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

const { useReading } = await import('./readingStore')

describe('readingStore', () => {
  beforeEach(() => {
    useReading.getState().reset()
    localStorage.clear()
  })

  it('initial state has empty syllables and words', () => {
    const state = useReading.getState()
    expect(state.syllables).toEqual({})
    expect(state.words).toEqual({})
    expect(state.albumUnlocked).toEqual([])
    expect(state.wildCelebrationCounter).toBe(0)
  })

  it('lazy-init creates SyllableState on first access', () => {
    const state = useReading.getState()
    state.ensureSyllableInitialized('MA')
    expect(useReading.getState().syllables['syl-MA']).toBeDefined()
    expect(useReading.getState().syllables['syl-MA'].box).toBe(1)
  })

  it('lazy-init creates WordState on first access', () => {
    const state = useReading.getState()
    state.ensureWordInitialized('word-MAMA')
    expect(useReading.getState().words['word-MAMA']).toBeDefined()
  })

  it('addToAlbum unlocks word', () => {
    const state = useReading.getState()
    state.addToAlbum('word-MAMA')
    expect(useReading.getState().albumUnlocked).toContain('word-MAMA')
  })

  it('addToAlbum is idempotent', () => {
    const state = useReading.getState()
    state.addToAlbum('word-MAMA')
    state.addToAlbum('word-MAMA')
    expect(useReading.getState().albumUnlocked.filter(id => id === 'word-MAMA')).toHaveLength(1)
  })

  it('incrementWildCounter advances counter', () => {
    const state = useReading.getState()
    state.incrementWildCounter()
    state.incrementWildCounter()
    expect(useReading.getState().wildCelebrationCounter).toBe(2)
  })

  it('resetWildCounter sets to 0', () => {
    const state = useReading.getState()
    state.incrementWildCounter()
    state.resetWildCounter()
    expect(useReading.getState().wildCelebrationCounter).toBe(0)
  })
})
