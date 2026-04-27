// Mapa par kontrastywnych (mylących) — sekcja 8.1 reguła 2 spec.
// Każda relacja symetryczna: jeśli b→d, to też d→b. Zbudowane z listy par,
// żeby nie powtarzać definicji w obie strony.

import { POLISH_ALPHABET } from './alphabet'

const RAW_PAIRS: readonly (readonly [string, string])[] = [
  // sekcja 8.1: b/d, b/p, d/p (q nie w polskim — pomijamy)
  ['b', 'd'],
  ['b', 'p'],
  ['d', 'p'],

  // graficznie podobne
  ['ł', 'l'],
  ['ł', 't'],

  // samogłoski długie / krótkie / dyftongi wzrokowe
  ['ó', 'o'],
  ['u', 'y'],

  // nosowe vs ich rdzeń
  ['ę', 'e'],
  ['ą', 'a'],

  // litery z diakrytykiem vs bez
  ['n', 'ń'],
  ['s', 'ś'],
  ['c', 'ć'],
  ['z', 'ż'],
  ['z', 'ź'],

  // kształt trójkątny / "domek"
  ['m', 'n'],
  ['m', 'w'],
] as const

function buildSymmetricMap(): Record<string, readonly string[]> {
  const acc: Record<string, Set<string>> = {}
  for (const letter of POLISH_ALPHABET) {
    acc[letter] = new Set<string>()
  }
  for (const [a, b] of RAW_PAIRS) {
    if (a === b) {
      // ochrona przed self-reference, choć surowa lista jej nie zawiera
      continue
    }
    acc[a]?.add(b)
    acc[b]?.add(a)
  }
  const out: Record<string, readonly string[]> = {}
  for (const letter of POLISH_ALPHABET) {
    out[letter] = Object.freeze([...(acc[letter] ?? new Set())])
  }
  return out
}

export const CONTRASTIVE_PAIRS: Record<string, readonly string[]> =
  buildSymmetricMap()

/**
 * Zwraca listę liter "kontrastywnych" (wizualnie/fonetycznie mylących się)
 * dla danej litery. Pusta lista = brak zdefiniowanych partnerów.
 */
export function getContrastivePartners(letter: string): readonly string[] {
  return CONTRASTIVE_PAIRS[letter] ?? []
}
