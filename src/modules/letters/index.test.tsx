import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// MemoryStorage polyfill — identycznie jak w innych testach store'u.
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

const { LettersModule } = await import('./index')
const { useLetters } = await import('./store/lettersStore')

function makeAudioBus() {
  return {
    play: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  }
}

function resetStore() {
  localStorage.clear()
  useLetters.setState({
    letters: {},
    sessions: [],
    seenIntros: [],
    lastUsedLevel: null,
  })
}

describe('LettersModule — integration', () => {
  beforeEach(() => {
    resetStore()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders LevelSelect at /letters', () => {
    const audioBus = makeAudioBus()
    render(
      <MemoryRouter initialEntries={['/']}>
        <LettersModule audioBus={audioBus} showNav={false} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('level-select')).toBeInTheDocument()
    expect(screen.getByTestId('letters-module')).toBeInTheDocument()
  })

  it('plays letters-intro on first visit and marks seen', () => {
    const audioBus = makeAudioBus()
    render(
      <MemoryRouter initialEntries={['/']}>
        <LettersModule audioBus={audioBus} showNav={false} />
      </MemoryRouter>,
    )
    const keys = audioBus.play.mock.calls.map((c) => c[0])
    expect(keys).toContain('letters-intro')
    expect(useLetters.getState().hasSeenIntro('letters-intro')).toBe(true)
  })

  it('selecting a level navigates to session and persists lastUsedLevel', () => {
    const audioBus = makeAudioBus()
    render(
      <MemoryRouter initialEntries={['/']}>
        <LettersModule audioBus={audioBus} showNav={false} />
      </MemoryRouter>,
    )
    act(() => {
      screen.getByTestId('level-tile-iskierka').click()
    })
    expect(screen.getByTestId('session-view')).toBeInTheDocument()
    expect(useLetters.getState().lastUsedLevel).toBe('iskierka')
  })

  it('renders SessionView at /letters/session/iskierka and plays quiz-intro + dont-know-intro', () => {
    const audioBus = makeAudioBus()
    render(
      <MemoryRouter initialEntries={['/session/iskierka']}>
        <LettersModule audioBus={audioBus} showNav={false} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('session-view')).toBeInTheDocument()
    const keys = audioBus.play.mock.calls.map((c) => c[0])
    expect(keys).toContain('quiz-intro')
    expect(keys).toContain('dont-know-intro')
    expect(useLetters.getState().hasSeenIntro('quiz-intro')).toBe(true)
    expect(useLetters.getState().hasSeenIntro('dont-know-intro')).toBe(true)
  })

  it('redirects invalid level to LevelSelect', () => {
    const audioBus = makeAudioBus()
    render(
      <MemoryRouter initialEntries={['/session/notalevel']}>
        <LettersModule audioBus={audioBus} showNav={false} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('level-select')).toBeInTheDocument()
  })

  it('full flow: select level → finish session → applySessionResults called', () => {
    const audioBus = makeAudioBus()
    render(
      <MemoryRouter initialEntries={['/']}>
        <LettersModule audioBus={audioBus} showNav={false} />
      </MemoryRouter>,
    )
    // Start na LevelSelect
    expect(screen.getByTestId('level-select')).toBeInTheDocument()
    // Wybór poziomu
    act(() => {
      screen.getByTestId('level-tile-iskierka').click()
    })
    expect(screen.getByTestId('session-view')).toBeInTheDocument()

    // Kończymy sesję klikając "Nie wiem" pełną liczbę pytań (default sessionLength=10)
    // Każde "dontKnow" otwiera feedback overlay; medium tempo = 3000ms.
    for (let i = 0; i < 10; i++) {
      act(() => {
        screen.getByTestId('dont-know-button').click()
      })
      act(() => {
        vi.advanceTimersByTime(3000)
      })
    }

    expect(screen.getByTestId('session-end')).toBeInTheDocument()
    // Po zakończeniu sesji store ma wpis w sessions[]
    expect(useLetters.getState().sessions.length).toBe(1)
    // Litery z aktywnej puli zostały zaktualizowane (każda widziana >= 0)
    const letters = useLetters.getState().letters
    // co najmniej jedna litera Iskierki ma totalSeen > 0 (10 pytań = 10 ekspozycji)
    const sumSeen = Object.values(letters).reduce(
      (acc, st) => acc + st.totalSeen,
      0,
    )
    expect(sumSeen).toBeGreaterThanOrEqual(10)
  })
})
