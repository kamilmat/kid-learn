import type { Level } from '@/shared/settings/types'
import type { ConceptId, ConceptMastery, MathFactState } from '../types'
import { getConceptsForLevel, type ConceptDef } from '../data/concepts'
import { generateFactsForConcept } from '../data/facts'

/**
 * Prerekwizyt zaliczony też przy `learning` z takim streakiem — pełne `mastered`
 * wymaga 2 dób (`MIN_AGE_FOR_MASTERY_MS`), a przez ten czas dziecko siedziałoby
 * na jednym koncepcie wejściowym (Płomyk: 2 fakty na całą sesję).
 */
const SOFT_UNLOCK_STREAK = 4

/** Poniżej tylu faktów pula poziomu jest za wąska na sesję — dobieramy peek-ahead. */
const MIN_FACTS_FOR_POOL = 8

/** Waga konceptu wpuszczonego wyłącznie jako peek-ahead (jeszcze zablokowanego). */
const PEEK_AHEAD_WEIGHT = 0.2

function prereqSatisfied(mastery: ConceptMastery | undefined): boolean {
  if (!mastery) return false
  if (mastery.state === 'mastered') return true
  return mastery.state === 'learning' && mastery.correctStreak >= SOFT_UNLOCK_STREAK
}

/** Odblokowany = każdy prerekwizyt `mastered` albo `learning` ze streakiem >= 4. */
export function isUnlocked(
  def: ConceptDef,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
): boolean {
  return (def.prerequisites ?? []).every((p) => prereqSatisfied(concepts[p]))
}

function factCount(defs: ConceptDef[]): number {
  return defs.reduce((sum, c) => sum + generateFactsForConcept(c.id).length, 0)
}

/**
 * Koncepty dopuszczone do losowania: odblokowane + ewentualny jeden peek-ahead,
 * gdy odblokowane dają za mało faktów na sensowną sesję.
 */
export function unlockedConcepts(
  level: Level,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
): ConceptDef[] {
  const all = getConceptsForLevel(level)
  const open = all.filter((c) => isUnlocked(c, concepts))
  // Bezpiecznik: gdy filtr wyciął wszystko, wpuszczamy koncepty bez prerekwizytów —
  // sesja nie może zostać bez pytań.
  const base = open.length > 0 ? open : all.filter((c) => (c.prerequisites ?? []).length === 0)
  if (factCount(base) >= MIN_FACTS_FOR_POOL) return base
  // Peek-ahead: dokładamy KOLEJNY (w kolejności dydaktycznej poziomu) jeszcze
  // zablokowany koncept, żeby wąska pula wejściowa nie zapętliła sesji na
  // kilku faktach. Waga 0.2 — to zajawka, nie pełnoprawny materiał.
  const next = all.find((c) => !base.includes(c))
  return next ? [...base, next] : base
}

function weightFor(
  def: ConceptDef,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
  facts: Record<string, MathFactState>,
): number {
  if (!isUnlocked(def, concepts)) return PEEK_AHEAD_WEIGHT
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
  // Anti-repeat tylko dopóki zostaje realny wybór. Przy dwóch konceptach
  // (świeży Płomyk: bonds-5 + peek-ahead) wycięcie poprzedniego wymuszałoby
  // sztywną naprzemienność i podbiło peek-ahead z 17% do 50%.
  const withoutLast = open.filter((c) => c.id !== lastConceptId)
  const pool = withoutLast.length > 1 ? withoutLast : open
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
