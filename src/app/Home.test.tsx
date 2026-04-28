// Polyfill localStorage in case a previous test file replaced globalThis.localStorage
// with a non-Storage-shaped value. We unconditionally install a fresh in-memory store.
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
  typeof window !== 'undefined' &&
  (typeof window.localStorage === 'undefined' ||
    typeof window.localStorage.setItem !== 'function')
) {
  const memStorage = new MemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    value: memStorage,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: memStorage,
    configurable: true,
    writable: true,
  })
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const audioPlayMock = vi.fn().mockResolvedValue(undefined)
const audioStopMock = vi.fn()
vi.mock('@/shared/audio/AudioBus', () => ({
  audioBus: {
    play: (key: string) => audioPlayMock(key),
    stop: () => audioStopMock(),
  },
}))

const markLettersIntroMock = vi.fn()
const markReadingIntroMock = vi.fn()
vi.mock('@/modules/letters/store/lettersStore', () => ({
  useLetters: (selector: (s: { hasSeenIntro: (k: string) => boolean; markIntroSeen: typeof markLettersIntroMock }) => unknown) =>
    selector({ hasSeenIntro: () => false, markIntroSeen: markLettersIntroMock }),
}))
vi.mock('@/modules/reading/store/readingStore', () => ({
  useReading: (selector: (s: { hasSeenIntro: (k: string) => boolean; markIntroSeen: typeof markReadingIntroMock }) => unknown) =>
    selector({ hasSeenIntro: () => false, markIntroSeen: markReadingIntroMock }),
}))

import { MemoryRouter } from 'react-router-dom'
import { Home } from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    audioPlayMock.mockClear()
    audioStopMock.mockClear()
    audioPlayMock.mockResolvedValue(undefined)
    try {
      window.localStorage.clear()
    } catch {
      /* localStorage maybe replaced by a polyfill in another test file */
    }
  })

  it('renders title "Iskierki"', () => {
    renderHome()
    expect(
      screen.getByRole('heading', { name: 'Iskierki' }),
    ).toBeInTheDocument()
  })

  it('renders the "Litery" module tile', () => {
    renderHome()
    const tile = screen.getByTestId('module-letters')
    expect(tile).toBeInTheDocument()
    expect(tile.textContent).toContain('Litery')
  })

  it('renders the "Czytanie" module tile', () => {
    renderHome()
    const tile = screen.getByTestId('module-reading')
    expect(tile).toBeInTheDocument()
    expect(tile.textContent).toContain('Czytanie')
  })

  it('renders parent zone with settings (⚙) and report (📊) buttons', () => {
    renderHome()
    expect(screen.getByTestId('parent-zone')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ustawienia' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Raport' })).toBeInTheDocument()
  })

  it('clicking "Litery" navigates to /letters', () => {
    renderHome()
    screen.getByTestId('module-letters').click()
    expect(navigateMock).toHaveBeenCalledWith('/letters')
  })

  it('clicking "Czytanie" navigates to /reading', () => {
    renderHome()
    screen.getByTestId('module-reading').click()
    expect(navigateMock).toHaveBeenCalledWith('/reading')
  })

  it('clicking ⚙ navigates to /settings', () => {
    renderHome()
    screen.getByRole('button', { name: 'Ustawienia' }).click()
    expect(navigateMock).toHaveBeenCalledWith('/settings')
  })

  it('clicking 📊 navigates to /report', () => {
    renderHome()
    screen.getByRole('button', { name: 'Raport' }).click()
    expect(navigateMock).toHaveBeenCalledWith('/report')
  })
})
