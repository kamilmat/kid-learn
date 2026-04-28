import type { Level } from '@/shared/settings/types'
import type { ExerciseType } from '../types'
import type { Fact } from '../data/facts'

export function exerciseTypeForFact(fact: Fact, level: Level): ExerciseType {
  // Maintenance odejmowania w Pochodni — sub- fakty z plomyk-addsub-10 zaciągane
  // w Pochodni jako interleaving (Bjork): NIE używaj concrete-add-subtract,
  // tylko dedykowanego subtract-maintenance ćwiczenia.
  if (level === 'pochodnia' && fact.id.startsWith('sub-')) {
    return 'subtract-maintenance'
  }
  switch (fact.conceptId) {
    case 'iskierka-counting-5':
    case 'iskierka-subitizing-6':
      // Subitizing 1-6: flash dice patterns (perceptual subitizing)
      return 'subitize-flash'
    case 'iskierka-counting-10':
      // Liczenie 7-10: ten frame statyczny (conceptual subitizing)
      return 'match-digit-dots'
    case 'iskierka-rhythm':
      return 'number-rhythm'
    case 'iskierka-adding-concrete':
      return 'concrete-add'
    case 'plomyk-bonds-5':
    case 'plomyk-bonds-10':
      return 'number-bond-builder'
    case 'plomyk-tenframe':
      return 'ten-frame-fill'
    case 'plomyk-addsub-10':
      return 'concrete-add-subtract'
    case 'plomyk-factfamily':
    case 'ognik-factfamily-20':
      return 'fact-family-triangle'
    case 'ognik-doubles':
      return 'doubles'
    case 'ognik-neardoubles':
      return 'near-doubles'
    case 'ognik-make10':
      return 'make-10'
    case 'pochodnia-skipcount-2':
    case 'pochodnia-skipcount-5':
    case 'pochodnia-skipcount-10':
      return 'skip-count-chase'
    case 'pochodnia-equalgroups':
      return 'equal-groups'
    case 'pochodnia-arrays':
    case 'pochodnia-commutativity':
      return 'array-match'
  }
}
