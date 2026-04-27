import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  SuggestionsSection,
  generateSuggestions,
  isResponseTimeIncreasing,
} from './SuggestionsSection'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import type { LetterState } from '@/shared/srs/types'
import type { SessionEvent, SessionLog } from '@/shared/stats/types'

function makeLetter(
  letter: string,
  patch: Partial<LetterState> = {},
): LetterState {
  return { ...createInitialLetterState(letter), ...patch }
}

function answersSession(
  startedAt: number,
  responseMsList: number[],
): SessionLog {
  const events: SessionEvent[] = []
  for (let i = 0; i < responseMsList.length; i++) {
    events.push({
      type: 'answer',
      ts: startedAt + i,
      outcome: 'correct',
      responseMs: responseMsList[i]!,
    })
  }
  return {
    id: `s-${startedAt}`,
    startedAt,
    endedAt: startedAt + 1000,
    level: 'iskierka',
    events,
  }
}

describe('generateSuggestions', () => {
  it('zwraca stałe rekomendacje nawet dla pustych danych', () => {
    const out = generateSuggestions({}, [])
    expect(out.some((s) => s.includes('snem'))).toBe(true)
    expect(out.some((s) => s.includes('mentorem'))).toBe(true)
    expect(out.some((s) => s.includes('dziennie'))).toBe(true)
  })

  it('wyłapuje najsłabsze 3 i najmocniejsze 3 litery', () => {
    const letters: Record<string, LetterState> = {
      a: makeLetter('a', { totalSeen: 10, totalCorrect: 9, totalWrong: 1 }),
      b: makeLetter('b', { totalSeen: 10, totalCorrect: 1, totalWrong: 9 }),
      c: makeLetter('c', { totalSeen: 10, totalCorrect: 8, totalWrong: 2 }),
      d: makeLetter('d', { totalSeen: 10, totalCorrect: 3, totalWrong: 7 }),
      e: makeLetter('e', { totalSeen: 10, totalCorrect: 7, totalWrong: 3 }),
      f: makeLetter('f', { totalSeen: 10, totalCorrect: 2, totalWrong: 8 }),
    }
    const out = generateSuggestions(letters, [])
    const weakest = out.find((s) => s.startsWith('Najsłabsze litery'))
    const strongest = out.find((s) => s.startsWith('Świetnie poszło'))
    expect(weakest).toBeDefined()
    expect(strongest).toBeDefined()
    // B i F i D powinny być najsłabsze (po polish-uppercase)
    expect(weakest).toContain('B')
    expect(weakest).toContain('F')
    expect(weakest).toContain('D')
    // A, C, E najmocniejsze
    expect(strongest).toContain('A')
    expect(strongest).toContain('C')
    expect(strongest).toContain('E')
  })

  it('pomija litery nie widziane w sortowaniu najsłabszych', () => {
    const letters: Record<string, LetterState> = {
      a: makeLetter('a'), // nie widziana
      b: makeLetter('b', { totalSeen: 5, totalCorrect: 1, totalWrong: 4 }),
    }
    const out = generateSuggestions(letters, [])
    const weakest = out.find((s) => s.startsWith('Najsłabsze litery'))
    // 'A' nie powinno się tam pojawić jako "letter"
    expect(weakest).not.toContain('A,')
    expect(weakest).toContain('B')
  })

  it('isResponseTimeIncreasing wykrywa wzrost 1.25x', () => {
    const sessions: SessionLog[] = [
      answersSession(0, [1000, 1000, 1000]),
      answersSession(10_000, [2000, 2000, 2000]),
    ]
    expect(isResponseTimeIncreasing(sessions)).toBe(true)
  })

  it('isResponseTimeIncreasing = false dla podobnych czasów', () => {
    const sessions: SessionLog[] = [
      answersSession(0, [1000, 1100, 1050]),
      answersSession(10_000, [1100, 1050, 1100]),
    ]
    expect(isResponseTimeIncreasing(sessions)).toBe(false)
  })

  it('dodaje sugestię o zmęczeniu jeśli czas rośnie', () => {
    const sessions: SessionLog[] = [
      answersSession(0, [1000, 1000, 1000]),
      answersSession(10_000, [3000, 3000, 3000]),
    ]
    const out = generateSuggestions({}, sessions)
    expect(out.some((s) => s.includes('zmęczone'))).toBe(true)
  })
})

describe('SuggestionsSection render', () => {
  it('renderuje listę sugestii', () => {
    render(<SuggestionsSection letters={{}} sessions={[]} />)
    const items = screen.getAllByTestId('suggestion-item')
    expect(items.length).toBeGreaterThanOrEqual(3)
  })
})
