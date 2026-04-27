import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuizCard } from './QuizCard'
import type { QuizCardProps } from './QuizCard'
import type { Question } from '@/modules/letters/types'

function makeQuestion(): Question {
  return {
    index: 0,
    targetLetter: 'b',
    tiles: ['b', 'a', 'm', 't'],
    targetSlot: 0,
    chosenCase: 'lower',
    chosenStyle: 'print',
    pairOnTile: false,
    bothStyles: false,
    startedAt: 0,
  }
}

function renderCard(overrides: Partial<QuizCardProps> = {}) {
  const props: QuizCardProps = {
    question: makeQuestion(),
    caseMode: 'tylko-male',
    styleMode: 'tylko-drukowane',
    questionNumber: 1,
    totalQuestions: 5,
    iskierki: 2,
    countdownMs: 10000,
    countdownTotalMs: 15000,
    interactive: true,
    onTileClick: vi.fn(),
    onPlayAudio: vi.fn(),
    onDontKnow: vi.fn(),
    onPause: vi.fn(),
    ...overrides,
  }
  return { ...render(<QuizCard {...props} />), props }
}

describe('QuizCard', () => {
  it('renders four letter tiles', () => {
    renderCard()
    expect(screen.getAllByRole('button', { name: /Litera/ })).toHaveLength(4)
  })

  it('shows the iskierki counter with current value', () => {
    renderCard({ iskierki: 7 })
    expect(screen.getByTestId('iskierki-counter')).toHaveTextContent('7')
  })

  it('shows progress dots equal to total questions', () => {
    renderCard({ totalQuestions: 5 })
    expect(screen.getByTestId('progress-dots').children).toHaveLength(5)
  })

  it('renders countdown bar when countdown is active', () => {
    renderCard()
    expect(screen.getByTestId('countdown-bar')).toBeInTheDocument()
  })

  it('hides countdown bar when countdownMs is null', () => {
    renderCard({ countdownMs: null, countdownTotalMs: null })
    expect(screen.queryByTestId('countdown-bar')).not.toBeInTheDocument()
  })

  it('invokes onTileClick with letter and slot when a tile is tapped', () => {
    const onTileClick = vi.fn()
    renderCard({ onTileClick })
    screen.getByTestId('tile-2').click()
    expect(onTileClick).toHaveBeenCalledWith('m', 2)
  })

  it('invokes onDontKnow when the dont-know button is tapped', () => {
    const onDontKnow = vi.fn()
    renderCard({ onDontKnow })
    screen.getByTestId('dont-know-button').click()
    expect(onDontKnow).toHaveBeenCalledTimes(1)
  })

  it('invokes onPlayAudio when the audio button is tapped', () => {
    const onPlayAudio = vi.fn()
    renderCard({ onPlayAudio })
    screen.getByTestId('audio-button').click()
    expect(onPlayAudio).toHaveBeenCalledTimes(1)
  })

  it('invokes onPause when the pause button is tapped', () => {
    const onPause = vi.fn()
    renderCard({ onPause })
    screen.getByTestId('pause-button').click()
    expect(onPause).toHaveBeenCalledTimes(1)
  })

  it('disables tiles when not interactive', () => {
    const onTileClick = vi.fn()
    renderCard({ interactive: false, onTileClick })
    screen.getByTestId('tile-0').click()
    expect(onTileClick).not.toHaveBeenCalled()
  })

  it('applies custom tileState for feedback rendering', () => {
    renderCard({ tileState: { 0: 'correct' } })
    expect(screen.getByTestId('tile-0')).toHaveAttribute('data-state', 'correct')
  })
})
