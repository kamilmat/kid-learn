import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConceptId,
  ConceptMastery,
  MathFactId,
  MathFactState,
  NumbersSessionLog,
} from '../types'
import type { Level } from '@/shared/settings/types'

export type NumbersState = {
  facts: Record<MathFactId, MathFactState>
  concepts: Partial<Record<ConceptId, ConceptMastery>>
  sessions: NumbersSessionLog[]
  seenIntros: string[]
  lastUsedLevel: Level | null
  wildCelebrationCounter: number

  ensureFactInitialized: (factId: MathFactId, conceptId: ConceptId) => void
  /** Bulk init — jeden `set()` na całą pulę poziomu (zamiast N zapisów persist). */
  ensureFactsInitialized: (
    facts: ReadonlyArray<{ id: MathFactId; conceptId: ConceptId }>,
  ) => void
  applySessionResults: (
    updatedFacts: Record<MathFactId, MathFactState>,
    updatedConcepts: Partial<Record<ConceptId, ConceptMastery>>,
    log: NumbersSessionLog,
  ) => void
  markIntroSeen: (key: string) => void
  hasSeenIntro: (key: string) => boolean
  setLastUsedLevel: (level: Level) => void
  incrementWildCounter: () => void
  resetWildCounter: () => void
  resetAllProgress: () => void
  reset: () => void
}

// Tyle sesji trzymamy w localStorage (jak MAX_SESSION_HISTORY w lettersStore).
const MAX_SESSION_HISTORY = 50

/**
 * v1 → v2: fakty liczenia miały wspólny prefiks `count-N`, dziś rozbite na
 * dwa koncepty (`count5-N` dla 1..5, `count10-N` dla 6..10). Bez mapowania
 * cały postęp w liczeniu zaczynał się od zera, a osierocone id nigdy już nie
 * trafiały do puli pytań (`levelFacts` ich nie zna).
 *
 * Zwraca `null` dla id, którego nie umiemy przypisać — takie wpisy wypadają.
 */
export function migrateLegacyFactId(id: string): MathFactId | null {
  const match = /^count-(\d+)$/.exec(id)
  if (!match) return id
  const n = Number(match[1])
  if (!Number.isInteger(n) || n < 1 || n > 10) return null
  return n <= 5 ? `count5-${n}` : `count10-${n}`
}

/** Koncept, do którego należy zmigrowany fakt liczenia. */
function conceptForMigratedFact(id: MathFactId): ConceptId | null {
  if (id.startsWith('count5-')) return 'iskierka-counting-5'
  if (id.startsWith('count10-')) return 'iskierka-counting-10'
  return null
}

type PersistedNumbers = Partial<NumbersState>

/**
 * Przepisuje id faktów w persistcie na aktualny schemat. Działa też na logach
 * sesji — inaczej raport rodzica pokazywałby `count-3` obok `count5-3` jako
 * dwa różne fakty.
 */
export function migrateNumbersPersist(persisted: unknown): PersistedNumbers {
  const p = (persisted ?? {}) as PersistedNumbers
  const facts = p.facts
  const migratedFacts: Record<MathFactId, MathFactState> = {}
  if (facts && typeof facts === 'object' && !Array.isArray(facts)) {
    const entries = Object.entries(facts)
    // Kolizja (persist ma i `count-3`, i `count5-3`) — wygrywa wpis już
    // zapisany pod docelowym id, bo pochodzi z nowszej sesji. `Object.entries`
    // NIE gwarantuje, że nowy format występuje przed starym, więc zamiast
    // polegać na kolejności iteracji, przetwarzamy najpierw wpisy już w
    // docelowym formacie (id === oldId, nie pasuje do `count-N`), a dopiero
    // potem legacy — legacy wypada, jeśli target jest już zajęty.
    const isLegacy = (id: string) => /^count-(\d+)$/.test(id)
    const nonLegacy = entries.filter(([oldId]) => !isLegacy(oldId))
    const legacy = entries.filter(([oldId]) => isLegacy(oldId))
    for (const [oldId, state] of [...nonLegacy, ...legacy]) {
      const newId = migrateLegacyFactId(oldId)
      if (!newId || !state) continue
      if (migratedFacts[newId]) continue
      migratedFacts[newId] = {
        ...state,
        id: newId,
        conceptId: conceptForMigratedFact(newId) ?? state.conceptId,
      }
    }
  }
  if (!Array.isArray(p.sessions)) return { ...p, facts: migratedFacts }
  const sessions: NumbersSessionLog[] = p.sessions.map((log) => ({
    ...log,
    events: Array.isArray(log?.events)
      ? log.events.flatMap((ev) => {
          const newId = migrateLegacyFactId(ev.factId)
          if (!newId) return []
          return [
            {
              ...ev,
              factId: newId,
              conceptId: conceptForMigratedFact(newId) ?? ev.conceptId,
            },
          ]
        })
      : [],
  }))
  return { ...p, facts: migratedFacts, sessions }
}

const initialState = {
  facts: {} as Record<MathFactId, MathFactState>,
  concepts: {} as Partial<Record<ConceptId, ConceptMastery>>,
  sessions: [] as NumbersSessionLog[],
  seenIntros: [] as string[],
  lastUsedLevel: null as Level | null,
  wildCelebrationCounter: 0,
}

export const useNumbers = create<NumbersState>()(
  persist(
    (set, get) => ({
      ...initialState,

      ensureFactInitialized: (factId, conceptId) => {
        if (get().facts[factId]) return
        set((s) => ({
          facts: {
            ...s.facts,
            [factId]: {
              id: factId,
              conceptId,
              box: 1,
              lastSeen: 0,
              recentWrong: 0,
            },
          },
        }))
      },

      ensureFactsInitialized: (facts) => {
        const existing = get().facts
        const missing = facts.filter((f) => !existing[f.id])
        if (missing.length === 0) return
        const added: Record<MathFactId, MathFactState> = {}
        for (const f of missing) {
          added[f.id] = {
            id: f.id,
            conceptId: f.conceptId,
            box: 1,
            lastSeen: 0,
            recentWrong: 0,
          }
        }
        set((s) => ({ facts: { ...s.facts, ...added } }))
      },

      applySessionResults: (updatedFacts, updatedConcepts, log) => {
        set((s) => {
          const sessions = [...s.sessions, log]
          return {
            facts: { ...s.facts, ...updatedFacts },
            concepts: { ...s.concepts, ...updatedConcepts },
            sessions:
              sessions.length > MAX_SESSION_HISTORY
                ? sessions.slice(sessions.length - MAX_SESSION_HISTORY)
                : sessions,
          }
        })
      },

      markIntroSeen: (key) => {
        set((s) =>
          s.seenIntros.includes(key) ? s : { seenIntros: [...s.seenIntros, key] },
        )
      },

      hasSeenIntro: (key) => get().seenIntros.includes(key),

      setLastUsedLevel: (level) => set({ lastUsedLevel: level }),

      incrementWildCounter: () =>
        set((s) => ({ wildCelebrationCounter: s.wildCelebrationCounter + 1 })),

      resetWildCounter: () => set({ wildCelebrationCounter: 0 }),

      resetAllProgress: () => set(initialState),

      reset: () => set(initialState),
    }),
    {
      name: 'iskierki-numbers-v1',
      version: 2,
      // Bez `migrate` bump wersji wyrzuciłby cały postęp — `merge` sanityzuje shape.
      migrate: (persisted, version) =>
        (version < 2
          ? migrateNumbersPersist(persisted)
          : persisted) as NumbersState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<NumbersState>
        return {
          ...current,
          facts:
            p.facts && typeof p.facts === 'object' && !Array.isArray(p.facts)
              ? p.facts
              : {},
          concepts:
            p.concepts && typeof p.concepts === 'object' && !Array.isArray(p.concepts)
              ? p.concepts
              : {},
          sessions: Array.isArray(p.sessions)
            ? p.sessions.slice(-MAX_SESSION_HISTORY)
            : [],
          seenIntros: Array.isArray(p.seenIntros) ? p.seenIntros : [],
          lastUsedLevel: p.lastUsedLevel ?? null,
          wildCelebrationCounter:
            typeof p.wildCelebrationCounter === 'number'
              ? p.wildCelebrationCounter
              : 0,
        } as NumbersState
      },
    },
  ),
)
