// Adapter logów sesji ze wszystkich modułów do jednego kształtu.
//
// WHY: sekcje raportu rodzica (Aktywność, Ostatnia sesja, Flagi zaangażowania)
// były karmione wyłącznie `useLetters(s => s.sessions)`, więc streak, wykres
// 14 dni i anti-cheat ignorowały Czytanie i Cyferki. Każdy moduł loguje własny
// kształt eventu, więc mapujemy je na `SessionEvent` z modułu liter — to
// najbogatszy wariant i wszystkie istniejące analizatory (`analyzeSession`,
// `aggregatePerDay`, `rangeAggregate`) już go rozumieją.
//
// Czego adapter NIE robi: nie udaje danych, których moduł nie loguje. Czytanie
// nie ma eventów pauzy → jego sesje po prostu nie generują flag pauzowych.

import type { NumbersSessionLog } from '@/modules/numbers/types'
import type { ReadingSessionEvent } from '@/modules/reading/types'
import type { Level } from '@/shared/settings/types'

import type { SessionEvent, SessionLog } from './types'

export type StatsModuleId = 'letters' | 'reading' | 'numbers'

export const STATS_MODULE_LABEL: Record<StatsModuleId, string> = {
  letters: 'Litery',
  reading: 'Czytanie',
  numbers: 'Cyferki',
}

/**
 * Sesja dowolnego modułu w kształcie `SessionLog` (moduł 1) + metadane modułu
 * i policzone podsumowanie. Rozszerza `SessionLog`, więc trafia bez zmian do
 * `ActivitySection` / `AntiCheatSection`.
 */
export type UnifiedSession = SessionLog & {
  module: StatsModuleId
  moduleLabel: string
  /** Liczba odpowiedzi (eventy `answer`). */
  questions: number
  correct: number
  wrong: number
}

/** Kształt logu sesji modułu 2 — `readingStore` trzyma go jako typ lokalny. */
export type ReadingSessionLog = {
  startedAt: number
  endedAt: number
  level: Level
  events: ReadingSessionEvent[]
}

/** `syl-MA` → `MA`, `word-MAMA` → `MAMA`; inne id zostają bez zmian. */
export function readingTargetLabel(targetId: string): string {
  const dash = targetId.indexOf('-')
  if (dash === -1) return targetId
  const prefix = targetId.slice(0, dash)
  if (prefix !== 'syl' && prefix !== 'word') return targetId
  return targetId.slice(dash + 1)
}

function summarize(events: SessionEvent[]): {
  questions: number
  correct: number
  wrong: number
} {
  let questions = 0
  let correct = 0
  let wrong = 0
  for (const ev of events) {
    if (ev.type !== 'answer') continue
    questions++
    if (ev.outcome === 'correct') correct++
    else wrong++
  }
  return { questions, correct, wrong }
}

function withSummary(
  base: Omit<UnifiedSession, 'questions' | 'correct' | 'wrong' | 'moduleLabel'>,
): UnifiedSession {
  return {
    ...base,
    moduleLabel: STATS_MODULE_LABEL[base.module],
    ...summarize(base.events),
  }
}

export function fromLettersLog(log: SessionLog): UnifiedSession {
  return withSummary({ ...log, module: 'letters' })
}

export function fromReadingLog(
  log: ReadingSessionLog,
  index: number,
): UnifiedSession {
  const events: SessionEvent[] = []
  for (const ev of log.events) {
    // Moduł 2 nie loguje osobnego `question-start`, ale `answer` niesie cel —
    // syntetyzujemy parę, żeby "Ostatnia sesja" mogła pokazać co było pytane.
    events.push({
      type: 'question-start',
      ts: ev.timestamp - ev.responseMs,
      targetLetter: readingTargetLabel(ev.targetId),
      distractors: [],
      positions: [],
      style: 'print',
      case: 'upper',
    })
    events.push({
      type: 'answer',
      ts: ev.timestamp,
      outcome: ev.outcome,
      responseMs: ev.responseMs,
    })
  }
  return withSummary({
    id: `reading-${log.startedAt}-${index}`,
    module: 'reading',
    startedAt: log.startedAt,
    endedAt: log.endedAt,
    level: log.level,
    events,
  })
}

export function fromNumbersLog(
  log: NumbersSessionLog,
  index: number,
): UnifiedSession {
  const events: SessionEvent[] = []
  for (const ev of log.events) {
    events.push({
      type: 'question-start',
      ts: ev.timestamp - ev.responseMs,
      targetLetter: ev.factId,
      distractors: [],
      positions: [],
      style: 'print',
      case: 'upper',
    })
    events.push({
      type: 'answer',
      ts: ev.timestamp,
      outcome: ev.outcome,
      responseMs: ev.responseMs,
    })
  }
  for (const ev of log.antiCheatEvents ?? []) {
    events.push(
      ev.type === 'pause'
        ? { type: 'pause', ts: ev.ts, reason: ev.reason }
        : { type: 'resume', ts: ev.ts },
    )
  }
  events.sort((a, b) => a.ts - b.ts)
  return withSummary({
    id: `numbers-${log.startedAt}-${index}`,
    module: 'numbers',
    startedAt: log.startedAt,
    endedAt: log.endedAt,
    level: log.level,
    events,
  })
}

/**
 * Scala logi wszystkich modułów w jedną listę posortowaną rosnąco po
 * `startedAt` — ta sama kolejność co `lettersStore.sessions`, więc konsumenci
 * biorący "ostatnie N" albo `sessions[length-1]` działają bez zmian.
 */
export function toUnifiedSessions(input: {
  letters?: readonly SessionLog[]
  reading?: readonly ReadingSessionLog[]
  numbers?: readonly NumbersSessionLog[]
}): UnifiedSession[] {
  const out: UnifiedSession[] = []
  for (const log of input.letters ?? []) out.push(fromLettersLog(log))
  input.reading?.forEach((log, i) => out.push(fromReadingLog(log, i)))
  input.numbers?.forEach((log, i) => out.push(fromNumbersLog(log, i)))
  out.sort((a, b) => a.startedAt - b.startedAt)
  return out
}
