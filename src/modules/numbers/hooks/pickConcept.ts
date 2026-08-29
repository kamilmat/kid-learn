import type { Level } from '@/shared/settings/types'
import type { ConceptId, ConceptMastery, MathFactState } from '../types'
import { getConceptsForLevel, type ConceptDef } from '../data/concepts'

/** Odblokowany = wszystkie prerekwizyty w stanie `mastered`. */
export function unlockedConcepts(
  level: Level,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
): ConceptDef[] {
  const all = getConceptsForLevel(level)
  const open = all.filter((c) =>
    (c.prerequisites ?? []).every((p) => concepts[p]?.state === 'mastered'),
  )
  // Bezpiecznik: gdy filtr wyciął wszystko, wpuszczamy koncepty bez prerekwizytów —
  // sesja nie może zostać bez pytań.
  return open.length > 0 ? open : all.filter((c) => (c.prerequisites ?? []).length === 0)
}

function weightFor(
  def: ConceptDef,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
  facts: Record<string, MathFactState>,
): number {
  if ((concepts[def.id]?.state ?? 'unseen') === 'mastered') return 0.4 // utrzymanie
  return Object.values(facts).some((f) => f.conceptId === def.id && f.recentWrong > 0) ? 2 : 1
}

/**
 * Krok 1 doboru pytania: WAŻONY wybór konceptu z anti-repeat wobec poprzedniego.
 * Krok 2 (`pickNextItem` na faktach TEGO konceptu) zostaje bez zmian.
 */
export function pickConcept(params: {
  level: Level
  concepts: Partial<Record<ConceptId, ConceptMastery>>
  facts: Record<string, MathFactState>
  lastConceptId: ConceptId | null
  rng: () => number
}): ConceptId | null {
  const { level, concepts, facts, lastConceptId, rng } = params
  const open = unlockedConcepts(level, concepts)
  if (open.length === 0) return null
  const pool = open.length > 1 ? open.filter((c) => c.id !== lastConceptId) : open
  const weights = pool.map((c) => weightFor(c, concepts, facts))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return pool[Math.floor(rng() * pool.length)]?.id ?? null
  let r = rng() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!
    if (r <= 0) return pool[i]!.id
  }
  return pool[pool.length - 1]!.id
}
