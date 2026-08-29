import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CzytankiState = {
  openedIds: string[]
  lastOpenedId: string | null
  seenIntros: string[]
  /** id czytanki → slug słowa (bez prefiksu `cz-word-`) → liczba dotknięć. */
  wordTaps: Record<string, Record<string, number>>
  /** id czytanki → łączny czas na ekranie w ms. */
  timeMs: Record<string, number>
  markOpened: (id: string) => void
  recordVisit: (id: string, taps: Record<string, number>, ms: number) => void
  markIntroSeen: (key: string) => void
  hasSeenIntro: (key: string) => boolean
  resetAllProgress: () => void
}

const initialState = {
  openedIds: [] as string[],
  lastOpenedId: null as string | null,
  seenIntros: [] as string[],
  wordTaps: {} as Record<string, Record<string, number>>,
  timeMs: {} as Record<string, number>,
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function mergeCzytankiState(persisted: unknown, current: CzytankiState): CzytankiState {
  const p = (persisted ?? {}) as Partial<CzytankiState>
  return {
    ...current,
    openedIds: Array.isArray(p.openedIds) ? p.openedIds : [],
    lastOpenedId: typeof p.lastOpenedId === 'string' ? p.lastOpenedId : null,
    seenIntros: Array.isArray(p.seenIntros) ? p.seenIntros : [],
    wordTaps: isPlainObject(p.wordTaps) ? (p.wordTaps as Record<string, Record<string, number>>) : {},
    timeMs: isPlainObject(p.timeMs) ? (p.timeMs as Record<string, number>) : {},
  } as CzytankiState
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
      /** Batch na wyjściu z ekranu — nie zapisujemy per tap (persist to zapis do localStorage). */
      recordVisit: (id, taps, ms) =>
        set((s) => {
          const merged = { ...(s.wordTaps[id] ?? {}) }
          for (const [slug, n] of Object.entries(taps)) merged[slug] = (merged[slug] ?? 0) + n
          return {
            wordTaps: { ...s.wordTaps, [id]: merged },
            timeMs: { ...s.timeMs, [id]: (s.timeMs[id] ?? 0) + ms },
          }
        }),
      markIntroSeen: (key) =>
        set((s) => (s.seenIntros.includes(key) ? s : { seenIntros: [...s.seenIntros, key] })),
      hasSeenIntro: (key) => get().seenIntros.includes(key),
      resetAllProgress: () => set(initialState),
    }),
    {
      name: 'iskierki-czytanki-v1',
      version: 2,
      // Bez `migrate` bump wersji wyrzuciłby cały postęp — `merge` sanityzuje shape.
      migrate: (persisted) => persisted as CzytankiState,
      merge: mergeCzytankiState,
    },
  ),
)
