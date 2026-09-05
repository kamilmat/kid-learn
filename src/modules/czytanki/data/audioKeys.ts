import { slugPl } from '@/shared/audio/slugPl'
import { soundKey } from '@/modules/letters/audio/promptKeys'

export { slugPl, AUDIO_KEY_RE } from '@/shared/audio/slugPl'

export function syllableAudioKey(syllable: string): string {
  return `cz-syl-${slugPl(syllable)}`
}

export function wordAudioKey(syllables: readonly string[]): string {
  return `cz-word-${slugPl(syllables.join(''))}`
}

// 'cz-01' → 'cz-q-01' — pytanie o rozumienie czytanki.
export function questionAudioKey(czytankaId: string): string {
  return czytankaId.replace(/^cz-/, 'cz-q-')
}

/**
 * Literka z trybu przypominajki. Pojedyncze litery grają kluczem modułu 1
 * (`letter-<x>` — nagrania rodzica z `manual-overrides/`, ten sam głos, który
 * dziecko zna z Literek), dwuznaki własnymi kluczami Agnieszki, bo w module 1
 * ich nie ma. Stąd import `soundKey`: jedno źródło prawdy dla nazwy klucza
 * litery (nie używa `slugPl` — `letter-ą.mp3` ma diakrytyk w nazwie pliku).
 */
export function letterUnitAudioKey(unit: string): string {
  if ([...unit].length === 1) return soundKey(unit)
  return `cz-let-${slugPl(unit)}`
}
