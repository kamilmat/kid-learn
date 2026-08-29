// lettersStore — Zustand store dla modułu Iskierki/Litery.
//
// Zakres (sekcje 11, 18, 6.5 spec):
//   - mapa LetterState (per litera) — postęp SRS, mastery, statystyki
//   - historia ostatnich sesji (max 50)
//   - seenIntros — onboardingi głosowe (tylko 1× per klucz)
//   - lastUsedLevel — ostatnio wybrany poziom (Iskierka / Płomyk / ...)
//
// Persistowane w `localStorage` pod kluczem `iskierki-letters-v1` —
// świadomie osobno od `iskierki-state-v1` (settings + math gate), żeby
// można było resetować postępy bez kasowania settings.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import {
  getActiveLetterPool,
  levelLetterPools,
} from '@/shared/settings/defaults'
import type { Level, Settings } from '@/shared/settings/types'
import type { LetterState } from '@/shared/srs/types'
import type { SessionLog } from '@/shared/stats/types'

export const LETTERS_STORAGE_KEY = 'iskierki-letters-v1'
export const MAX_SESSION_HISTORY = 50

/** Literka dnia zamrożona na dobę — `dayKey` w czasie lokalnym (`data/dailyLetter`). */
export type DailyLetter = {
  letter: string
  dayKey: string
}

export type LettersState = {
  letters: Record<string, LetterState>
  sessions: SessionLog[]
  seenIntros: string[]
  lastUsedLevel: Level | null
  dailyLetter: DailyLetter | null
  /** `dayKey` doby, w której mikrosesja „Literka dnia" została dokończona. */
  dailyDoneDayKey: string | null
}

export type LettersStore = LettersState & {
  /**
   * Bulk update po sesji — zaktualizowane state'y + dodanie SessionLog do
   * historii (zachowujemy ostatnie MAX_SESSION_HISTORY wpisów).
   */
  applySessionResults: (
    updatedStates: Record<string, LetterState>,
    sessionLog: SessionLog,
  ) => void
  markIntroSeen: (introKey: string) => void
  hasSeenIntro: (introKey: string) => boolean
  setLastUsedLevel: (level: Level) => void
  setDailyLetter: (daily: DailyLetter) => void
  markDailyDone: (dayKey: string) => void
  /** Czyści letters/sessions/seenIntros + literkę dnia. lastUsedLevel pozostaje. */
  resetAllProgress: () => void
}

type PersistedLettersShape = LettersState

const initialLettersState: LettersState = {
  letters: {},
  sessions: [],
  seenIntros: [],
  lastUsedLevel: null,
  dailyLetter: null,
  dailyDoneDayKey: null,
}

export const useLetters = create<LettersStore>()(
  persist(
    (set, get) => ({
      ...initialLettersState,

      applySessionResults: (updatedStates, sessionLog) => {
        set((state) => {
          const mergedLetters = { ...state.letters, ...updatedStates }
          const sessions = [...state.sessions, sessionLog]
          // Trim do ostatnich MAX_SESSION_HISTORY
          const trimmed =
            sessions.length > MAX_SESSION_HISTORY
              ? sessions.slice(sessions.length - MAX_SESSION_HISTORY)
              : sessions
          return {
            letters: mergedLetters,
            sessions: trimmed,
          }
        })
      },

      markIntroSeen: (introKey) => {
        set((state) => {
          if (state.seenIntros.includes(introKey)) return state
          return { seenIntros: [...state.seenIntros, introKey] }
        })
      },

      hasSeenIntro: (introKey) => {
        return get().seenIntros.includes(introKey)
      },

      setLastUsedLevel: (level) => {
        set({ lastUsedLevel: level })
      },

      setDailyLetter: (daily) => {
        set({ dailyLetter: daily })
      },

      markDailyDone: (dayKey) => {
        set({ dailyDoneDayKey: dayKey })
      },

      resetAllProgress: () => {
        set((state) => ({
          letters: {},
          sessions: [],
          seenIntros: [],
          dailyLetter: null,
          dailyDoneDayKey: null,
          // lastUsedLevel zostaje (UX: nie kasujemy ostatnio wybranego poziomu)
          lastUsedLevel: state.lastUsedLevel,
        }))
      },
    }),
    {
      name: LETTERS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedLettersShape => ({
        letters: state.letters,
        sessions: state.sessions,
        seenIntros: state.seenIntros,
        lastUsedLevel: state.lastUsedLevel,
        dailyLetter: state.dailyLetter,
        dailyDoneDayKey: state.dailyDoneDayKey,
      }),
      version: 2,
      // Bez `migrate` bump wersji wyrzuciłby cały postęp — `merge` sanityzuje shape.
      migrate: (persisted) => persisted as PersistedLettersShape,
      // Defensywne sklejanie: jeśli zapisany stan nie ma jakiegoś pola
      // (np. po dodaniu nowego do `LetterState` lub `LettersState`), użyj
      // świeżych defaultów zamiast `undefined`.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedLettersShape>
        const merged = {
          ...current,
          letters: { ...(p.letters ?? {}) },
          sessions: Array.isArray(p.sessions) ? p.sessions : [],
          seenIntros: Array.isArray(p.seenIntros) ? p.seenIntros : [],
          lastUsedLevel: p.lastUsedLevel ?? null,
          dailyLetter: p.dailyLetter ?? null,
          dailyDoneDayKey: p.dailyDoneDayKey ?? null,
        }
        // Migration: assign id to LetterState entries that pre-date the id field.
        if (merged.letters) {
          for (const [letter, state] of Object.entries(merged.letters)) {
            if (state && !(state as { id?: string }).id) {
              (state as { id: string }).id = `letter-${letter.toUpperCase()}`
            }
          }
        }
        return merged
      },
    },
  ),
)

// ---------- Selektory (czyste funkcje) ----------

/**
 * Zwraca litery z `box === 5` (opanowane) — ściana osiągnięć (sekcja 6.5).
 * Wynik posortowany alfabetycznie dla stabilności renderu.
 */
export function selectMasteredLetters(
  state: Pick<LettersState, 'letters'>,
): string[] {
  const out: string[] = []
  for (const [letter, st] of Object.entries(state.letters)) {
    if (st.box === 5) out.push(letter)
  }
  return out.sort()
}

/**
 * Mapa `LetterState` z lazy init dla aktywnej puli — gwarantuje, że każda
 * aktywna litera ma poprawny initial state (nawet jeśli dziecko nigdy jej
 * jeszcze nie widziało). Używane przez SessionView jako `initialStates`.
 */
export function selectLetterStateMap(
  state: Pick<LettersState, 'letters'>,
  level: Level,
  settings: Settings,
): Record<string, LetterState> {
  const pool = getActiveLetterPool(settings, level)
  const out: Record<string, LetterState> = {}
  for (const letter of pool) {
    out[letter] = state.letters[letter] ?? createInitialLetterState(letter)
  }
  return out
}

// Re-eksport puli pełnej (32 litery) dla mastery wall — wygodny shortcut.
export { levelLetterPools }
