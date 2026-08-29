import type { ConceptId } from '../types'

// Klucze mastery-* istnieją od modułu 3, ale nikt ich dotąd nie odtwarzał.
const MASTERY_AUDIO: Record<ConceptId, string> = {
  'iskierka-counting-5': 'mastery-counting-5',
  'iskierka-counting-10': 'mastery-counting-10',
  'iskierka-subitizing-6': 'mastery-subitizing',
  'iskierka-rhythm': 'mastery-rhythm',
  'iskierka-adding-concrete': 'mastery-adding-concrete',
  'plomyk-bonds-5': 'mastery-bonds-5',
  'plomyk-bonds-10': 'mastery-bonds-10',
  'plomyk-tenframe': 'mastery-tenframe',
  'plomyk-addsub-10': 'mastery-addsub-10',
  'plomyk-factfamily': 'mastery-factfamily',
  'ognik-doubles': 'mastery-doubles',
  'ognik-neardoubles': 'mastery-neardoubles',
  'ognik-make10': 'mastery-make10',
  // Brak dedykowanego nagrania — dzieli komunikat z rodziną liczb do 10.
  'ognik-factfamily-20': 'mastery-factfamily',
  'pochodnia-skipcount-2': 'mastery-skipcount-2',
  'pochodnia-skipcount-5': 'mastery-skipcount-5',
  'pochodnia-skipcount-10': 'mastery-skipcount-10',
  'pochodnia-equalgroups': 'mastery-equalgroups',
  'pochodnia-arrays': 'mastery-arrays',
  'pochodnia-commutativity': 'mastery-commutativity',
}

export function masteryAudioKey(conceptId: ConceptId): string {
  return MASTERY_AUDIO[conceptId]
}
