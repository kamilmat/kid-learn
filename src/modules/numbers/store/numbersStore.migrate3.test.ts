import { describe, expect, it } from 'vitest'
import { migrateNumbersV3 } from './numbersStore'

type ConceptShape = {
  state: string
  factsCorrect: string[]
  recentOutcomes: string[]
  factsTouched?: string[]
}

function conceptsOf(result: unknown): Record<string, ConceptShape> {
  return (result as { concepts: Record<string, ConceptShape> }).concepts
}

describe('migrateNumbersV3 (v2 → v3)', () => {
  it('przepisuje factsTouched na factsCorrect i zeruje okno', () => {
    const v2 = {
      concepts: {
        'iskierka-counting-5': { state: 'mastered', factsTouched: ['a', 'b'] },
      },
    }
    const c = conceptsOf(migrateNumbersV3(v2))['iskierka-counting-5']!
    expect(c.state).toBe('mastered')
    expect(c.factsCorrect).toEqual(['a', 'b'])
    expect(c.recentOutcomes).toEqual([])
  })

  it('koncept bez factsTouched dostaje puste tablice', () => {
    const c = conceptsOf(migrateNumbersV3({ concepts: { x: { state: 'learning' } } }))['x']!
    expect(c.factsCorrect).toEqual([])
    expect(c.recentOutcomes).toEqual([])
  })

  it('nie rusza persistu bez konceptów', () => {
    expect(migrateNumbersV3({ facts: { 'add-1-1': {} } })).toEqual({
      facts: { 'add-1-1': {} },
    })
    expect(migrateNumbersV3(undefined)).toEqual({})
  })

  it('zachowuje pozostałe pola persistu', () => {
    const out = migrateNumbersV3({
      concepts: { x: { state: 'learning', factsTouched: ['a'] } },
      seenIntros: ['intro-x'],
      wildCelebrationCounter: 3,
    }) as { seenIntros: string[]; wildCelebrationCounter: number }
    expect(out.seenIntros).toEqual(['intro-x'])
    expect(out.wildCelebrationCounter).toBe(3)
  })
})
