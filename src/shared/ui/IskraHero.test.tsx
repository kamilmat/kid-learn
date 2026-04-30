import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { IskraHero, useIskraReaction } from './IskraHero'
import type { IskraState } from './IskraMascot'

const ALL_STATES: IskraState[] = ['idle', 'happy', 'surprise', 'dance']

describe('IskraHero', () => {
  it.each(ALL_STATES)('renders 2 arms + inner mascot for state=%s', (state) => {
    const { getByTestId } = render(<IskraHero state={state} />)
    const root = getByTestId('iskra-hero')
    expect(root.getAttribute('data-state')).toBe(state)
    expect(getByTestId('iskra-hero-arm-left')).toBeInTheDocument()
    expect(getByTestId('iskra-hero-arm-right')).toBeInTheDocument()
    const mascot = getByTestId('iskra-mascot')
    expect(mascot.getAttribute('data-state')).toBe(state)
  })

  it('idleVariant default is "static"', () => {
    const { getByTestId } = render(<IskraHero state="idle" />)
    expect(getByTestId('iskra-hero').getAttribute('data-idle-variant')).toBe('static')
  })

  it('idleVariant="wave" applies to root element', () => {
    const { getByTestId } = render(<IskraHero state="idle" idleVariant="wave" />)
    expect(getByTestId('iskra-hero').getAttribute('data-idle-variant')).toBe('wave')
  })

  it('default size is 180 (width)', () => {
    const { getByTestId } = render(<IskraHero />)
    expect(getByTestId('iskra-hero').style.width).toBe('180px')
  })

  it('honors custom size prop and computes proportional height', () => {
    const { getByTestId } = render(<IskraHero size={120} />)
    const root = getByTestId('iskra-hero')
    expect(root.style.width).toBe('120px')
    expect(root.style.height).toBe('110px')
  })

  it('forwards intensity to inner mascot', () => {
    const { getByTestId } = render(<IskraHero state="idle" intensity="torch" />)
    expect(getByTestId('iskra-mascot').getAttribute('data-intensity')).toBe('torch')
  })
})

describe('useIskraReaction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useIskraReaction())
    expect(result.current.state).toBe('idle')
  })

  it('cheer() sets state to happy for 900ms then back to idle', () => {
    const { result } = renderHook(() => useIskraReaction())
    act(() => {
      result.current.cheer()
    })
    expect(result.current.state).toBe('happy')
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.state).toBe('idle')
  })

  it('dance() sets state to dance for 4000ms then back to idle', () => {
    const { result } = renderHook(() => useIskraReaction())
    act(() => {
      result.current.dance()
    })
    expect(result.current.state).toBe('dance')
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.state).toBe('idle')
  })

  it('cleanup on unmount cancels pending timeout (no state leak)', () => {
    const { result, unmount } = renderHook(() => useIskraReaction())
    act(() => {
      result.current.cheer()
    })
    unmount()
    expect(() => {
      vi.advanceTimersByTime(2000)
    }).not.toThrow()
  })
})
