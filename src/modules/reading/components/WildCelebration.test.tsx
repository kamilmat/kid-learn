import { describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { WildCelebration } from './WildCelebration'
import { WILD_CELEBRATIONS } from '../data/wildCelebrations'

describe('WildCelebration', () => {
  it('renders the Component for the def', () => {
    const def = WILD_CELEBRATIONS[0]!  // rocket
    render(<WildCelebration def={def} audioBus={{ play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(screen.getByTestId('wild-rocket-blast')).toBeDefined()
  })

  it('plays audio sequence', () => {
    const def = WILD_CELEBRATIONS[0]!
    const playMock = vi.fn().mockResolvedValue(undefined)
    render(<WildCelebration def={def} audioBus={{ play: playMock, stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(playMock).toHaveBeenCalled()
  })

  it('calls onComplete after duration', async () => {
    vi.useFakeTimers()
    const def = WILD_CELEBRATIONS[0]!
    const onComplete = vi.fn()
    render(<WildCelebration def={def} audioBus={{ play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }} onComplete={onComplete} />)
    await act(async () => { vi.advanceTimersByTime(def.durationMs + 100) })
    expect(onComplete).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
