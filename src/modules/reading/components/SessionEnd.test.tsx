// Node 25's experimental built-in `localStorage` shadows jsdom's implementation
// in this vitest setup, but it's effectively disabled (no `clear`/`setItem`).
// We polyfill an in-memory Storage here so persist middleware can write.
// Identyczny pattern jak w lettersStore.test.ts / ReportScreen.test.tsx.
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

import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SessionResult } from '../hooks/useReadingSession'

vi.mock('@/shared/stats/enoughForToday', () => ({
  hasEnoughForToday: vi.fn(() => true),
}))

const { render, screen, fireEvent } = await import('@testing-library/react')
const { SessionEnd } = await import('./SessionEnd')
const { useReading } = await import('../store/readingStore')

const results: SessionResult = {
  outcomes: { correct: 3, wrong: 0, dontKnow: 0 },
  iskierkiEarned: 3,
  newAlbumWords: [],
  durationMs: 10_000,
}

describe('SessionEnd — ceremonia → podsumowanie', () => {
  beforeEach(() => {
    useReading.setState({ pendingCeremonyMilestone: null })
  })

  it('po zamknięciu ceremonii pokazuje podsumowanie bez błędu i gra session-stop-enough, gdy hasEnoughForToday=true', () => {
    useReading.setState({ pendingCeremonyMilestone: 10 })
    const play = vi.fn().mockResolvedValue(true)
    const stop = vi.fn()

    render(
      <SessionEnd
        results={results}
        level="iskierka"
        onExit={vi.fn()}
        onAlbum={vi.fn()}
        audioBus={{ play, stop }}
      />,
    )

    expect(screen.getByTestId('ceremony-view')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Świetnie!'))

    // Ceremonia zamknięta → podsumowanie sesji renderuje się bez rzucania
    // błędu kolejności hooków (isPerfect nie jest już useMemo po early return).
    expect(screen.getByTestId('reading-session-end')).toBeInTheDocument()
    expect(screen.queryByTestId('ceremony-view')).not.toBeInTheDocument()
    expect(play).toHaveBeenCalledWith('session-stop-enough')
  })

  it('previousRatios pomija poprawki (attempt: 2) — inaczej sesja z hiperkorekcją wygląda lepiej niż była', () => {
    const answer = (outcome: 'correct' | 'wrong', attempt?: 2) => ({
      type: 'answer' as const,
      ts: 0,
      outcome,
      responseMs: 1000,
      ...(attempt !== undefined ? { attempt } : {}),
    })
    // Poprzednia sesja: 1/3 za pierwszym podejściem (0.33 ≤ 0.4 → sygnał „w dół"),
    // ale z retry-correct policzonymi jako pytania byłoby 3/5 = 0.6 i sugestia
    // by nie padła.
    const prevLog = {
      id: 'prev',
      startedAt: 0,
      endedAt: 1,
      level: 'iskierka' as const,
      events: [
        answer('wrong'),
        answer('correct', 2),
        answer('wrong'),
        answer('correct', 2),
        answer('correct'),
      ],
    }
    const currentLog = { ...prevLog, id: 'current', events: [] }
    useReading.setState({ sessions: [prevLog, currentLog] })
    const play = vi.fn().mockResolvedValue(true)

    render(
      <SessionEnd
        results={{ outcomes: { correct: 1, wrong: 2, dontKnow: 0 }, iskierkiEarned: 1, newAlbumWords: [], durationMs: 10_000 }}
        level="iskierka"
        onExit={vi.fn()}
        onAlbum={vi.fn()}
        audioBus={{ play, stop: vi.fn() }}
      />,
    )

    expect(play).toHaveBeenCalledWith('reading-level-down')
    useReading.setState({ sessions: [] })
  })
})
