import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FeedbackOverlay } from './SessionView'

function deferredBus() {
  const resolvers: Array<(ok: boolean) => void> = []
  const play = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        resolvers.push(resolve)
      }),
  )
  return { bus: { play, stop: vi.fn() }, resolvers, play }
}

describe('FeedbackOverlay (moduł 3)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('przy błędzie kolejkuje korektę + "tu było N" i czeka na koniec audio', async () => {
    const { bus, resolvers, play } = deferredBus()
    const onAdvance = vi.fn()

    render(
      <FeedbackOverlay
        outcome="wrong"
        correctValue={25}
        audioBus={bus}
        onAdvance={onAdvance}
      />,
    )

    expect(play).toHaveBeenCalledWith('try-again-soft')
    expect(play).toHaveBeenCalledWith('correct-show-25')

    // Stary kod przechodził dalej po 2200 ms, ucinając korektę.
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(onAdvance).not.toHaveBeenCalled()

    await act(async () => {
      for (const resolve of resolvers) resolve(true)
    })
    await act(async () => {
      vi.advanceTimersByTime(2200)
    })
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })

  it('trzyma minimalny czas overlayu gdy audio kończy się natychmiast', async () => {
    const bus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const onAdvance = vi.fn()

    render(
      <FeedbackOverlay
        outcome="correct"
        correctValue={null}
        audioBus={bus}
        onAdvance={onAdvance}
      />,
    )

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(onAdvance).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })

  it('nie przechodzi dalej po odmontowaniu (pauza w trakcie feedbacku)', async () => {
    const { bus, resolvers } = deferredBus()
    const onAdvance = vi.fn()

    const { unmount } = render(
      <FeedbackOverlay
        outcome="dontKnow"
        correctValue={7}
        audioBus={bus}
        onAdvance={onAdvance}
      />,
    )
    unmount()

    await act(async () => {
      for (const resolve of resolvers) resolve(false)
      vi.advanceTimersByTime(20_000)
    })
    expect(onAdvance).not.toHaveBeenCalled()
  })
})
