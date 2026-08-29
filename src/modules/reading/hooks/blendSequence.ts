import { ALL_WORDS, getWordAudioKey } from '../data/words'
import { getSyllableAudioKey } from '../data/syllables'

export function syllablesForWord(word: string): string[] {
  return ALL_WORDS.find((w) => w.text === word)?.syllables.slice() ?? []
}

/**
 * Jawny krok syntezy: „Składamy: MA… MA… MAMA". Bez niego dziecko nigdy nie
 * słyszy pojedynczych sylab SWOJEGO słowa — a to ten krok przenosi
 * rozpoznawanie w czytanie.
 *
 * Nieznane słowo → pusta lista: podziału na sylaby nie zgadujemy, bo błędny
 * podział uczyłby błędnego czytania.
 */
export function blendAudioKeys(word: string): string[] {
  const syllables = syllablesForWord(word)
  if (syllables.length === 0) return []
  return ['reading-blend-prefix', ...syllables.map(getSyllableAudioKey), getWordAudioKey(word)]
}
