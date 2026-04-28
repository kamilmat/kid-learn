import type { LetterState } from './types'

export function createInitialLetterState(letter: string): LetterState {
  return {
    id: `letter-${letter.toUpperCase()}`,
    letter,
    box: 1,
    lastSeen: 0,
    totalSeen: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalDontKnow: 0,
    totalTimeout: 0,
    recentWrong: 0,
    avgResponseMs: 0,
    masteredAt: null,
    confusedWith: {},
    perStyle: {
      print: { correct: 0, wrong: 0 },
      handwritten: { correct: 0, wrong: 0 },
    },
    perCase: {
      upper: { correct: 0, wrong: 0 },
      lower: { correct: 0, wrong: 0 },
    },
  }
}
