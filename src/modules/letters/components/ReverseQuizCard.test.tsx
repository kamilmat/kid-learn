import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ReverseQuizCard } from './ReverseQuizCard'
import type { Question } from '@/modules/letters/types'

const question: Question = {
  index: 4,
  kind: 'letter-to-sound',
  targetLetter: 'm',
  tiles: ['a', 'm', 'l'],
  targetSlot: 1,
  chosenCase: 'lower',
  chosenStyle: 'drukowany',
  pairOnTile: false,
  bothStyles: false,
  startedAt: 0,
}

function renderCard(overrides: Partial<Parameters<typeof ReverseQuizCard>[0]> = {}) {
  const onPlayCandidate = vi.fn()
  const onTileClick = vi.fn()
  render(
    <ReverseQuizCard
      question={question}
      caseMode="tylko-male"
      styleMode="tylko-drukowane"
      questionNumber={5}
      totalQuestions={10}
      iskierki={3}
      wrongCount={0}
      dontKnowCount={0}
      mascotIntensity="calm"
      interactive
      onPlayCandidate={onPlayCandidate}
      onTileClick={onTileClick}
      onDontKnow={vi.fn()}
      onPause={vi.fn()}
      {...overrides}
    />,
  )
  return { onPlayCandidate, onTileClick }
}

describe('ReverseQuizCard', () => {
  it('tap kafelka odsłuchuje kandydata i NIE jest odpowiedzią', () => {
    const { onPlayCandidate, onTileClick } = renderCard()

    fireEvent.click(screen.getByTestId('candidate-0'))
    fireEvent.click(screen.getByTestId('candidate-2'))

    expect(onPlayCandidate.mock.calls).toEqual([['a'], ['l']])
    expect(onTileClick).not.toHaveBeenCalled()
  })

  it('osobny przycisk ✔ pod kafelkiem jest odpowiedzią', () => {
    const { onPlayCandidate, onTileClick } = renderCard()

    fireEvent.click(screen.getByTestId('confirm-1'))

    expect(onTileClick).toHaveBeenCalledWith('m', 1)
    expect(onPlayCandidate).not.toHaveBeenCalled()
  })

  it('pokazuje literę-cel i zachowuje 🤷 oraz ⏸', () => {
    renderCard()

    expect(screen.getByTestId('reverse-target-letter')).toHaveTextContent('m')
    expect(screen.getByTestId('dont-know-button')).toBeInTheDocument()
    expect(screen.getByTestId('pause-button')).toBeInTheDocument()
  })

  it('blokuje odsłuch i odpowiedź gdy nieinteraktywne (feedback/pauza)', () => {
    const { onPlayCandidate, onTileClick } = renderCard({ interactive: false })

    fireEvent.click(screen.getByTestId('candidate-0'))
    fireEvent.click(screen.getByTestId('confirm-1'))

    expect(onPlayCandidate).not.toHaveBeenCalled()
    expect(onTileClick).not.toHaveBeenCalled()
  })
})
