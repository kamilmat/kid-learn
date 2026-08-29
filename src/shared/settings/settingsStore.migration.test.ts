// Migracja persistu settings v4 → v5.
//
// v5 wymienia „Długość sesji" modułu 1 (`sessionLength`: 5|10|15) na globalne
// `questionsPerSession` (5|8|12) i degraduje `numbers.questionCount` do
// overridu. Test pilnuje, że przy bumpie wersji NIE gubimy reszty ustawień —
// bez `migrate` zustand odrzuciłby cały blob i skasował wybory rodzica.

import { beforeEach, describe, expect, it } from 'vitest'

// Node 25 wystawia własne, kalekie `localStorage` (bez `clear`/`setItem`),
// które przesłania jsdom-owe. Ten sam polyfill co w `settingsStore.test.ts`.
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

const { STORAGE_KEY, useSettings } = await import('./settingsStore')
const { defaultSettings } = await import('./defaults')

type LegacySettings = Record<string, unknown>

function seedV4(settings: LegacySettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 4,
      state: {
        settings,
        mathGateState: { failedAttempts: 0, cooldownUntil: 0 },
        parentGateUnlockedUntil: 0,
      },
    }),
  )
}

describe('settingsStore migration v4 → v5', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState()._resetForTests()
  })

  it('mapuje sessionLength=10 na questionsPerSession=8 i zachowuje resztę', async () => {
    seedV4({
      sessionLength: 10,
      celebrationTempo: 'long',
      humorMode: 'off',
    })

    await useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings

    expect(settings.questionsPerSession).toBe(8)
    expect(settings.celebrationTempo).toBe('long')
    expect(settings.humorMode).toBe('off')
    expect('sessionLength' in settings).toBe(false)
  })

  it('mapuje krańce: 5 → 5, 15 → 12', async () => {
    seedV4({ sessionLength: 5 })
    await useSettings.persist.rehydrate()
    expect(useSettings.getState().settings.questionsPerSession).toBe(5)

    seedV4({ sessionLength: 15 })
    await useSettings.persist.rehydrate()
    expect(useSettings.getState().settings.questionsPerSession).toBe(12)
  })

  it('zachowuje defaulty pól dodanych po v4 (secondAttempt, letters, czytanki)', async () => {
    seedV4({ sessionLength: 10 })

    await useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings

    expect(settings.secondAttempt).toBe(defaultSettings.secondAttempt)
    expect(settings.letters).toEqual(defaultSettings.letters)
    expect(settings.czytanki).toEqual(defaultSettings.czytanki)
  })

  it('kasuje numbers.questionCount równy staremu defaultowi, zostawia świadomy wybór', async () => {
    seedV4({ sessionLength: 10, numbers: { questionCount: 8, conceptIntros: false } })
    await useSettings.persist.rehydrate()
    let numbers = useSettings.getState().settings.numbers
    expect(numbers.questionCount).toBeUndefined()
    // Reszta pola `numbers` przeżywa migrację.
    expect(numbers.conceptIntros).toBe(false)

    seedV4({ sessionLength: 10, numbers: { questionCount: 10 } })
    await useSettings.persist.rehydrate()
    numbers = useSettings.getState().settings.numbers
    expect(numbers.questionCount).toBe(10)
  })

  it('nie nadpisuje jawnego questionsPerSession przy ponownym rehydrate (v5)', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 5,
        state: {
          settings: { questionsPerSession: 12 },
          mathGateState: { failedAttempts: 0, cooldownUntil: 0 },
          parentGateUnlockedUntil: 0,
        },
      }),
    )

    await useSettings.persist.rehydrate()
    expect(useSettings.getState().settings.questionsPerSession).toBe(12)
  })
})
