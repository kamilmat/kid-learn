import { describe, expect, it } from 'vitest'
import { generateSuggestions, type SuggestionInput } from './suggestions'
import type { UnifiedSession } from './aggregate'
import { STATS_MODULE_LABEL, type StatsModuleId } from './aggregate'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import type { LetterState } from '@/shared/srs/types'
import type { SyllableState } from '@/modules/reading/types'
import type { ConceptMastery } from '@/modules/numbers/types'

const NOW = new Date(2026, 7, 29, 18, 0, 0).getTime()
const DAY = 24 * 60 * 60 * 1_000

function session(
  module: StatsModuleId,
  startedAt: number,
  questions = 8,
): UnifiedSession {
  return {
    id: `${module}-${startedAt}`,
    startedAt,
    endedAt: startedAt + 5 * 60_000,
    level: 'iskierka',
    events: [],
    module,
    moduleLabel: STATS_MODULE_LABEL[module],
    questions,
    correct: questions,
    wrong: 0,
    dontKnow: 0,
    retries: 0,
  }
}

function hardLetters(n: number): Record<string, LetterState> {
  const out: Record<string, LetterState> = {}
  for (const letter of ['a', 'b', 'c', 'd', 'e'].slice(0, n)) {
    out[letter] = {
      ...createInitialLetterState(letter),
      totalSeen: 6,
      recentWrong: 2,
    }
  }
  return out
}

function base(patch: Partial<SuggestionInput> = {}): SuggestionInput {
  return { now: NOW, letters: {}, allSessions: [], ...patch }
}

describe('generateSuggestions', () => {
  it('bez żadnych danych zwraca dokładnie jedną sugestię (fallback z Liter)', () => {
    const out = generateSuggestions(base())
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('fallback')
    expect(out[0]!.text).toContain('Liter')
    expect(out[0]!.why).not.toBe('')
  })

  it('sesja sprzed 4 dni → no-activity na pierwszym miejscu, przed regułami niższego priorytetu', () => {
    const out = generateSuggestions(
      base({
        allSessions: [session('letters', NOW - 4 * DAY)],
        letters: hardLetters(3),
      }),
    )
    expect(out[0]!.id).toBe('no-activity')
    expect(out.map((s) => s.id)).toContain('hard-items')
    // posortowane malejąco po priorytecie
    const priorities = out.map((s) => s.priority)
    expect([...priorities].sort((a, b) => b - a)).toEqual(priorities)
  })

  // ODSTĘPSTWO od briefu: reguła „brak sesji od ≥3 dni" patrzy na ostatnią
  // sesję, więc sesja DZIŚ ją wyłącza — inaczej karta mówiłaby „wróćcie do
  // nauki" dziecku, które właśnie ćwiczyło. Wtedy wygrywa `two-sessions`.
  it('sesja sprzed 4 dni i jedna dziś → no-activity nie wchodzi, karta to two-sessions', () => {
    const out = generateSuggestions(
      base({
        allSessions: [
          session('letters', NOW - 4 * DAY),
          // reading/numbers wczoraj — inaczej wchodzi `module-cold` (5)
          session('reading', NOW - DAY),
          session('numbers', NOW - DAY),
          session('letters', NOW - 60_000),
        ],
      }),
    )
    expect(out.map((s) => s.id)).not.toContain('no-activity')
    expect(out[0]!.id).toBe('two-sessions')
  })

  it('moduł nigdy nietknięty dostaje „zacznijcie", nie „wróćcie"', () => {
    const out = generateSuggestions(
      base({ allSessions: [session('letters', NOW - 60_000)] }),
    )
    const cold = out.filter((s) => s.id === 'module-cold')
    expect(cold.map((s) => s.module)).toEqual(['reading', 'numbers'])
    for (const s of cold) {
      expect(s.text).toContain('Zacznijcie')
      expect(s.text).not.toContain('Wróćcie')
    }
  })

  it('moduł tknięty, ale ponad 7 dni temu → „wróćcie"', () => {
    const out = generateSuggestions(
      base({
        allSessions: [
          session('letters', NOW - 60_000),
          session('reading', NOW - 9 * DAY),
          session('numbers', NOW - 60_000),
        ],
      }),
    )
    const cold = out.find((s) => s.id === 'module-cold')
    expect(cold?.module).toBe('reading')
    expect(cold?.text).toContain('Wróćcie')
  })

  it('brakujące snapshoty (numbers/reading/czytanki: undefined) nie rzucają', () => {
    expect(() =>
      generateSuggestions(
        base({
          allSessions: [session('letters', NOW - 60_000)],
          numbers: undefined,
          reading: undefined,
          czytanki: undefined,
        }),
      ),
    ).not.toThrow()
  })

  it('liczy trudne sylaby razem z literami', () => {
    const syllables: Record<string, SyllableState> = {
      'syl-MA': {
        id: 'syl-MA',
        syllable: 'MA',
        box: 1,
        lastSeen: NOW,
        recentWrong: 2,
        totalSeen: 4,
        totalCorrect: 1,
        totalWrong: 3,
      },
      'syl-LO': {
        id: 'syl-LO',
        syllable: 'LO',
        box: 1,
        lastSeen: NOW,
        recentWrong: 3,
        totalSeen: 4,
        totalCorrect: 1,
        totalWrong: 3,
      },
    }
    const out = generateSuggestions(
      base({
        allSessions: [session('letters', NOW - 60_000)],
        letters: hardLetters(1),
        reading: { syllables, words: {} },
      }),
    )
    const hard = out.find((s) => s.id === 'hard-items')
    expect(hard).toBeDefined()
    expect(hard!.why).toContain('3')
  })

  it('koncept w nauce od ponad 14 dni daje concept-stuck z nazwą konceptu', () => {
    const mastery: ConceptMastery = {
      state: 'learning',
      firstSeenAt: NOW - 20 * DAY,
      lastSeenAt: NOW - DAY,
      correctStreak: 0,
      factsTouched: [],
      recentOutcomes: [],
      factsCorrect: [],
    }
    const out = generateSuggestions(
      base({
        allSessions: [
          session('letters', NOW - 60_000),
          session('numbers', NOW - 60_000),
        ],
        numbers: { facts: {}, concepts: { 'plomyk-bonds-10': mastery } },
      }),
    )
    const stuck = out.find((s) => s.id === 'concept-stuck')
    expect(stuck?.text).toContain('Rozkład 6-10')
  })

  it('otwarte czytanki bez żadnego powtórzenia dają reread', () => {
    const out = generateSuggestions(
      base({
        allSessions: [session('letters', NOW - 60_000)],
        czytanki: { openedIds: ['cz-1', 'cz-2'], readCounts: { 'cz-1': 1 } },
      }),
    )
    expect(out.map((s) => s.id)).toContain('reread')
  })

  it('czytanka przeczytana 2× wyłącza reread', () => {
    const out = generateSuggestions(
      base({
        allSessions: [session('letters', NOW - 60_000)],
        czytanki: { openedIds: ['cz-1'], readCounts: { 'cz-1': 2 } },
      }),
    )
    expect(out.map((s) => s.id)).not.toContain('reread')
  })

  it('gdy żadna reguła nie pasuje, zostaje fallback', () => {
    const out = generateSuggestions(
      base({
        allSessions: [
          session('letters', NOW - 60_000),
          session('reading', NOW - 60_000),
          session('numbers', NOW - 60_000),
        ],
        czytanki: { openedIds: ['cz-1'], readCounts: { 'cz-1': 3 } },
      }),
    )
    // 3 sesje dziś → two-sessions nie wchodzi; nic innego nie pasuje
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('fallback')
  })
})
