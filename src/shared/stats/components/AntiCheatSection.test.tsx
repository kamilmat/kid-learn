import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AntiCheatSection,
  collectFlagsForRecentSessions,
} from './AntiCheatSection'
import type { SessionEvent, SessionLog } from '@/shared/stats/types'

function fastClickSession(startedAt: number): SessionLog {
  // 3 odpowiedzi pod rząd <1s = fast-click warning
  const events: SessionEvent[] = [
    { type: 'answer', ts: startedAt + 100, outcome: 'correct', responseMs: 500 },
    { type: 'answer', ts: startedAt + 200, outcome: 'correct', responseMs: 600 },
    { type: 'answer', ts: startedAt + 300, outcome: 'wrong', responseMs: 700 },
  ]
  return {
    id: `s-${startedAt}`,
    startedAt,
    endedAt: startedAt + 1000,
    level: 'iskierka',
    events,
  }
}

function visibilitySession(startedAt: number): SessionLog {
  const events: SessionEvent[] = [
    { type: 'pause', ts: startedAt + 100, reason: 'visibility' },
    { type: 'resume', ts: startedAt + 200 },
  ]
  return {
    id: `s-vis-${startedAt}`,
    startedAt,
    endedAt: startedAt + 1000,
    level: 'iskierka',
    events,
  }
}

function emptySession(startedAt: number): SessionLog {
  return {
    id: `s-empty-${startedAt}`,
    startedAt,
    endedAt: startedAt + 1000,
    level: 'iskierka',
    events: [],
  }
}

describe('collectFlagsForRecentSessions', () => {
  it('zbiera flagi z ostatnich N sesji', () => {
    const sessions: SessionLog[] = [
      emptySession(0),
      emptySession(1000),
      emptySession(2000),
      fastClickSession(3000),
      visibilitySession(4000),
    ]
    const flags = collectFlagsForRecentSessions(sessions, 5)
    expect(flags.length).toBeGreaterThanOrEqual(2)
    const types = flags.map((f) => f.flag.type)
    expect(types).toContain('fast-click')
    expect(types).toContain('visibility')
  })

  it('ogranicza analizę do ostatnich N sesji', () => {
    // Stara sesja z fast-click; nowsze 5 pustych
    const sessions: SessionLog[] = [
      fastClickSession(0),
      emptySession(1000),
      emptySession(2000),
      emptySession(3000),
      emptySession(4000),
      emptySession(5000),
    ]
    const flags = collectFlagsForRecentSessions(sessions, 5)
    expect(flags.length).toBe(0)
  })
})

describe('AntiCheatSection render', () => {
  it('pokazuje pustą wiadomość gdy brak flag', () => {
    render(<AntiCheatSection sessions={[emptySession(0)]} />)
    expect(screen.getByTestId('anticheat-empty')).toBeInTheDocument()
  })

  it('renderuje flagi z analyzeSession', () => {
    render(
      <AntiCheatSection
        sessions={[fastClickSession(1_700_000_000_000), visibilitySession(1_700_000_010_000)]}
      />,
    )
    const flags = screen.getAllByTestId('anticheat-flag')
    expect(flags.length).toBeGreaterThanOrEqual(2)
    const types = flags.map((el) => el.getAttribute('data-flag-type'))
    expect(types).toContain('fast-click')
    expect(types).toContain('visibility')
  })

  it('flag visibility ma severity=alert', () => {
    render(<AntiCheatSection sessions={[visibilitySession(0)]} />)
    const flag = screen.getByTestId('anticheat-flag')
    expect(flag.getAttribute('data-severity')).toBe('alert')
  })

  it('flag fast-click ma severity=warning', () => {
    render(<AntiCheatSection sessions={[fastClickSession(0)]} />)
    const flag = screen.getByTestId('anticheat-flag')
    expect(flag.getAttribute('data-severity')).toBe('warning')
  })
})
