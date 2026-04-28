import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyllableFillExercise } from './SyllableFillExercise'

describe('SyllableFillExercise', () => {
  const baseProps = {
    targetWord: 'KAPELUSZ',
    visibleSyllables: ['KA', 'PE'],
    missingPosition: 'last' as const,
    missingSyllable: 'LUSZ',
    choices: ['LUSZ', 'TUSZ', 'BUSZ', 'KOSZ'],
    onAnswer: vi.fn(),
    onDontKnow: vi.fn(),
    onAudioRepeat: vi.fn(),
  }

  it('renders visible syllables', () => {
    render(<SyllableFillExercise {...baseProps} />)
    expect(screen.getByText('KA')).toBeDefined()
    expect(screen.getByText('PE')).toBeDefined()
  })

  it('renders 4 syllable choices', () => {
    render(<SyllableFillExercise {...baseProps} />)
    for (const c of ['LUSZ', 'TUSZ', 'BUSZ', 'KOSZ']) {
      expect(screen.getByLabelText(`sylaba ${c}`)).toBeDefined()
    }
  })

  it('calls onAnswer with chosen syllable', () => {
    const onAnswer = vi.fn()
    render(<SyllableFillExercise {...baseProps} onAnswer={onAnswer} />)
    fireEvent.click(screen.getByLabelText('sylaba LUSZ'))
    expect(onAnswer).toHaveBeenCalledWith('LUSZ')
  })

  it('renders gap at missingPosition=last', () => {
    render(<SyllableFillExercise {...baseProps} />)
    expect(screen.getByTestId('gap-slot')).toBeDefined()
  })

  it('renders gap at missingPosition=first', () => {
    render(
      <SyllableFillExercise
        {...baseProps}
        visibleSyllables={['PE', 'LUSZ']}
        missingPosition="first"
        missingSyllable="KA"
        choices={['KA', 'TA', 'LA', 'PA']}
      />,
    )
    expect(screen.getByTestId('gap-slot')).toBeDefined()
  })

  it('renders gap at missingPosition=middle', () => {
    render(
      <SyllableFillExercise
        {...baseProps}
        visibleSyllables={['KA', 'LUSZ']}
        missingPosition="middle"
        missingSyllable="PE"
        choices={['PE', 'TE', 'ME', 'SE']}
      />,
    )
    expect(screen.getByTestId('gap-slot')).toBeDefined()
  })

  it('calls onDontKnow when "Nie wiem" tapped', () => {
    const onDontKnow = vi.fn()
    render(<SyllableFillExercise {...baseProps} onDontKnow={onDontKnow} />)
    fireEvent.click(screen.getByLabelText(/Nie wiem/i))
    expect(onDontKnow).toHaveBeenCalled()
  })

  it('calls onAudioRepeat when 🔊 button tapped', () => {
    const onAudioRepeat = vi.fn()
    render(<SyllableFillExercise {...baseProps} onAudioRepeat={onAudioRepeat} />)
    fireEvent.click(screen.getByLabelText(/Powtórz audio/i))
    expect(onAudioRepeat).toHaveBeenCalled()
  })
})
