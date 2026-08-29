import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionEnd } from './SessionEnd'
import type { SessionEvent } from '@/modules/letters/types'

function makeAudioBus() {
  return { play: vi.fn(() => Promise.resolve(true)) }
}

describe('SessionEnd — druga próba (attempt 2) poza statystykami', () => {
  it('błąd + poprawka po nim liczą się jako 1 pytanie z 1 pomyłką, nie 2', () => {
    // Sekwencja: pytanie "a", pierwsza próba błędna (wybrano "m"), druga
    // próba (retry) poprawna — bez własnego question-start, tak jak loguje
    // to `useSession`.
    const events: SessionEvent[] = [
      {
        type: 'question-start',
        ts: 0,
        targetLetter: 'a',
        distractors: ['m'],
        positions: [0, 1],
        style: 'print',
        case: 'lower',
      },
      {
        type: 'answer',
        ts: 100,
        outcome: 'wrong',
        chosenLetter: 'm',
        chosenPosition: 1,
        responseMs: 500,
      },
      {
        type: 'answer',
        ts: 300,
        outcome: 'correct',
        chosenLetter: 'a',
        chosenPosition: 0,
        responseMs: 200,
        attempt: 2,
      },
    ]

    render(
      <SessionEnd
        iskierki={0}
        totalQuestions={1}
        sessionLength={1}
        events={events}
        onRestart={() => {}}
        onExit={() => {}}
        audioBus={makeAudioBus()}
      />,
    )

    // total = liczba PYTAŃ (1), nie liczba eventów answer (2).
    expect(screen.getByTestId('breakdown-correct')).toHaveTextContent('0')
    expect(screen.getByTestId('breakdown-wrong')).toHaveTextContent('1')
    // Litera "A" nie może wyglądać jak opanowana mimo poprawki w drugiej próbie.
    expect(screen.queryByTestId('best-letters')).not.toBeInTheDocument()
    expect(screen.getByTestId('worst-letters')).toHaveTextContent('A')
    // 0/1 poprawnych na pierwsze podejście — sugestia awansu nie powinna się pojawić.
    expect(screen.queryByTestId('level-up-suggest')).not.toBeInTheDocument()
  })
})
