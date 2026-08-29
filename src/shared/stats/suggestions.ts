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
import { LEVEL_LABEL } from '@/shared/settings/defaults'
import type { Level } from '@/shared/settings/types'
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
  /**
   * id czytanki → timestamp ostatniego zaliczonego przeczytania. Opcjonalne:
   * persist sprzed v3 tego pola nie ma i wtedy „kiedy ostatnio" jest nieznane —
   * lepiej milczeć niż zgadywać datę.
   */
  lastCountedAt?: Record<string, number> | undefined
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
/** Tak samo jak w `todaySessions` — porzucony start to jeszcze nie nauka. */
const MIN_QUESTIONS_FOR_ACTIVITY = 3
/** Ile najsłabszych pozycji wymieniamy rodzicowi z nazwy. */
const HARD_ITEMS_NAMED = 3

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

/**
 * Ostatnia PRAWDZIWA sesja. „Literka dnia" (60-90 s przywitanie) i porzucone
 * starty na 1-2 pytaniach nie mogą uciszać reguły „wróćcie do nauki".
 */
function lastRealSessionAt(sessions: readonly UnifiedSession[]): number | null {
  let last: number | null = null
  for (const s of sessions) {
    if (s.level === 'daily') continue
    if (s.questions < MIN_QUESTIONS_FOR_ACTIVITY) continue
    if (last === null || s.startedAt > last) last = s.startedAt
  }
  return last
}

/** Czytanki nie logują sesji — jedynym śladem aktywności jest `lastCountedAt`. */
function lastCzytankaAt(
  czytanki: SuggestionCzytankiSnapshot | undefined,
): number | null {
  let last: number | null = null
  for (const ts of Object.values(czytanki?.lastCountedAt ?? {})) {
    if (last === null || ts > last) last = ts
  }
  return last
}

function countHardLetters(letters: Record<string, LetterState>): number {
  let n = 0
  for (const l of Object.values(letters)) {
    if (l.recentWrong >= HARD_ITEM_WRONG) n++
  }
  return n
}

type HardReading = { count: number; labels: string[]; level: Level }

/**
 * Trudne sylaby i słowa modułu 2 — razem, bo dla rodzica to jedna czynność,
 * ale ODDZIELNIE od liter: tam prowadzi zupełnie inny ekran.
 */
function hardReading(reading: SuggestionReadingSnapshot): HardReading {
  const syllables = Object.values(reading.syllables).filter(
    (s) => s.recentWrong >= HARD_ITEM_WRONG,
  )
  const words = Object.values(reading.words).filter(
    (w) => w.recentWrong >= HARD_ITEM_WRONG,
  )
  const named = [
    ...syllables.map((s) => ({ label: s.syllable, wrong: s.recentWrong })),
    ...words.map((w) => ({ label: w.word, wrong: w.recentWrong })),
  ]
  // Stabilne sortowanie: przy remisie zostaje kolejność (sylaby przed słowami).
  named.sort((a, b) => b.wrong - a.wrong)
  // Sylaby żyją wyłącznie na Iskierce, słowa niosą własny poziom — kierujemy
  // rodzica tam, gdzie najsłabsze słowo faktycznie się pojawia.
  let level: Level = 'iskierka'
  let worstWordWrong = -1
  for (const w of words) {
    if (w.recentWrong > worstWordWrong) {
      worstWordWrong = w.recentWrong
      level = w.level
    }
  }
  return {
    count: syllables.length + words.length,
    labels: named.slice(0, HARD_ITEMS_NAMED).map((n) => n.label),
    level,
  }
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

  // Czytanka nie tworzy sesji, więc bez `lastCountedAt` reguła mówiłaby
  // „wróćcie do nauki" dziecku, które wczoraj czytało.
  const lastSession = lastRealSessionAt(allSessions)
  const lastCzytanka = lastCzytankaAt(input.czytanki)
  const lastAny =
    lastSession === null || (lastCzytanka !== null && lastCzytanka > lastSession)
      ? lastCzytanka
      : lastSession
  if (lastAny !== null) {
    const days = daysAgo(lastAny, now)
    if (days >= NO_ACTIVITY_DAYS) {
      out.push({
        id: 'no-activity',
        priority: 6,
        module: 'all',
        text: 'Wróćcie do nauki — wystarczy jedna krótka sesja.',
        why: `Ostatnia aktywność była ${days} dni temu, a przerwy najbardziej kosztują świeżo poznany materiał.`,
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

  if (input.czytanki) {
    if (input.czytanki.openedIds.length === 0) {
      out.push({
        id: 'module-cold',
        priority: 5,
        module: 'czytanki',
        text: `Zacznijcie moduł „${CZYTANKI_LABEL}" — jeszcze w nim nie byliście.`,
        why: 'Czytanie całych zdań łączy sylaby w płynność.',
      })
    } else if (lastCzytanka !== null) {
      const days = daysAgo(lastCzytanka, now)
      if (days >= MODULE_COLD_DAYS) {
        out.push({
          id: 'module-cold',
          priority: 5,
          module: 'czytanki',
          text: `Wróćcie do modułu „${CZYTANKI_LABEL}" — dawno go nie było.`,
          why: `Ostatnia czytanka była ${days} dni temu.`,
        })
      }
    }
  }

  // Litery i Czytanie OSOBNO: „Trudne literki" to ekran modułu 1 i nie powtórzy
  // tam ani jednej sylaby, więc wspólny licznik wysyłał rodzica w złe miejsce.
  const hardLetters = countHardLetters(input.letters)
  if (hardLetters >= HARD_ITEMS_REQUIRED) {
    out.push({
      id: 'hard-letters',
      priority: 4,
      module: 'letters',
      text: 'Zróbcie 5 minut „Trudnych literek" — same problematyczne znaki.',
      why: `${hardLetters} liter wciąż wraca z błędem.`,
    })
  }

  if (input.reading) {
    const hard = hardReading(input.reading)
    if (hard.count >= HARD_ITEMS_REQUIRED) {
      out.push({
        id: 'hard-reading',
        priority: 4,
        module: 'reading',
        text: `Poćwiczcie Czytanie na poziomie „${LEVEL_LABEL[hard.level]}" — najsłabsze: ${hard.labels.join(', ')}.`,
        why: `${hard.count} sylab i słów wciąż wraca z błędem.`,
      })
    }
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
