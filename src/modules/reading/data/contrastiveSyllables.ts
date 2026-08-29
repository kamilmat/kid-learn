// Bez tego pytanie da się rozwiązać po pierwszej literze. Pary wyłącznie na 24
// sylabach z data/syllables.ts; KA/GA, SA/ZA, TY/DY nie mają pokrycia w puli.
import { ALL_SYLLABLES } from './syllables'

const RAW_PAIRS: readonly (readonly [string, string])[] = [
  ['MA', 'MO'], ['TA', 'TO'], ['LA', 'LO'], ['KO', 'KU'], ['DA', 'DO'], ['DO', 'DU'],
  ['NA', 'NO'], ['NO', 'NU'], ['RA', 'RO'], ['RO', 'RU'], ['SA', 'SO'],   // samogłoska
  ['PA', 'BA'], ['TA', 'DA'],                                            // dźwięczność
  ['MA', 'NA'], ['MO', 'NO'], ['TA', 'KA'], ['DA', 'BA'], ['LA', 'RA'], ['NU', 'DU'], // artykulacja
] as const

function buildSymmetricMap(): Record<string, readonly string[]> {
  const acc: Record<string, Set<string>> = {}
  for (const syllable of ALL_SYLLABLES) {
    acc[syllable.text] = new Set<string>()
  }
  for (const [a, b] of RAW_PAIRS) {
    if (a === b) {
      continue
    }
    acc[a]?.add(b)
    acc[b]?.add(a)
  }
  const out: Record<string, readonly string[]> = {}
  for (const syllable of ALL_SYLLABLES) {
    out[syllable.text] = Object.freeze([...(acc[syllable.text] ?? new Set())])
  }
  return out
}

export const CONTRASTIVE_SYLLABLES: Record<string, readonly string[]> = buildSymmetricMap()

/**
 * Zwraca listę sylab "kontrastywnych" (fonetycznie mylących się) dla danej
 * sylaby. Pusta lista = brak zdefiniowanych partnerów.
 */
export function getContrastiveSyllablePartners(syllable: string): readonly string[] {
  return CONTRASTIVE_SYLLABLES[syllable] ?? []
}
