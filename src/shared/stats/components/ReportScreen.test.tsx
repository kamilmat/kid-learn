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

  it('po unlocku pokazuje kartę „Następny krok" i zwinięte sekcje', () => {
    // Symulujemy unlock — bezpośrednio przesuwając parentGateUnlockedUntil
    useSettings.setState({ parentGateUnlockedUntil: fixedNow + 60_000 })

    render(<ReportScreen now={() => fixedNow} />)

    expect(screen.getByTestId('report-screen')).toBeInTheDocument()
    expect(screen.getByTestId('next-step-card')).toBeInTheDocument()

    for (const id of [
      'collapsible-letters',
      'collapsible-activity',
      'collapsible-live',
      'collapsible-suggestions',
      'collapsible-anticheat',
      'collapsible-reading',
      'collapsible-numbers',
      'collapsible-czytanki',
    ]) {
      expect(screen.getByTestId(`${id}-toggle`)).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    }
    // Zwinięte = zawartość nie jest w DOM.
    expect(screen.queryByTestId('letters-section')).not.toBeInTheDocument()
  })

  it('rozwiązanie bramki NA ŻYWO pokazuje raport (nie wywala się na hookach)', () => {
    // Regresja: `flagCount = useMemo(...)` stał POD `if (!unlocked) return`,
    // więc render po odblokowaniu miał więcej hooków niż poprzedni i React
    // rzucał „Rendered more hooks than during the previous render". Wejście na
    // /report przy JUŻ odblokowanej bramce działało, więc błąd był niewidoczny
    // dla testów, które ustawiają unlock przed renderem.
    render(<ReportScreen now={() => fixedNow} />)
    expect(screen.getByTestId('math-gate')).toBeInTheDocument()

    const expression = screen.getByTestId('math-gate-expression').textContent ?? ''
    const [, a, b, c] = expression.match(/(\d+)\s*\+\s*(\d+)\s*-\s*(\d+)/) ?? []
    const answer = Number(a) + Number(b) - Number(c)

    fireEvent.change(screen.getByTestId('math-gate-input'), {
      target: { value: String(answer) },
    })
    fireEvent.click(screen.getByTestId('math-gate-submit'))

    expect(screen.getByTestId('report-screen')).toBeInTheDocument()
    expect(screen.queryByTestId('math-gate')).not.toBeInTheDocument()
  })

  it('kliknięcie nagłówka rozwija sekcję', () => {
    useSettings.setState({ parentGateUnlockedUntil: fixedNow + 60_000 })

    render(<ReportScreen now={() => fixedNow} />)

    fireEvent.click(screen.getByTestId('collapsible-letters-toggle'))
    expect(screen.getByTestId('letters-section')).toBeInTheDocument()
    expect(screen.getByTestId('collapsible-letters-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    )
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
    expect(arg).toContain('## Następny krok')
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
