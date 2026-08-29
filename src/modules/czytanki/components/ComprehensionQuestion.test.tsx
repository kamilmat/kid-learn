import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Comprehension } from '../data/types'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// w tym vitest setupie, ale jest efektywnie zepsuty (brak `clear`/`setItem`).
// Identyczny pattern jak w czytankiStore.test.ts — persist musi mieć gdzie pisać.
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

const { useCzytanki } = await import('../store/czytankiStore')
const { ComprehensionQuestion } = await import('./ComprehensionQuestion')

const comprehension: Comprehension = { question: 'Kto ma kota?', options: ['🧔', '👩', '👵'], answer: 0 }

function setup() {
  const audioBus = { play: vi.fn(async () => true), stop: vi.fn() }
  const onClose = vi.fn()
  render(
    <ComprehensionQuestion
      czytankaId="cz-01"
      comprehension={comprehension}
      audioBus={audioBus}
      onClose={onClose}
    />,
  )
  return { audioBus, onClose }
}

function tiles(): HTMLElement[] {
  return screen.queryAllByTestId('comprehension-option')
}

describe('ComprehensionQuestion', () => {
  beforeEach(() => {
    useCzytanki.setState({ answeredQuestionIds: [] })
  })

  it('na mount zatrzymuje audio i gra intro + pytanie', () => {
    const { audioBus } = setup()
    expect(audioBus.stop).toHaveBeenCalled()
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-intro')
    expect(audioBus.play).toHaveBeenCalledWith('cz-q-01')
  })

  it('po błędzie zostają 2 kafelki, w tym poprawny', () => {
    const { audioBus } = setup()
    expect(tiles()).toHaveLength(3)
    fireEvent.click(tiles()[1]!)
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-again')
    const left = tiles()
    expect(left).toHaveLength(2)
    expect(left.map((t) => t.getAttribute('data-option-index'))).toContain('0')
  })

  it('poprawna odpowiedź daje 👏, zapisuje id i zamyka overlay', () => {
    vi.useFakeTimers()
    const { audioBus, onClose } = setup()
    fireEvent.click(tiles()[0]!)
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-praise')
    expect(screen.getByTestId('comprehension-praise')).toBeDefined()
    expect(useCzytanki.getState().answeredQuestionIds).toContain('cz-01')
    vi.advanceTimersByTime(1500)
    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('druga próba zawsze kończy się pochwałą', () => {
    const { audioBus } = setup()
    fireEvent.click(tiles()[1]!)
    const wrongLeft = tiles().find((t) => t.getAttribute('data-option-index') !== '0')!
    fireEvent.click(wrongLeft)
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-praise')
    expect(useCzytanki.getState().answeredQuestionIds).toContain('cz-01')
  })

  it('🔊 powtarza pytanie', () => {
    const { audioBus } = setup()
    audioBus.play.mockClear()
    fireEvent.click(screen.getByTestId('comprehension-repeat'))
    expect(audioBus.play).toHaveBeenCalledWith('cz-q-01')
  })
})
