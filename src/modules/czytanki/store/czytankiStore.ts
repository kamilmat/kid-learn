import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Wejście-wyjście-wejście w kilkanaście sekund (dziecko szuka właściwej czytanki,
// myli się w kafelku) to nadal JEDNO czytanie — dopiero po minucie liczymy kolejne.
export const RECOUNT_GUARD_MS = 60_000

export type CzytankiState = {
  openedIds: string[]
  lastOpenedId: string | null
  seenIntros: string[]
  /** id czytanki → slug słowa (bez prefiksu `cz-word-`) → liczba dotknięć. */
  wordTaps: Record<string, Record<string, number>>
  /** id czytanki → łączny czas na ekranie w ms. */
  timeMs: Record<string, number>
  /** id czytanki → ile razy została przeczytana (wejścia na ekran, nie tapy). */
  readCounts: Record<string, number>
  /** id czytanki → timestamp ostatniego zaliczonego przeczytania (guard 60 s). */
  lastCountedAt: Record<string, number>
  markOpened: (id: string, nowMs?: number) => void
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
  readCounts: {} as Record<string, number>,
  lastCountedAt: {} as Record<string, number>,
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type PersistedCzytanki = Partial<CzytankiState> & Record<string, unknown>

/** v1 → v2: statystyki tapów i czasu (Fala 1). */
export function migrateCzytankiV2(persisted: unknown): PersistedCzytanki {
  const p = (persisted ?? {}) as PersistedCzytanki
  if (!isPlainObject(p.wordTaps)) p.wordTaps = {}
  if (!isPlainObject(p.timeMs)) p.timeMs = {}
  return p
}

/** v2 → v3: licznik przeczytań + timestamp guardu. */
export function migrateCzytankiV3(persisted: unknown): PersistedCzytanki {
  const p = (persisted ?? {}) as PersistedCzytanki
  if (!isPlainObject(p.readCounts)) p.readCounts = {}
  if (!isPlainObject(p.lastCountedAt)) p.lastCountedAt = {}
  return p
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
    readCounts: isPlainObject(p.readCounts) ? (p.readCounts as Record<string, number>) : {},
    lastCountedAt: isPlainObject(p.lastCountedAt) ? (p.lastCountedAt as Record<string, number>) : {},
  } as CzytankiState
}

export const useCzytanki = create<CzytankiState>()(
  persist(
    (set, get) => ({
      ...initialState,
      markOpened: (id, nowMs = Date.now()) =>
        set((s) => {
          const fresh = nowMs - (s.lastCountedAt[id] ?? 0) >= RECOUNT_GUARD_MS
          return {
            lastOpenedId: id,
            openedIds: s.openedIds.includes(id) ? s.openedIds : [...s.openedIds, id],
            readCounts: fresh ? { ...s.readCounts, [id]: (s.readCounts[id] ?? 0) + 1 } : s.readCounts,
            lastCountedAt: fresh ? { ...s.lastCountedAt, [id]: nowMs } : s.lastCountedAt,
          }
        }),
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
      version: 3,
      // Bez `migrate` bump wersji wyrzuciłby cały postęp — `merge` sanityzuje shape.
      // Łańcuch append-only: każdy krok dokłada pola swojej wersji.
      migrate: (persisted, version) => {
        let p = (persisted ?? {}) as PersistedCzytanki
        if (version < 2) p = migrateCzytankiV2(p)
        if (version < 3) p = migrateCzytankiV3(p)
        return p as CzytankiState
      },
      merge: mergeCzytankiState,
    },
  ),
)
