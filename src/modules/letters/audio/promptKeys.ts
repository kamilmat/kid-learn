import { slugPl } from '@/shared/audio/slugPl'
import type { PromptMode } from '@/shared/settings/types'

/**
 * W trybie `both` kolejność to NAZWA → FONEM: nazwa identyfikuje literę, a fonem
 * zostaje ostatnim bodźcem przed wyborem — to on jest potrzebny do scalania
 * głosek w słowo (Piasta & Wagner 2010). Brak pliku nie boli: `play()` zwraca
 * `false`, kolejka idzie dalej, a przy `both` dziecko usłyszy przynajmniej nazwę.
 */
// Samogłoski (a, e, i, o, u, y, ą, ę) nazywa się tak samo, jak brzmią — w trybie
// `both` grałoby „a… a", więc dla nich zostaje sam fonem. `ó` ma inną nazwę
// („u zamknięte"), więc nie jest tu wyjątkiem.
const NAME_EQUALS_PHONEME = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'ą', 'ę'])

export function promptAudioKeys(letter: string, mode: PromptMode): string[] {
  const slug = slugPl(letter)
  if (mode === 'both' && NAME_EQUALS_PHONEME.has(letter.toLowerCase())) {
    return [`phon-${slug}`]
  }
  switch (mode) {
    case 'phoneme':
      return [`phon-${slug}`]
    case 'name':
      return [`letter-name-${slug}`]
    case 'both':
      return [`letter-name-${slug}`, `phon-${slug}`]
    default:
      return [`phon-${slug}`]
  }
}
