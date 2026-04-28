import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WordChoiceExercise } from './WordChoiceExercise'

describe('WordChoiceExercise', () => {
  it('renders 4 word choices', () => {
    render(
      <WordChoiceExercise
        targetWord="TATA"
        choices={['TATA', 'MAMA', 'BABA', 'LALA']}
        onAnswer={vi.fn()}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />,
    )
    for (const c of ['TATA', 'MAMA', 'BABA', 'LALA']) expect(screen.getByText(c)).toBeDefined()
  })

  it('calls onAnswer with chosen word', () => {
    const onAnswer = vi.fn()
    render(
      <WordChoiceExercise
        targetWord="TATA"
        choices={['TATA', 'MAMA', 'BABA', 'LALA']}
        onAnswer={onAnswer}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText(/słowo TATA/i))
    expect(onAnswer).toHaveBeenCalledWith('TATA')
  })

  it('calls onDontKnow when "Nie wiem" tapped', () => {
    const onDontKnow = vi.fn()
    render(
      <WordChoiceExercise
        targetWord="TATA"
        choices={['TATA', 'MAMA', 'BABA', 'LALA']}
        onAnswer={vi.fn()}
        onDontKnow={onDontKnow}
        onAudioRepeat={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText(/Nie wiem/i))
    expect(onDontKnow).toHaveBeenCalled()
  })

  it('calls onAudioRepeat when 🔊 button tapped', () => {
    const onAudioRepeat = vi.fn()
    render(
      <WordChoiceExercise
        targetWord="TATA"
        choices={['TATA', 'MAMA', 'BABA', 'LALA']}
        onAnswer={vi.fn()}
        onDontKnow={vi.fn()}
        onAudioRepeat={onAudioRepeat}
      />,
    )
    fireEvent.click(screen.getByLabelText(/Powtórz audio/i))
    expect(onAudioRepeat).toHaveBeenCalled()
  })
})
