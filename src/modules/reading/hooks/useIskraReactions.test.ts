import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIskraReactions } from './useIskraReactions'

describe('useIskraReactions', () => {
  it('starts with idle reaction', () => {
    const { result } = renderHook(() => useIskraReactions())
    expect(result.current.reaction.type).toBe('idle')
  })

  it('triggerEasterEgg sets reaction to easter-egg', () => {
    const { result } = renderHook(() => useIskraReactions(() => 0.5))
    act(() => result.current.triggerEasterEgg())
    expect(result.current.reaction.type).toBe('easter-egg')
  })

  it('triggerComicFail sets reaction to comic-fail with variant', () => {
    const { result } = renderHook(() => useIskraReactions(() => 0))
    act(() => result.current.triggerComicFail())
    expect(result.current.reaction.type).toBe('comic-fail')
    if (result.current.reaction.type === 'comic-fail') {
      expect(['scratch', 'eatBanana', 'confusionDance', 'sigh', 'sillyFace']).toContain(result.current.reaction.variant)
    }
  })

  it('triggerStreak sets reaction with level', () => {
    const { result } = renderHook(() => useIskraReactions())
    act(() => result.current.triggerStreak(2))
    expect(result.current.reaction.type).toBe('streak')
    if (result.current.reaction.type === 'streak') {
      expect(result.current.reaction.level).toBe(2)
    }
  })

  it('reaction returns to idle after duration', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useIskraReactions(() => 0))
    act(() => result.current.triggerComicFail())
    expect(result.current.reaction.type).toBe('comic-fail')
    act(() => { vi.advanceTimersByTime(1100) })
    expect(result.current.reaction.type).toBe('idle')
    vi.useRealTimers()
  })
})
