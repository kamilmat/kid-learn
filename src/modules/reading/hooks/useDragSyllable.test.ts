import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragSyllable } from './useDragSyllable'

describe('useDragSyllable', () => {
  it('detects correct drop into right slot', () => {
    const onDropCorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      onDropCorrect,
      onDropIncorrect: vi.fn(),
    }))
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-MA-1', data: { current: { syllable: 'MA' } } },
        over: { id: 'slot-0' },
      } as any)
    })
    expect(onDropCorrect).toHaveBeenCalledWith({ slotIndex: 0, syllable: 'MA' })
  })

  it('calls onDropIncorrect when over is null', () => {
    const onDropIncorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      onDropCorrect: vi.fn(),
      onDropIncorrect,
    }))
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-MA-1', data: { current: { syllable: 'MA' } } },
        over: null,
      } as any)
    })
    expect(onDropIncorrect).toHaveBeenCalled()
  })

  it('calls onDropIncorrect when wrong syllable in slot', () => {
    const onDropIncorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      onDropCorrect: vi.fn(),
      onDropIncorrect,
    }))
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-TA-1', data: { current: { syllable: 'TA' } } },
        over: { id: 'slot-0' },
      } as any)
    })
    expect(onDropIncorrect).toHaveBeenCalled()
  })

  it('calls onDropIncorrect when slot id does not match pattern', () => {
    const onDropIncorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      onDropCorrect: vi.fn(),
      onDropIncorrect,
    }))
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-MA-1', data: { current: { syllable: 'MA' } } },
        over: { id: 'unknown-target' },
      } as any)
    })
    expect(onDropIncorrect).toHaveBeenCalled()
  })

  it('detects correct drop into second slot', () => {
    const onDropCorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['KO', 'TY'],
      onDropCorrect,
      onDropIncorrect: vi.fn(),
    }))
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-TY-2', data: { current: { syllable: 'TY' } } },
        over: { id: 'slot-1' },
      } as any)
    })
    expect(onDropCorrect).toHaveBeenCalledWith({ slotIndex: 1, syllable: 'TY' })
  })

  it('falls back to parsing syllable from active.id when data.current is missing', () => {
    const onDropCorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      onDropCorrect,
      onDropIncorrect: vi.fn(),
    }))
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-MA-1', data: { current: null } },
        over: { id: 'slot-0' },
      } as any)
    })
    expect(onDropCorrect).toHaveBeenCalledWith({ slotIndex: 0, syllable: 'MA' })
  })

  it('calls onDropIncorrect when slotIndex out of bounds', () => {
    const onDropIncorrect = vi.fn()
    const { result } = renderHook(() => useDragSyllable({
      slots: ['MA', 'MA'],
      onDropCorrect: vi.fn(),
      onDropIncorrect,
    }))
    act(() => {
      result.current.onDragEnd({
        active: { id: 'syl-MA-1', data: { current: { syllable: 'MA' } } },
        over: { id: 'slot-5' },
      } as any)
    })
    expect(onDropIncorrect).toHaveBeenCalled()
  })
})
