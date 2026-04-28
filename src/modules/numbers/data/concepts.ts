import type { ConceptId } from '../types'
import type { Level } from '@/shared/settings/types'

export type ConceptDef = {
  id: ConceptId
  level: Level
  introAudioKey: string
  masteryAudioKey: string
  // Mastery threshold (spec sec 14.2):
  // correctStreak >= minStreakForMastery
  //   + factsTouched.length >= minFacts
  //   + age >= MIN_AGE_FOR_MASTERY_MS
  minFacts: number
  minStreakForMastery: number
}

export const CONCEPTS: Record<ConceptId, ConceptDef> = {
  // Iskierka
  'iskierka-counting-5': {
    id: 'iskierka-counting-5', level: 'iskierka',
    introAudioKey: 'intro-iskierka-counting-5',
    masteryAudioKey: 'mastery-counting-5',
    minFacts: 5, minStreakForMastery: 8,
  },
  'iskierka-counting-10': {
    id: 'iskierka-counting-10', level: 'iskierka',
    introAudioKey: 'intro-iskierka-counting-10',
    masteryAudioKey: 'mastery-counting-10',
    minFacts: 5, minStreakForMastery: 8,
  },
  'iskierka-subitizing-6': {
    id: 'iskierka-subitizing-6', level: 'iskierka',
    introAudioKey: 'intro-iskierka-subitizing-6',
    masteryAudioKey: 'mastery-subitizing',
    minFacts: 4, minStreakForMastery: 8,
  },
  'iskierka-rhythm': {
    id: 'iskierka-rhythm', level: 'iskierka',
    introAudioKey: 'intro-iskierka-rhythm',
    masteryAudioKey: 'mastery-rhythm',
    minFacts: 3, minStreakForMastery: 8,
  },
  'iskierka-adding-concrete': {
    id: 'iskierka-adding-concrete', level: 'iskierka',
    introAudioKey: 'intro-iskierka-adding-concrete',
    masteryAudioKey: 'mastery-adding-concrete',
    minFacts: 4, minStreakForMastery: 8,
  },
  // Płomyk
  'plomyk-bonds-5': {
    id: 'plomyk-bonds-5', level: 'plomyk',
    introAudioKey: 'intro-plomyk-bonds-5',
    masteryAudioKey: 'mastery-bonds-5',
    minFacts: 2, minStreakForMastery: 8,
  },
  'plomyk-bonds-10': {
    id: 'plomyk-bonds-10', level: 'plomyk',
    introAudioKey: 'intro-plomyk-bonds-10',
    masteryAudioKey: 'mastery-bonds-10',
    minFacts: 5, minStreakForMastery: 8,
  },
  'plomyk-tenframe': {
    id: 'plomyk-tenframe', level: 'plomyk',
    introAudioKey: 'intro-plomyk-tenframe',
    masteryAudioKey: 'mastery-tenframe',
    minFacts: 5, minStreakForMastery: 8,
  },
  'plomyk-addsub-10': {
    id: 'plomyk-addsub-10', level: 'plomyk',
    introAudioKey: 'intro-plomyk-addsub-10',
    masteryAudioKey: 'mastery-addsub-10',
    minFacts: 6, minStreakForMastery: 8,
  },
  'plomyk-factfamily': {
    id: 'plomyk-factfamily', level: 'plomyk',
    introAudioKey: 'intro-plomyk-factfamily',
    masteryAudioKey: 'mastery-factfamily',
    minFacts: 4, minStreakForMastery: 8,
  },
  // Ognik
  'ognik-doubles': {
    id: 'ognik-doubles', level: 'ognik',
    introAudioKey: 'intro-ognik-doubles',
    masteryAudioKey: 'mastery-doubles',
    minFacts: 5, minStreakForMastery: 8,
  },
  'ognik-neardoubles': {
    id: 'ognik-neardoubles', level: 'ognik',
    introAudioKey: 'intro-ognik-neardoubles',
    masteryAudioKey: 'mastery-neardoubles',
    minFacts: 5, minStreakForMastery: 8,
  },
  'ognik-make10': {
    id: 'ognik-make10', level: 'ognik',
    introAudioKey: 'intro-ognik-make10',
    masteryAudioKey: 'mastery-make10',
    minFacts: 6, minStreakForMastery: 8,
  },
  'ognik-factfamily-20': {
    id: 'ognik-factfamily-20', level: 'ognik',
    introAudioKey: 'intro-ognik-factfamily-20',
    masteryAudioKey: 'mastery-factfamily',
    minFacts: 5, minStreakForMastery: 8,
  },
  // Pochodnia
  'pochodnia-skipcount-2': {
    id: 'pochodnia-skipcount-2', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-skipcount-2',
    masteryAudioKey: 'mastery-skipcount-2',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-skipcount-5': {
    id: 'pochodnia-skipcount-5', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-skipcount-5',
    masteryAudioKey: 'mastery-skipcount-5',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-skipcount-10': {
    id: 'pochodnia-skipcount-10', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-skipcount-10',
    masteryAudioKey: 'mastery-skipcount-10',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-equalgroups': {
    id: 'pochodnia-equalgroups', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-equalgroups',
    masteryAudioKey: 'mastery-equalgroups',
    minFacts: 5, minStreakForMastery: 8,
  },
  'pochodnia-arrays': {
    id: 'pochodnia-arrays', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-arrays',
    masteryAudioKey: 'mastery-arrays',
    minFacts: 4, minStreakForMastery: 8,
  },
  'pochodnia-commutativity': {
    id: 'pochodnia-commutativity', level: 'pochodnia',
    introAudioKey: 'intro-pochodnia-commutativity',
    masteryAudioKey: 'mastery-commutativity',
    minFacts: 4, minStreakForMastery: 8,
  },
}

export function getConceptsForLevel(level: Level): ConceptDef[] {
  return Object.values(CONCEPTS).filter((c) => c.level === level)
}

// Sleep consolidation guard (research: dziecko konsoliduje wiedzę przez sen,
// więc mastery nie powinno być zaliczane wcześniej niż po 2 nocach)
export const MIN_AGE_FOR_MASTERY_MS = 2 * 24 * 60 * 60 * 1000
