import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

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

const { NumbersStats, formatFactId } = await import('./NumbersStats')
const { useNumbers } = await import('@/modules/numbers/store/numbersStore')

describe('formatFactId', () => {
  it('formatuje znane typy faktów', () => {
    expect(formatFactId('add-5-2')).toBe('5+2')
    expect(formatFactId('sub-7-3')).toBe('7-3')
    expect(formatFactId('bond-7-3-4')).toBe('3+4')
    expect(formatFactId('double-6')).toBe('6+6')
    expect(formatFactId('mult-3-2')).toBe('3×2')
    expect(formatFactId('array-3x4')).toBe('3×4')
    expect(formatFactId('tenframe-7')).toBe('TF·7')
    expect(formatFactId('skip5-step3')).toBe('+5')
  })

  it('nieznane formaty zwraca jako-jest (no-op defensywny)', () => {
    expect(formatFactId('totally-unknown-format')).toBe('totally-unknown-format')
  })
})

describe('NumbersStats', () => {
  beforeEach(() => {
    useNumbers.getState().reset()
  })

  it('pokazuje 0/20 koncepty gdy store pusty', () => {
    render(<NumbersStats />)
    expect(screen.getByText(/Opanowane:/)).toHaveTextContent('Opanowane: 0 / 20')
  })

  it('pokazuje opanowane koncepty + listę', () => {
    useNumbers.setState({
      concepts: {
        'iskierka-counting-5': {
          state: 'mastered',
          firstSeenAt: 1, lastSeenAt: 2, correctStreak: 10, factsTouched: ['add-1-1'],
        },
        'plomyk-bonds-5': {
          state: 'learning',
          firstSeenAt: 1, lastSeenAt: 2, correctStreak: 3, factsTouched: ['bond-5-2-3'],
        },
      },
    })
    render(<NumbersStats />)
    expect(screen.getByText(/Opanowane:/)).toHaveTextContent('Opanowane: 1 / 20')
    expect(screen.getByText(/Liczenie do 5/)).toBeInTheDocument()
    expect(screen.getByText(/W nauce:/)).toHaveTextContent('W nauce: 1')
  })

  it('pokazuje top 10 trudnych faktów posortowane', () => {
    useNumbers.setState({
      facts: {
        'add-5-2': { id: 'add-5-2', conceptId: 'iskierka-adding-concrete', box: 1, lastSeen: 0, recentWrong: 3 },
        'sub-7-3': { id: 'sub-7-3', conceptId: 'plomyk-addsub-10', box: 2, lastSeen: 0, recentWrong: 1 },
      },
    })
    render(<NumbersStats />)
    expect(screen.getByTestId('difficult-fact-add-5-2')).toBeInTheDocument()
    expect(screen.getByTestId('difficult-fact-sub-7-3')).toBeInTheDocument()
  })

  it('pokazuje "wszystko idzie" gdy brak trudnych', () => {
    render(<NumbersStats />)
    expect(screen.getByText(/Brak trudnych faktów/)).toBeInTheDocument()
  })

  it('renderuje 8 komórek heatmapy', () => {
    render(<NumbersStats />)
    expect(screen.getByTestId('concept-group-cell-counting')).toBeInTheDocument()
    expect(screen.getByTestId('concept-group-cell-multiplication')).toBeInTheDocument()
  })
})
