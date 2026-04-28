import type { Level } from '@/shared/settings/types'
import { LEVEL_TO_EXERCISE, type ExerciseType } from '../types'
import { ALL_SYLLABLES } from './syllables'
import { getWordsByLevel } from './words'

export type ReadingPool = {
  level: Level
  exerciseType: ExerciseType
  itemIds: string[]
}

export function getReadingPool(level: Level): ReadingPool {
  const exerciseType = LEVEL_TO_EXERCISE[level]
  const itemIds = level === 'iskierka'
    ? ALL_SYLLABLES.map(s => s.id)
    : getWordsByLevel(level).map(w => w.id)
  return { level, exerciseType, itemIds }
}
