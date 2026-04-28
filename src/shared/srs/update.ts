import type {
  Box,
  DisplayCase,
  DisplayStyle,
  LetterState,
  Outcome,
} from './types'

const RECENT_WRONG_DECAY = 0.33

function clampBox(value: number): Box {
  if (value <= 1) return 1
  if (value >= 5) return 5
  return value as Box
}

export function nextBox(current: Box, outcome: Outcome): Box {
  switch (outcome) {
    case 'correct':
      return clampBox(current + 1)
    case 'wrong':
      return clampBox(current - 2)
    case 'dontKnow':
      return clampBox(current - 1)
    case 'timeout':
      return clampBox(current - 2)
  }
}

export function nextRecentWrong(current: number, outcome: Outcome): number {
  if (outcome === 'correct') {
    return Math.max(current - RECENT_WRONG_DECAY, 0)
  }
  return current + 1
}

function runningMean(prevMean: number, prevCount: number, sample: number): number {
  if (prevCount <= 0) return sample
  return prevMean + (sample - prevMean) / (prevCount + 1)
}

function bumpStyle(
  perStyle: LetterState['perStyle'],
  style: DisplayStyle,
  outcome: Outcome
): LetterState['perStyle'] {
  if (outcome !== 'correct' && outcome !== 'wrong') return perStyle
  const bucket = perStyle[style]
  const updated =
    outcome === 'correct'
      ? { correct: bucket.correct + 1, wrong: bucket.wrong }
      : { correct: bucket.correct, wrong: bucket.wrong + 1 }
  return { ...perStyle, [style]: updated }
}

function bumpCase(
  perCase: LetterState['perCase'],
  displayCase: DisplayCase,
  outcome: Outcome
): LetterState['perCase'] {
  if (displayCase === 'pair') return perCase
  if (outcome !== 'correct' && outcome !== 'wrong') return perCase
  const bucket = perCase[displayCase]
  const updated =
    outcome === 'correct'
      ? { correct: bucket.correct + 1, wrong: bucket.wrong }
      : { correct: bucket.correct, wrong: bucket.wrong + 1 }
  return { ...perCase, [displayCase]: updated }
}

export type UpdateMeta = { firstMastery: boolean }

export function updateLetterState(
  state: LetterState,
  outcome: Outcome,
  responseMs: number,
  now: number,
  displayStyle: DisplayStyle,
  displayCase: DisplayCase,
  chosenLetter?: string
): [LetterState, UpdateMeta] {
  const newBox = nextBox(state.box, outcome)
  const reachedFiveFirstTime = newBox === 5 && state.masteredAt === null
  const masteredAt = reachedFiveFirstTime ? now : state.masteredAt

  const totalCorrect = state.totalCorrect + (outcome === 'correct' ? 1 : 0)
  const totalWrong = state.totalWrong + (outcome === 'wrong' ? 1 : 0)
  const totalDontKnow = state.totalDontKnow + (outcome === 'dontKnow' ? 1 : 0)
  const totalTimeout = state.totalTimeout + (outcome === 'timeout' ? 1 : 0)
  const totalSeen = state.totalSeen + 1

  const confusedWith =
    outcome === 'wrong' && chosenLetter !== undefined && chosenLetter !== state.letter
      ? {
          ...state.confusedWith,
          [chosenLetter]: (state.confusedWith[chosenLetter] ?? 0) + 1,
        }
      : state.confusedWith

  const next: LetterState = {
    id: state.id,
    letter: state.letter,
    box: newBox,
    lastSeen: now,
    totalSeen,
    totalCorrect,
    totalWrong,
    totalDontKnow,
    totalTimeout,
    recentWrong: nextRecentWrong(state.recentWrong, outcome),
    avgResponseMs: runningMean(state.avgResponseMs, state.totalSeen, responseMs),
    masteredAt,
    confusedWith,
    perStyle: bumpStyle(state.perStyle, displayStyle, outcome),
    perCase: bumpCase(state.perCase, displayCase, outcome),
  }

  return [next, { firstMastery: reachedFiveFirstTime }]
}
