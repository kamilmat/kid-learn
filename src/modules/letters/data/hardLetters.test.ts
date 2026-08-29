import { describe, expect, it } from 'vitest'
import type { LetterState } from '@/shared/srs/types'
import type { SessionLog } from '@/shared/stats/types'
import {
  HARD_LETTERS_CAP,
  configLevelForHard,
  selectHardLetters,
} from './hardLetters'

const NOW = 1_000_000_000

function state(letter: string, over: Partial<LetterState> = {}): LetterState {
  return {
    id: `letter-${letter}`,
    letter,
    box: 3,
    lastSeen: NOW - 3_600_000,
    totalSeen: 5,
    totalCorrect: 3,
    totalWrong: 2,
    totalDontKnow: 0,
    totalTimeout: 0,
    recentWrong: 0,
    avgResponseMs: 2000,
    masteredAt: null,
    confusedWith: {},
    perStyle: { print: { correct: 0, wrong: 0 }, handwritten: { correct: 0, wrong: 0 } },
    perCase: { upper: { correct: 0, wrong: 0 }, lower: { correct: 0, wrong: 0 } },
    ...over,
  }
}

function map(...states: LetterState[]): Record<string, LetterState> {
  return Object.fromEntries(states.map((s) => [s.letter, s]))
}

function log(level: SessionLog['level']): SessionLog {
  return { id: `s-${level}`, startedAt: NOW, endedAt: NOW, level, events: [] }
}

describe('selectHardLetters', () => {
  it('pomija litery jeszcze nie widziane (totalSeen === 0)', () => {
    const letters = map(state('a', { totalSeen: 0, box: 1, recentWrong: 0 }))
    expect(selectHardLetters(letters, NOW)).toEqual([])
  })

  it('pomija utrwalone bez świeżych błędów (box 4, recentWrong 0)', () => {
    const letters = map(state('a', { box: 4, recentWrong: 0 }))
    expect(selectHardLetters(letters, NOW)).toEqual([])
  })

  it('bierze literę ze świeżym błędem nawet przy box 5', () => {
    const letters = map(state('a', { box: 5, recentWrong: 1 }))
    expect(selectHardLetters(letters, NOW)).toEqual(['a'])
  })

  it('bierze litery słabo utrwalone (box <= 2) bez świeżych błędów', () => {
    const letters = map(
      state('a', { box: 1, recentWrong: 0 }),
      state('b', { box: 2, recentWrong: 0 }),
      state('c', { box: 3, recentWrong: 0 }),
    )
    expect([...selectHardLetters(letters, NOW)].sort()).toEqual(['a', 'b'])
  })

  it('tnie wynik do cap=8 przy 10 kandydatach', () => {
    const letters = map(
      ...'abcdefghij'.split('').map((l) => state(l, { box: 1, recentWrong: 1 })),
    )
    expect(HARD_LETTERS_CAP).toBe(8)
    expect(selectHardLetters(letters, NOW)).toHaveLength(8)
  })

  it('sortuje malejąco po score — najtrudniejsze pierwsze', () => {
    const letters = map(
      state('a', { box: 2, recentWrong: 0 }),
      state('b', { box: 1, recentWrong: 3 }),
    )
    expect(selectHardLetters(letters, NOW)[0]).toBe('b')
  })

  it('respektuje jawny cap', () => {
    const letters = map(
      state('a', { box: 1, recentWrong: 1 }),
      state('b', { box: 1, recentWrong: 1 }),
      state('c', { box: 1, recentWrong: 1 }),
    )
    expect(selectHardLetters(letters, NOW, 2)).toHaveLength(2)
  })
})

describe('configLevelForHard', () => {
  it('bez sesji → iskierka', () => {
    expect(configLevelForHard([])).toBe('iskierka')
  })

  it('bierze najwyższy poziom z historii', () => {
    expect(configLevelForHard([log('plomyk'), log('ognik'), log('iskierka')])).toBe(
      'ognik',
    )
  })

  it('ignoruje tryby bez poziomu (hard/daily)', () => {
    expect(configLevelForHard([log('hard'), log('daily')])).toBe('iskierka')
    expect(configLevelForHard([log('plomyk'), log('hard')])).toBe('plomyk')
  })

  it('bierze lastUsedLevel, gdy historię wypełniły same hard/daily', () => {
    // Repro białego ekranu: 50 sesji powtórkowych wypycha z okna wszystkie
    // wpisy poziomowe, więc sama historia dałaby `iskierka` (6 liter), a
    // „Trudne literki" celują w ż/ź/ń z Pochodni.
    const history = Array.from({ length: 50 }, (_, i) =>
      i % 2 === 0 ? log('hard') : log('daily'),
    )
    expect(configLevelForHard(history)).toBe('iskierka')
    expect(configLevelForHard(history, 'pochodnia')).toBe('pochodnia')
  })

  it('bierze wyższy z historii i lastUsedLevel', () => {
    expect(configLevelForHard([log('ognik')], 'iskierka')).toBe('ognik')
    expect(configLevelForHard([log('iskierka')], 'ognik')).toBe('ognik')
    expect(configLevelForHard([], null)).toBe('iskierka')
  })
})
