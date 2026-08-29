import { slugPl } from '@/shared/audio/slugPl'

export type Syllable = {
  id: string                  // 'syl-MA'
  text: string                // 'MA'
}

const SYLLABLE_TEXTS = [
  'MA', 'TA', 'LA', 'KO', 'MO', 'TO', 'LO', 'RA', 'RO', 'RU',
  'BA', 'DA', 'DO', 'KU', 'NA', 'NO', 'SA', 'SO', 'NU', 'PA', 'WA',
  'DU', 'KA', 'TY',
] as const

/** Id itemu SRS (klucz persist `iskierki-reading-v1`). NIE zmieniać — migracja skasowałaby postęp. */
export function getSyllableId(syllable: string): string {
  return `syl-${syllable}`
}

/** Klucz pliku audio — lowercase ASCII (patrz `slugPl`). */
export function getSyllableAudioKey(syllable: string): string {
  return `syl-${slugPl(syllable)}`
}

export const ALL_SYLLABLES: readonly Syllable[] = SYLLABLE_TEXTS.map((text) => ({
  id: getSyllableId(text),
  text,
}))

export function getSyllableById(id: string): Syllable | undefined {
  return ALL_SYLLABLES.find(s => s.id === id)
}
