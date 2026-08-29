import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

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

const { useNumbers } = await import('../store/numbersStore')
const { useNumbersSession } = await import('./useNumbersSession')

describe('useNumbersSession', () => {
  beforeEach(() => {
    useNumbers.getState().reset()
    localStorage.clear()
  })

  it('starts session and picks first question', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 4 }),
    )
    expect(result.current.status).toBe('asking')
    act(() => result.current.start())
    expect(result.current.currentQuestion).not.toBeNull()
    expect(audioBus.play).toHaveBeenCalledWith('session-start-iskierka')
    expect(audioBus.stop).toHaveBeenCalled()
  })

  it('advances through questionCount and ends', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 2 }),
    )
    act(() => result.current.start())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    expect(result.current.status).toBe('ended')
    expect(result.current.counters.correct).toBe(2)
  })

  it('updates fact box after correct answer', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 1 }),
    )
    act(() => result.current.start())
    const factId = result.current.currentQuestion?.factId
    expect(factId).toBeDefined()
    const beforeBox = useNumbers.getState().facts[factId!]?.box
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    const afterBox = useNumbers.getState().facts[factId!]?.box
    expect(afterBox).toBeGreaterThan(beforeBox ?? 0)
  })

  it('saves session log', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'plomyk', audioBus, questionCount: 1 }),
    )
    act(() => result.current.start())
    act(() => result.current.answer('wrong'))
    act(() => result.current.advance())
    const sessions = useNumbers.getState().sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.level).toBe('plomyk')
    expect(sessions[0]?.events).toHaveLength(1)
    expect(sessions[0]?.events[0]?.outcome).toBe('wrong')
  })

  it('pause + resume keeps current question', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 4 }),
    )
    act(() => result.current.start())
    const q1 = result.current.currentQuestion
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')
    act(() => result.current.resume())
    expect(result.current.status).toBe('asking')
    expect(result.current.currentQuestion).toEqual(q1)
  })

  it('answer jest ignorowane poza statusem asking (double-tap w feedbacku)', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 4 }),
    )
    act(() => result.current.start())
    act(() => result.current.answer('correct'))
    act(() => result.current.answer('wrong'))
    expect(result.current.counters).toEqual({ correct: 1, wrong: 0, dontKnow: 0 })
  })

  it('powtórzony fakt w sesji kumuluje wyniki SRS (fold sekwencyjny)', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    // rng=0 → deterministycznie: fakt A, potem B (filtr lastTarget), potem znowu A.
    const { result } = renderHook(() =>
      useNumbersSession({
        level: 'iskierka',
        audioBus,
        questionCount: 3,
        rng: () => 0,
      }),
    )
    act(() => result.current.start())
    const first = result.current.currentQuestion!.factId
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    expect(result.current.currentQuestion!.factId).toBe(first)
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())

    // Dwa trafienia na `first`: box 1 → 2 → 3. Przed poprawką (każdy event liczony
    // od stanu sprzed sesji) wychodziło 2.
    expect(useNumbers.getState().facts[first]?.box).toBe(3)
  })

  it('flush zapisuje częściowe wyniki przy wyjściu z pauzy', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 8 }),
    )
    act(() => result.current.start())
    const factId = result.current.currentQuestion!.factId
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())
    act(() => result.current.pause('manual'))
    act(() => result.current.flush())

    const state = useNumbers.getState()
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0]?.aborted).toBe(true)
    expect(state.sessions[0]?.events).toHaveLength(1)
    expect(state.facts[factId]?.box).toBe(2)
  })

  it('flush bez odpowiedzi nie zapisuje pustej sesji', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 8 }),
    )
    act(() => result.current.start())
    act(() => result.current.flush())
    expect(useNumbers.getState().sessions).toHaveLength(0)
  })

  it('loguje zdarzenia anti-cheat (idle / visibility) w logu sesji', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 1 }),
    )
    act(() => result.current.start())
    act(() => result.current.pause('idle'))
    act(() => result.current.resume())
    act(() => result.current.pause('visibility'))
    act(() => result.current.resume())
    act(() => result.current.answer('correct'))
    act(() => result.current.advance())

    const log = useNumbers.getState().sessions[0]!
    expect(log.antiCheatEvents?.map((e) => e.type)).toEqual([
      'pause',
      'resume',
      'pause',
      'resume',
    ])
    expect(
      log.antiCheatEvents?.filter((e) => e.type === 'pause').map((e) => e.reason),
    ).toEqual(['idle', 'visibility'])
  })

  it('pauza w trakcie feedbacku wraca do feedbacku (nie gubi advance)', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'iskierka', audioBus, questionCount: 4 }),
    )
    act(() => result.current.start())
    act(() => result.current.answer('correct'))
    expect(result.current.status).toBe('feedback')
    act(() => result.current.pause('visibility'))
    expect(result.current.status).toBe('paused')
    act(() => result.current.resume())
    expect(result.current.status).toBe('feedback')
  })

  it('skipCountStep: 5 — pytania tylko z konceptów mających fakty (bez fallbacku na pulę poziomu)', async () => {
    const { getLevelFacts } = await import('../data/levelFacts')
    const { unlockedConcepts } = await import('./pickConcept')
    const levelFacts = getLevelFacts('pochodnia', 5)
    // Świeży postęp → otwarte są tylko skipcount-5 i equalgroups. Gdy dobór
    // konceptu wybierze bezfaktowy skipcount-2/10, sesja spada na pulę CAŁEGO
    // poziomu i wypuszcza koncepty jeszcze zablokowane — tego pilnuje ten test.
    const allowed = new Set<string>([
      ...unlockedConcepts('pochodnia', {}, levelFacts).map((c) => c.id),
      'plomyk-addsub-10', // gałąź maintenance odejmowania (18%)
    ])

    let seed = 12345
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    const { result } = renderHook(() =>
      useNumbersSession({
        level: 'pochodnia', audioBus, questionCount: 8, skipCountStep: 5, rng,
      }),
    )
    act(() => result.current.start())
    const seen: string[] = []
    for (let i = 0; i < 8; i++) {
      expect(result.current.currentQuestion).not.toBeNull()
      seen.push(result.current.currentQuestion!.conceptId)
      act(() => result.current.answer('correct'))
      act(() => result.current.advance())
    }
    expect(seen).toHaveLength(8)
    expect(seen.filter((id) => !allowed.has(id))).toEqual([])
  })

  it('inicjalizuje całą pulę faktów jednym zapisem w start()', () => {
    const audioBus = { play: vi.fn(() => Promise.resolve(true)), stop: vi.fn() }
    let writes = 0
    const unsub = useNumbers.subscribe(() => {
      writes += 1
    })
    const { result } = renderHook(() =>
      useNumbersSession({ level: 'plomyk', audioBus, questionCount: 4 }),
    )
    act(() => result.current.start())
    unsub()
    expect(Object.keys(useNumbers.getState().facts).length).toBeGreaterThan(50)
    expect(writes).toBe(1)
  })
})

const { computeMasteryProgress } = await import('./useNumbersSession')
const { MIN_AGE_FOR_MASTERY_MS } = await import('../data/concepts')

describe('computeMasteryProgress — okno 8/10 zamiast serii z rzędu', () => {
  const CONCEPT = 'iskierka-counting-5' as const
  // minFacts=5 dla tego konceptu — 10 odpowiedzi rozkładamy na 5 różnych faktów.
  const FACT_IDS = ['count5-1', 'count5-2', 'count5-3', 'count5-4', 'count5-5']

  function events(outcomes: Array<'correct' | 'wrong'>) {
    return outcomes.map((outcome, i) => ({
      factId: FACT_IDS[i % FACT_IDS.length]!,
      conceptId: CONCEPT,
      exerciseType: 'subitize-flash' as const,
      outcome,
      responseMs: 1000,
      timestamp: i,
    }))
  }

  // Koncept „stary" — MIN_AGE_FOR_MASTERY_MS to 2 doby, inaczej nic nie dojrzeje.
  const endedAt = MIN_AGE_FOR_MASTERY_MS + 1000
  const prev = {
    [CONCEPT]: {
      state: 'learning' as const,
      firstSeenAt: 1,
      lastSeenAt: 1,
      correctStreak: 0,
      factsTouched: [],
      recentOutcomes: [],
      factsCorrect: [],
    },
  }

  const withWrongAt = (wrongIdx: number[]) =>
    Array.from({ length: 10 }, (_, i) =>
      wrongIdx.includes(i) ? ('wrong' as const) : ('correct' as const),
    )

  function run(outcomes: Array<'correct' | 'wrong'>) {
    return computeMasteryProgress(prev, events(outcomes), endedAt)[CONCEPT]!
  }

  it('8 poprawnych + 2 błędy w oknie 10 → mastered', () => {
    const c = run(withWrongAt([3, 7]))
    expect(c.recentOutcomes).toHaveLength(10)
    expect(c.state).toBe('mastered')
  })

  it('7 poprawnych + 3 błędy → wciąż learning', () => {
    expect(run(withWrongAt([1, 4, 8])).state).toBe('learning')
  })

  it('2 błędy na starcie + 8 poprawnych → mastered (seria by się wyzerowała)', () => {
    const c = run(withWrongAt([0, 1]))
    expect(c.state).toBe('mastered')
    expect(c.correctStreak).toBe(8)
  })

  it('okno przycięte do 10 ostatnich; „nie wiem" liczy się jak błąd', () => {
    const evs = [
      ...events(Array.from({ length: 10 }, () => 'wrong' as const)),
      ...events(Array.from({ length: 10 }, () => 'correct' as const)),
    ]
    const c = computeMasteryProgress(prev, evs, endedAt)[CONCEPT]!
    expect(c.recentOutcomes).toEqual(Array.from({ length: 10 }, () => 'correct'))
    expect([...c.factsCorrect].sort()).toEqual([...FACT_IDS].sort())

    const dontKnow = computeMasteryProgress(
      prev,
      [
        ...events(Array.from({ length: 9 }, () => 'correct' as const)),
        {
          factId: FACT_IDS[0]!,
          conceptId: CONCEPT,
          exerciseType: 'subitize-flash' as const,
          outcome: 'dontKnow' as const,
          responseMs: 1000,
          timestamp: 99,
        },
      ],
      endedAt,
    )[CONCEPT]!
    expect(dontKnow.recentOutcomes[9]).toBe('wrong')
  })

  it('mastery nie cofa się przez słabsze okno', () => {
    const mastered = {
      [CONCEPT]: { ...prev[CONCEPT], state: 'mastered' as const },
    }
    const c = computeMasteryProgress(
      mastered,
      events(Array.from({ length: 10 }, () => 'wrong' as const)),
      endedAt,
    )[CONCEPT]!
    expect(c.state).toBe('mastered')
  })

  it('samo dotknięcie faktu nie wystarcza — liczy się factsCorrect', () => {
    // 10 poprawnych, ale tylko 2 różne fakty → minFacts=5 niespełnione.
    const evs = Array.from({ length: 10 }, (_, i) => ({
      factId: FACT_IDS[i % 2]!,
      conceptId: CONCEPT,
      exerciseType: 'subitize-flash' as const,
      outcome: 'correct' as const,
      responseMs: 1000,
      timestamp: i,
    }))
    expect(computeMasteryProgress(prev, evs, endedAt)[CONCEPT]!.state).toBe('learning')
  })
})
