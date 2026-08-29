import { describe, expect, it } from 'vitest'

import type { UnifiedSession } from './aggregate'
import { completedSessionsToday, ENOUGH_SESSIONS_TODAY } from './todaySessions'

const TODAY = new Date(2026, 7, 29, 10, 0, 0).getTime()

function makeSession(overrides: Partial<UnifiedSession> = {}): UnifiedSession {
  return {
    id: 'session-1',
    startedAt: TODAY,
    endedAt: TODAY + 60_000,
    level: 'iskierka',
    events: [],
    module: 'letters',
    moduleLabel: 'Litery',
    questions: 3,
    correct: 3,
    wrong: 0,
    dontKnow: 0,
    retries: 0,
    ...overrides,
  }
}

describe('completedSessionsToday', () => {
  it('pomija sesję sprzed dzisiejszej północy', () => {
    const yesterday = TODAY - 24 * 60 * 60 * 1000
    const sessions = [makeSession({ id: 'yesterday', startedAt: yesterday })]
    expect(completedSessionsToday(sessions, TODAY)).toBe(0)
  })

  it('pomija sesję z 0 pytaniami (porzucony start)', () => {
    const sessions = [makeSession({ id: 'empty', questions: 0 })]
    expect(completedSessionsToday(sessions, TODAY)).toBe(0)
  })

  it('pomija sesję z 1-2 pytaniami (porzucony start poniżej progu)', () => {
    const sessions = [
      makeSession({ id: 'one-question', questions: 1 }),
      makeSession({ id: 'two-questions', questions: 2 }),
    ]
    expect(completedSessionsToday(sessions, TODAY)).toBe(0)
  })

  it('liczy sesję z dokładnie 3 pytaniami (próg)', () => {
    const sessions = [makeSession({ id: 'three-questions', questions: 3 })]
    expect(completedSessionsToday(sessions, TODAY)).toBe(1)
  })

  it('liczy dwie sesje dziś z różnych modułów jako 2', () => {
    const sessions = [
      makeSession({ id: 'letters-today', module: 'letters' }),
      makeSession({ id: 'reading-today', module: 'reading' }),
    ]
    expect(completedSessionsToday(sessions, TODAY)).toBe(2)
  })
})

describe('ENOUGH_SESSIONS_TODAY', () => {
  it('próg to co najmniej 2', () => {
    expect(ENOUGH_SESSIONS_TODAY).toBeGreaterThanOrEqual(2)
  })
})
