import { describe, it, expect } from 'vitest'
import { pickConcept, unlockedConcepts, effectiveConcepts, isUnlocked } from './pickConcept'
import { CONCEPTS } from '../data/concepts'
import { getLevelFacts } from '../data/levelFacts'
import type { ConceptId, ConceptMastery, MathFactState } from '../types'

const m = (state: ConceptMastery['state'], correctStreak = 0): ConceptMastery => ({
  state,
  firstSeenAt: 1,
  lastSeenAt: 1,
  correctStreak,
  factsTouched: [],
  recentOutcomes: [],
  factsCorrect: [],
})
function seeded(seed: number): () => number {
  let s = seed
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
}

/** 200 losowań z podtrzymaniem `lastConceptId` — jak w sesji. */
function sample(
  level: 'iskierka' | 'plomyk' | 'ognik' | 'pochodnia',
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
  seed: number,
  facts: Record<string, MathFactState> = {},
  carryLast = true,
): Map<ConceptId, number> {
  const rng = seeded(seed)
  const counts = new Map<ConceptId, number>()
  let last: ConceptId | null = null
  for (let i = 0; i < 200; i++) {
    const c = pickConcept({ level, concepts, facts, lastConceptId: last, rng })
    if (!c) continue
    counts.set(c, (counts.get(c) ?? 0) + 1)
    if (carryLast) last = c
  }
  return counts
}

describe('pickConcept', () => {
  it('koncept z niespełnionym prerekwizytem nie wychodzi, gdy pula nie potrzebuje peek-ahead', () => {
    // Ognik: `doubles` samo daje 10 faktów (>= 8), więc peek-ahead się nie włącza
    // i dalsze koncepty zostają zamknięte.
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = { 'ognik-doubles': m('learning') }
    const seen = new Set(sample('ognik', concepts, 7).keys())
    expect(seen.has('ognik-doubles')).toBe(true)
    expect(seen.has('ognik-neardoubles')).toBe(false)
    expect(seen.has('ognik-make10')).toBe(false)
  })

  it('miękkie bramkowanie: prerekwizyt `learning` ze streakiem >= 4 odblokowuje kolejny koncept', () => {
    const almost: Partial<Record<ConceptId, ConceptMastery>> = { 'ognik-doubles': m('learning', 3) }
    expect(unlockedConcepts('ognik', almost).map((c) => c.id)).toEqual(['ognik-doubles'])

    const soft: Partial<Record<ConceptId, ConceptMastery>> = { 'ognik-doubles': m('learning', 4) }
    expect(unlockedConcepts('ognik', soft).map((c) => c.id)).toEqual([
      'ognik-doubles',
      'ognik-neardoubles',
    ])
    expect(sample('ognik', soft, 11).get('ognik-neardoubles')).toBeGreaterThan(0)
  })

  it('peek-ahead: wąska pula wejściowa dostaje kolejny koncept z małą wagą', () => {
    // Świeży Płomyk: `bonds-5` to tylko 2 fakty — za mało na sesję (8 pytań).
    expect(unlockedConcepts('plomyk', {}).map((c) => c.id)).toEqual([
      'plomyk-bonds-5',
      'plomyk-bonds-10',
    ])
    const counts = sample('plomyk', {}, 19)
    const peek = counts.get('plomyk-bonds-10') ?? 0
    expect(peek).toBeGreaterThan(0)
    // Waga 0.2 vs 1 → zajawka zostaje mniejszością, nie przejmuje sesji.
    expect(peek / 200).toBeLessThan(0.35)
    expect(counts.get('plomyk-bonds-5')).toBeGreaterThan(peek)
  })

  it('żaden koncept nie przekracza 45% z 200 losowań w Płomyku', () => {
    const concepts: Partial<Record<ConceptId, ConceptMastery>> = {
      'plomyk-bonds-5': m('mastered'), 'plomyk-bonds-10': m('mastered'),
      'plomyk-tenframe': m('learning'), 'plomyk-addsub-10': m('learning'),
    }
    for (const n of sample('plomyk', concepts, 42).values()) expect(n / 200).toBeLessThanOrEqual(0.45)
  })

  it('bezpiecznik: nic nie odblokowane → koncepty bez prerekwizytów', () => {
    // 10 faktów w `ognik-doubles` przekracza próg peek-ahead, więc pula zostaje sama.
    expect(unlockedConcepts('ognik', {}).map((c) => c.id)).toEqual(['ognik-doubles'])
  })

  it('skipCountStep: pula konceptów zawężona do tych, które mają fakty', () => {
    const facts5 = getLevelFacts('pochodnia', 5)
    const eff = effectiveConcepts('pochodnia', facts5).map((c) => c.id)
    expect(eff).not.toContain('pochodnia-skipcount-2')
    expect(eff).not.toContain('pochodnia-skipcount-10')
    expect(eff).toContain('pochodnia-skipcount-5')

    // Bezfaktowy koncept nigdy nie wychodzi z losowania.
    const seen = new Set<ConceptId>()
    const rng = seeded(5)
    let last: ConceptId | null = null
    for (let i = 0; i < 200; i++) {
      const c = pickConcept({
        level: 'pochodnia', concepts: {}, facts: {}, lastConceptId: last, rng,
        levelFacts: facts5,
      })
      if (!c) continue
      seen.add(c)
      last = c
    }
    expect(seen.has('pochodnia-skipcount-2')).toBe(false)
    expect(seen.has('pochodnia-skipcount-10')).toBe(false)
    expect(seen.has('pochodnia-skipcount-5')).toBe(true)
  })

  it('skipCountStep: nieobecny prerekwizyt przechodzi na rodzeństwo z tej samej rodziny', () => {
    const facts5 = getLevelFacts('pochodnia', 5)
    const ids = new Set(effectiveConcepts('pochodnia', facts5).map((c) => c.id))

    // `skipcount-5` ma prerekwizyt `skipcount-2` — bez rodzeństwa w puli (siebie
    // nie liczymy), więc startuje otwarty.
    expect(isUnlocked(CONCEPTS['pochodnia-skipcount-5'], {}, ids)).toBe(true)
    // `equalgroups` też wskazuje na `skipcount-2`, ale tu zamiennik ISTNIEJE
    // (`skipcount-5`) — mnożenie czeka na niego zamiast wchodzić od razu.
    expect(isUnlocked(CONCEPTS['pochodnia-equalgroups'], {}, ids)).toBe(false)

    const soft: Partial<Record<ConceptId, ConceptMastery>> = {
      'pochodnia-skipcount-5': m('learning', 4),
    }
    expect(isUnlocked(CONCEPTS['pochodnia-equalgroups'], soft, ids)).toBe(true)
    expect(unlockedConcepts('pochodnia', soft, facts5).map((c) => c.id)).toEqual([
      'pochodnia-skipcount-5',
      'pochodnia-equalgroups',
    ])
  })

  it('skipCountStep: dalsze koncepty odblokowują się po soft-unlocku obecnych prerekwizytów', () => {
    const facts5 = getLevelFacts('pochodnia', 5)
    const soft: Partial<Record<ConceptId, ConceptMastery>> = {
      'pochodnia-skipcount-5': m('learning', 4),
      'pochodnia-equalgroups': m('learning', 4),
    }
    expect(unlockedConcepts('pochodnia', soft, facts5).map((c) => c.id)).toEqual([
      'pochodnia-skipcount-5',
      'pochodnia-equalgroups',
      'pochodnia-arrays',
    ])
    const full: Partial<Record<ConceptId, ConceptMastery>> = {
      ...soft, 'pochodnia-arrays': m('learning', 4),
    }
    expect(unlockedConcepts('pochodnia', full, facts5).map((c) => c.id)).toContain(
      'pochodnia-commutativity',
    )
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
