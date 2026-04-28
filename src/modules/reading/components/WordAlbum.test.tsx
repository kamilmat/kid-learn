// WordAlbum tests — Phase 9.1
// MemoryStorage polyfill must be set BEFORE any store import (same pattern as readingStore.test.ts).
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

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Dynamic imports ensure polyfill runs before module initialization
const { WordAlbum } = await import('./WordAlbum')
const { useReading } = await import('../store/readingStore')

const mockBus = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }

describe('WordAlbum', () => {
  beforeEach(() => {
    useReading.getState().reset()
    localStorage.clear()
    vi.clearAllMocks()
    // Oznacz intro jako odtworzone, żeby nie wpływało na testy audioBus
    useReading.getState().markIntroSeen('reading-album-intro')
  })

  it('renders album title and counter', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText(/Album Iskry/i)).toBeDefined()
    expect(screen.getByText(/0 z 67 słów/i)).toBeDefined()
  })

  it('renders cards for all 67 words by default', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    const cards = screen.getAllByLabelText(/karta /i)
    expect(cards.length).toBeGreaterThanOrEqual(67)
  })

  it('shows emoji for unlocked words', () => {
    useReading.getState().ensureWordInitialized('word-MAMA')
    useReading.getState().addToAlbum('word-MAMA')
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('👩‍👧')).toBeDefined()
    expect(screen.getByText(/1 z 67 słów/i)).toBeDefined()
  })

  it('locked cards show ? placeholder', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    const placeholders = screen.getAllByText('?')
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it('filter buttons exist', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    expect(screen.getByText('Wszystkie')).toBeDefined()
    expect(screen.getByText('Płomyk')).toBeDefined()
    expect(screen.getByText('Ognik')).toBeDefined()
    expect(screen.getByText('Pochodnia')).toBeDefined()
  })

  it('exit button calls onExit', () => {
    const onExit = vi.fn()
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={onExit} /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText(/Wróć/i))
    expect(onExit).toHaveBeenCalled()
  })

  it('locked card click does nothing (no audio)', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    const lockedCard = screen.getByLabelText(/karta MAMA \(jeszcze nie zdobyta\)/i)
    fireEvent.click(lockedCard)
    expect(mockBus.play).not.toHaveBeenCalled()
  })

  it('filter by Płomyk shows only plomyk cards', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByText('Płomyk'))
    // plomyk has 20 words
    const cards = screen.getAllByLabelText(/karta /i)
    expect(cards.length).toBe(20)
  })

  it('filter by Ognik shows only ognik cards', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByText('Ognik'))
    // ognik has 25 words
    const cards = screen.getAllByLabelText(/karta /i)
    expect(cards.length).toBe(25)
  })

  it('filter by Pochodnia shows only pochodnia cards', () => {
    render(<MemoryRouter><WordAlbum audioBus={mockBus} onExit={vi.fn()} /></MemoryRouter>)
    fireEvent.click(screen.getByText('Pochodnia'))
    // pochodnia has 22 words
    const cards = screen.getAllByLabelText(/karta /i)
    expect(cards.length).toBe(22)
  })
})
