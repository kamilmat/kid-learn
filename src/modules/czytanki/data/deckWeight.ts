import { wordAudioKey } from './audioKeys'
import { getCzytankaById } from './czytanki'

// Waga liczona ze ŚREDNIEJ liczby tapów na słowo, nie z sumy: suma rosła z
// długością czytanki (grupa 4 ma ~25 słów), więc po kilkudziesięciu czytankach
// cała pula siedziała na maksimum i ważenie po cichu przestawało działać.
const TAPS_PER_WORD_FOR_WEIGHT = 1.5
const MAX_EXTRA_WEIGHT = 2

/**
 * Waga czytanki w talii 🎲: im częściej dziecko stukało słowa, które w niej
 * występują (w dowolnej czytance), tym bliżej początku talii trafi.
 */
export function czytankaWeightFn(wordTaps: Record<string, Record<string, number>>): (id: string) => number {
  const totals = new Map<string, number>()
  for (const perCzytanka of Object.values(wordTaps)) {
    for (const [slug, n] of Object.entries(perCzytanka)) totals.set(slug, (totals.get(slug) ?? 0) + n)
  }
  return (id) => {
    const c = getCzytankaById(id)
    if (!c || totals.size === 0) return 1
    let taps = 0
    let words = 0
    for (const sent of c.sentences) {
      for (const w of sent) {
        taps += totals.get(wordAudioKey(w.syllables).replace('cz-word-', '')) ?? 0
        words += 1
      }
    }
    if (words === 0) return 1
    return 1 + Math.min(MAX_EXTRA_WEIGHT, taps / words / TAPS_PER_WORD_FOR_WEIGHT)
  }
}
