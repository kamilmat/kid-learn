import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { CountObjectsExercise } from './CountObjectsExercise'
import { exerciseTypeForFact } from '../../hooks/exerciseRouter'
import type { Fact } from '../../data/facts'

function makeBus() {
  const play = vi.fn<(key: string) => Promise<boolean>>(() => Promise.resolve(true))
  const stop = vi.fn()
  return { play, stop, keys: () => play.mock.calls.map(([k]) => k) }
}

function renderExercise(n: number, restrictChoicesTo?: number[]) {
  const bus = makeBus()
  const onAnswer = vi.fn()
  render(
    <CountObjectsExercise
      audioBus={bus}
      payload={{ n, emoji: '🍎', seed: 42 }}
      onAnswer={onAnswer}
      {...(restrictChoicesTo !== undefined ? { restrictChoicesTo } : {})}
    />,
  )
  return { bus, onAnswer }
}

function tap(el: Element) {
  fireEvent.pointerDown(el, { pointerId: 1 })
  fireEvent.pointerUp(el, { pointerId: 1 })
}

describe('CountObjectsExercise', () => {
  it('drugi tap w ten sam obiekt nie liczy dalej', () => {
    const { bus } = renderExercise(4)
    const objects = screen.getAllByTestId('count-object')
    expect(objects).toHaveLength(4)
    tap(objects[0]!)
    tap(objects[0]!)
    expect(bus.keys().filter((k) => k.startsWith('number-'))).toEqual(['number-1'])
  })

  it('po ostatnim obiekcie pojawia się pytanie o kardynalność', () => {
    const { bus } = renderExercise(3)
    const objects = screen.getAllByTestId('count-object')
    expect(screen.queryByTestId('count-cardinality')).toBeNull()
    for (const o of objects) tap(o)
    expect(screen.getByTestId('count-cardinality')).toBeDefined()
    expect(bus.keys()).toEqual([
      'count-objects-prompt',
      'number-1',
      'number-2',
      'number-3',
      'count-objects-howmany',
    ])
  })

  it('stukanie w obiekty nigdy nie woła onAnswer — dopiero kafelek cyfry', async () => {
    const { onAnswer } = renderExercise(2)
    const objects = screen.getAllByTestId('count-object')
    for (const o of objects) tap(o)
    expect(onAnswer).not.toHaveBeenCalled()
    const choices = screen.getAllByTestId('count-choice')
    expect(choices).toHaveLength(4)
    await act(async () => {})
    fireEvent.click(choices[0]!.firstElementChild!)
    expect(onAnswer).toHaveBeenCalledTimes(1)
    const [outcome, value] = onAnswer.mock.calls[0]!
    expect(outcome).toBe(value === 2 ? 'correct' : 'wrong')
  })

  it('kafelki są zablokowane póki kolejka pytania nie wybrzmi', async () => {
    let resolveHowmany: (v: boolean) => void = () => {}
    const play = vi.fn<(key: string) => Promise<boolean>>((key) =>
      key === 'count-objects-howmany'
        ? new Promise<boolean>((r) => {
            resolveHowmany = r
          })
        : Promise.resolve(true),
    )
    const onAnswer = vi.fn()
    render(
      <CountObjectsExercise
        audioBus={{ play, stop: vi.fn() }}
        payload={{ n: 2, emoji: '🍎', seed: 42 }}
        onAnswer={onAnswer}
      />,
    )
    for (const o of screen.getAllByTestId('count-object')) tap(o)
    const tiles = screen.getByTestId('count-cardinality')
    expect(tiles.dataset.locked).toBe('true')
    fireEvent.click(screen.getAllByTestId('count-choice')[0]!.firstElementChild!)
    expect(onAnswer).not.toHaveBeenCalled()
    await act(async () => {
      resolveHowmany(true)
    })
    expect(screen.getByTestId('count-cardinality').dataset.locked).toBe('false')
    fireEvent.click(screen.getAllByTestId('count-choice')[0]!.firstElementChild!)
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })

  it('n === 1 startuje od razu w fazie kardynalności', () => {
    const { bus } = renderExercise(1)
    expect(screen.getByTestId('count-cardinality')).toBeDefined()
    expect(bus.keys()).toEqual(['count-objects-howmany'])
  })

  it('plansza skaluje się z szerokością — pozycje w % planszy', () => {
    renderExercise(6)
    const board = screen.getByTestId('count-board')
    expect(board.style.width).toBe('100%')
    expect(board.style.aspectRatio).toBe('900 / 400')
    for (const o of screen.getAllByTestId('count-object') as HTMLElement[]) {
      expect(o.style.left.endsWith('%')).toBe(true)
      expect(o.style.top.endsWith('%')).toBe(true)
      expect(parseFloat(o.style.left)).toBeGreaterThan(0)
      expect(parseFloat(o.style.left)).toBeLessThan(100)
      expect(parseFloat(o.style.top)).toBeGreaterThan(0)
      expect(parseFloat(o.style.top)).toBeLessThan(100)
      // Tap-target ≥60 px nawet gdy plansza zwęzi się do iPada w pionie.
      expect(o.style.width).toContain('60px')
    }
  })

  it('obiekty nie nachodzą na siebie (środki ≥96 px)', () => {
    renderExercise(10)
    const objects = screen.getAllByTestId('count-object') as HTMLElement[]
    // Pozycje są w % planszy 900×400; translate(-50%,-50%) → to wprost środek.
    const centers = objects.map((o) => ({
      x: (parseFloat(o.style.left) / 100) * 900,
      y: (parseFloat(o.style.top) / 100) * 400,
    }))
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const d = Math.hypot(centers[i]!.x - centers[j]!.x, centers[i]!.y - centers[j]!.y)
        expect(d).toBeGreaterThanOrEqual(96)
      }
    }
  })

  it('druga próba: przeliczenie na głos i tylko podane opcje', () => {
    vi.useFakeTimers()
    const { bus } = renderExercise(3, [3, 5])
    expect(bus.keys()).toContain('count-objects-recount')
    act(() => {
      vi.advanceTimersByTime(3 * 700)
    })
    expect(bus.keys().filter((k) => k.startsWith('number-'))).toEqual([
      'number-1',
      'number-2',
      'number-3',
    ])
    expect(screen.getAllByTestId('count-choice')).toHaveLength(2)
    vi.useRealTimers()
  })

  it('zamrożony ekran przerywa przeliczanie i odblokowuje kafelki', () => {
    vi.useFakeTimers()
    const bus = makeBus()
    const onAnswer = vi.fn()
    const view = (active: boolean) => (
      <CountObjectsExercise
        audioBus={bus}
        payload={{ n: 6, emoji: '🍎', seed: 42 }}
        onAnswer={onAnswer}
        restrictChoicesTo={[6, 4]}
        active={active}
      />
    )
    const { rerender } = render(view(true))
    act(() => {
      vi.advanceTimersByTime(700)
    })
    const counted = ['number-1', 'number-2']
    expect(bus.keys().filter((k) => k.startsWith('number-'))).toEqual(counted)
    act(() => {
      rerender(view(false))
    })
    act(() => {
      vi.advanceTimersByTime(10 * 700)
    })
    // Pauza w trakcie przeliczania: ani jednego klipu więcej po zamrożeniu.
    expect(bus.keys().filter((k) => k.startsWith('number-'))).toEqual(counted)
    // Ekran nie może zostać w fazie `recount` — dziecko dostaje kafelki.
    expect(screen.getByTestId('count-cardinality').getAttribute('data-locked')).toBe('false')
    expect(screen.getAllByTestId('count-choice')).toHaveLength(2)
    vi.useRealTimers()
  })
})

describe('exerciseTypeForFact — przeplot liczenia 1:1', () => {
  const count5: Fact = { id: 'count5-3', conceptId: 'iskierka-counting-5', args: [3] }
  const count10: Fact = { id: 'count10-8', conceptId: 'iskierka-counting-10', args: [8] }

  it('co drugie pytanie konceptów liczenia to count-objects', () => {
    expect(exerciseTypeForFact(count5, 'iskierka', 0)).toBe('count-objects')
    expect(exerciseTypeForFact(count5, 'iskierka', 1)).toBe('subitize-flash')
    expect(exerciseTypeForFact(count10, 'iskierka', 0)).toBe('count-objects')
    expect(exerciseTypeForFact(count10, 'iskierka', 1)).toBe('match-digit-dots')
  })

  it('subitizing zostaje bez przeplotu', () => {
    const sub: Fact = { id: 'subitize-4', conceptId: 'iskierka-subitizing-6', args: [4] }
    expect(exerciseTypeForFact(sub, 'iskierka', 0)).toBe('subitize-flash')
    expect(exerciseTypeForFact(sub, 'iskierka', 1)).toBe('subitize-flash')
  })
})
