// Polski alfabet — sekcja 11 spec (Iskierki letters module).
// Wszystkie 32 litery w kolejności alfabetu polskiego, lowercase.

export const POLISH_ALPHABET = [
  'a',
  'ą',
  'b',
  'c',
  'ć',
  'd',
  'e',
  'ę',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'ł',
  'm',
  'n',
  'ń',
  'o',
  'ó',
  'p',
  'r',
  's',
  'ś',
  't',
  'u',
  'w',
  'y',
  'z',
  'ź',
  'ż',
] as const

export type PolishLetter = (typeof POLISH_ALPHABET)[number]

const POLISH_ALPHABET_SET: ReadonlySet<string> = new Set(POLISH_ALPHABET)

/**
 * Zamienia literę na wielką używając locale polskiego (`pl-PL`).
 * Standardowe `.toUpperCase()` w niektórych runtime'ach niepoprawnie traktuje
 * ą/ć/ę/ł/ń/ó/ś/ź/ż — `toLocaleUpperCase('pl-PL')` jest bezpieczne.
 */
export function toUpper(letter: string): string {
  return letter.toLocaleUpperCase('pl-PL')
}

/**
 * Sprawdza czy podany string to pojedyncza polska litera (lowercase) z alfabetu.
 */
export function isPolishLetter(s: string): boolean {
  return POLISH_ALPHABET_SET.has(s)
}
