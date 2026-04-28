import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WordScene } from './WordScene'

describe('WordScene', () => {
  const baseScene = {
    id: 'test-v1',
    emoji: '🐱',
    durationMs: 100,
    keyframes: [{ name: 'testKf', css: '@keyframes testKf { 0%,100% { transform: scale(1); } }' }],
    audio: [],
  }

  it('renders emoji', () => {
    render(<WordScene scene={baseScene} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(screen.getByText('🐱')).toBeDefined()
  })

  it('renders data-testid word-scene', () => {
    render(<WordScene scene={baseScene} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(screen.getByTestId('word-scene')).toBeDefined()
  })

  it('calls onComplete after durationMs', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    render(<WordScene scene={{ ...baseScene, durationMs: 1000 }} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={onComplete} />)
    vi.advanceTimersByTime(1100)
    expect(onComplete).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('plays audio sequence', () => {
    const playMock = vi.fn().mockResolvedValue(undefined)
    render(<WordScene scene={{ ...baseScene, audio: ['word-MAMA', 'sfx-heart-beat'] }} audioBus={{ play: playMock, stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(playMock).toHaveBeenCalled()
  })

  it('renders without effects when effects is undefined', () => {
    const sceneNoEffects = { ...baseScene, effects: undefined }
    render(<WordScene scene={sceneNoEffects} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(screen.getByTestId('word-scene')).toBeDefined()
  })

  it('renders hearts effect', () => {
    const sceneWithHearts = { ...baseScene, effects: ['hearts'] }
    const { container } = render(<WordScene scene={sceneWithHearts} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={vi.fn()} />)
    // hearts effect renders 💗 and ❤️
    expect(container.textContent).toContain('💗')
  })

  it('renders stars effect', () => {
    const sceneWithStars = { ...baseScene, effects: ['stars'] }
    const { container } = render(<WordScene scene={sceneWithStars} audioBus={{ play: vi.fn(), stop: vi.fn() }} onComplete={vi.fn()} />)
    expect(container.textContent).toContain('⭐')
  })
})
