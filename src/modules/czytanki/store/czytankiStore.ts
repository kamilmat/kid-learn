import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CzytankiState = {
  openedIds: string[]
  lastOpenedId: string | null
  seenIntros: string[]
  markOpened: (id: string) => void
  markIntroSeen: (key: string) => void
  hasSeenIntro: (key: string) => boolean
  resetAllProgress: () => void
}

const initialState = {
  openedIds: [] as string[],
  lastOpenedId: null as string | null,
  seenIntros: [] as string[],
}

export const useCzytanki = create<CzytankiState>()(
  persist(
    (set, get) => ({
      ...initialState,
      markOpened: (id) =>
        set((s) => ({
          lastOpenedId: id,
          openedIds: s.openedIds.includes(id) ? s.openedIds : [...s.openedIds, id],
        })),
      markIntroSeen: (key) =>
        set((s) => (s.seenIntros.includes(key) ? s : { seenIntros: [...s.seenIntros, key] })),
      hasSeenIntro: (key) => get().seenIntros.includes(key),
      resetAllProgress: () => set(initialState),
    }),
    {
      name: 'iskierki-czytanki-v1',
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CzytankiState>
        return {
          ...current,
          openedIds: Array.isArray(p.openedIds) ? p.openedIds : [],
          lastOpenedId: typeof p.lastOpenedId === 'string' ? p.lastOpenedId : null,
          seenIntros: Array.isArray(p.seenIntros) ? p.seenIntros : [],
        } as CzytankiState
      },
    },
  ),
)
