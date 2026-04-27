export type Box = 1 | 2 | 3 | 4 | 5

export type DisplayStyle = 'print' | 'handwritten'
export type DisplayCase = 'upper' | 'lower' | 'pair'

export type Outcome = 'correct' | 'wrong' | 'dontKnow' | 'timeout'

export type LetterState = {
  letter: string
  box: Box
  lastSeen: number
  totalSeen: number
  totalCorrect: number
  totalWrong: number
  totalDontKnow: number
  totalTimeout: number
  recentWrong: number
  avgResponseMs: number
  masteredAt: number | null
  confusedWith: Record<string, number>
  perStyle: {
    print: { correct: number; wrong: number }
    handwritten: { correct: number; wrong: number }
  }
  perCase: {
    upper: { correct: number; wrong: number }
    lower: { correct: number; wrong: number }
  }
}
