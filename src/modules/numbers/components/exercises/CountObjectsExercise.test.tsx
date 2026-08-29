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

  it('stukanie w obiekty nigdy nie woła onAnswer — dopiero kafelek cyfry', () => {
    const { onAnswer } = renderExercise(2)
    const objects = screen.getAllByTestId('count-object')
    for (const o of objects) tap(o)
    expect(onAnswer).not.toHaveBeenCalled()
    const choices = screen.getAllByTestId('count-choice')
    expect(choices).toHaveLength(4)
    fireEvent.click(choices[0]!.firstElementChild!)
    expect(onAnswer).toHaveBeenCalledTimes(1)
    const [outcome, value] = onAnswer.mock.calls[0]!
    expect(outcome).toBe(value === 2 ? 'correct' : 'wrong')
  })

  it('n === 1 startuje od razu w fazie kardynalności', () => {
    const { bus } = renderExercise(1)
    expect(screen.getByTestId('count-cardinality')).toBeDefined()
    expect(bus.keys()).toEqual(['count-objects-howmany'])
  })

  it('obiekty nie nachodzą na siebie (środki ≥96 px)', () => {
    renderExercise(10)
    const objects = screen.getAllByTestId('count-object') as HTMLElement[]
    const centers = objects.map((o) => ({
      x: parseFloat(o.style.left) + 36,
      y: parseFloat(o.style.top) + 36,
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
