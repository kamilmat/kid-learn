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
      version: 1,
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
