import { describe, it, expect } from 'vitest'
import { pickConcept, unlockedConcepts } from './pickConcept'
import type { ConceptId, ConceptMastery, MathFactState } from '../types'

const m = (state: ConceptMastery['state']): ConceptMastery =>
  ({ state, firstSeenAt: 1, lastSeenAt: 1, correctStreak: 0, factsTouched: [] })
function seeded(seed: number): () => number {
  let s = seed
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
}

describe('pickConcept', () => {
  it('koncept z niespełnionym prerekwizytem nie wychodzi ani razu', () => {
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = { 'plomyk-bonds-5': m('learning') }
    const rng = seeded(7); const seen = new Set<ConceptId>()
    for (let i = 0; i < 200; i++) {
      const c = pickConcept({ level: 'plomyk', concepts, facts: {}, lastConceptId: null, rng })
      if (c) seen.add(c)
    }
    expect(seen.has('plomyk-addsub-10')).toBe(false)
    expect(seen.has('plomyk-bonds-5')).toBe(true)
  })
  it('żaden koncept nie przekracza 45% z 200 losowań w Płomyku', () => {
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = {
      'plomyk-bonds-5': m('mastered'), 'plomyk-bonds-10': m('mastered'),
      'plomyk-tenframe': m('learning'), 'plomyk-addsub-10': m('learning'),
    }
    const rng = seeded(42); const counts = new Map<ConceptId, number>(); let last: ConceptId | null = null
    for (let i = 0; i < 200; i++) {
      const c = pickConcept({ level: 'plomyk', concepts, facts: {}, lastConceptId: last, rng })
      if (!c) continue
      counts.set(c, (counts.get(c) ?? 0) + 1); last = c
    }
    for (const n of counts.values()) expect(n / 200).toBeLessThanOrEqual(0.45)
  })
  it('bezpiecznik: nic nie odblokowane → koncepty bez prerekwizytów', () => {
    expect(unlockedConcepts('ognik', {}).map((c) => c.id)).toEqual(['ognik-doubles'])
  })
  it('fakt z recentWrong podbija wagę swojego konceptu', () => {
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = {
      'iskierka-counting-5': m('learning'), 'iskierka-rhythm': m('learning'),
    }
    const facts = { f1: { id: 'f1', conceptId: 'iskierka-rhythm', box: 1, lastSeen: 0,
      recentWrong: 2, totalSeen: 3, totalCorrect: 1, totalWrong: 2 } } as unknown as Record<string, MathFactState>
    const rng = seeded(3); let hits = 0
    for (let i = 0; i < 200; i++)
      if (pickConcept({ level: 'iskierka', concepts, facts, lastConceptId: null, rng }) === 'iskierka-rhythm') hits++
    expect(hits).toBeGreaterThan(40)
  })
})
