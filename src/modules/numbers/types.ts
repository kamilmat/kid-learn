import type { BaseItemState } from '@/shared/srs/types'
import type { Level } from '@/shared/settings/types'

// Klucze faktów matematycznych — używane jako id w SRS.
// Format: <type>-<args>; np. "bond-7-3-4", "add-5-2", "sub-7-3", "double-6",
// "neardouble-6-7", "make10-8-5", "skip2-step3", "mult-3-2", "array-3x4".
export type MathFactId = string

export type ConceptId =
  // Iskierka
  | 'iskierka-counting-5'
  | 'iskierka-counting-10'
  | 'iskierka-subitizing-6'
  | 'iskierka-rhythm'
  | 'iskierka-adding-concrete'
  // Płomyk
  | 'plomyk-bonds-5'
  | 'plomyk-bonds-10'
  | 'plomyk-tenframe'
  | 'plomyk-addsub-10'
  | 'plomyk-factfamily'
  // Ognik
  | 'ognik-doubles'
  | 'ognik-neardoubles'
  | 'ognik-make10'
  | 'ognik-factfamily-20'
  // Pochodnia
  | 'pochodnia-skipcount-2'
  | 'pochodnia-skipcount-5'
  | 'pochodnia-skipcount-10'
  | 'pochodnia-equalgroups'
  | 'pochodnia-arrays'
  | 'pochodnia-commutativity'

export type MathFactState = BaseItemState & {
  conceptId: ConceptId
}

export type ConceptMasteryState = 'unseen' | 'learning' | 'mastered'

export type ConceptMastery = {
  state: ConceptMasteryState
  firstSeenAt: number
  lastSeenAt: number
  correctStreak: number
  factsTouched: string[]
}

export type ExerciseType =
  // Iskierka
  | 'subitize-flash'
  | 'match-digit-dots'
  | 'number-rhythm'
  | 'concrete-add'
  // Płomyk
  | 'number-bond-builder'
  | 'ten-frame-fill'
  | 'concrete-add-subtract'
  | 'fact-family-triangle'
  // Ognik
  | 'doubles'
  | 'near-doubles'
  | 'make-10'
  // Pochodnia
  | 'equal-groups'
  | 'skip-count-chase'
  | 'array-match'
  | 'subtract-maintenance'

export type Question = {
  factId: MathFactId
  conceptId: ConceptId
  exerciseType: ExerciseType
  payload: Record<string, unknown>
}

export type AnswerOutcome = 'correct' | 'wrong' | 'dontKnow'

export type NumbersSessionEvent = {
  factId: MathFactId
  conceptId: ConceptId
  exerciseType: ExerciseType
  outcome: AnswerOutcome
  responseMs: number
  timestamp: number
}

export type NumbersSessionLog = {
  startedAt: number
  endedAt: number
  level: Level
  events: NumbersSessionEvent[]
}
