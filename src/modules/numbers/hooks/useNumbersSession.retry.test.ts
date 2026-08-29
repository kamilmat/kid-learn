// Druga próba po błędzie (moduł 3) — ten sam kontrakt co w modułach 1 i 2:
// pierwsza pomyłka rusza SRS i liczniki, poprawka idzie tylko do logu.

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
const { extractCorrectValue } = await import('../data/correctValue')

const makeAudioBus = () => ({ play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() })

/** Box 3 — inaczej `wrong` (box − 2) utknąłby na dolnym progu 1 i nic nie widać. */
function seedFactAtBox3(factId: string): void {
  useNumbers.setState((s) => {
    const fact = s.facts[factId]
    if (!fact) return s
    return { facts: { ...s.facts, [factId]: { ...fact, box: 3 } } }
  })
}

describe('useNumbersSession — druga próba po błędzie', () => {
  beforeEach(() => {
    useNumbers.getState().reset()
    localStorage.clear()
  })

  it('błąd → status retry z [poprawna, wybrana]; poprawka nie zmienia boxa ani liczników', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 2 }),
    )

    act(() => result.current.start())
    const question = result.current.currentQuestion!
    const factId = question.factId
    const correct = extractCorrectValue(question)!
    const chosen = correct + 1
    seedFactAtBox3(factId)

    act(() => result.current.answer('wrong', 1, chosen))
    expect(result.current.status).toBe('feedback')
    expect(result.current.counters).toEqual({ correct: 0, wrong: 1, dontKnow: 0 })

    // Overlay feedbacku wybrzmiał → ekran drugiej próby (bez nowego pytania).
    act(() => result.current.advance())
    expect(result.current.status).toBe('retry')
    expect(result.current.retryChoices).toEqual([correct, chosen])
    expect(result.current.currentQuestion?.factId).toBe(factId)
    expect(result.current.questionIdx).toBe(0)
    expect(audioBus.play).toHaveBeenCalledWith('try-again')

    act(() => result.current.answer('correct', 2))
    expect(result.current.lastAttempt).toBe(2)
    // Liczniki (i procenty w podsumowaniu) opisują pierwsze podejście.
    expect(result.current.counters).toEqual({ correct: 0, wrong: 1, dontKnow: 0 })

    act(() => result.current.advance())
    expect(result.current.status).toBe('asking')
    expect(result.current.questionIdx).toBe(1)
    expect(result.current.retryChoices).toBeNull()

    act(() => result.current.flush())
    const fact = useNumbers.getState().facts[factId]!
    // Box ruszył dokładnie raz (3 → 1 za błąd); retry-correct go nie podnosi.
    expect(fact.box).toBe(1)
    expect(fact.recentWrong).toBe(1)

    const events = useNumbers.getState().sessions.at(-1)!.events
    expect(events).toHaveLength(2)
    expect(events[0]!.attempt).toBeUndefined()
    expect(events[1]!.attempt).toBe(2)
  })

  it('secondAttempt: false → po błędzie od razu następne pytanie', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useNumbersSession({
        level: 'iskierka',
        audioBus,
        questionCount: 2,
        secondAttempt: false,
      }),
    )

    act(() => result.current.start())
    const correct = extractCorrectValue(result.current.currentQuestion!)!

    act(() => result.current.answer('wrong', 1, correct + 1))
    act(() => result.current.advance())
    expect(result.current.status).toBe('asking')
    expect(result.current.retryChoices).toBeNull()
    expect(result.current.questionIdx).toBe(1)
  })

  it('🤷 nie planuje drugiej próby (brak hipotezy do skorygowania)', () => {
    const audioBus = makeAudioBus()
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 2 }),
    )

    act(() => result.current.start())
    act(() => result.current.answer('dontKnow'))
    act(() => result.current.advance())
    expect(result.current.status).toBe('asking')
    expect(result.current.retryChoices).toBeNull()
  })
})
