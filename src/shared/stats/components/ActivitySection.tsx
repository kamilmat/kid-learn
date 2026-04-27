// ActivitySection — sekcja 14.2 spec.
//
// Bar chart 14 dni (CSS flex z divami) + statystyki "Dziś / wczoraj / tydzień
// / streak". Wszystko liczone z `sessions` (historia max 50 sesji).

import { useMemo } from 'react'
import type { SessionEvent, SessionLog } from '@/shared/stats/types'

export type ActivitySectionProps = {
  sessions: SessionLog[]
  /** Bieżący timestamp ms — wstrzykiwane dla determinizmu testów. */
  now: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1_000

/** Klucz `YYYY-MM-DD` w lokalnej strefie czasu. */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export type DailyAggregate = {
  dayKey: string
  questions: number
  durationMs: number
  sessions: number
}

/**
 * Liczba pytań w sesji = liczba eventów `answer`.
 */
function countQuestions(events: SessionEvent[]): number {
  let n = 0
  for (const ev of events) {
    if (ev.type === 'answer') n++
  }
  return n
}

/**
 * Czas trwania sesji = endedAt-startedAt (jeśli ended); w innym wypadku
 * (sesja w toku, brak endedAt) → ts ostatniego eventu - startedAt.
 */
function sessionDuration(s: SessionLog): number {
  if (s.endedAt !== null) return Math.max(0, s.endedAt - s.startedAt)
  if (s.events.length === 0) return 0
  const last = s.events[s.events.length - 1]!
  return Math.max(0, last.ts - s.startedAt)
}

/**
 * Agreguje sesje per dzień. Klucze według lokalnego dayKey.
 */
export function aggregatePerDay(
  sessions: SessionLog[],
): Record<string, DailyAggregate> {
  const map: Record<string, DailyAggregate> = {}
  for (const s of sessions) {
    const k = dayKey(s.startedAt)
    if (!map[k]) {
      map[k] = { dayKey: k, questions: 0, durationMs: 0, sessions: 0 }
    }
    map[k]!.questions += countQuestions(s.events)
    map[k]!.durationMs += sessionDuration(s)
    map[k]!.sessions += 1
  }
  return map
}

/**
 * Zwraca kolejne `n` dni kończących się dniem `now` (włącznie), od najstarszej
 * do najnowszej. Każdy element ma {dayKey, ts: start of day}.
 */
export function lastNDays(
  now: number,
  n: number,
): Array<{ dayKey: string; ts: number }> {
  const out: Array<{ dayKey: string; ts: number }> = []
  const todayStart = startOfDay(now)
  for (let i = n - 1; i >= 0; i--) {
    const ts = todayStart - i * MS_PER_DAY
    out.push({ dayKey: dayKey(ts), ts })
  }
  return out
}

/**
 * Streak = liczba kolejnych dni z >=1 sesją, kończąca się dziś (lub wczoraj
 * jeśli dziś brak sesji jeszcze nie zerwało streaka — zerwanie liczymy gdy
 * brak również wczoraj). Implementacja: zaczynamy od dziś, idziemy wstecz.
 * Jeśli dziś nie ma sesji, ale wczoraj jest — streak nadal jest aktywny i
 * wynosi liczbę dni z sesją kończącą się wczoraj.
 */
export function streakDays(sessions: SessionLog[], now: number): number {
  const agg = aggregatePerDay(sessions)
  let count = 0
  let cursor = startOfDay(now)
  // Jeśli dziś brak sesji — zaczynamy liczenie od wczoraj.
  if (!agg[dayKey(cursor)]) {
    cursor -= MS_PER_DAY
  }
  while (agg[dayKey(cursor)]) {
    count++
    cursor -= MS_PER_DAY
  }
  return count
}

/**
 * Łączny stat (questions, durationMs, sessions) między [fromTs, toTs).
 */
export function rangeAggregate(
  sessions: SessionLog[],
  fromTs: number,
  toTs: number,
): { questions: number; durationMs: number; sessions: number } {
  let questions = 0
  let durationMs = 0
  let count = 0
  for (const s of sessions) {
    if (s.startedAt < fromTs || s.startedAt >= toTs) continue
    questions += countQuestions(s.events)
    durationMs += sessionDuration(s)
    count++
  }
  return { questions, durationMs, sessions: count }
}

function fmtMin(ms: number): string {
  return `${Math.round(ms / 60_000)} min`
}

function maxQuestions(days: DailyAggregate[]): number {
  let max = 0
  for (const d of days) {
    if (d.questions > max) max = d.questions
  }
  return max
}

export function ActivitySection({ sessions, now }: ActivitySectionProps) {
  const days = useMemo(() => lastNDays(now, 14), [now])
  const agg = useMemo(() => aggregatePerDay(sessions), [sessions])

  const dayData: DailyAggregate[] = days.map((d) => {
    return (
      agg[d.dayKey] ?? {
        dayKey: d.dayKey,
        questions: 0,
        durationMs: 0,
        sessions: 0,
      }
    )
  })
  const maxQ = Math.max(1, maxQuestions(dayData))

  const todayStart = startOfDay(now)
  const yesterdayStart = todayStart - MS_PER_DAY
  const weekStart = todayStart - 6 * MS_PER_DAY

  const today = rangeAggregate(sessions, todayStart, todayStart + MS_PER_DAY)
  const yesterday = rangeAggregate(sessions, yesterdayStart, todayStart)
  const week = rangeAggregate(sessions, weekStart, todayStart + MS_PER_DAY)
  const streak = streakDays(sessions, now)

  return (
    <section
      data-testid="activity-section"
      style={{
        padding: 16,
        background: '#ffffff',
        border: '1px solid #e8e0d2',
        borderRadius: 12,
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>Aktywność</h2>

      <div
        data-testid="activity-bars"
        role="img"
        aria-label="Wykres ostatnich 14 dni"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height: 100,
          marginBottom: 12,
        }}
      >
        {dayData.map((d) => {
          const heightPct = (d.questions / maxQ) * 100
          return (
            <div
              key={d.dayKey}
              data-testid={`activity-bar-${d.dayKey}`}
              data-questions={d.questions}
              title={`${d.dayKey}: ${d.questions} pytań`}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  minHeight: d.questions > 0 ? 2 : 0,
                  background: '#5b8def',
                  borderRadius: 4,
                }}
              />
            </div>
          )
        })}
      </div>

      <div
        data-testid="activity-stats"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          fontSize: 14,
          color: '#2d2d33',
        }}
      >
        <span data-testid="stat-today">
          Dziś: {today.questions} pytań / {fmtMin(today.durationMs)}
        </span>
        <span data-testid="stat-yesterday">
          Wczoraj: {yesterday.questions} pytań / {fmtMin(yesterday.durationMs)}
        </span>
        <span data-testid="stat-week">
          Tydzień: {week.questions} pytań / {fmtMin(week.durationMs)}
        </span>
        <span data-testid="stat-streak">Streak: {streak} dni</span>
      </div>
    </section>
  )
}
