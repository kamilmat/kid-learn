import { beforeEach, describe, expect, it } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// We polyfill an in-memory Storage here so persist middleware can write.
// Top-level — runs before module import below so persist middleware sees it.
// Scoped to this test file only — does not touch shared setup.
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

const { COOLDOWN_MS } = await import('./mathGate')
const { STORAGE_KEY, UNLOCK_TTL_MS, useSettings } = await import(
  './settingsStore'
)
const { defaultSettings } = await import('./defaults')
const { initialMathGateState } = await import('./mathGate')

const reset = (): void => {
  localStorage.clear()
  useSettings.getState()._resetForTests()
}

describe('useSettings store', () => {
  beforeEach(() => {
    reset()
  })

  it('starts with default settings', () => {
    const { settings, mathGateState, parentGateUnlockedUntil } =
      useSettings.getState()
    expect(settings.questionsPerSession).toBe(8)
    expect(settings.timeLimit).toEqual({})
    expect(mathGateState).toEqual({ failedAttempts: 0, cooldownUntil: 0 })
    expect(parentGateUnlockedUntil).toBe(0)
  })

  describe('updateSetting', () => {
    it('updates a single setting and preserves others', () => {
      useSettings.getState().updateSetting('questionsPerSession', 5)
      expect(useSettings.getState().settings.questionsPerSession).toBe(5)
      expect(useSettings.getState().settings.timeLimit).toEqual({})
    })

    it('updates timeLimit and showCountdownBar independently', () => {
      useSettings.getState().updateSetting('timeLimit', { iskierka: 25 })
      useSettings.getState().updateSetting('showCountdownBar', { iskierka: true })
      const s = useSettings.getState().settings
      expect(s.timeLimit).toEqual({ iskierka: 25 })
      expect(s.showCountdownBar).toEqual({ iskierka: true })
    })
  })

  describe('parent gate flow', () => {
    const problem = { a: 7, b: 8, c: 5 } // answer = 10

    it('unlocks on correct answer and locks again on lockGate()', () => {
      const t0 = 1_000_000
      const result = useSettings
        .getState()
        .tryUnlockGate('10', problem, t0)
      expect(result).toEqual({ success: true })
      expect(useSettings.getState().isUnlocked(t0)).toBe(true)
      expect(useSettings.getState().isUnlocked(t0 + 1_000)).toBe(true)

      useSettings.getState().lockGate()
      expect(useSettings.getState().isUnlocked(t0)).toBe(false)
    })

    it('TTL of 5 minutes expires', () => {
      const t0 = 1_000_000
      useSettings.getState().tryUnlockGate('10', problem, t0)
      expect(useSettings.getState().isUnlocked(t0 + UNLOCK_TTL_MS - 1)).toBe(
        true,
      )
      expect(useSettings.getState().isUnlocked(t0 + UNLOCK_TTL_MS)).toBe(false)
      expect(useSettings.getState().isUnlocked(t0 + UNLOCK_TTL_MS + 1)).toBe(
        false,
      )
    })

    it('TTL is exactly 5 minutes', () => {
      expect(UNLOCK_TTL_MS).toBe(5 * 60 * 1000)
    })

    it('rejects wrong answer without unlocking', () => {
      const t0 = 0
      const result = useSettings
        .getState()
        .tryUnlockGate('11', problem, t0)
      expect(result).toEqual({ success: false, reason: 'wrong-answer' })
      expect(useSettings.getState().isUnlocked(t0)).toBe(false)
      expect(useSettings.getState().mathGateState.failedAttempts).toBe(1)
    })

    it('triggers cooldown after 3 wrong answers', () => {
      const t0 = 0
      useSettings.getState().tryUnlockGate('11', problem, t0)
      useSettings.getState().tryUnlockGate('12', problem, t0 + 1_000)
      const third = useSettings
        .getState()
        .tryUnlockGate('13', problem, t0 + 2_000)
      expect(third.success).toBe(false)
      if (!third.success) {
        expect(third.reason).toBe('cooldown')
        expect(third.cooldownMs).toBe(COOLDOWN_MS)
      }
    })

    it('rejects attempts during cooldown without consuming the answer', () => {
      const t0 = 0
      useSettings.getState().tryUnlockGate('11', problem, t0)
      useSettings.getState().tryUnlockGate('12', problem, t0 + 1_000)
      useSettings.getState().tryUnlockGate('13', problem, t0 + 2_000)
      // even a correct answer is rejected during cooldown
      const result = useSettings
        .getState()
        .tryUnlockGate('10', problem, t0 + 3_000)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toBe('cooldown')
      }
      expect(useSettings.getState().isUnlocked(t0 + 3_000)).toBe(false)
    })

    it('allows unlock after cooldown expires', () => {
      const t0 = 0
      useSettings.getState().tryUnlockGate('11', problem, t0)
      useSettings.getState().tryUnlockGate('12', problem, t0 + 1_000)
      useSettings.getState().tryUnlockGate('13', problem, t0 + 2_000)
      const tAfter = t0 + 2_000 + COOLDOWN_MS
      const result = useSettings
        .getState()
        .tryUnlockGate('10', problem, tAfter)
      expect(result).toEqual({ success: true })
      expect(useSettings.getState().isUnlocked(tAfter)).toBe(true)
    })
  })

  describe('persistence', () => {
    it('writes to localStorage under iskierki-state-v1', () => {
      useSettings.getState().updateSetting('questionsPerSession', 12)
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw as string)
      // Zustand persist wraps as { state, version }
      expect(parsed.state.settings.questionsPerSession).toBe(12)
    })

    it('persists mathGateState and parentGateUnlockedUntil', () => {
      const t0 = 1_000_000
      const problem = { a: 7, b: 8, c: 5 }
      useSettings.getState().tryUnlockGate('10', problem, t0)
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw as string)
      expect(parsed.state.parentGateUnlockedUntil).toBe(t0 + UNLOCK_TTL_MS)
      expect(parsed.state.mathGateState).toEqual({
        failedAttempts: 0,
        cooldownUntil: 0,
      })
    })
  })
})

describe('showCountdownBar migration (v2 → v3)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState()._resetForTests()
  })

  it('drops legacy boolean showCountdownBar from persisted state', () => {
    // Symulujemy stary persist (v2): showCountdownBar był boolean
    const legacyPersisted = {
      state: {
        settings: {
          ...defaultSettings,
          showCountdownBar: true as unknown as (typeof defaultSettings)['showCountdownBar'],
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 2,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPersisted))
    // Force rehydrate
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.showCountdownBar).toEqual({})
  })
})

describe('timeLimit migration (v3 → v4)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState()._resetForTests()
  })

  it('drops legacy primitive timeLimit (number) from persisted state', () => {
    const legacyPersisted = {
      state: {
        settings: {
          ...defaultSettings,
          timeLimit: 15 as unknown as (typeof defaultSettings)['timeLimit'],
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 3,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPersisted))
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.timeLimit).toEqual({})
  })

  it('drops legacy primitive timeLimit ("off") from persisted state', () => {
    const legacyPersisted = {
      state: {
        settings: {
          ...defaultSettings,
          timeLimit: 'off' as unknown as (typeof defaultSettings)['timeLimit'],
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 3,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyPersisted))
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.timeLimit).toEqual({})
  })

  it('preserves per-level timeLimit object when already migrated', () => {
    const persisted = {
      state: {
        settings: {
          ...defaultSettings,
          timeLimit: { iskierka: 25 as const, plomyk: 'off' as const },
        },
        mathGateState: initialMathGateState,
        parentGateUnlockedUntil: 0,
      },
      version: 4,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    useSettings.persist.rehydrate()
    const settings = useSettings.getState().settings
    expect(settings.timeLimit).toEqual({ iskierka: 25, plomyk: 'off' })
  })
})

describe('activeLettersOverride validation on rehydrate', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState()._resetForTests()
  })

  const persist = (
    activeLettersOverride: (typeof defaultSettings)['activeLettersOverride'],
  ) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          settings: { ...defaultSettings, activeLettersOverride },
          mathGateState: initialMathGateState,
          parentGateUnlockedUntil: 0,
        },
        version: 4,
      }),
    )
    useSettings.persist.rehydrate()
    return useSettings.getState().settings.activeLettersOverride
  }

  // I6: merge NIE kasuje override'u za rozmiar — wybór rodzica zostaje w
  // persistcie, a fallback na domyślną pulę robi dopiero `getActiveLetterPool`.
  it('keeps an override too small for the level tilesPerQuestion', () => {
    expect(persist({ iskierka: ['a'] })).toEqual({ iskierka: ['a'] })
  })

  it('filters letters outside the level pool but keeps a usable override', () => {
    expect(persist({ iskierka: ['a', 'm', 'l', 'e', 'o', 'ż'] })).toEqual({
      iskierka: ['a', 'm', 'l', 'e', 'o'],
    })
  })

  it('keeps a valid override untouched', () => {
    const valid = ['a', 'm', 'l', 'e', 'o', 't']
    expect(persist({ iskierka: valid })).toEqual({ iskierka: valid })
  })

  // Override złożony wyłącznie z liter spoza puli poziomu odfiltrowuje się do
  // pustej tablicy — persistowanie jej nadal jako override oszukiwałoby
  // edytor (pokazywałby pusty wybór zamiast puli domyślnej). Klucz musi
  // zniknąć, żeby `getActiveLetterPool`/edytor wzięły domyślną pulę poziomu.
  it('drops the key entirely when the override has only letters outside the level pool', () => {
    expect(persist({ iskierka: ['ż', 'ó', 'ś'] })).toEqual({})
  })
})

describe('letters.promptMode sanitization on rehydrate', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettings.getState()._resetForTests()
  })

  const persist = (letters: unknown) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          settings: { ...defaultSettings, letters },
          mathGateState: initialMathGateState,
          parentGateUnlockedUntil: 0,
        },
        version: 4,
      }),
    )
    useSettings.persist.rehydrate()
    return useSettings.getState().settings.letters
  }

  it('falls back to default `both` when promptMode is invalid', () => {
    expect(persist({ promptMode: 'invalid', promptModeByLevel: {} })).toEqual(
      { promptMode: 'both', promptModeByLevel: {} },
    )
  })

  it('falls back to default `both` when promptMode is missing entirely', () => {
    expect(persist({ promptModeByLevel: {} }).promptMode).toBe('both')
  })

  it('keeps a valid promptMode value', () => {
    expect(persist({ promptMode: 'phoneme', promptModeByLevel: {} }).promptMode).toBe(
      'phoneme',
    )
  })

  it('drops invalid per-level promptMode overrides but keeps valid ones', () => {
    expect(
      persist({
        promptMode: 'both',
        promptModeByLevel: { iskierka: 'name', plomyk: 'nonsense' },
      }).promptModeByLevel,
    ).toEqual({ iskierka: 'name' })
  })
})
