// Pule liter per poziom — sekcja 11 spec.
// Re-eksportujemy `Level` z shared/settings, żeby cały kod mówił jednym typem.

import type { Level } from '@/shared/settings/types'

export type { Level }

const ISKIERKA: readonly string[] = ['a', 'm', 'l', 'e', 'o', 't'] as const

const PLOMYK: readonly string[] = [
  ...ISKIERKA,
  's',
  'k',
  'b',
  'd',
  'n',
  'p',
  'r',
  'i',
] as const

const OGNIK: readonly string[] = [
  ...PLOMYK,
  'c',
  'g',
  'j',
  'w',
  'z',
  'h',
  'f',
  'u',
  'y',
  'ł',
] as const

const POCHODNIA: readonly string[] = [
  ...OGNIK,
  'ą',
  'ć',
  'ę',
  'ń',
  'ó',
  'ś',
  'ź',
  'ż',
] as const

export const LEVEL_POOLS: Record<Level, readonly string[]> = {
  iskierka: ISKIERKA,
  plomyk: PLOMYK,
  ognik: OGNIK,
  pochodnia: POCHODNIA,
} as const

/**
 * Zwraca pulę liter dla danego poziomu (readonly, w kolejności kumulacji).
 * Dla `iskierka` zwraca 6 liter, dla `pochodnia` zwraca pełne 32.
 */
export function getLevelPool(level: Level): readonly string[] {
  return LEVEL_POOLS[level]
}
