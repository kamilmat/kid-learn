import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Wejście-wyjście-wejście w kilkanaście sekund (dziecko szuka właściwej czytanki,
// myli się w kafelku) to nadal JEDNO czytanie — dopiero po minucie liczymy kolejne.
export const RECOUNT_GUARD_MS = 60_000

/** Trafienie za 1. razem / za 2. / nietrafione (druga próba też była pudłem). */
export type ComprehensionResult = 'first' | 'second' | 'miss'

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
  /** id czytanek, w których dziecko trafiło odpowiedź (badge ✔ na ekranie czytanki). */
  answeredQuestionIds: string[]
  /** id czytanki → czy trafiło za pierwszym, za drugim razem, czy wcale. */
  comprehensionResults: Record<string, ComprehensionResult>
  markOpened: (id: string) => void
  /** Zaliczenie czytania — wołane dopiero po dowodzie przejścia tekstu (nie na mount). */
  markRead: (id: string, nowMs?: number) => void
  recordVisit: (id: string, taps: Record<string, number>, ms: number) => void
  recordComprehension: (id: string, result: ComprehensionResult) => void
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
  answeredQuestionIds: [] as string[],
  comprehensionResults: {} as Record<string, ComprehensionResult>,
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

/** v2 → v3: licznik przeczytań + timestamp guardu + odpowiedzi na pytania. */
export function migrateCzytankiV3(persisted: unknown): PersistedCzytanki {
  const p = (persisted ?? {}) as PersistedCzytanki
  if (!isPlainObject(p.readCounts)) p.readCounts = {}
  if (!isPlainObject(p.lastCountedAt)) p.lastCountedAt = {}
  if (!Array.isArray(p.answeredQuestionIds)) p.answeredQuestionIds = []
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
    answeredQuestionIds: Array.isArray(p.answeredQuestionIds) ? p.answeredQuestionIds : [],
    // Dołożone bez bumpu wersji — `merge` biegnie przy KAŻDEJ rehydracji, więc
    // stary persist (bez tego pola) i tak dostaje tu domyślne `{}`.
    comprehensionResults: isPlainObject(p.comprehensionResults)
      ? (p.comprehensionResults as Record<string, ComprehensionResult>)
      : {},
  } as CzytankiState
}

export const useCzytanki = create<CzytankiState>()(
  persist(
    (set, get) => ({
      ...initialState,
      // Samo wejście na ekran to jeszcze nie przeczytanie — przeklikanie listy
      // strzałką ▶ zaliczałoby wszystko. Licznik podbija dopiero `markRead`.
      markOpened: (id) =>
        set((s) => ({
          lastOpenedId: id,
          openedIds: s.openedIds.includes(id) ? s.openedIds : [...s.openedIds, id],
        })),
      markRead: (id, nowMs = Date.now()) =>
        set((s) => {
          const fresh = nowMs - (s.lastCountedAt[id] ?? 0) >= RECOUNT_GUARD_MS
          if (!fresh) return s
          return {
            readCounts: { ...s.readCounts, [id]: (s.readCounts[id] ?? 0) + 1 },
            lastCountedAt: { ...s.lastCountedAt, [id]: nowMs },
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
      // Badge ✔ należy się tylko za trafienie; 'miss' zostaje w statystyce,
      // ale dziecko dostaje pytanie ❓ ponownie przy kolejnym czytaniu.
      recordComprehension: (id, result) =>
        set((s) => ({
          comprehensionResults: { ...s.comprehensionResults, [id]: result },
          answeredQuestionIds:
            result !== 'miss' && !s.answeredQuestionIds.includes(id)
              ? [...s.answeredQuestionIds, id]
              : s.answeredQuestionIds,
        })),
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
