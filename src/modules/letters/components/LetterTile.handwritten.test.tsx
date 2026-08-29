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

describe('LetterTile — shared HandwrittenLetter (czterolinia)', () => {
  it('renders an <svg> with 4 <line> elements for tylko-pisane', () => {
    const { container } = renderTile({ styleMode: 'tylko-pisane' })
    const svg = screen.getByTestId('handwritten-letter')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(container.querySelectorAll('line')).toHaveLength(4)
  })

  it('renders only print-letter for tylko-drukowane, no svg', () => {
    const { container } = renderTile({ styleMode: 'tylko-drukowane' })
    expect(screen.getByTestId('print-letter')).toBeInTheDocument()
    expect(screen.queryByTestId('handwritten-letter')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })
})
