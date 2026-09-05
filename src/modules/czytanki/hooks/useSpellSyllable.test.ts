import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSpellSyllable, SPELL_WHOLE } from './useSpellSyllable'

function makeBus() {
  const played: string[] = []
  return {
    played,
    play: vi.fn(async (key: string) => {
      played.push(key)
      return true
    }),
    stop: vi.fn(),
  }
}

describe('useSpellSyllable', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('gra literki po kolei, a na końcu całą sylabę', async () => {
    const bus = makeBus()
    const { result } = renderHook(() => useSpellSyllable({ audioBus: bus }))
    act(() => result.current.spell('0-0-0', 'SZY'))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(bus.played).toEqual(['cz-let-sz', 'letter-y', 'cz-syl-szy'])
    await waitFor(() => expect(result.current.spelling).toBeNull())
  })

  it('podświetla kolejne literki, a przy klamrze całą sylabę', async () => {
    // Bus, który kończy klip dopiero na żądanie — inaczej stany podświetlenia
    // przelatują szybciej, niż test zdąży je zobaczyć.
    const releases: Array<() => void> = []
    const bus = {
      play: vi.fn(() => new Promise<boolean>((resolve) => releases.push(() => resolve(true)))),
      stop: vi.fn(),
    }
    const endClip = async () => {
      await act(async () => {
        releases.shift()?.()
        await vi.advanceTimersByTimeAsync(500)
      })
    }
    const { result } = renderHook(() => useSpellSyllable({ audioBus: bus }))
    act(() => result.current.spell('0-0-0', 'KO'))
    await waitFor(() => expect(result.current.spelling).toEqual({ key: '0-0-0', index: 0 }))
    await endClip()
    expect(result.current.spelling).toEqual({ key: '0-0-0', index: 1 })
    await endClip()
    expect(result.current.spelling).toEqual({ key: '0-0-0', index: SPELL_WHOLE })
    await endClip()
    expect(result.current.spelling).toBeNull()
  })

  it('sylaba jednoliterowa nie dostaje klamry', async () => {
    const bus = makeBus()
    const { result } = renderHook(() => useSpellSyllable({ audioBus: bus }))
    act(() => result.current.spell('0-0-0', 'O'))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(bus.played).toEqual(['letter-o'])
  })

  it('stop przerywa sekwencję i gasi podświetlenie', async () => {
    const bus = makeBus()
    const { result } = renderHook(() => useSpellSyllable({ audioBus: bus }))
    act(() => result.current.spell('0-0-0', 'KO'))
    await waitFor(() => expect(bus.played.length).toBe(1))
    act(() => result.current.stop())
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(bus.played).toEqual(['letter-k'])
    expect(result.current.spelling).toBeNull()
  })

  it('tap w inną sylabę zaczyna od nowa', async () => {
    const bus = makeBus()
    const { result } = renderHook(() => useSpellSyllable({ audioBus: bus }))
    act(() => result.current.spell('0-0-0', 'KO'))
    await waitFor(() => expect(bus.played.length).toBe(1))
    act(() => result.current.spell('0-0-1', 'TA'))
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(bus.played).toEqual(['letter-k', 'letter-t', 'letter-a', 'cz-syl-ta'])
    expect(bus.stop).toHaveBeenCalled()
  })
})
