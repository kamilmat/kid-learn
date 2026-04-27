import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { useCountdown, type UseCountdownProps, type UseCountdownResult } from './useCountdown'

function Harness({
  onResult,
  ...props
}: UseCountdownProps & { onResult: (r: UseCountdownResult) => void }) {
  const result = useCountdown(props)
  onResult(result)
  return null
}

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('zwraca remainingMs=null gdy running=false', () => {
    let last: UseCountdownResult | null = null
    render(
      <Harness
        durationMs={1000}
        running={false}
        onResult={(r) => {
          last = r
        }}
      />,
    )
    expect(last!.remainingMs).toBeNull()
    expect(last!.progress).toBe(0)
  })

  it('zwraca remainingMs=null gdy durationMs=null', () => {
    let last: UseCountdownResult | null = null
    render(
      <Harness
        durationMs={null}
        running
        onResult={(r) => {
          last = r
        }}
      />,
    )
    expect(last!.remainingMs).toBeNull()
  })

  it('liczy progress 0→1 i wywołuje onTimeout', () => {
    const onTimeout = vi.fn()
    const results: UseCountdownResult[] = []
    render(
      <Harness
        durationMs={1000}
        running
        onTimeout={onTimeout}
        onResult={(r) => {
          results.push(r)
        }}
      />,
    )

    expect(results[0]!.remainingMs).toBe(1000)
    expect(results[0]!.progress).toBe(0)

    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(onTimeout).toHaveBeenCalledTimes(1)
    const tail = results[results.length - 1]!
    expect(tail.remainingMs).toBe(0)
    expect(tail.progress).toBe(1)
  })

  it('wywołuje onWarning3s gdy zostaje <=3s', () => {
    const onWarning = vi.fn()
    render(
      <Harness
        durationMs={5000}
        running
        onWarning3s={onWarning}
        onResult={() => {}}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(2500) // remaining = 2500 ≤ 3000
    })
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('reset gdy durationMs się zmieni', () => {
    const results: UseCountdownResult[] = []
    const { rerender } = render(
      <Harness
        durationMs={1000}
        running
        onResult={(r) => {
          results.push(r)
        }}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(500)
    })
    rerender(
      <Harness
        durationMs={2000}
        running
        onResult={(r) => {
          results.push(r)
        }}
      />,
    )
    const tail = results[results.length - 1]!
    expect(tail.remainingMs).toBe(2000)
  })

  it('cleanup przy unmount nie wywołuje onTimeout', () => {
    const onTimeout = vi.fn()
    const { unmount } = render(
      <Harness durationMs={500} running onTimeout={onTimeout} onResult={() => {}} />,
    )
    unmount()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
