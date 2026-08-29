import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
    useCzytanki.setState({ answeredQuestionIds: [], comprehensionResults: {} })
  })

  it('na mount zatrzymuje audio i gra intro + pytanie', () => {
    const { audioBus } = setup()
    expect(audioBus.stop).toHaveBeenCalled()
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-intro')
    expect(audioBus.play).toHaveBeenCalledWith('cz-q-01')
  })

  it('po błędzie zostają 2 kafelki, w tym poprawny, i pytanie leci ponownie', () => {
    const { audioBus } = setup()
    expect(tiles()).toHaveLength(3)
    audioBus.play.mockClear()
    fireEvent.click(tiles()[1]!)
    expect(audioBus.play.mock.calls.map((c) => c[0])).toEqual(['czytanki-q-again', 'cz-q-01'])
    const left = tiles()
    expect(left).toHaveLength(2)
    expect(left.map((t) => t.getAttribute('data-option-index'))).toContain('0')
  })

  it('poprawna odpowiedź daje 👏, zapisuje id i zamyka overlay po wybrzmieniu pochwały', async () => {
    vi.useFakeTimers()
    const { audioBus, onClose } = setup()
    fireEvent.click(tiles()[0]!)
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-praise')
    expect(screen.getByTestId('comprehension-praise')).toBeDefined()
    expect(useCzytanki.getState().answeredQuestionIds).toContain('cz-01')
    // Zamknięcie czeka na rozstrzygnięcie play() (AudioBus settluje na `ended`).
    await vi.advanceTimersByTimeAsync(0)
    expect(onClose).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1500)
    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('gdy pochwała nie zagra, bezpiecznik zamyka overlay', async () => {
    vi.useFakeTimers()
    const audioBus = { play: vi.fn(() => new Promise<boolean>(() => {})), stop: vi.fn() }
    const onClose = vi.fn()
    render(
      <ComprehensionQuestion
        czytankaId="cz-01"
        comprehension={comprehension}
        audioBus={audioBus}
        onClose={onClose}
      />,
    )
    fireEvent.click(tiles()[0]!)
    await vi.advanceTimersByTimeAsync(4999)
    expect(onClose).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2)
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('✋ zamyka overlay z cue i nie zabija go przy odmontowaniu', () => {
    const { audioBus, onClose } = setup()
    audioBus.play.mockClear()
    audioBus.stop.mockClear()
    fireEvent.click(screen.getByTestId('comprehension-close'))
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-close')
    expect(onClose).toHaveBeenCalled()
    const stopsBefore = audioBus.stop.mock.calls.length
    cleanup()
    expect(audioBus.stop.mock.calls.length).toBe(stopsBefore)
  })

  it('trafienie za pierwszym razem zapisuje wynik "first"', () => {
    setup()
    fireEvent.click(tiles()[0]!)
    expect(useCzytanki.getState().comprehensionResults['cz-01']).toBe('first')
  })

  it('trafienie za drugim razem daje 👏 i wynik "second"', () => {
    const { audioBus } = setup()
    fireEvent.click(tiles()[1]!)
    fireEvent.click(tiles().find((t) => t.getAttribute('data-option-index') === '0')!)
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-praise')
    expect(useCzytanki.getState().comprehensionResults['cz-01']).toBe('second')
    expect(useCzytanki.getState().answeredQuestionIds).toContain('cz-01')
  })

  it('druga pomyłka: łagodne cue, bez 👏, poprawny kafelek podświetlony, wynik "miss"', async () => {
    vi.useFakeTimers()
    const { audioBus, onClose } = setup()
    fireEvent.click(tiles()[1]!)
    audioBus.play.mockClear()
    fireEvent.click(tiles().find((t) => t.getAttribute('data-option-index') === '2')!)
    expect(audioBus.play).toHaveBeenCalledWith('czytanki-q-miss')
    expect(audioBus.play).not.toHaveBeenCalledWith('czytanki-q-praise')
    expect(screen.queryByTestId('comprehension-praise')).toBeNull()
    const revealed = tiles().filter((t) => t.getAttribute('data-revealed') === 'true')
    expect(revealed.map((t) => t.getAttribute('data-option-index'))).toEqual(['0'])
    expect(useCzytanki.getState().comprehensionResults['cz-01']).toBe('miss')
    // Bez ✔ na liście — badge należy się tylko za trafienie.
    expect(useCzytanki.getState().answeredQuestionIds).not.toContain('cz-01')
    await vi.advanceTimersByTimeAsync(1500)
    expect(onClose).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('✋ zostaje widoczne w trakcie 👏 i zamyka overlay ucinając audio', () => {
    const { audioBus, onClose } = setup()
    fireEvent.click(tiles()[0]!)
    expect(screen.getByTestId('comprehension-praise')).toBeDefined()
    audioBus.stop.mockClear()
    fireEvent.click(screen.getByTestId('comprehension-close'))
    expect(audioBus.stop).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('🔊 powtarza pytanie', () => {
    const { audioBus } = setup()
    audioBus.play.mockClear()
    fireEvent.click(screen.getByTestId('comprehension-repeat'))
    expect(audioBus.play).toHaveBeenCalledWith('cz-q-01')
  })
})
