// „Następny krok" — jedna konkretna akcja dla rodzica, policzona ze WSZYSTKICH
// modułów (Litery, Czytanie, Cyferki, Czytanki).
//
// WHY osobny plik zamiast rozbudowy `SuggestionsSection`: ta sama czysta
// funkcja karmi kartę na górze raportu, listę „Więcej sugestii" i eksport
// markdown — kontrakt „treść UI ≡ markdown" trzyma się tylko wtedy, gdy nie ma
// drugiej implementacji reguł.
//
// Reguły są uporządkowane priorytetem malejąco; `out[0]` to karta.

import type { LetterState } from '@/shared/srs/types'
import type { SyllableState, WordState } from '@/modules/reading/types'
import type {
  ConceptId,
  ConceptMastery,
  MathFactState,
} from '@/modules/numbers/types'
import { CONCEPT_LABELS } from '@/modules/numbers/data/conceptLabels'
import {
  STATS_MODULE_LABEL,
  type StatsModuleId,
  type UnifiedSession,
} from './aggregate'
import { completedSessionsToday } from './todaySessions'

export type SuggestionModule = StatsModuleId | 'czytanki' | 'all'

export type Suggestion = {
  id: string
  text: string
  /** Jedno zdanie: dlaczego to jest teraz sensowne. */
  why: string
  priority: number
  module: SuggestionModule
}

/** Kształt snapshotu Cyferek — ten sam co w `exporter.ts`, bez importu (cykl). */
export type SuggestionNumbersSnapshot = {
  facts: Record<string, MathFactState>
  concepts: Partial<Record<ConceptId, ConceptMastery>>
}

export type SuggestionReadingSnapshot = {
  syllables: Record<string, SyllableState>
  words: Record<string, WordState>
}

export type SuggestionCzytankiSnapshot = {
  openedIds: string[]
  readCounts: Record<string, number>
}

export type SuggestionInput = {
  now: number
  letters: Record<string, LetterState>
  allSessions: UnifiedSession[]
  // `| undefined` świadomie: przy `exactOptionalPropertyTypes` wywołujący
  // przekazuje snapshot wprost ze store'a, który bywa jeszcze nieutworzony.
  reading?: SuggestionReadingSnapshot | undefined
  numbers?: SuggestionNumbersSnapshot | undefined
  czytanki?: SuggestionCzytankiSnapshot | undefined
}

export const FALLBACK_SUGGESTION: Suggestion = {
  id: 'fallback',
  priority: 0,
  module: 'all',
  text: 'Usiądźcie razem do jednej sesji Liter — 8 minut wystarczy.',
  why: 'Jeszcze za mało danych, żeby coś doradzić.',
}

const MS_PER_DAY = 24 * 60 * 60 * 1_000
const NO_ACTIVITY_DAYS = 3
const MODULE_COLD_DAYS = 7
const CONCEPT_STUCK_DAYS = 14
const HARD_ITEM_WRONG = 2
const HARD_ITEMS_REQUIRED = 3

const MODULE_ORDER: StatsModuleId[] = ['letters', 'reading', 'numbers']

const CZYTANKI_LABEL = 'Czytanki'

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Pełne dni kalendarzowe między `ts` a `now` (dziś = 0). */
function daysAgo(ts: number, now: number): number {
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(ts)) / MS_PER_DAY))
}

function lastSessionAt(
  sessions: readonly UnifiedSession[],
  module?: StatsModuleId,
): number | null {
  let last: number | null = null
  for (const s of sessions) {
    if (module !== undefined && s.module !== module) continue
    if (last === null || s.startedAt > last) last = s.startedAt
  }
  return last
}

function countHardItems(input: SuggestionInput): number {
  let n = 0
  for (const l of Object.values(input.letters)) {
    if (l.recentWrong >= HARD_ITEM_WRONG) n++
  }
  for (const s of Object.values(input.reading?.syllables ?? {})) {
    if (s.recentWrong >= HARD_ITEM_WRONG) n++
  }
  return n
}

function stuckConcept(
  numbers: SuggestionNumbersSnapshot,
  now: number,
): { id: ConceptId; days: number } | null {
  let best: { id: ConceptId; days: number } | null = null
  for (const [id, mastery] of Object.entries(numbers.concepts) as [
    ConceptId,
    ConceptMastery | undefined,
  ][]) {
    if (!mastery || mastery.state !== 'learning') continue
    const days = daysAgo(mastery.firstSeenAt, now)
    if (days < CONCEPT_STUCK_DAYS) continue
    if (best === null || days > best.days) best = { id, days }
  }
  return best
}

/**
 * Sugestie dla rodzica, malejąco po `priority`. Zawsze zwraca ≥1 element —
 * gdy nic nie pasuje (albo nie ma jeszcze żadnej sesji), jest to `FALLBACK`.
 */
export function generateSuggestions(input: SuggestionInput): Suggestion[] {
  const { now, allSessions } = input

  // Bez ani jednej sesji każda reguła mówiłaby „wróćcie" do czegoś, czego nie
  // było — jedyna uczciwa rada to po prostu zacząć.
  if (allSessions.length === 0) return [FALLBACK_SUGGESTION]

  const out: Suggestion[] = []

  const lastAny = lastSessionAt(allSessions)
  if (lastAny !== null) {
    const days = daysAgo(lastAny, now)
    if (days >= NO_ACTIVITY_DAYS) {
      out.push({
        id: 'no-activity',
        priority: 6,
        module: 'all',
        text: 'Wróćcie do nauki — wystarczy jedna krótka sesja.',
        why: `Ostatnia sesja była ${days} dni temu, a przerwy najbardziej kosztują świeżo poznane litery.`,
      })
    }
  }

  for (const m of MODULE_ORDER) {
    const last = lastSessionAt(allSessions, m)
    const label = STATS_MODULE_LABEL[m]
    if (last === null) {
      out.push({
        id: 'module-cold',
        priority: 5,
        module: m,
        text: `Zacznijcie moduł „${label}" — jeszcze w nim nie byliście.`,
        why: 'Każdy moduł ćwiczy inną umiejętność, warto mieć je wszystkie w rotacji.',
      })
      continue
    }
    const days = daysAgo(last, now)
    if (days >= MODULE_COLD_DAYS) {
      out.push({
        id: 'module-cold',
        priority: 5,
        module: m,
        text: `Wróćcie do modułu „${label}" — dawno go nie było.`,
        why: `Ostatnia sesja w tym module była ${days} dni temu.`,
      })
    }
  }

  if (input.czytanki && input.czytanki.openedIds.length === 0) {
    out.push({
      id: 'module-cold',
      priority: 5,
      module: 'czytanki',
      text: `Zacznijcie moduł „${CZYTANKI_LABEL}" — jeszcze w nim nie byliście.`,
      why: 'Czytanie całych zdań łączy sylaby w płynność.',
    })
  }

  const hardItems = countHardItems(input)
  if (hardItems >= HARD_ITEMS_REQUIRED) {
    out.push({
      id: 'hard-items',
      priority: 4,
      module: 'letters',
      text: 'Zróbcie 5 minut „Trudnych literek" — same problematyczne znaki.',
      why: `${hardItems} liter i sylab wciąż wraca z błędem.`,
    })
  }

  if (input.numbers) {
    const stuck = stuckConcept(input.numbers, now)
    if (stuck) {
      out.push({
        id: 'concept-stuck',
        priority: 3,
        module: 'numbers',
        text: `Poćwiczcie razem „${CONCEPT_LABELS[stuck.id]}" — ten temat stoi w miejscu.`,
        why: `Koncept jest w nauce od ${stuck.days} dni; zwykle brakuje wtedy wcześniejszego kroku.`,
      })
    }
  }

  if (input.czytanki && input.czytanki.openedIds.length > 0) {
    const anyReread = Object.values(input.czytanki.readCounts).some(
      (n) => n >= 2,
    )
    if (!anyReread) {
      out.push({
        id: 'reread',
        priority: 2,
        module: 'czytanki',
        text: 'Przeczytajcie ulubioną czytankę drugi raz.',
        why: 'Powtórne czytanie tego samego tekstu buduje płynność szybciej niż kolejny nowy.',
      })
    }
  }

  if (completedSessionsToday(allSessions, now) === 1) {
    out.push({
      id: 'two-sessions',
      priority: 1,
      module: 'all',
      text: 'Dwie krótkie zamiast jednej długiej — druga sesja wieczorem.',
      why: 'Powtórka po przerwie utrwala lepiej niż jedna długa sesja.',
    })
  }

  if (out.length === 0) return [FALLBACK_SUGGESTION]

  // Stabilne sortowanie (ES2019+) — przy remisie zostaje kolejność reguł.
  out.sort((a, b) => b.priority - a.priority)
  return out
}
