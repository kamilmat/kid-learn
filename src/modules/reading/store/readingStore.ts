import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyllableState, WordState, ReadingSessionEvent } from '../types'
import type { Level } from '@/shared/settings/types'
import { getSyllableAudioKey } from '../data/syllables'
import { getWordById } from '../data/words'

type SessionLog = {
  startedAt: number
  endedAt: number
  level: Level
  events: ReadingSessionEvent[]
}

export type ReadingState = {
  syllables: Record<string, SyllableState>
  words: Record<string, WordState>
  sessions: SessionLog[]
  albumUnlocked: string[]
  seenIntros: string[]
  lastUsedLevel: Level | null
  wildCelebrationCounter: number
  seenSceneVariants: Record<string, string[]>
  pendingCeremonyMilestone: number | null

  ensureSyllableInitialized: (syllable: string) => void
  ensureWordInitialized: (wordId: string) => void
  applySessionResults: (
    updatedSyllables: Record<string, SyllableState>,
    updatedWords: Record<string, WordState>,
    log: SessionLog,
  ) => void
  addToAlbum: (wordId: string) => void
  markIntroSeen: (key: string) => void
  hasSeenIntro: (key: string) => boolean
  setLastUsedLevel: (level: Level) => void
  incrementWildCounter: () => void
  resetWildCounter: () => void
  markSceneSeen: (wordText: string, sceneId: string) => void
  setPendingCeremony: (milestone: number) => void
  clearPendingCeremony: () => void
  resetAllProgress: () => void
  reset: () => void
}

const initialState = {
  syllables: {},
  words: {},
  sessions: [],
  albumUnlocked: [],
  seenIntros: [],
  lastUsedLevel: null,
  wildCelebrationCounter: 0,
  seenSceneVariants: {} as Record<string, string[]>,
  pendingCeremonyMilestone: null as number | null,
}

export const useReading = create<ReadingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      ensureSyllableInitialized: (syllable) => {
        const id = getSyllableAudioKey(syllable)
        if (!get().syllables[id]) {
          set((s) => ({
            syllables: {
              ...s.syllables,
              [id]: {
                id,
                syllable,
                box: 1,
                lastSeen: 0,
                recentWrong: 0,
                totalSeen: 0,
                totalCorrect: 0,
                totalWrong: 0,
              },
            },
          }))
        }
      },

      ensureWordInitialized: (wordId) => {
        if (!get().words[wordId]) {
          const word = getWordById(wordId)
          if (!word) return
          set((s) => ({
            words: {
              ...s.words,
              [wordId]: {
                id: wordId,
                word: word.text,
                box: 1,
                lastSeen: 0,
                recentWrong: 0,
                totalSeen: 0,
                totalCorrect: 0,
                totalWrong: 0,
                level: word.level,
                album: false,
              },
            },
          }))
        }
      },

      applySessionResults: (updatedSyllables, updatedWords, log) => {
        set((s) => ({
          syllables: { ...s.syllables, ...updatedSyllables },
          words: { ...s.words, ...updatedWords },
          sessions: [...s.sessions, log],
        }))
      },

      addToAlbum: (wordId) => {
        set((s) => {
          if (s.albumUnlocked.includes(wordId)) return s
          const word = s.words[wordId]
          return {
            albumUnlocked: [...s.albumUnlocked, wordId],
            words: word ? { ...s.words, [wordId]: { ...word, album: true } } : s.words,
          }
        })
      },

      markIntroSeen: (key) => {
        set((s) => s.seenIntros.includes(key) ? s : { seenIntros: [...s.seenIntros, key] })
      },

      hasSeenIntro: (key) => get().seenIntros.includes(key),

      setLastUsedLevel: (level) => set({ lastUsedLevel: level }),

      incrementWildCounter: () => set((s) => ({ wildCelebrationCounter: s.wildCelebrationCounter + 1 })),

      resetWildCounter: () => set({ wildCelebrationCounter: 0 }),

      markSceneSeen: (wordText, sceneId) => {
        set((s) => {
          const current = s.seenSceneVariants[wordText] ?? []
          if (current.includes(sceneId)) return s
          return {
            seenSceneVariants: {
              ...s.seenSceneVariants,
              [wordText]: [...current, sceneId],
            },
          }
        })
      },

      setPendingCeremony: (milestone) => set({ pendingCeremonyMilestone: milestone }),

      clearPendingCeremony: () => set({ pendingCeremonyMilestone: null }),

      resetAllProgress: () => set(initialState),

      reset: () => set(initialState),
    }),
    {
      name: 'iskierki-reading-v1',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReadingState>
        return {
          ...current,
          syllables: (p.syllables && typeof p.syllables === 'object' && !Array.isArray(p.syllables)) ? p.syllables : {},
          words: (p.words && typeof p.words === 'object' && !Array.isArray(p.words)) ? p.words : {},
          sessions: Array.isArray(p.sessions) ? p.sessions : [],
          seenIntros: Array.isArray(p.seenIntros) ? p.seenIntros : [],
          albumUnlocked: Array.isArray(p.albumUnlocked) ? p.albumUnlocked : [],
          lastUsedLevel: p.lastUsedLevel ?? null,
          wildCelebrationCounter: typeof p.wildCelebrationCounter === 'number' ? p.wildCelebrationCounter : 0,
          seenSceneVariants: (p.seenSceneVariants && typeof p.seenSceneVariants === 'object' && !Array.isArray(p.seenSceneVariants)) ? p.seenSceneVariants : {},
          pendingCeremonyMilestone: typeof p.pendingCeremonyMilestone === 'number' ? p.pendingCeremonyMilestone : null,
        } as ReadingState
      },
    },
  ),
)
