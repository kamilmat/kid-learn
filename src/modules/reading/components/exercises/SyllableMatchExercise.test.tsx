import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyllableMatchExercise } from './SyllableMatchExercise'

describe('SyllableMatchExercise', () => {
  it('renders 4 syllable choices', () => {
    render(
      <SyllableMatchExercise
        targetSyllable="MA"
        choices={['MA', 'TA', 'LA', 'KO']}
        onAnswer={vi.fn()}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />,
    )
    for (const c of ['MA', 'TA', 'LA', 'KO']) expect(screen.getByText(c)).toBeDefined()
  })

  it('calls onAnswer with chosen syllable', () => {
    const onAnswer = vi.fn()
    render(
      <SyllableMatchExercise
        targetSyllable="MA"
        choices={['MA', 'TA', 'LA', 'KO']}
        onAnswer={onAnswer}
        onDontKnow={vi.fn()}
        onAudioRepeat={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText(/sylaba TA/i))
    expect(onAnswer).toHaveBeenCalledWith('TA')
  })

  it('calls onDontKnow when "Nie wiem" tapped', () => {
    const onDontKnow = vi.fn()
    render(
      <SyllableMatchExercise
        targetSyllable="MA"
        choices={['MA', 'TA', 'LA', 'KO']}
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
      <SyllableMatchExercise
        targetSyllable="MA"
        choices={['MA', 'TA', 'LA', 'KO']}
        onAnswer={vi.fn()}
        onDontKnow={vi.fn()}
        onAudioRepeat={onAudioRepeat}
      />,
    )
    fireEvent.click(screen.getByLabelText(/Powtórz audio/i))
    expect(onAudioRepeat).toHaveBeenCalled()
  })
})
