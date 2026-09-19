import { wordAudioKey } from './audioKeys'
import { getCzytankaById } from './czytanki'

// Co 5 dotknięć słów czytanki = +1 do wagi, najwyżej 3× bazowa. Więcej
// zamieniłoby talię w powtórkę kilku „trudnych” czytanek.
const TAPS_PER_WEIGHT = 5
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
    for (const sent of c.sentences) {
      for (const w of sent) taps += totals.get(wordAudioKey(w.syllables).replace('cz-word-', '')) ?? 0
    }
    return 1 + Math.min(MAX_EXTRA_WEIGHT, taps / TAPS_PER_WEIGHT)
  }
}
