// Asocjacje litera → słowo + obrazek — sekcja 12 spec.
// Dual coding (Paivio): każda litera ma kotwicę słowną i wizualną.
// audioKey/phraseAudioKey wskazują pliki w `public/audio/` (generowane ze
// `scripts/generate-audio.ts`). Image path zarezerwowany — svg dorobimy później.

import { POLISH_ALPHABET } from './alphabet'

export type AssociationPosition = 'start' | 'middle' | 'end'

export type Association = {
  letter: string
  word: string
  position: AssociationPosition
  imagePath: string
  emoji: string
  audioKey: string
  phraseAudioKey: string
}

type AssocSeed = {
  letter: string
  word: string
  position: AssociationPosition
  emoji: string
}

// Sekcja 12: tabela litera → słowo + pozycja litery w słowie.
// Wpisy w kolejności alfabetu polskiego.
const SEEDS: readonly AssocSeed[] = [
  { letter: 'a', word: 'arbuz', position: 'start', emoji: '🍉' },
  { letter: 'ą', word: 'dąb', position: 'middle', emoji: '🌳' },
  { letter: 'b', word: 'balon', position: 'start', emoji: '🎈' },
  { letter: 'c', word: 'cebula', position: 'start', emoji: '🧅' },
  { letter: 'ć', word: 'ćma', position: 'start', emoji: '🦋' },
  { letter: 'd', word: 'dom', position: 'start', emoji: '🏠' },
  { letter: 'e', word: 'ekran', position: 'start', emoji: '📺' },
  { letter: 'ę', word: 'gęś', position: 'middle', emoji: '🦢' },
  { letter: 'f', word: 'foka', position: 'start', emoji: '🦭' },
  { letter: 'g', word: 'góra', position: 'start', emoji: '⛰️' },
  { letter: 'h', word: 'hak', position: 'start', emoji: '🪝' },
  { letter: 'i', word: 'iskra', position: 'start', emoji: '✨' },
  { letter: 'j', word: 'jabłko', position: 'start', emoji: '🍎' },
  { letter: 'k', word: 'kot', position: 'start', emoji: '🐱' },
  { letter: 'l', word: 'lampa', position: 'start', emoji: '💡' },
  { letter: 'ł', word: 'łyżwa', position: 'start', emoji: '⛸️' },
  { letter: 'm', word: 'miś', position: 'start', emoji: '🧸' },
  { letter: 'n', word: 'nos', position: 'start', emoji: '👃' },
  { letter: 'ń', word: 'koń', position: 'end', emoji: '🐴' },
  { letter: 'o', word: 'osa', position: 'start', emoji: '🐝' },
  { letter: 'ó', word: 'ósemka', position: 'start', emoji: '8️⃣' },
  { letter: 'p', word: 'piłka', position: 'start', emoji: '⚽' },
  { letter: 'r', word: 'ryba', position: 'start', emoji: '🐟' },
  { letter: 's', word: 'słońce', position: 'start', emoji: '☀️' },
  { letter: 'ś', word: 'śliwka', position: 'start', emoji: '🟣' },
  { letter: 't', word: 'tort', position: 'start', emoji: '🎂' },
  { letter: 'u', word: 'ucho', position: 'start', emoji: '👂' },
  { letter: 'w', word: 'woda', position: 'start', emoji: '💧' },
  { letter: 'y', word: 'dym', position: 'middle', emoji: '💨' },
  { letter: 'z', word: 'zegar', position: 'start', emoji: '⏰' },
  { letter: 'ź', word: 'źrebak', position: 'start', emoji: '🐎' },
  { letter: 'ż', word: 'żaba', position: 'start', emoji: '🐸' },
] as const

function buildAssociation(seed: AssocSeed): Association {
  return {
    letter: seed.letter,
    word: seed.word,
    position: seed.position,
    emoji: seed.emoji,
    imagePath: `/images/letters/${seed.letter}.svg`,
    audioKey: `word-${seed.word}`,
    phraseAudioKey: `assoc-${seed.letter}`,
  }
}

function buildMap(): Record<string, Association> {
  const out: Record<string, Association> = {}
  for (const seed of SEEDS) {
    out[seed.letter] = buildAssociation(seed)
  }
  return out
}

export const ASSOCIATIONS: Record<string, Association> = buildMap()

/**
 * Lista wszystkich asocjacji w kolejności alfabetu polskiego.
 */
export const ASSOCIATIONS_LIST: readonly Association[] = POLISH_ALPHABET.map(
  (l) => ASSOCIATIONS[l]!,
)

/**
 * Zwraca asocjację dla danej litery. Rzuca, jeśli litera spoza alfabetu —
 * to bug w wywołaniu, nie w danych.
 */
export function getAssociation(letter: string): Association {
  const found = ASSOCIATIONS[letter]
  if (found === undefined) {
    throw new Error(
      `getAssociation: brak asocjacji dla litery "${letter}" (poza polskim alfabetem)`,
    )
  }
  return found
}
