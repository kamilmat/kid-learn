import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { usePageVisibility } from './usePageVisibility'

function Harness(props: Parameters<typeof usePageVisibility>[0]) {
  usePageVisibility(props)
  return null
}

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  // Przywróć domyślny stan visibilityState — jsdom zwykle ma 'visible'.
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  })
})

describe('usePageVisibility', () => {
  it('wywołuje onHidden gdy visibilityState=hidden', () => {
    const onHidden = vi.fn()
    const onVisible = vi.fn()
    render(<Harness onHidden={onHidden} onVisible={onVisible} enabled />)

    act(() => setVisibility('hidden'))
    expect(onHidden).toHaveBeenCalledTimes(1)
    expect(onVisible).not.toHaveBeenCalled()
  })

  it('wywołuje onVisible gdy visibilityState=visible', () => {
    const onHidden = vi.fn()
    const onVisible = vi.fn()
    render(<Harness onHidden={onHidden} onVisible={onVisible} enabled />)

    act(() => setVisibility('hidden'))
    act(() => setVisibility('visible'))
    expect(onVisible).toHaveBeenCalledTimes(1)
  })

  it('enabled=false nie słucha event-u', () => {
    const onHidden = vi.fn()
    const onVisible = vi.fn()
    render(<Harness onHidden={onHidden} onVisible={onVisible} enabled={false} />)

    act(() => setVisibility('hidden'))
    expect(onHidden).not.toHaveBeenCalled()
  })

  it('cleanup przy unmount usuwa listener', () => {
    const onHidden = vi.fn()
    const onVisible = vi.fn()
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = render(
      <Harness onHidden={onHidden} onVisible={onVisible} enabled />,
    )
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

    act(() => setVisibility('hidden'))
    expect(onHidden).not.toHaveBeenCalled()
    removeSpy.mockRestore()
  })

  it('cleanup gdy enabled przechodzi na false', () => {
    const onHidden = vi.fn()
    const onVisible = vi.fn()
    const { rerender } = render(
      <Harness onHidden={onHidden} onVisible={onVisible} enabled />,
    )
    rerender(<Harness onHidden={onHidden} onVisible={onVisible} enabled={false} />)
    act(() => setVisibility('hidden'))
    expect(onHidden).not.toHaveBeenCalled()
  })
})
