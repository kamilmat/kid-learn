// Pule liter per poziom — sekcja 11 spec.
//
// JEDNO ŹRÓDŁO PRAWDY: `shared/settings/defaults.ts` (`levelLetterPools`).
// Wcześniej ta sama lista 32 liter żyła w dwóch plikach i mogła się rozjechać
// przy dodaniu litery. Tu zostaje tylko readonly widok + helper, żeby moduł
// liter nadal mówił swoim API (`LEVEL_POOLS`, `getLevelPool`).
// Re-eksportujemy `Level` z shared/settings, żeby cały kod mówił jednym typem.

import { levelLetterPools } from '@/shared/settings/defaults'
import type { Level } from '@/shared/settings/types'

export type { Level }

export const LEVEL_POOLS: Record<Level, readonly string[]> = levelLetterPools

/**
 * Zwraca pulę liter dla danego poziomu (readonly, w kolejności kumulacji).
 * Dla `iskierka` zwraca 6 liter, dla `pochodnia` zwraca pełne 32.
 */
export function getLevelPool(level: Level): readonly string[] {
  return LEVEL_POOLS[level]
}
