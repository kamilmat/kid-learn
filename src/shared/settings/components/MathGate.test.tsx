// Polyfill localStorage for persist middleware before importing store.
// (Node 25 ma experimental built-in localStorage który shadowuje jsdom — patrz
// settingsStore.test.ts).
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

if (
  typeof localStorage === 'undefined' ||
  typeof localStorage.clear !== 'function'
) {
  const memStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: memStorage,
    configurable: true,
    writable: true,
  })
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      value: memStorage,
      configurable: true,
      writable: true,
    })
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

const { MathGate } = await import('./MathGate')
const { useSettings } = await import('@/shared/settings/settingsStore')
type MathProblem = import('@/shared/settings/types').MathProblem

const PROBLEM_A: MathProblem = {
  a: 7,
  b: 8,
  c: 5,
  answer: 10,
  expression: '7 + 8 - 5',
}
const PROBLEM_B: MathProblem = {
  a: 9,
  b: 6,
  c: 4,
  answer: 11,
  expression: '9 + 6 - 4',
}
const PROBLEM_C: MathProblem = {
  a: 8,
  b: 7,
  c: 9,
  answer: 6,
  expression: '8 + 7 - 9',
}

const reset = () => {
  localStorage.clear()
  useSettings.getState()._resetForTests()
}

function makeSequenceGenerator(...problems: MathProblem[]): () => MathProblem {
  let i = 0
  return () => {
    const p = problems[Math.min(i, problems.length - 1)]!
    i++
    return p
  }
}

describe('MathGate', () => {
  beforeEach(() => {
    reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the current math expression and a numeric input', () => {
    render(
      <MathGate
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
        generateProblem={makeSequenceGenerator(PROBLEM_A)}
      />,
    )
    expect(screen.getByTestId('math-gate-expression')).toHaveTextContent(
      '7 + 8 - 5 = ?',
    )
    const input = screen.getByTestId('math-gate-input') as HTMLInputElement
    expect(input.type).toBe('number')
    expect(input.inputMode).toBe('numeric')
  })

  it('renders optional reason in title', () => {
    render(
      <MathGate
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
        reason="aby otworzyć ustawienia"
        generateProblem={makeSequenceGenerator(PROBLEM_A)}
      />,
    )
    expect(screen.getByTestId('math-gate-title')).toHaveTextContent(
      'Tylko dla rodzica — aby otworzyć ustawienia',
    )
  })

  it('calls onSuccess and unlocks gate on correct answer', () => {
    const onSuccess = vi.fn()
    render(
      <MathGate
        onSuccess={onSuccess}
        onCancel={vi.fn()}
        generateProblem={makeSequenceGenerator(PROBLEM_A)}
        now={() => 1_000_000}
      />,
    )
    fireEvent.change(screen.getByTestId('math-gate-input'), {
      target: { value: '10' },
    })
    fireEvent.click(screen.getByTestId('math-gate-submit'))
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(useSettings.getState().isUnlocked(1_000_000)).toBe(true)
  })

  it('does not call onSuccess on wrong answer and shows fail message', () => {
    const onSuccess = vi.fn()
    render(
      <MathGate
        onSuccess={onSuccess}
        onCancel={vi.fn()}
        generateProblem={makeSequenceGenerator(PROBLEM_A, PROBLEM_B)}
        now={() => 0}
      />,
    )
    fireEvent.change(screen.getByTestId('math-gate-input'), {
      target: { value: '99' },
    })
    fireEvent.click(screen.getByTestId('math-gate-submit'))
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByTestId('math-gate-error')).toHaveTextContent(
      'Nie tym razem, spróbuj ponownie',
    )
  })

  it('generates a NEW problem after each failed attempt (anti-memorization)', () => {
    const onSuccess = vi.fn()
    render(
      <MathGate
        onSuccess={onSuccess}
        onCancel={vi.fn()}
        generateProblem={makeSequenceGenerator(PROBLEM_A, PROBLEM_B, PROBLEM_C)}
        now={() => 0}
      />,
    )
    expect(screen.getByTestId('math-gate-expression')).toHaveTextContent(
      '7 + 8 - 5 = ?',
    )
    fireEvent.change(screen.getByTestId('math-gate-input'), {
      target: { value: '99' },
    })
    fireEvent.click(screen.getByTestId('math-gate-submit'))
    // Po pierwszej porażce → nowy problem (PROBLEM_B).
    expect(screen.getByTestId('math-gate-expression')).toHaveTextContent(
      '9 + 6 - 4 = ?',
    )
    fireEvent.change(screen.getByTestId('math-gate-input'), {
      target: { value: '99' },
    })
    fireEvent.click(screen.getByTestId('math-gate-submit'))
    expect(screen.getByTestId('math-gate-expression')).toHaveTextContent(
      '8 + 7 - 9 = ?',
    )
  })

  it('shows cooldown countdown after 3 failed attempts and disables submit', () => {
    vi.useFakeTimers()
    const onSuccess = vi.fn()
    let nowMs = 0
    render(
      <MathGate
        onSuccess={onSuccess}
        onCancel={vi.fn()}
        generateProblem={makeSequenceGenerator(
          PROBLEM_A,
          PROBLEM_B,
          PROBLEM_C,
          PROBLEM_A,
        )}
        now={() => nowMs}
      />,
    )

    for (let i = 0; i < 3; i++) {
      fireEvent.change(screen.getByTestId('math-gate-input'), {
        target: { value: '99' },
      })
      fireEvent.click(screen.getByTestId('math-gate-submit'))
      nowMs += 100
    }

    // Cooldown view widoczny.
    const cooldown = screen.getByTestId('math-gate-cooldown')
    expect(cooldown).toBeInTheDocument()
    expect(cooldown.textContent).toMatch(/Spróbuj za 60s/)

    // Submit button nie jest renderowany w trybie cooldown.
    expect(screen.queryByTestId('math-gate-submit')).not.toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('cancel button calls onCancel', () => {
    const onCancel = vi.fn()
    render(
      <MathGate
        onSuccess={vi.fn()}
        onCancel={onCancel}
        generateProblem={makeSequenceGenerator(PROBLEM_A)}
      />,
    )
    fireEvent.click(screen.getByTestId('math-gate-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('submit is disabled when input is empty', () => {
    render(
      <MathGate
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
        generateProblem={makeSequenceGenerator(PROBLEM_A)}
      />,
    )
    const submit = screen.getByTestId('math-gate-submit') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByTestId('math-gate-input'), {
      target: { value: '10' },
    })
    expect(submit.disabled).toBe(false)
  })

  it('cooldown timer ticks down each second', () => {
    vi.useFakeTimers()
    let nowMs = 0
    render(
      <MathGate
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
        generateProblem={makeSequenceGenerator(
          PROBLEM_A,
          PROBLEM_B,
          PROBLEM_C,
          PROBLEM_A,
        )}
        now={() => nowMs}
      />,
    )
    for (let i = 0; i < 3; i++) {
      fireEvent.change(screen.getByTestId('math-gate-input'), {
        target: { value: '99' },
      })
      fireEvent.click(screen.getByTestId('math-gate-submit'))
      nowMs += 100
    }
    expect(screen.getByTestId('math-gate-cooldown').textContent).toMatch(/60s/)
    // Po 5 sekundach — countdown powinien zmaleć.
    act(() => {
      nowMs += 5_000
      vi.advanceTimersByTime(5_000)
    })
    // Ceil((60_000 - 5_300) / 1000) = 55 (nowMs=5_300 z 3*100 + 5_000)
    expect(screen.getByTestId('math-gate-cooldown').textContent).toMatch(/55s/)
  })
})
