import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReadingLevelSelect } from './ReadingLevelSelect'

const mockBus = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }

describe('ReadingLevelSelect', () => {
  it('renders 4 level tiles', () => {
    render(<MemoryRouter><ReadingLevelSelect onSelect={vi.fn()} audioBus={mockBus} /></MemoryRouter>)
    expect(screen.getByLabelText(/Iskierka/i)).toBeDefined()
    expect(screen.getByLabelText(/Płomyk/i)).toBeDefined()
    expect(screen.getByLabelText(/Ognik/i)).toBeDefined()
    expect(screen.getByLabelText(/Pochodnia/i)).toBeDefined()
  })

  it('calls onSelect with level when tile tapped', () => {
    const onSelect = vi.fn()
    render(<MemoryRouter><ReadingLevelSelect onSelect={onSelect} audioBus={mockBus} /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText(/Iskierka/i))
    expect(onSelect).toHaveBeenCalledWith('iskierka')
  })

  it('plays nav-tap audio on tile click', () => {
    render(<MemoryRouter><ReadingLevelSelect onSelect={vi.fn()} audioBus={mockBus} /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText(/Płomyk/i))
    expect(mockBus.play).toHaveBeenCalledWith('nav-tap')
  })
})
