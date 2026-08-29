import { slugPl } from '@/shared/audio/slugPl'
import type { PromptMode } from '@/shared/settings/types'

/**
 * Tryb `phoneme` = „jak się czyta" (b → „by", n → „ny"): klucze `letter-<x>`,
 * czyli nagrania rodzica z `manual-overrides/` — to była wymowa modułu od
 * początku i user wprost ją potwierdził (fonemy Azure `phon-*` zostają w repo,
 * ale nie grają). W trybie `both` kolejność to NAZWA → DŹWIĘK; dla samogłosek
 * nazwa = dźwięk, więc gra sam dźwięk (inaczej „a… a"). `ó` ma osobną nazwę
 * („u zamknięte"), więc nie jest wyjątkiem.
 */
const NAME_EQUALS_SOUND = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'ą', 'ę'])

export function soundKey(letter: string): string {
  return `letter-${letter.toLowerCase()}`
}

export function promptAudioKeys(letter: string, mode: PromptMode): string[] {
  const slug = slugPl(letter)
  if (mode === 'both' && NAME_EQUALS_SOUND.has(letter.toLowerCase())) {
    return [soundKey(letter)]
  }
  switch (mode) {
    case 'phoneme':
      return [soundKey(letter)]
    case 'name':
      return [`letter-name-${slug}`]
    case 'both':
      return [`letter-name-${slug}`, soundKey(letter)]
    default:
      return [soundKey(letter)]
  }
}
