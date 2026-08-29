import { slugPl } from '@/shared/audio/slugPl'
import type { PromptMode } from '@/shared/settings/types'

/**
 * W trybie `both` kolejność to NAZWA → FONEM: nazwa identyfikuje literę, a fonem
 * zostaje ostatnim bodźcem przed wyborem — to on jest potrzebny do scalania
 * głosek w słowo (Piasta & Wagner 2010). Brak pliku nie boli: `play()` zwraca
 * `false`, kolejka idzie dalej, a przy `both` dziecko usłyszy przynajmniej nazwę.
 */
export function promptAudioKeys(letter: string, mode: PromptMode): string[] {
  const slug = slugPl(letter)
  switch (mode) {
    case 'phoneme':
      return [`phon-${slug}`]
    case 'name':
      return [`letter-name-${slug}`]
    case 'both':
      return [`letter-name-${slug}`, `phon-${slug}`]
  }
}
