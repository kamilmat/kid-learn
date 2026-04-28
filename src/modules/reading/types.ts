import type { BaseItemState, Outcome } from '@/shared/srs/types'
import type { Level } from '@/shared/settings/types'

export type ExerciseType = 'syllable-match' | 'word-assembly' | 'word-choice' | 'syllable-fill'

export const LEVEL_TO_EXERCISE: Record<Level, ExerciseType> = {
  iskierka: 'syllable-match',
  plomyk: 'word-assembly',
  ognik: 'word-choice',
  pochodnia: 'syllable-fill',
}

export type SyllableState = BaseItemState & {
  syllable: string                  // np. "MA"
  totalSeen: number
  totalCorrect: number
  totalWrong: number
}

export type WordState = BaseItemState & {
  word: string                      // np. "MAMA"
  totalSeen: number
  totalCorrect: number
  totalWrong: number
  level: Level                      // poziom na którym to słowo żyje
  album: boolean                    // czy w albumie (box >= 5 raz osiągnięty)
}

export type SyllableFillVariant = 'first' | 'middle' | 'last'

export type ReadingQuestion =
  | { type: 'syllable-match'; targetSyllable: string; choices: string[] }
  | { type: 'word-assembly'; targetWord: string; syllables: string[]; distractors: string[] }
  | { type: 'word-choice'; targetWord: string; choices: string[] }
  | { type: 'syllable-fill'; targetWord: string; missingPosition: SyllableFillVariant; missingSyllable: string; choices: string[]; visibleSyllables: string[] }

export type ReadingSessionEvent = {
  questionIndex: number
  exerciseType: ExerciseType
  targetId: string                  // 'syl-MA' lub 'word-MAMA'
  outcome: Outcome
  responseMs: number
  timestamp: number
}
