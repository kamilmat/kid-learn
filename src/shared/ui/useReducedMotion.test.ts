import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from './useReducedMotion'

type Listener = (e: MediaQueryListEvent) => void

function makeMatchMedia(initialMatches: boolean) {
  const listeners: Listener[] = []
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: 'change', listener: Listener) => {
      listeners.push(listener)
    },
    removeEventListener: (_type: 'change', listener: Listener) => {
      const idx = listeners.indexOf(listener)
      if (idx >= 0) listeners.splice(idx, 1)
    },
  }
  const emit = (matches: boolean) => {
    mql.matches = matches
    for (const listener of listeners) listener({ matches } as MediaQueryListEvent)
  }
  const matchMedia = vi.fn().mockReturnValue(mql)
  return { matchMedia, emit }
}

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when matchMedia reports matches: true', () => {
    const { matchMedia } = makeMatchMedia(true)
    vi.stubGlobal('matchMedia', matchMedia)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('switches result when the change listener fires with matches: true', () => {
    const { matchMedia, emit } = makeMatchMedia(false)
    vi.stubGlobal('matchMedia', matchMedia)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => emit(true))
    expect(result.current).toBe(true)
  })

  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })
})
