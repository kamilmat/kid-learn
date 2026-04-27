import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { useIdleDetector } from './useIdleDetector'

function Harness(props: Parameters<typeof useIdleDetector>[0]) {
  useIdleDetector(props)
  return null
}

describe('useIdleDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('wywołuje onIdle po thresholdMs braku interakcji', () => {
    const onIdle = vi.fn()
    render(<Harness thresholdMs={1000} onIdle={onIdle} enabled />)

    expect(onIdle).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(onIdle).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('resetuje timer przy każdej interakcji', () => {
    const onIdle = vi.fn()
    render(<Harness thresholdMs={500} onIdle={onIdle} enabled />)

    act(() => {
      vi.advanceTimersByTime(400)
    })
    act(() => {
      document.dispatchEvent(new Event('pointerdown'))
    })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(onIdle).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('wywołuje onResume gdy interakcja przyjdzie po idle', () => {
    const onIdle = vi.fn()
    const onResume = vi.fn()
    render(<Harness thresholdMs={500} onIdle={onIdle} onResume={onResume} enabled />)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onIdle).toHaveBeenCalledTimes(1)
    expect(onResume).not.toHaveBeenCalled()

    act(() => {
      document.dispatchEvent(new Event('keydown'))
    })
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('nie wywołuje onResume gdy interakcja przyjdzie przed idle', () => {
    const onIdle = vi.fn()
    const onResume = vi.fn()
    render(<Harness thresholdMs={500} onIdle={onIdle} onResume={onResume} enabled />)

    act(() => {
      vi.advanceTimersByTime(100)
      document.dispatchEvent(new Event('pointerdown'))
    })
    expect(onResume).not.toHaveBeenCalled()
    expect(onIdle).not.toHaveBeenCalled()
  })

  it('enabled=false nie odpala timera ani nie słucha eventów', () => {
    const onIdle = vi.fn()
    render(<Harness thresholdMs={500} onIdle={onIdle} enabled={false} />)

    act(() => {
      vi.advanceTimersByTime(2000)
      document.dispatchEvent(new Event('pointerdown'))
    })
    expect(onIdle).not.toHaveBeenCalled()
  })

  it('cleanup przy unmount usuwa listenery i czyści timer', () => {
    const onIdle = vi.fn()
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = render(<Harness thresholdMs={500} onIdle={onIdle} enabled />)
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onIdle).not.toHaveBeenCalled()
    removeSpy.mockRestore()
  })

  it('reaguje na touchstart', () => {
    const onIdle = vi.fn()
    render(<Harness thresholdMs={500} onIdle={onIdle} enabled />)

    act(() => {
      vi.advanceTimersByTime(400)
      document.dispatchEvent(new Event('touchstart'))
      vi.advanceTimersByTime(400)
    })
    expect(onIdle).not.toHaveBeenCalled()
  })
})
