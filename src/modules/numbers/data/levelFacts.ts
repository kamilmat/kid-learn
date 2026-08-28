import type { Level, SkipCountStep } from '@/shared/settings/types'
import { getConceptsForLevel } from './concepts'
import { generateFactsForConcept, type Fact } from './facts'
import type { ConceptId } from '../types'

// Pula maintenance odejmowania dla Pochodni — kuratorowana, do 20 z przekraczaniem progu
export const POCHODNIA_SUB_MAINTENANCE_FACTS: Fact[] = [
  { id: 'sub-13-5', conceptId: 'plomyk-addsub-10', args: [13, 5] },
  { id: 'sub-15-7', conceptId: 'plomyk-addsub-10', args: [15, 7] },
  { id: 'sub-12-8', conceptId: 'plomyk-addsub-10', args: [12, 8] },
  { id: 'sub-14-6', conceptId: 'plomyk-addsub-10', args: [14, 6] },
  { id: 'sub-11-4', conceptId: 'plomyk-addsub-10', args: [11, 4] },
  { id: 'sub-16-9', conceptId: 'plomyk-addsub-10', args: [16, 9] },
]

const SKIP_COUNT_CONCEPTS: Record<2 | 5 | 10, ConceptId> = {
  2: 'pochodnia-skipcount-2',
  5: 'pochodnia-skipcount-5',
  10: 'pochodnia-skipcount-10',
}

/**
 * Wszystkie fakty dostępne na danym poziomie (z maintenance dla Pochodni).
 * `skipCountStep` (ustawienie rodzica) zawęża Pochodnię do jednego kroku
 * skip-count; 'mixed' (default) zostawia wszystkie trzy.
 */
export function getLevelFacts(level: Level, skipCountStep: SkipCountStep = 'mixed'): Fact[] {
  let concepts = getConceptsForLevel(level)
  if (level === 'pochodnia' && skipCountStep !== 'mixed') {
    const keep = SKIP_COUNT_CONCEPTS[skipCountStep]
    const dropped = Object.values(SKIP_COUNT_CONCEPTS).filter((c) => c !== keep)
    concepts = concepts.filter((c) => !dropped.includes(c.id))
  }
  const main = concepts.flatMap((c) => generateFactsForConcept(c.id))
  if (level === 'pochodnia') {
    return [...main, ...POCHODNIA_SUB_MAINTENANCE_FACTS]
  }
  return main
}

const MAINTENANCE_IDS = new Set(POCHODNIA_SUB_MAINTENANCE_FACTS.map((f) => f.id))

/**
 * Pula głównego losowania. Fakty maintenance mają własną gałąź 18% w sesji —
 * zostawione też tutaj byłyby liczone podwójnie.
 */
export function excludeMaintenance(facts: Fact[]): Fact[] {
  return facts.filter((f) => !MAINTENANCE_IDS.has(f.id))
}

/** Operator odczytywany z id faktu — `sub-*` to odejmowanie, reszta dodawanie. */
export function opForFact(fact: Fact): '+' | '-' {
  return fact.id.startsWith('sub-') ? '-' : '+'
}
