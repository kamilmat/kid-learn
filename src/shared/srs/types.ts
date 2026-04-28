export type Box = 1 | 2 | 3 | 4 | 5

export type DisplayStyle = 'print' | 'handwritten'
export type DisplayCase = 'upper' | 'lower' | 'pair'

export type Outcome = 'correct' | 'wrong' | 'dontKnow' | 'timeout'

// Bazowy typ dla każdego elementu z SRS — używany przez select/update/scoring/distractors.
// Konkretne typy (LetterState, SyllableState, WordState) rozszerzają go o pola specyficzne.
export type BaseItemState = {
  id: string                  // unikalny identyfikator (np. "letter-A", "syl-MA", "word-MAMA")
  box: Box
  lastSeen: number
  recentWrong: number
}

export type LetterState = {
  id: string
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
