import { describe, expect, it } from 'vitest'
import { exportReportToMarkdown } from './exporter'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import { defaultSettings } from '@/shared/settings/defaults'
import type { LetterState } from '@/shared/srs/types'
import type { SessionEvent, SessionLog } from '@/shared/stats/types'
import {
  fromLettersLog,
  fromNumbersLog,
  fromReadingLog,
  type ReadingSessionLog,
  type UnifiedSession,
} from './aggregate'
import type { NumbersSessionLog } from '@/modules/numbers/types'

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

/** Skrót: SessionLog modułu 1 -> UnifiedSession, tak jak w ReportScreen. */
function fakeUnifiedSession(
  startedAt: number,
  numAnswers: number,
  durationMs: number = 60_000,
): UnifiedSession {
  return fromLettersLog(fakeSession(startedAt, numAnswers, durationMs))
}

const NOW = new Date(2023, 6, 28, 12, 0, 0).getTime()

describe('exportReportToMarkdown', () => {
  it('generuje pełny raport z wszystkimi sekcjami', () => {
    const letters: Record<string, LetterState> = {
      a: makeLetter('a', { totalSeen: 5, totalCorrect: 4, totalWrong: 1, box: 3 }),
      b: makeLetter('b', { totalSeen: 5, totalCorrect: 1, totalWrong: 4, box: 1 }),
    }
    const sessions: UnifiedSession[] = [fakeUnifiedSession(NOW, 5)]
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
    const sessions: UnifiedSession[] = [
      fakeUnifiedSession(NOW, 5),
      fakeUnifiedSession(NOW - 24 * 60 * 60 * 1000, 3),
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

  it('renderuje sekcję "Limit czasu (per poziom)" z 4 sub-bulletami z dwuspacjowym wcięciem', () => {
    const md = exportReportToMarkdown({}, [], defaultSettings, NOW)
    // Header sekcji
    expect(md).toContain('- Limit czasu (per poziom):')
    // Per-level defaulty (iskierka/płomyk = 'off', ognik/pochodnia = 15s)
    // 2-spacjowe wcięcie zagnieżdżonego bulleta jest częścią kontraktu — pinujemy.
    expect(md).toContain('  - Iskierka: wyłączony')
    expect(md).toContain('  - Płomyk: wyłączony')
    expect(md).toContain('  - Ognik: 15s')
    expect(md).toContain('  - Pochodnia: 15s')
  })

  it('uwzględnia override per-level w sekcji "Limit czasu"', () => {
    const settings = {
      ...defaultSettings,
      timeLimit: { iskierka: 10 as const, ognik: 'off' as const },
    }
    const md = exportReportToMarkdown({}, [], settings, NOW)
    expect(md).toContain('  - Iskierka: 10s')
    expect(md).toContain('  - Ognik: wyłączony')
    // Bez overrideu — fallback do defaultu poziomu
    expect(md).toContain('  - Płomyk: wyłączony')
    expect(md).toContain('  - Pochodnia: 15s')
  })

  it('uwzględnia flagi anti-cheat', () => {
    const fast: SessionEvent[] = [
      { type: 'answer', ts: 100, outcome: 'correct', responseMs: 500 },
      { type: 'answer', ts: 200, outcome: 'correct', responseMs: 600 },
      { type: 'answer', ts: 300, outcome: 'wrong', responseMs: 700 },
    ]
    const sessions: UnifiedSession[] = [
      fromLettersLog({
        id: 's1',
        startedAt: NOW,
        endedAt: NOW + 1000,
        level: 'iskierka',
        events: fast,
      }),
    ]
    const md = exportReportToMarkdown({}, sessions, defaultSettings, NOW)
    expect(md).toContain('Szybkie klikanie')
  })

  it('sekcja Aktywność pokazuje sesję czytania z etykietą modułu i policzoną dzisiaj', () => {
    const readingLog: ReadingSessionLog = {
      startedAt: NOW,
      endedAt: NOW + 30_000,
      level: 'plomyk',
      events: [
        {
          questionIndex: 0,
          exerciseType: 'word-assembly',
          targetId: 'word-SOWA',
          outcome: 'correct',
          responseMs: 3_000,
          timestamp: NOW + 5_000,
        },
      ],
    }
    const sessions: UnifiedSession[] = [fromReadingLog(readingLog, 0)]
    const md = exportReportToMarkdown({}, sessions, defaultSettings, NOW)
    expect(md).toContain('## Aktywność')
    expect(md).toContain('- Dziś wg modułu:')
    expect(md).toContain('Czytanie: 1 sesji, 1 pytań')
  })

  it('sekcja Flagi anti-cheat pokazuje event modułu Cyferki z etykietą modułu', () => {
    const numbersLog: NumbersSessionLog = {
      startedAt: NOW,
      endedAt: NOW + 1_000,
      level: 'ognik',
      events: [
        {
          factId: 'add-5-2',
          conceptId: 'ognik-doubles',
          exerciseType: 'doubles',
          outcome: 'correct',
          responseMs: 500,
          timestamp: NOW + 100,
        },
        {
          factId: 'add-5-2',
          conceptId: 'ognik-doubles',
          exerciseType: 'doubles',
          outcome: 'correct',
          responseMs: 600,
          timestamp: NOW + 200,
        },
        {
          factId: 'add-5-2',
          conceptId: 'ognik-doubles',
          exerciseType: 'doubles',
          outcome: 'wrong',
          responseMs: 700,
          timestamp: NOW + 300,
        },
      ],
    }
    const sessions: UnifiedSession[] = [fromNumbersLog(numbersLog, 0)]
    const md = exportReportToMarkdown({}, sessions, defaultSettings, NOW)
    expect(md).toContain('## Flagi zaangażowania')
    expect(md).toContain('Szybkie klikanie')
    expect(md).toContain('Cyferki')
  })
})
