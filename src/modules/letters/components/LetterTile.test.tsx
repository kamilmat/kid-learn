import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LetterTile } from './LetterTile'
import type { LetterTileProps } from './LetterTile'

function renderTile(overrides: Partial<LetterTileProps> = {}) {
  const props: LetterTileProps = {
    letter: 'b',
    caseMode: 'tylko-duze',
    styleMode: 'tylko-drukowane',
    chosenCase: 'lower',
    state: 'idle',
    onClick: vi.fn(),
    ...overrides,
  }
  return { ...render(<LetterTile {...props} />), props }
}

describe('LetterTile — caseMode', () => {
  it('renders uppercase form for tylko-duze', () => {
    renderTile({ caseMode: 'tylko-duze' })
    expect(screen.getByRole('button')).toHaveTextContent('B')
  })

  it('renders lowercase form for tylko-male', () => {
    renderTile({ caseMode: 'tylko-male' })
    expect(screen.getByRole('button')).toHaveTextContent('b')
  })

  it('renders pair "Bb" for para', () => {
    renderTile({ caseMode: 'para' })
    expect(screen.getByRole('button')).toHaveTextContent('Bb')
  })

  it('uses chosenCase=upper in mieszane', () => {
    renderTile({ caseMode: 'mieszane', chosenCase: 'upper' })
    expect(screen.getByRole('button')).toHaveTextContent('B')
  })

  it('uses chosenCase=lower in mieszane', () => {
    renderTile({ caseMode: 'mieszane', chosenCase: 'lower' })
    expect(screen.getByRole('button')).toHaveTextContent('b')
  })
})

describe('LetterTile — styleMode', () => {
  it('renders only print for tylko-drukowane', () => {
    renderTile({ styleMode: 'tylko-drukowane' })
    expect(screen.getByTestId('print-letter')).toBeInTheDocument()
  })

  it('renders only handwritten for tylko-pisane', () => {
    renderTile({ styleMode: 'tylko-pisane' })
    expect(screen.getByTestId('handwritten-letter')).toBeInTheDocument()
  })

  it('renders both styles for oba-na-kafelku', () => {
    renderTile({ styleMode: 'oba-na-kafelku' })
    expect(screen.getByTestId('print-letter')).toBeInTheDocument()
    expect(screen.getByTestId('handwritten-letter')).toBeInTheDocument()
  })

  it('renders only print for mieszane-per-pytanie default branch', () => {
    renderTile({ styleMode: 'mieszane-per-pytanie' })
    expect(screen.queryByTestId('handwritten-letter')).not.toBeInTheDocument()
  })
})

describe('LetterTile — state', () => {
  it('marks data-state idle by default', () => {
    renderTile({ state: 'idle' })
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'idle')
  })

  it('marks data-state correct', () => {
    renderTile({ state: 'correct' })
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'correct')
  })

  it('marks data-state wrong', () => {
    renderTile({ state: 'wrong' })
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'wrong')
  })

  it('scales the highlighted-correct tile', () => {
    renderTile({ state: 'highlighted-correct' })
    expect(screen.getByRole('button').style.transform).toBe('scale(1.2)')
  })
})

describe('LetterTile — interaction', () => {
  it('invokes onClick when tapped', () => {
    const onClick = vi.fn()
    renderTile({ onClick })
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not invoke onClick when disabled', () => {
    const onClick = vi.fn()
    renderTile({ onClick, disabled: true })
    screen.getByRole('button').click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
