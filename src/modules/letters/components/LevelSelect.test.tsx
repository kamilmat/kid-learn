import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

// MemoryStorage polyfill jak w lettersStore.test.ts.
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

const { LevelSelect } = await import('./LevelSelect')
const { useLetters } = await import('../store/lettersStore')
const { createInitialLetterState } = await import(
  '@/shared/srs/createInitialLetterState'
)

function makeAudioBus() {
  return { play: vi.fn(() => Promise.resolve()) }
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

describe('LevelSelect', () => {
  beforeEach(() => {
    resetStore()
  })

  it('renders 4 level tiles with letter counts', () => {
    render(<LevelSelect onSelect={vi.fn()} audioBus={makeAudioBus()} />)
    expect(screen.getByTestId('level-tile-iskierka')).toBeInTheDocument()
    expect(screen.getByTestId('level-tile-plomyk')).toBeInTheDocument()
    expect(screen.getByTestId('level-tile-ognik')).toBeInTheDocument()
    expect(screen.getByTestId('level-tile-pochodnia')).toBeInTheDocument()

    expect(screen.getByTestId('level-tile-iskierka').textContent).toContain('6 literek')
    expect(screen.getByTestId('level-tile-plomyk').textContent).toContain('14 literek')
    expect(screen.getByTestId('level-tile-ognik').textContent).toContain('24 literek')
    expect(screen.getByTestId('level-tile-pochodnia').textContent).toContain('32 literek')
  })

  it('clicking a tile invokes onSelect with the correct level', () => {
    const onSelect = vi.fn()
    const audioBus = makeAudioBus()
    render(<LevelSelect onSelect={onSelect} audioBus={audioBus} />)
    act(() => {
      screen.getByTestId('level-tile-plomyk').click()
    })
    expect(onSelect).toHaveBeenCalledWith('plomyk')
  })

  it('plays level-select-intro on first mount, marks seen', () => {
    const audioBus = makeAudioBus()
    render(<LevelSelect onSelect={vi.fn()} audioBus={audioBus} />)
    const calls = audioBus.play.mock.calls.map((c) => c[0])
    expect(calls).toContain('level-select-intro')
    expect(useLetters.getState().hasSeenIntro('level-select-intro')).toBe(true)
  })

  it('does not replay level-select-intro if already seen', () => {
    useLetters.getState().markIntroSeen('level-select-intro')
    const audioBus = makeAudioBus()
    render(<LevelSelect onSelect={vi.fn()} audioBus={audioBus} />)
    const calls = audioBus.play.mock.calls.map((c) => c[0])
    expect(calls).not.toContain('level-select-intro')
  })

  it('mastery wall shows 32 cells; box=5 letters marked mastered', () => {
    // Oznaczamy "a" i "m" jako opanowane (box 5)
    useLetters.getState().applyOutcome(
      'a',
      { ...createInitialLetterState('a'), box: 5, masteredAt: 1 },
    )
    useLetters.getState().applyOutcome(
      'm',
      { ...createInitialLetterState('m'), box: 5, masteredAt: 1 },
    )

    render(<LevelSelect onSelect={vi.fn()} audioBus={makeAudioBus()} />)

    // Cała ściana = 32 komórki
    const wall = screen.getByTestId('mastery-wall')
    const cells = wall.querySelectorAll('[data-testid^="mastery-cell-"]')
    expect(cells).toHaveLength(32)

    expect(
      screen.getByTestId('mastery-cell-a').dataset.mastered,
    ).toBe('true')
    expect(
      screen.getByTestId('mastery-cell-m').dataset.mastered,
    ).toBe('true')
    expect(
      screen.getByTestId('mastery-cell-b').dataset.mastered,
    ).toBe('false')
  })

  it('clicking a mastered cell triggers mastery-celebration audio', () => {
    useLetters.getState().applyOutcome(
      'a',
      { ...createInitialLetterState('a'), box: 5, masteredAt: 1 },
    )
    const audioBus = makeAudioBus()
    render(<LevelSelect onSelect={vi.fn()} audioBus={audioBus} />)
    act(() => {
      screen.getByTestId('mastery-cell-a').click()
    })
    const calls = audioBus.play.mock.calls.map((c) => c[0])
    expect(calls).toContain('mastery-celebration')
  })

  it('clicking a non-mastered cell is disabled (no audio)', () => {
    const audioBus = makeAudioBus()
    render(<LevelSelect onSelect={vi.fn()} audioBus={audioBus} />)
    const cell = screen.getByTestId('mastery-cell-b') as HTMLButtonElement
    expect(cell.disabled).toBe(true)
    act(() => {
      cell.click()
    })
    const calls = audioBus.play.mock.calls.map((c) => c[0])
    expect(calls).not.toContain('mastery-celebration')
  })
})
