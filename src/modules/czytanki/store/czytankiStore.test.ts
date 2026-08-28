import { describe, it, expect, beforeEach } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// w tym vitest setupie, ale jest efektywnie zepsuty (brak `clear`/`setItem`).
// Polyfillujemy in-memory Storage żeby persist middleware mógł zapisywać.
// Identyczny pattern jak w numbersStore.test.ts / readingStore.test.ts / lettersStore.test.ts.
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

const { useCzytanki, mergeCzytankiState } = await import('./czytankiStore')

describe('czytankiStore', () => {
  beforeEach(() => useCzytanki.getState().resetAllProgress())
  it('markOpened jest idempotentne i ustawia lastOpenedId', () => {
    useCzytanki.getState().markOpened('cz-03')
    useCzytanki.getState().markOpened('cz-03')
    expect(useCzytanki.getState().openedIds).toEqual(['cz-03'])
    expect(useCzytanki.getState().lastOpenedId).toBe('cz-03')
  })
  it('intro seen', () => {
    expect(useCzytanki.getState().hasSeenIntro('x')).toBe(false)
    useCzytanki.getState().markIntroSeen('x')
    expect(useCzytanki.getState().hasSeenIntro('x')).toBe(true)
  })
  it('mergeCzytankiState wraca do defaultów gdy brak persisted state', () => {
    const merged = mergeCzytankiState({}, useCzytanki.getState())
    expect(merged.openedIds).toEqual([])
    expect(merged.lastOpenedId).toBeNull()
    expect(merged.seenIntros).toEqual([])
  })
  it('mergeCzytankiState wraca do defaultów gdy persisted state ma zły typ', () => {
    const merged = mergeCzytankiState({ openedIds: 'bad', lastOpenedId: 5 }, useCzytanki.getState())
    expect(merged.openedIds).toEqual([])
    expect(merged.lastOpenedId).toBeNull()
    expect(merged.seenIntros).toEqual([])
  })
})
