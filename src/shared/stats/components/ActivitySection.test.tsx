import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ActivitySection,
  aggregatePerDay,
  dayKey,
  lastNDays,
  rangeAggregate,
  streakDays,
} from './ActivitySection'
import type { SessionLog, SessionEvent } from '@/shared/stats/types'

const MS = 24 * 60 * 60 * 1000

function fakeSession(
  startedAt: number,
  durationMs: number,
  numAnswers: number,
): SessionLog {
  const events: SessionEvent[] = []
  for (let i = 0; i < numAnswers; i++) {
    events.push({
      type: 'question-start',
      ts: startedAt + i * 1000,
      targetLetter: 'a',
      distractors: [],
      positions: [],
      style: 'print',
      case: 'lower',
    })
    events.push({
      type: 'answer',
      ts: startedAt + i * 1000 + 500,
      outcome: 'correct',
      responseMs: 500,
    })
  }
  return {
    id: `s-${startedAt}`,
    startedAt,
    endedAt: startedAt + durationMs,
    level: 'iskierka',
    events,
  }
}

// Wybieramy stały punkt czasowy w środku dnia (lokalny). Fri Jul 28 2023 12:00.
const NOW = new Date(2023, 6, 28, 12, 0, 0).getTime()

describe('ActivitySection helpers', () => {
  it('dayKey daje YYYY-MM-DD', () => {
    expect(dayKey(NOW)).toBe('2023-07-28')
  })

  it('lastNDays(now, 14) zwraca 14 elementów kończących się dzisiaj', () => {
    const days = lastNDays(NOW, 14)
    expect(days.length).toBe(14)
    expect(days[days.length - 1]?.dayKey).toBe('2023-07-28')
    expect(days[0]?.dayKey).toBe('2023-07-15')
  })

  it('aggregatePerDay sumuje pytania per dzień', () => {
    const sessions: SessionLog[] = [
      fakeSession(NOW, 5 * 60_000, 5),
      fakeSession(NOW + 60_000, 3 * 60_000, 3),
      fakeSession(NOW - MS, 4 * 60_000, 4),
    ]
    const agg = aggregatePerDay(sessions)
    expect(agg['2023-07-28']?.questions).toBe(8)
    expect(agg['2023-07-28']?.sessions).toBe(2)
    expect(agg['2023-07-27']?.questions).toBe(4)
  })

  it('streakDays liczy ciągłe dni z sesją kończąc na dziś', () => {
    const sessions: SessionLog[] = [
      fakeSession(NOW, 5 * 60_000, 5), // dziś
      fakeSession(NOW - MS, 3 * 60_000, 3), // wczoraj
      fakeSession(NOW - 2 * MS, 4 * 60_000, 4), // przedwczoraj
      // przerwa
      fakeSession(NOW - 5 * MS, 1 * 60_000, 1),
    ]
    expect(streakDays(sessions, NOW)).toBe(3)
  })

  it('streakDays gdy dziś brak sesji, ale wczoraj jest — streak liczy od wczoraj', () => {
    const sessions: SessionLog[] = [
      fakeSession(NOW - MS, 3 * 60_000, 3),
      fakeSession(NOW - 2 * MS, 4 * 60_000, 4),
    ]
    expect(streakDays(sessions, NOW)).toBe(2)
  })

  it('streakDays = 0 gdy brak sesji', () => {
    expect(streakDays([], NOW)).toBe(0)
  })

  it('rangeAggregate sumuje w przedziale [from, to)', () => {
    const sessions: SessionLog[] = [
      fakeSession(NOW, 5 * 60_000, 5),
      fakeSession(NOW - MS, 3 * 60_000, 3),
      fakeSession(NOW - 2 * MS, 4 * 60_000, 4),
    ]
    // Cały tydzień zamknięty w 7 dniach kończący dziś (włącznie)
    const todayStart = new Date(2023, 6, 28).getTime()
    const weekStart = todayStart - 6 * MS
    const r = rangeAggregate(sessions, weekStart, todayStart + MS)
    expect(r.questions).toBe(12)
    expect(r.sessions).toBe(3)
  })
})

describe('ActivitySection render', () => {
  it('renderuje 14 słupków + statystyki', () => {
    const sessions: SessionLog[] = [
      fakeSession(NOW, 5 * 60_000, 5),
      fakeSession(NOW - MS, 3 * 60_000, 3),
    ]
    render(<ActivitySection sessions={sessions} now={NOW} />)
    const bars = document.querySelectorAll('[data-testid^="activity-bar-"]')
    expect(bars.length).toBe(14)
    expect(screen.getByTestId('stat-today').textContent).toContain('5 pytań')
    expect(screen.getByTestId('stat-yesterday').textContent).toContain(
      '3 pytań',
    )
    expect(screen.getByTestId('stat-streak').textContent).toContain('2 dni')
  })

  it('słupek dzisiejszy ma poprawny data-questions', () => {
    const sessions: SessionLog[] = [fakeSession(NOW, 5 * 60_000, 7)]
    render(<ActivitySection sessions={sessions} now={NOW} />)
    const todayBar = screen.getByTestId('activity-bar-2023-07-28')
    expect(todayBar.getAttribute('data-questions')).toBe('7')
  })
})
