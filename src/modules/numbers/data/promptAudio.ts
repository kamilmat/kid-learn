// Klucz audio polecenia dla pytania — używany przez przycisk 🔊 („powtórz")
// w status barze sesji. WHY osobna mapa: każde ćwiczenie kolejkuje własny
// prompt w `useEffect` przy mouncie, ale przycisk powtórki żyje w SessionView
// i nie ma dostępu do tego efektu.

import type { Question } from '../types'

export function promptAudioKey(question: Question | null): string | null {
  if (!question) return null
  const args = (question.payload as { args?: number[] }).args ?? []
  switch (question.exerciseType) {
    case 'count-objects':
      return 'count-objects-prompt'
    case 'subitize-flash':
    case 'match-digit-dots':
      return 'ask-howmany'
    case 'number-rhythm':
      return 'ask-whats-next'
    case 'concrete-add':
    case 'doubles':
    case 'near-doubles':
    case 'make-10':
    case 'equal-groups':
    case 'array-match':
      return 'ask-howmany-total'
    case 'number-bond-builder':
    case 'fact-family-triangle':
      return 'ask-build-bond'
    case 'ten-frame-fill':
      return 'ask-howmany-missing'
    case 'subtract-maintenance':
      return 'ask-howmany-left'
    case 'concrete-add-subtract': {
      const op = (question.payload as { op?: '+' | '-' }).op
      return op === '-' ? 'ask-howmany-left' : 'ask-howmany-total'
    }
    case 'skip-count-chase': {
      const step = args[0]
      if (step === 5) return 'ask-skip-count-5'
      if (step === 10) return 'ask-skip-count-10'
      return 'ask-skip-count-2'
    }
  }
}

/**
 * Iskra „myśli na głos" (competent other, Wygotski) — gra raz na sesję dla
 * typów ćwiczeń, w których modelowanie strategii ma sens.
 */
export function thinkingAloudKey(exerciseType: Question['exerciseType']): string | null {
  switch (exerciseType) {
    case 'concrete-add':
    case 'concrete-add-subtract':
      return 'iskra-thinking-aloud-fingers'
    case 'ten-frame-fill':
    case 'make-10':
      return 'iskra-thinking-aloud-tenframe'
    case 'doubles':
    case 'near-doubles':
      return 'iskra-thinking-aloud-doubles'
    default:
      return null
  }
}

/** `number-0..20` istnieją w numbers.json; poza zakresem nie ma pliku. */
function numberKey(n: number | undefined): string | null {
  return n !== undefined && Number.isInteger(n) && n >= 0 && n <= 20 ? `number-${n}` : null
}

/**
 * Pełna sekwencja polecenia: liczby zadania wypowiadane wprost, potem pytanie.
 * WHY: klucze `number-*`/`op-*` były martwe, a dziecko słyszało samo „ile jest
 * razem?" bez składników. Argument spoza 0–20 → cofamy się do klucza
 * generycznego: lepiej krótszy prompt niż 404 w środku kolejki.
 */
export function promptAudioKeys(question: Question | null): string[] {
  const generic = promptAudioKey(question)
  if (!question || generic === null) return []
  const args = (question.payload as { args?: number[] }).args ?? []
  const a = numberKey(args[0])
  const b = numberKey(args[1])
  const withOp = (op: string): string[] =>
    a !== null && b !== null ? [a, op, b, generic] : [generic]
  switch (question.exerciseType) {
    // `doubles` ma jeden argument (a+a) — powiel go zamiast oczekiwać `b`.
    case 'doubles':
      return a !== null ? [a, 'op-plus', a, generic] : [generic]
    case 'concrete-add':
    case 'near-doubles':
    case 'make-10':
      return withOp('op-plus')
    case 'subtract-maintenance':
      return withOp('op-minus')
    case 'concrete-add-subtract':
      return withOp((question.payload as { op?: '+' | '-' }).op === '-' ? 'op-minus' : 'op-plus')
    case 'equal-groups':
    case 'array-match':
      return withOp('op-times')
    case 'ten-frame-fill':
      // fakt `tenframe-need-10` ma args[0] === 0 — „0 do dziesięciu" nie ma sensu
      // wypowiedziane, więc pomijamy wiodącą liczbę i zostaje sam prompt generyczny.
      return a !== null && args[0] !== 0 ? [a, generic] : [generic]
    case 'number-bond-builder':
      return a !== null ? [a, generic] : [generic]
    default:
      // count-objects, subitize-flash, match-digit-dots, number-rhythm,
      // skip-count-chase, fact-family-triangle — liczby SĄ celem pytania
      // (wypowiedzenie ich zdradziłoby odpowiedź) albo jest ich za dużo.
      return [generic]
  }
}
