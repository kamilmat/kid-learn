import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  LettersSection,
  sortLettersWeakestFirst,
  weaknessScore,
  masteryPercent,
  lastExposures,
} from './LettersSection'
import { createInitialLetterState } from '@/shared/srs/createInitialLetterState'
import type { LetterState } from '@/shared/srs/types'
import type { SessionLog } from '@/shared/stats/types'

function makeLetter(
  letter: string,
  patch: Partial<LetterState> = {},
): LetterState {
  return { ...createInitialLetterState(letter), ...patch }
}

describe('LettersSection helpers', () => {
  it('sortLettersWeakestFirst sortuje od najsłabszej do najmocniejszej', () => {
    const letters: Record<string, LetterState> = {
      a: makeLetter('a', { totalSeen: 10, totalCorrect: 9, totalWrong: 1 }),
      b: makeLetter('b', { totalSeen: 10, totalCorrect: 2, totalWrong: 8 }),
      c: makeLetter('c', { totalSeen: 10, totalCorrect: 5, totalWrong: 5 }),
    }
    const sorted = sortLettersWeakestFirst(letters)
    expect(sorted.map((s) => s.letter)).toEqual(['b', 'c', 'a'])
  })

  it('weaknessScore -Infinity dla nigdy nie widzianych', () => {
    expect(weaknessScore(makeLetter('a'))).toBe(-Infinity)
  })

  it('masteryPercent: box=1 → 0%, box=5 → 100%', () => {
    expect(masteryPercent(makeLetter('a', { box: 1, totalSeen: 1 }))).toBe(0)
    expect(masteryPercent(makeLetter('a', { box: 5, totalSeen: 1 }))).toBe(100)
    expect(masteryPercent(makeLetter('a', { box: 3, totalSeen: 1 }))).toBe(50)
    // niewidziana → 0
    expect(masteryPercent(makeLetter('a', { box: 5 }))).toBe(0)
  })

  it('lastExposures wyciąga outcome z eventów dla danej litery', () => {
    const session: SessionLog = {
      id: 's1',
      startedAt: 0,
      endedAt: 1,
      level: 'iskierka',
      events: [
        {
          type: 'question-start',
          ts: 1,
          targetLetter: 'a',
          distractors: [],
          positions: [],
          style: 'print',
          case: 'lower',
        },
        { type: 'answer', ts: 2, outcome: 'correct', responseMs: 1000 },
        {
          type: 'question-start',
          ts: 3,
          targetLetter: 'b',
          distractors: [],
          positions: [],
          style: 'print',
          case: 'lower',
        },
        { type: 'answer', ts: 4, outcome: 'wrong', responseMs: 2000 },
        {
          type: 'question-start',
          ts: 5,
          targetLetter: 'a',
          distractors: [],
          positions: [],
          style: 'print',
          case: 'lower',
        },
        { type: 'answer', ts: 6, outcome: 'wrong', responseMs: 3000 },
      ],
    }
    expect(lastExposures('a', [session])).toEqual(['correct', 'wrong'])
    expect(lastExposures('b', [session])).toEqual(['wrong'])
    expect(lastExposures('c', [session])).toEqual([])
  })
})

describe('LettersSection render', () => {
  it('pokazuje pustą wiadomość gdy brak liter', () => {
    render(<LettersSection letters={{}} sessions={[]} />)
    expect(screen.getByTestId('letters-empty')).toBeInTheDocument()
  })

  it('renderuje wiersze z poprawnym data-box i sortuje od najsłabszej', () => {
    const letters: Record<string, LetterState> = {
      a: makeLetter('a', {
        totalSeen: 10,
        totalCorrect: 9,
        totalWrong: 1,
        box: 4,
      }),
      b: makeLetter('b', {
        totalSeen: 10,
        totalCorrect: 2,
        totalWrong: 8,
        box: 1,
      }),
    }
    render(<LettersSection letters={letters} sessions={[]} />)
    const rowA = screen.getByTestId('letter-row-a')
    const rowB = screen.getByTestId('letter-row-b')
    expect(rowA).toHaveAttribute('data-box', '4')
    expect(rowB).toHaveAttribute('data-box', '1')
    // B (najsłabsza) powinno wystąpić wcześniej w DOM
    const order = Array.from(
      document.querySelectorAll('[data-letter]'),
    ).map((el) => el.getAttribute('data-letter'))
    expect(order).toEqual(['b', 'a'])
  })

  it('klik na literę pokazuje ekspander', () => {
    const letters: Record<string, LetterState> = {
      a: makeLetter('a', {
        totalSeen: 5,
        totalCorrect: 3,
        totalWrong: 2,
        avgResponseMs: 2500,
        confusedWith: { b: 2, c: 1 },
        perStyle: {
          print: { correct: 2, wrong: 1 },
          handwritten: { correct: 1, wrong: 1 },
        },
        perCase: {
          upper: { correct: 1, wrong: 1 },
          lower: { correct: 2, wrong: 1 },
        },
      }),
    }
    render(<LettersSection letters={letters} sessions={[]} />)

    expect(screen.queryByTestId('letter-row-a-detail')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('letter-row-a-toggle'))
    const detail = screen.getByTestId('letter-row-a-detail')
    expect(detail).toBeInTheDocument()
    expect(detail.textContent).toContain('Średni czas')
    expect(detail.textContent).toContain('mylone z B')
    // klik ponownie zwija
    fireEvent.click(screen.getByTestId('letter-row-a-toggle'))
    expect(screen.queryByTestId('letter-row-a-detail')).not.toBeInTheDocument()
  })
})
