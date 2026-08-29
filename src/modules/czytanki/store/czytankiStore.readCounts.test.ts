import { describe, it, expect, beforeEach } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// w tym vitest setupie, ale jest efektywnie zepsuty (brak `clear`/`setItem`).
// Polyfillujemy in-memory Storage żeby persist middleware mógł zapisywać.
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

const { useCzytanki, mergeCzytankiState, migrateCzytankiV3 } = await import('./czytankiStore')

const T0 = 1_700_000_000_000

describe('czytankiStore — licznik przeczytań', () => {
  beforeEach(() => useCzytanki.getState().resetAllProgress())

  it('pierwsze wejście liczy się jako jedno czytanie', () => {
    useCzytanki.getState().markOpened('cz-01', T0)
    expect(useCzytanki.getState().readCounts['cz-01']).toBe(1)
  })

  it('powrót w ciągu 60 s nie inkrementuje, po 60 s inkrementuje', () => {
    useCzytanki.getState().markOpened('cz-01', T0)
    useCzytanki.getState().markOpened('cz-01', T0 + 30_000)
    expect(useCzytanki.getState().readCounts['cz-01']).toBe(1)
    useCzytanki.getState().markOpened('cz-01', T0 + 90_000)
    expect(useCzytanki.getState().readCounts['cz-01']).toBe(2)
  })

  it('guard jest per czytanka — inne id liczy się od razu', () => {
    useCzytanki.getState().markOpened('cz-01', T0)
    useCzytanki.getState().markOpened('cz-02', T0 + 1_000)
    expect(useCzytanki.getState().readCounts).toEqual({ 'cz-01': 1, 'cz-02': 1 })
  })

  it('migrateCzytankiV3 zachowuje openedIds i dokłada puste mapy', () => {
    const migrated = migrateCzytankiV3({ openedIds: ['cz-02'], wordTaps: {}, timeMs: {} })
    expect(migrated.openedIds).toEqual(['cz-02'])
    expect(migrated.readCounts).toEqual({})
    expect(migrated.lastCountedAt).toEqual({})
  })

  it('mergeCzytankiState defaultuje readCounts i lastCountedAt', () => {
    const merged = mergeCzytankiState({ openedIds: ['cz-03'] }, useCzytanki.getState())
    expect(merged.openedIds).toEqual(['cz-03'])
    expect(merged.readCounts).toEqual({})
    expect(merged.lastCountedAt).toEqual({})
  })

  it('resetAllProgress czyści licznik przeczytań', () => {
    useCzytanki.getState().markOpened('cz-01', T0)
    useCzytanki.getState().resetAllProgress()
    expect(useCzytanki.getState().readCounts).toEqual({})
    expect(useCzytanki.getState().lastCountedAt).toEqual({})
  })
})
