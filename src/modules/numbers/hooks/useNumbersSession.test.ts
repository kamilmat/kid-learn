import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number { return this.store.size }
  clear(): void { this.store.clear() }
  getItem(key: string): string | null { return this.store.has(key) ? (this.store.get(key) as string) : null }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string): void { this.store.delete(key) }
  setItem(key: string, value: string): void { this.store.set(key, String(value)) }
}

if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const memStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { value: memStorage, configurable: true, writable: true })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: memStorage, configurable: true, writable: true })
  }
}

const { useNumbers } = await import('../store/numbersStore')
const { useNumbersSession } = await import('./useNumbersSession')

describe('useNumbersSession', () => {
  beforeEach(() => {
    useNumbers.getState().reset()
    localStorage.clear()
  })

  it('starts session and picks first question', () => {
    const audioBus = { play: vi.fn(), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 4 }),
    )
    expect(result.current.status).toBe('asking')
    act(() => result.current.start())
    expect(result.current.currentQuestion).not.toBeNull()
    expect(audioBus.play).toHaveBeenCalledWith('session-start-iskierka')
    expect(audioBus.stop).toHaveBeenCalled()
  })

  it('advances through questionCount and ends', () => {
    const audioBus = { play: vi.fn(), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 2 }),
    )
    act(() => result.current.start())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    expect(result.current.status).toBe('ended')
    expect(result.current.counters.correct).toBe(2)
  })

  it('updates fact box after correct answer', () => {
    const audioBus = { play: vi.fn(), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 1 }),
    )
    act(() => result.current.start())
    const factId = result.current.currentQuestion?.factId
    expect(factId).toBeDefined()
    const beforeBox = useNumbers.getState().facts[factId!]?.box
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    const afterBox = useNumbers.getState().facts[factId!]?.box
    expect(afterBox).toBeGreaterThan(beforeBox ?? 0)
  })

  it('saves session log', () => {
    const audioBus = { play: vi.fn(), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'plomyk', audioBus, questionCount: 1 }),
    )
    act(() => result.current.start())
    act(() => result.current.answer('wrong'))
    act(() => result.current.advance())
    const sessions = useNumbers.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.level).toBe('plomyk')
    expect(sessions[0]?.events).toHaveLength(1)
    expect(sessions[0]?.events[0]?.outcome).toBe('wrong')
  })

  it('pause + resume keeps current question', () => {
    const audioBus = { play: vi.fn(), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 4 }),
    )
    act(() => result.current.start())
    const q1 = result.current.currentQuestion
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')
    act(() => result.current.resume())
    expect(result.current.status).toBe('asking')
    expect(result.current.currentQuestion).toEqual(q1)
  })
})
