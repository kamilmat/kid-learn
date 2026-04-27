import { beforeEach, describe, expect, it } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// We polyfill an in-memory Storage here so persist middleware can write.
// Identyczny pattern jak w settingsStore.test.ts.
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

const { createInitialLetterState } = await import(
  '@/shared/srs/createInitialLetterState'
)
const { defaultSettings } = await import('@/shared/settings/defaults')
const {
  LETTERS_STORAGE_KEY,
  MAX_SESSION_HISTORY,
  selectActiveLetters,
  selectLetterStateMap,
  selectMasteredLetters,
  useLetters,
} = await import('./lettersStore')

import type { LetterState } from '@/shared/srs/types'
import type { SessionLog } from '@/shared/stats/types'

const reset = (): void => {
  localStorage.clear()
  // Bezpośredni reset state'u w store (poza UI flowem)
  useLetters.setState({
    letters: {},
    sessions: [],
    seenIntros: [],
    lastUsedLevel: null,
  })
}

function makeLetterState(
  letter: string,
  overrides: Partial<LetterState> = {},
): LetterState {
  return { ...createInitialLetterState(letter), ...overrides }
}

function makeSessionLog(id: string, startedAt = 1_000): SessionLog {
  return {
    id,
    startedAt,
    endedAt: startedAt + 60_000,
    level: 'iskierka',
    events: [],
  }
}

describe('useLetters store', () => {
  beforeEach(() => {
    reset()
  })

  it('starts with empty letters/sessions/seenIntros and null lastUsedLevel', () => {
    const s = useLetters.getState()
    expect(s.letters).toEqual({})
    expect(s.sessions).toEqual([])
    expect(s.seenIntros).toEqual([])
    expect(s.lastUsedLevel).toBeNull()
  })

  describe('getLetterState', () => {
    it('returns initial state for unknown letter (lazy init)', () => {
      const st = useLetters.getState().getLetterState('b')
      expect(st.letter).toBe('b')
      expect(st.box).toBe(1)
      expect(st.totalSeen).toBe(0)
    })

    it('returns stored state for known letter', () => {
      const stored = makeLetterState('a', { box: 4, totalSeen: 12 })
      useLetters.getState().applyOutcome('a', stored)
      const fetched = useLetters.getState().getLetterState('a')
      expect(fetched).toEqual(stored)
    })
  })

  describe('applyOutcome', () => {
    it('writes a single letter state', () => {
      const updated = makeLetterState('m', { box: 3 })
      useLetters.getState().applyOutcome('m', updated)
      expect(useLetters.getState().letters['m']).toEqual(updated)
    })
  })

  describe('applySessionResults', () => {
    it('merges updated states and appends session to history', () => {
      const updated = {
        a: makeLetterState('a', { box: 2 }),
        m: makeLetterState('m', { box: 5, masteredAt: 1234 }),
      }
      const log = makeSessionLog('s1')
      useLetters.getState().applySessionResults(updated, log)

      const s = useLetters.getState()
      expect(s.letters['a']?.box).toBe(2)
      expect(s.letters['m']?.box).toBe(5)
      expect(s.sessions).toHaveLength(1)
      expect(s.sessions[0]?.id).toBe('s1')
    })

    it('preserves earlier letters not present in update', () => {
      useLetters.getState().applyOutcome('o', makeLetterState('o', { box: 4 }))
      useLetters
        .getState()
        .applySessionResults(
          { a: makeLetterState('a', { box: 2 }) },
          makeSessionLog('s1'),
        )
      const s = useLetters.getState()
      expect(s.letters['o']?.box).toBe(4)
      expect(s.letters['a']?.box).toBe(2)
    })

    it(`trims session history to last ${MAX_SESSION_HISTORY}`, () => {
      // Wstawiamy 55 sesji — powinno zostać 50, ostatnie 50
      for (let i = 0; i < 55; i++) {
        useLetters
          .getState()
          .applySessionResults({}, makeSessionLog(`s${i}`, i))
      }
      const sessions = useLetters.getState().sessions
      expect(sessions).toHaveLength(MAX_SESSION_HISTORY)
      // Trzymamy najnowsze — powinny to być id "s5".."s54"
      expect(sessions[0]?.id).toBe('s5')
      expect(sessions[sessions.length - 1]?.id).toBe('s54')
    })
  })

  describe('seenIntros', () => {
    it('marks intro and detects', () => {
      expect(useLetters.getState().hasSeenIntro('letters-intro')).toBe(false)
      useLetters.getState().markIntroSeen('letters-intro')
      expect(useLetters.getState().hasSeenIntro('letters-intro')).toBe(true)
    })

    it('does not duplicate keys', () => {
      useLetters.getState().markIntroSeen('quiz-intro')
      useLetters.getState().markIntroSeen('quiz-intro')
      expect(useLetters.getState().seenIntros).toEqual(['quiz-intro'])
    })
  })

  describe('lastUsedLevel', () => {
    it('sets and reads', () => {
      useLetters.getState().setLastUsedLevel('plomyk')
      expect(useLetters.getState().lastUsedLevel).toBe('plomyk')
    })
  })

  describe('resetAllProgress', () => {
    it('clears letters/sessions/seenIntros but keeps lastUsedLevel', () => {
      useLetters.getState().applyOutcome('a', makeLetterState('a', { box: 5 }))
      useLetters
        .getState()
        .applySessionResults({}, makeSessionLog('s1'))
      useLetters.getState().markIntroSeen('letters-intro')
      useLetters.getState().setLastUsedLevel('ognik')

      useLetters.getState().resetAllProgress()

      const s = useLetters.getState()
      expect(s.letters).toEqual({})
      expect(s.sessions).toEqual([])
      expect(s.seenIntros).toEqual([])
      expect(s.lastUsedLevel).toBe('ognik') // zachowany
    })
  })

  describe('persistence', () => {
    it('writes to localStorage under iskierki-letters-v1', () => {
      useLetters.getState().setLastUsedLevel('plomyk')
      const raw = localStorage.getItem(LETTERS_STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw as string)
      expect(parsed.state.lastUsedLevel).toBe('plomyk')
    })

    it('persists letters and sessions', () => {
      useLetters.getState().applyOutcome('a', makeLetterState('a', { box: 3 }))
      useLetters
        .getState()
        .applySessionResults({}, makeSessionLog('s1'))
      const raw = localStorage.getItem(LETTERS_STORAGE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw as string)
      expect(parsed.state.letters.a.box).toBe(3)
      expect(parsed.state.sessions).toHaveLength(1)
    })
  })

  describe('selectors', () => {
    it('selectMasteredLetters returns only box=5 letters, sorted', () => {
      useLetters.getState().applyOutcome('a', makeLetterState('a', { box: 2 }))
      useLetters.getState().applyOutcome('m', makeLetterState('m', { box: 5 }))
      useLetters.getState().applyOutcome('b', makeLetterState('b', { box: 5 }))
      const mastered = selectMasteredLetters(useLetters.getState())
      expect(mastered).toEqual(['b', 'm'])
    })

    it('selectActiveLetters returns level pool from settings', () => {
      const active = selectActiveLetters(
        useLetters.getState(),
        'iskierka',
        defaultSettings,
      )
      expect(active.sort()).toEqual(['a', 'e', 'l', 'm', 'o', 't'])
    })

    it('selectLetterStateMap lazy-inits missing letters', () => {
      // Tylko "a" istnieje
      useLetters
        .getState()
        .applyOutcome('a', makeLetterState('a', { box: 4 }))
      const map = selectLetterStateMap(
        useLetters.getState(),
        'iskierka',
        defaultSettings,
      )
      // Wszystkie 6 liter Iskierki obecne
      expect(Object.keys(map).sort()).toEqual([
        'a',
        'e',
        'l',
        'm',
        'o',
        't',
      ])
      expect(map['a']?.box).toBe(4) // zachowany
      expect(map['e']?.box).toBe(1) // initial
      expect(map['e']?.totalSeen).toBe(0)
    })
  })
})
