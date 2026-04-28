export type Syllable = {
  id: string                  // 'syl-MA'
  text: string                // 'MA'
}

const SYLLABLE_TEXTS = [
  'MA', 'TA', 'LA', 'KO', 'MO', 'TO', 'LO', 'RA', 'RO', 'RU',
  'BA', 'DA', 'DO', 'KU', 'NA', 'NO', 'SA', 'NU', 'PA', 'WA',
  'DU', 'KA', 'TY',
] as const

export const ALL_SYLLABLES: readonly Syllable[] = SYLLABLE_TEXTS.map((text) => ({
  id: `syl-${text}`,
  text,
}))

export function getSyllableAudioKey(syllable: string): string {
  return `syl-${syllable}`
}

export function getSyllableById(id: string): Syllable | undefined {
  return ALL_SYLLABLES.find(s => s.id === id)
}
