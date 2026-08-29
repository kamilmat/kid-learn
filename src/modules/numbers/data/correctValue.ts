import type { ExerciseType, Question } from '../types'

/**
 * Wartość, którą lektor wypowiada w feedbacku ("Tu było N!") i którą pokazujemy
 * na overlayu przy błędnej odpowiedzi. Wyciągnięte z SessionView, bo test audio
 * (`correct-show-<n>`) musi policzyć zbiór wszystkich możliwych wartości.
 */
export function extractCorrectValue(question: {
  exerciseType: ExerciseType
  payload: Record<string, unknown>
}): number | null {
  const args = (question.payload as { args: number[] }).args
  switch (question.exerciseType) {
    case 'count-objects':
    case 'subitize-flash':
    case 'match-digit-dots':
      return args[0] ?? null
    case 'number-rhythm':
      return args[0] ?? null
    case 'concrete-add':
      return (args[0] ?? 0) + (args[1] ?? 0)
    case 'number-bond-builder':
      return args[0] ?? null // whole
    case 'ten-frame-fill':
      return args[1] ?? null // missing
    case 'concrete-add-subtract': {
      const op = (question.payload as { op?: '+' | '-' }).op ?? '+'
      const a = args[0] ?? 0
      const b = args[1] ?? 0
      return op === '-' ? a - b : a + b
    }
    case 'fact-family-triangle':
      return args[2] ?? null // whole
    case 'doubles':
      return (args[0] ?? 0) * 2
    case 'near-doubles':
      return (args[0] ?? 0) + (args[1] ?? 0)
    case 'make-10':
      return (args[0] ?? 0) + (args[1] ?? 0)
    case 'equal-groups':
      return (args[0] ?? 0) * (args[1] ?? 0)
    case 'skip-count-chase':
      return args[2] ?? null // nextValue
    case 'array-match':
      return (args[0] ?? 0) * (args[1] ?? 0)
    case 'subtract-maintenance':
      return (args[0] ?? 0) - (args[1] ?? 0)
  }
}

export type { Question }
