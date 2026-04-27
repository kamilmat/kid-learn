import type { Box, LetterState } from './types'

const BOX_WEIGHTS: Record<Box, number> = {
  1: 5.0,
  2: 3.0,
  3: 1.5,
  4: 1.0,
  5: 0.4,
}

const RECENCY_CAP = 3.0
const MS_PER_HOUR = 3_600_000

export function boxWeight(box: Box): number {
  return BOX_WEIGHTS[box]
}

export function scoreLetter(state: LetterState, now: number): number {
  const recency =
    state.lastSeen <= 0
      ? 1.0
      : Math.min(1 + ((now - state.lastSeen) / MS_PER_HOUR) * 0.3, RECENCY_CAP)
  const recentWrongBoost = 1 + state.recentWrong * 2.0
  return boxWeight(state.box) * recency * recentWrongBoost
}
