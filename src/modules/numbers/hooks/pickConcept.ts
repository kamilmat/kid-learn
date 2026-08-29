import type { Level } from '@/shared/settings/types'
import type { ConceptId, ConceptMastery, MathFactState } from '../types'
import { CONCEPTS, getConceptsForLevel, type ConceptDef } from '../data/concepts'
import type { Fact } from '../data/facts'
import { getLevelFacts } from '../data/levelFacts'

/**
 * Prerekwizyt zaliczony też przy `learning` z połową streaka wymaganego do
 * mastery — pełne `mastered` wymaga 2 dób (`MIN_AGE_FOR_MASTERY_MS`), a przez
 * ten czas dziecko siedziałoby na jednym koncepcie wejściowym (Płomyk: 2 fakty
 * na całą sesję). Próg liczony per koncept, bo `minStreakForMastery` może się
 * różnić między konceptami.
 */
function softUnlockStreak(def: ConceptDef): number {
  return Math.ceil(def.minStreakForMastery / 2)
}

/** Poniżej tylu faktów pula poziomu jest za wąska na sesję — dobieramy peek-ahead. */
const MIN_FACTS_FOR_POOL = 8

/** Waga konceptu wpuszczonego wyłącznie jako peek-ahead (jeszcze zablokowanego). */
const PEEK_AHEAD_WEIGHT = 0.2

/**
 * Koncepty poziomu, które mają >= 1 fakt w FAKTYCZNEJ puli sesji. Ustawienie
 * rodzica `skipCountStep` wycina z Pochodni fakty dwóch skip-countów — bez tego
 * filtra bezfaktowy koncept zostawał „odblokowany", był wybierany w kółko
 * (pusta pula → fallback na całą pulę poziomu), nigdy nie osiągał mastery
 * i blokował wszystko, co miało go w prerekwizytach.
 */
export function effectiveConcepts(level: Level, levelFacts: readonly Fact[]): ConceptDef[] {
  const withFacts = new Set<ConceptId>(levelFacts.map((f) => f.conceptId))
  return getConceptsForLevel(level).filter((c) => withFacts.has(c.id))
}

function factCounts(
  defs: ConceptDef[],
  levelFacts: readonly Fact[],
): Map<ConceptId, number> {
  const ids = new Set(defs.map((d) => d.id))
  const counts = new Map<ConceptId, number>()
  for (const f of levelFacts) {
    if (ids.has(f.conceptId)) counts.set(f.conceptId, (counts.get(f.conceptId) ?? 0) + 1)
  }
  return counts
}

/**
 * Rodzina konceptu = id bez ostatniego segmentu liczbowego
 * (`pochodnia-skipcount-2` → `pochodnia-skipcount-`). Pozwala podmienić
 * prerekwizyt wycięty przez ustawienie rodzica na jego rodzeństwo.
 */
function familyOf(id: ConceptId): { prefix: string; step: number } | null {
  const m = /^(.*[^0-9])(\d+)$/.exec(id)
  return m ? { prefix: m[1]!, step: Number(m[2]) } : null
}

/**
 * Prerekwizyt przełożony na koncept FAKTYCZNIE obecny w puli sesji.
 * `null` = brak zamiennika (prerekwizyt traktujemy jako spełniony).
 *
 * WHY remap zamiast bezwarunkowego „spełniony": przy `skipCountStep: 5`
 * `equalgroups` wymaga `skipcount-2`, którego w puli nie ma — ale mnożenie
 * nadal ma stać na jakimkolwiek opanowanym skip-countcie, więc bramkujemy je
 * najniższym obecnym krokiem (tu: `skipcount-5`) zamiast wpuszczać od razu.
 */
function resolvePrereq(
  prereqId: ConceptId,
  selfId: ConceptId,
  effectiveIds: ReadonlySet<ConceptId>,
): ConceptId | null {
  if (effectiveIds.has(prereqId)) return prereqId
  const fam = familyOf(prereqId)
  if (!fam) return null
  let best: { id: ConceptId; step: number } | null = null
  for (const id of effectiveIds) {
    // Bez samego siebie — inaczej `skipcount-5` z prerekwizytem `skipcount-2`
    // zamknąłby się na własnym mastery i nigdy nie wystartował.
    if (id === selfId) continue
    const f = familyOf(id)
    if (!f || f.prefix !== fam.prefix) continue
    if (!best || f.step < best.step) best = { id, step: f.step }
  }
  return best?.id ?? null
}

function prereqSatisfied(
  prereqId: ConceptId,
  selfId: ConceptId,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
  effectiveIds: ReadonlySet<ConceptId>,
): boolean {
  const resolved = resolvePrereq(prereqId, selfId, effectiveIds)
  // Brak prerekwizytu i brak zamiennika w rodzinie = rodzic świadomie wyciął
  // całą gałąź wejściową. Traktujemy jako spełniony, inaczej to, co od niej
  // zależy, byłoby nieosiągalne.
  if (!resolved) return true
  const mastery = concepts[resolved]
  if (!mastery) return false
  if (mastery.state === 'mastered') return true
  if (mastery.state !== 'learning') return false
  const threshold = softUnlockStreak(CONCEPTS[resolved])
  // Mastery liczy dziś okno ostatnich 10, nie serię z rzędu — miękkie
  // odblokowanie musi honorować obie miary, inaczej dziecko z 6/10 poprawnych
  // (ale bez serii) siedziałoby w nieskończoność na koncepcie wejściowym.
  const correctInWindow = (mastery.recentOutcomes ?? []).filter(
    (o) => o === 'correct',
  ).length
  return mastery.correctStreak >= threshold || correctInWindow >= threshold
}

/**
 * Odblokowany = każdy prerekwizyt (obecny w efektywnej puli albo przełożony na
 * rodzeństwo z tej samej rodziny) jest `mastered` albo `learning` ze streakiem
 * >= połowy progu mastery.
 */
export function isUnlocked(
  def: ConceptDef,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
  effectiveIds: ReadonlySet<ConceptId>,
): boolean {
  return (def.prerequisites ?? []).every((p) =>
    prereqSatisfied(p, def.id, concepts, effectiveIds),
  )
}

/**
 * Koncepty dopuszczone do losowania: odblokowane + ewentualny jeden peek-ahead,
 * gdy odblokowane dają za mało faktów na sensowną sesję. `levelFacts` to
 * faktyczna pula sesji (po `skipCountStep`); domyślnie pełna pula poziomu.
 */
export function unlockedConcepts(
  level: Level,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
  levelFacts: readonly Fact[] = getLevelFacts(level),
): ConceptDef[] {
  const all = effectiveConcepts(level, levelFacts)
  const ids = new Set(all.map((c) => c.id))
  const open = all.filter((c) => isUnlocked(c, concepts, ids))
  // Bezpiecznik: gdy filtr wyciął wszystko, wpuszczamy koncepty bez prerekwizytów —
  // sesja nie może zostać bez pytań.
  const base = open.length > 0 ? open : all.filter((c) => (c.prerequisites ?? []).length === 0)
  const counts = factCounts(all, levelFacts)
  const baseFacts = base.reduce((sum, c) => sum + (counts.get(c.id) ?? 0), 0)
  if (baseFacts >= MIN_FACTS_FOR_POOL) return base
  // Peek-ahead: dokładamy KOLEJNY (w kolejności dydaktycznej poziomu) jeszcze
  // zablokowany koncept, żeby wąska pula wejściowa nie zapętliła sesji na
  // kilku faktach. Waga 0.2 — to zajawka, nie pełnoprawny materiał.
  const next = all.find((c) => !base.includes(c) && !isUnlocked(c, concepts, ids))
  return next ? [...base, next] : base
}

function weightFor(
  def: ConceptDef,
  concepts: Partial<Record<ConceptId, ConceptMastery>>,
  facts: Record<string, MathFactState>,
  effectiveIds: ReadonlySet<ConceptId>,
): number {
  if (!isUnlocked(def, concepts, effectiveIds)) return PEEK_AHEAD_WEIGHT
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
  /** Faktyczna pula faktów sesji (po `skipCountStep`). */
  levelFacts?: readonly Fact[]
}): ConceptId | null {
  const { level, concepts, facts, lastConceptId, rng } = params
  const levelFacts = params.levelFacts ?? getLevelFacts(level)
  const open = unlockedConcepts(level, concepts, levelFacts)
  if (open.length === 0) return null
  const effectiveIds = new Set(effectiveConcepts(level, levelFacts).map((c) => c.id))
  // Anti-repeat tylko dopóki zostaje realny wybór. Przy dwóch konceptach
  // (świeży Płomyk: bonds-5 + peek-ahead) wycięcie poprzedniego wymuszałoby
  // sztywną naprzemienność i podbiło peek-ahead z 17% do 50%.
  const withoutLast = open.filter((c) => c.id !== lastConceptId)
  const pool = withoutLast.length > 1 ? withoutLast : open
  const weights = pool.map((c) => weightFor(c, concepts, facts, effectiveIds))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return pool[Math.floor(rng() * pool.length)]?.id ?? null
  let r = rng() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!
    if (r <= 0) return pool[i]!.id
  }
  return pool[pool.length - 1]!.id
}
