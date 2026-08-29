import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('plays audio sequence', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined)
    render(<WordScene scene={{ ...baseScene, audio: ['word-MAMA', 'sfx-heart-beat'] }} audioBus={{ play: playMock, stop: vi.fn() }} onComplete={vi.fn()} />)
    await waitFor(() => expect(playMock).toHaveBeenCalled())
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

  it('plays the scene audio exactly once under StrictMode (phantom double-effect)', async () => {
    // Regression: StrictMode's cancelled phantom first effect run used to
    // stamp playedRef synchronously, making the real second run see
    // alreadyPlayed=true and skip the word clip entirely.
    const playMock = vi.fn().mockResolvedValue(undefined)
    const scene = { ...baseScene, audio: ['word-test'] }
    render(
      <StrictMode>
        <WordScene scene={scene} audioBus={{ play: playMock, stop: vi.fn() }} onComplete={vi.fn()} />
      </StrictMode>
    )
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1))
    expect(playMock).toHaveBeenCalledWith('word-test')
  })

  it('does not replay audio on remount after the scene already completed (pause/resume)', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined)
    const scene = { ...baseScene, audio: ['word-test'] }
    const playedRef = { current: null as string | null }

    const { unmount } = render(
      <WordScene scene={scene} audioBus={{ play: playMock, stop: vi.fn() }} onComplete={vi.fn()} playedRef={playedRef} />
    )
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1))
    unmount()

    render(
      <WordScene scene={scene} audioBus={{ play: playMock, stop: vi.fn() }} onComplete={vi.fn()} playedRef={playedRef} />
    )
    // Give any (unwanted) async replay a chance to happen before asserting.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(playMock).toHaveBeenCalledTimes(1)
  })
})
