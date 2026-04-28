import { describe, expect, it } from 'vitest'
import { generateFactsForConcept } from './facts'
import { CONCEPTS } from './concepts'
import type { ConceptId } from '../types'

describe('generateFactsForConcept', () => {
  it('iskierka-counting-5 generates 5 facts', () => {
    const facts = generateFactsForConcept('iskierka-counting-5')
    expect(facts).toHaveLength(5)
    expect(facts[0]?.id).toBe('count-1')
    expect(facts[4]?.id).toBe('count-5')
  })

  it('plomyk-bonds-5 generates 2 bonds (1+4, 2+3)', () => {
    const facts = generateFactsForConcept('plomyk-bonds-5')
    expect(facts).toHaveLength(2)
    expect(facts.map((f) => f.id)).toEqual(['bond-5-1-4', 'bond-5-2-3'])
  })

  it('plomyk-bonds-10 generates bonds for 6..10', () => {
    const facts = generateFactsForConcept('plomyk-bonds-10')
    // 6: (1,5), (2,4), (3,3) = 3
    // 7: (1,6), (2,5), (3,4) = 3
    // 8: (1,7), (2,6), (3,5), (4,4) = 4
    // 9: (1,8), (2,7), (3,6), (4,5) = 4
    // 10: (1,9), (2,8), (3,7), (4,6), (5,5) = 5
    // Total = 19
    expect(facts).toHaveLength(19)
    expect(facts.some((f) => f.id === 'bond-7-3-4')).toBe(true)
    expect(facts.some((f) => f.id === 'bond-10-5-5')).toBe(true)
  })

  it('ognik-doubles generates 1+1 .. 10+10', () => {
    const facts = generateFactsForConcept('ognik-doubles')
    expect(facts).toHaveLength(10)
    expect(facts[0]?.id).toBe('double-1')
    expect(facts[9]?.id).toBe('double-10')
  })

  it('pochodnia-skipcount-2 generates step facts', () => {
    const facts = generateFactsForConcept('pochodnia-skipcount-2')
    expect(facts).toHaveLength(4)
    expect(facts.every((f) => f.id.startsWith('skip2-step'))).toBe(true)
  })

  it('every concept generates at least minFacts facts (mastery thresholds satisfiable)', () => {
    for (const id of Object.keys(CONCEPTS) as ConceptId[]) {
      const def = CONCEPTS[id]
      const facts = generateFactsForConcept(id)
      expect(facts.length, `concept ${id} has ${facts.length} facts but minFacts=${def.minFacts}`).toBeGreaterThanOrEqual(def.minFacts)
    }
  })

  it('every fact has matching conceptId', () => {
    for (const id of Object.keys(CONCEPTS) as ConceptId[]) {
      const facts = generateFactsForConcept(id)
      expect(facts.every((f) => f.conceptId === id)).toBe(true)
    }
  })

  it('no duplicate fact ids within a concept', () => {
    for (const id of Object.keys(CONCEPTS) as ConceptId[]) {
      const facts = generateFactsForConcept(id)
      const ids = facts.map((f) => f.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
