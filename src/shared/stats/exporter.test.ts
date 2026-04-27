import { describe, expect, it } from 'vitest'
import { exportReportToMarkdown } from './exporter'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import { defaultSettings } from '@/shared/settings/defaults'
import type { LetterState } from '@/shared/srs/types'
import type { SessionEvent, SessionLog } from '@/shared/stats/types'

function makeLetter(
  letter: string,
  patch: Partial<LetterState> = {},
): LetterState {
  return { ...createInitialLetterState(letter), ...patch }
}

function fakeSession(
  startedAt: number,
  numAnswers: number,
  durationMs: number = 60_000,
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

const NOW = new Date(2023, 6, 28, 12, 0, 0).getTime()

describe('exportReportToMarkdown', () => {
  it('generuje pełny raport z wszystkimi sekcjami', () => {
    const letters: Record<string, LetterState> = {
      a: makeLetter('a', { totalSeen: 5, totalCorrect: 4, totalWrong: 1, box: 3 }),
      b: makeLetter('b', { totalSeen: 5, totalCorrect: 1, totalWrong: 4, box: 1 }),
    }
    const sessions: SessionLog[] = [fakeSession(NOW, 5)]
    const md = exportReportToMarkdown(letters, sessions, defaultSettings, NOW)

    expect(md).toContain('# Raport Iskierki')
    expect(md).toContain('## Litery')
    expect(md).toContain('## Aktywność')
    expect(md).toContain('### Ostatnie 14 dni')
    expect(md).toContain('## Sugestie')
    expect(md).toContain('## Flagi zaangażowania')
    expect(md).toContain('## Ustawienia')
  })

  it('dla pustych danych zachowuje strukturę', () => {
    const md = exportReportToMarkdown({}, [], defaultSettings, NOW)
    expect(md).toContain('# Raport Iskierki')
    expect(md).toContain('Brak danych')
    expect(md).toContain('Brak flag')
  })

  it('uppercase liter w tabeli liter (polski locale)', () => {
    const letters: Record<string, LetterState> = {
      ł: makeLetter('ł', {
        totalSeen: 3,
        totalCorrect: 1,
        totalWrong: 2,
        box: 1,
      }),
    }
    const md = exportReportToMarkdown(letters, [], defaultSettings, NOW)
    expect(md).toContain('| Ł |')
  })

  it('liczy "Dziś" i "Wczoraj" oraz Streak', () => {
    const sessions: SessionLog[] = [
      fakeSession(NOW, 5),
      fakeSession(NOW - 24 * 60 * 60 * 1000, 3),
    ]
    const md = exportReportToMarkdown({}, sessions, defaultSettings, NOW)
    expect(md).toContain('Dziś: 5 pytań')
    expect(md).toContain('Wczoraj: 3 pytań')
    expect(md).toContain('Streak: 2 dni')
  })

  it('zawiera ostatnie 14 dni jako tabela', () => {
    const md = exportReportToMarkdown({}, [], defaultSettings, NOW)
    // Ostatni dzień (dziś) musi być w tabeli
    expect(md).toContain('2023-07-28')
    // Pierwszy z 14 (14 dni temu, włącznie z dziś):
    expect(md).toContain('2023-07-15')
  })

  it('uwzględnia flagi anti-cheat', () => {
    const fast: SessionEvent[] = [
      { type: 'answer', ts: 100, outcome: 'correct', responseMs: 500 },
      { type: 'answer', ts: 200, outcome: 'correct', responseMs: 600 },
      { type: 'answer', ts: 300, outcome: 'wrong', responseMs: 700 },
    ]
    const sessions: SessionLog[] = [
      {
        id: 's1',
        startedAt: NOW,
        endedAt: NOW + 1000,
        level: 'iskierka',
        events: fast,
      },
    ]
    const md = exportReportToMarkdown({}, sessions, defaultSettings, NOW)
    expect(md).toContain('Szybkie klikanie')
  })
})
