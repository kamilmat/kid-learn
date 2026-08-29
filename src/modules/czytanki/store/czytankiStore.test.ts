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
  it('migracja v1 → v2 daje puste mapy i NIE gubi openedIds', () => {
    const v1 = { openedIds: ['cz-01', 'cz-02'], lastOpenedId: 'cz-02', seenIntros: ['czytanka-first'] }
    const merged = mergeCzytankiState(v1, useCzytanki.getState())
    expect(merged.openedIds).toEqual(['cz-01', 'cz-02'])
    expect(merged.lastOpenedId).toBe('cz-02')
    expect(merged.seenIntros).toEqual(['czytanka-first'])
    expect(merged.wordTaps).toEqual({})
    expect(merged.timeMs).toEqual({})
  })
  it('recordVisit kumuluje tapy i czas przy dwóch wizytach', () => {
    useCzytanki.getState().recordVisit('cz-01', { mama: 2, tata: 1 }, 30_000)
    useCzytanki.getState().recordVisit('cz-01', { mama: 3 }, 15_000)
    useCzytanki.getState().recordVisit('cz-02', { oko: 1 }, 5_000)
    expect(useCzytanki.getState().wordTaps['cz-01']).toEqual({ mama: 5, tata: 1 })
    expect(useCzytanki.getState().timeMs).toEqual({ 'cz-01': 45_000, 'cz-02': 5_000 })
  })
  it('resetAllProgress czyści tapy i czas', () => {
    useCzytanki.getState().recordVisit('cz-01', { mama: 2 }, 1_000)
    useCzytanki.getState().resetAllProgress()
    expect(useCzytanki.getState().wordTaps).toEqual({})
    expect(useCzytanki.getState().timeMs).toEqual({})
  })
})
