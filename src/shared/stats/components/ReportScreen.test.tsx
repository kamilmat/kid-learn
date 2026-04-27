import { beforeEach, describe, expect, it, vi } from 'vitest'

// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// We polyfill an in-memory Storage here so persist middleware can write.
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

const { render, screen, fireEvent, waitFor } = await import(
  '@testing-library/react'
)
const { useSettings } = await import('@/shared/settings/settingsStore')
const { useLetters } = await import('@/modules/letters/store/lettersStore')
const { ReportScreen } = await import('./ReportScreen')

const reset = (): void => {
  localStorage.clear()
  useSettings.getState()._resetForTests()
  // useLetters: ręczny reset (nie ma _resetForTests)
  useLetters.setState({
    letters: {},
    sessions: [],
    seenIntros: [],
    lastUsedLevel: null,
  })
}

const fixedNow = 1_700_000_000_000

describe('ReportScreen', () => {
  beforeEach(() => {
    reset()
  })

  it('renderuje MathGate gdy gate nie jest odblokowany', () => {
    render(<ReportScreen now={() => fixedNow} />)
    expect(screen.getByTestId('math-gate')).toBeInTheDocument()
    // Sekcje raportu nie powinny być wyrenderowane
    expect(screen.queryByTestId('report-screen')).not.toBeInTheDocument()
  })

  it('po unlocku pokazuje wszystkie 5 sekcji', () => {
    // Symulujemy unlock — bezpośrednio przesuwając parentGateUnlockedUntil
    useSettings.setState({ parentGateUnlockedUntil: fixedNow + 60_000 })

    render(<ReportScreen now={() => fixedNow} />)

    expect(screen.getByTestId('report-screen')).toBeInTheDocument()
    expect(screen.getByTestId('letters-section')).toBeInTheDocument()
    expect(screen.getByTestId('activity-section')).toBeInTheDocument()
    expect(screen.getByTestId('live-session-section')).toBeInTheDocument()
    expect(screen.getByTestId('suggestions-section')).toBeInTheDocument()
    expect(screen.getByTestId('anticheat-section')).toBeInTheDocument()
  })

  it('przycisk "Skopiuj raport" wywołuje copyToClipboard i pokazuje feedback', async () => {
    useSettings.setState({ parentGateUnlockedUntil: fixedNow + 60_000 })
    const copy = vi.fn().mockResolvedValue(undefined)

    render(<ReportScreen now={() => fixedNow} copyToClipboard={copy} />)

    fireEvent.click(screen.getByTestId('copy-report-button'))

    await waitFor(() => {
      expect(copy).toHaveBeenCalledTimes(1)
    })
    const arg = copy.mock.calls[0]?.[0] as string
    expect(arg).toContain('# Raport Iskierki')
    expect(screen.getByTestId('copy-feedback-success')).toHaveTextContent(
      'Skopiowano!',
    )
  })

  it('błąd schowka pokazuje "Nie udało się skopiować"', async () => {
    useSettings.setState({ parentGateUnlockedUntil: fixedNow + 60_000 })
    const copy = vi.fn().mockRejectedValue(new Error('no clipboard'))

    render(<ReportScreen now={() => fixedNow} copyToClipboard={copy} />)

    fireEvent.click(screen.getByTestId('copy-report-button'))

    await waitFor(() => {
      expect(screen.getByTestId('copy-feedback-error')).toBeInTheDocument()
    })
  })
})
