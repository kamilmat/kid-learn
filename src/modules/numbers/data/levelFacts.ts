import type { Level } from '@/shared/settings/types'
import { getConceptsForLevel } from './concepts'
import { generateFactsForConcept, type Fact } from './facts'

// Pula maintenance odejmowania dla Pochodni — kuratorowana, do 20 z przekraczaniem progu
export const POCHODNIA_SUB_MAINTENANCE_FACTS: Fact[] = [
  { id: 'sub-13-5', conceptId: 'plomyk-addsub-10', args: [13, 5] },
  { id: 'sub-15-7', conceptId: 'plomyk-addsub-10', args: [15, 7] },
  { id: 'sub-12-8', conceptId: 'plomyk-addsub-10', args: [12, 8] },
  { id: 'sub-14-6', conceptId: 'plomyk-addsub-10', args: [14, 6] },
  { id: 'sub-11-4', conceptId: 'plomyk-addsub-10', args: [11, 4] },
  { id: 'sub-16-9', conceptId: 'plomyk-addsub-10', args: [16, 9] },
]

/** Wszystkie fakty dostępne na danym poziomie (z maintenance dla Pochodni). */
export function getLevelFacts(level: Level): Fact[] {
  const main = getConceptsForLevel(level).flatMap((c) => generateFactsForConcept(c.id))
  if (level === 'pochodnia') {
    return [...main, ...POCHODNIA_SUB_MAINTENANCE_FACTS]
  }
  return main
}

/** Operator odczytywany z id faktu — `sub-*` to odejmowanie, reszta dodawanie. */
export function opForFact(fact: Fact): '+' | '-' {
  return fact.id.startsWith('sub-') ? '-' : '+'
}
