import type { AnswerOutcome, ConceptId } from '../types'

/**
 * Nazwanie strategii po błędzie — dziecko dostaje NARZĘDZIE, nie tylko
 * poprawną odpowiedź. Limit 2× na sesję: częściej robi się zrzędzenie.
 * `subtract-maintenance` to typ ĆWICZENIA — jego fakty mają conceptId
 * 'plomyk-addsub-10' z op '-', więc trafiają w count-back poniżej.
 */
export const MAX_STRATEGY_CUES_PER_SESSION = 2

/**
 * Budżet się zużywa tylko za błędy — „nie wiem" nadal odtwarza strategię
 * (dziecko ma dostać narzędzie), ale nie powinno kosztować tyle co pomyłka:
 * przyznanie się do niewiedzy jest już samo w sobie dobrą decyzją.
 */
export function shouldChargeStrategyBudget(outcome: AnswerOutcome): boolean {
  return outcome === 'wrong'
}

export function strategyAudioKey(conceptId: ConceptId, op: '+' | '-'): string | null {
  switch (conceptId) {
    case 'iskierka-adding-concrete':
      return 'strategy-count-on'
    case 'plomyk-addsub-10':
      return op === '-' ? 'strategy-count-back' : 'strategy-count-on'
    case 'ognik-doubles':
      return 'strategy-doubles'
    case 'ognik-neardoubles':
      return 'strategy-near-doubles'
    case 'ognik-make10':
    case 'plomyk-tenframe':
      return 'strategy-make10'
    default:
      return null
  }
}
