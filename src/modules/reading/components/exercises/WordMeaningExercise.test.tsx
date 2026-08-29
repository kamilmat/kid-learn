import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WordMeaningExercise } from './WordMeaningExercise'
import { ALL_WORDS } from '../../data/words'

const choices = ['ŻABA', 'BANAN', 'LAMPA', 'ROWER']

function renderExercise(overrides: Partial<Parameters<typeof WordMeaningExercise>[0]> = {}) {
  const onAnswer = vi.fn()
  const onDontKnow = vi.fn()
  const onAudioRepeat = vi.fn()
  render(
    <WordMeaningExercise
      targetWord="ŻABA"
      choices={choices}
      onAnswer={onAnswer}
      onDontKnow={onDontKnow}
      onAudioRepeat={onAudioRepeat}
      {...overrides}
    />,
  )
  return { onAnswer, onDontKnow, onAudioRepeat }
}

describe('WordMeaningExercise', () => {
  it('pokazuje emoji targetu i 4 kafelki słów', () => {
    renderExercise()
    const target = ALL_WORDS.find((w) => w.text === 'ŻABA')!
    expect(screen.getByTestId('word-meaning-emoji').textContent).toBe(target.albumEmoji)
    for (const word of choices) {
      expect(screen.getByLabelText(`słowo ${word}`)).toBeDefined()
    }
  })

  it('nie pokazuje targetu jako tekstu poza kafelkami (obrazek jest jedyną wskazówką)', () => {
    renderExercise()
    expect(screen.getByTestId('word-meaning-emoji').textContent).not.toContain('ŻABA')
  })

  it('tap kafelka woła onAnswer z tym słowem', () => {
    const { onAnswer } = renderExercise()
    fireEvent.click(screen.getByLabelText('słowo BANAN'))
    expect(onAnswer).toHaveBeenCalledWith('BANAN')
  })

  it('🤷 i 🔊 wołają swoje callbacki', () => {
    const { onDontKnow, onAudioRepeat } = renderExercise()
    fireEvent.click(screen.getByLabelText('Nie wiem'))
    expect(onDontKnow).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByLabelText('Powtórz audio'))
    expect(onAudioRepeat).toHaveBeenCalledTimes(1)
  })
})
