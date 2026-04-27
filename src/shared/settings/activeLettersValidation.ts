// Walidacja aktywnych liter — sekcja 13.2 spec.
//
// "Walidacja: minimum 4 zaznaczone litery (siatka 2×2 wymaga 1 docelowej +
// 3 dystraktorów). UI nie pozwala zapisać <4."
//
// Override musi być podzbiorem PULI POZIOMU (nie całego alfabetu) — dziecko
// nie może uczyć się liter spoza zakresu poziomu (chroni SRS + dystraktory).

import { levelLetterPools } from './defaults'
import type { Level, Settings } from './types'

export const MIN_ACTIVE_LETTERS = 4

/**
 * Czy zestaw liter jest dopuszczalny jako override puli aktywnych liter.
 * Wymagane minimum 4 unikalne litery.
 */
export function isActiveLettersValid(letters: string[]): boolean {
  if (!Array.isArray(letters)) return false
  const unique = new Set(letters)
  return unique.size >= MIN_ACTIVE_LETTERS
}

export type OverrideError = { error: string }

/**
 * Stosuje override puli aktywnych liter dla poziomu.
 *
 * Reguły:
 *  - litery muszą być częścią puli poziomu (nie pozwalamy "wymyślać" liter
 *    spoza zakresu — chroni to SRS i generator dystraktorów).
 *  - minimum 4 unikalne litery.
 *  - zwraca nowy obiekt Settings z zaktualizowanym `activeLettersOverride`,
 *    LUB obiekt `{ error }`.
 *
 * Aby przywrócić default poziomu, przekaż null/undefined nie tu, lecz przez
 * osobną akcję store'a (delete klucza). Ta funkcja zawsze ustawia override.
 */
export function validateAndApplyOverride(
  level: Level,
  letters: string[],
  currentSettings: Settings,
): Settings | OverrideError {
  const unique = Array.from(new Set(letters))
  if (unique.length < MIN_ACTIVE_LETTERS) {
    return {
      error: `Minimum ${MIN_ACTIVE_LETTERS} liter wymagane (wybrano ${unique.length}).`,
    }
  }
  const validForLevel = new Set(levelLetterPools[level])
  const invalid = unique.filter((letter) => !validForLevel.has(letter))
  if (invalid.length > 0) {
    return {
      error: `Litery spoza puli poziomu: ${invalid.join(', ')}.`,
    }
  }
  return {
    ...currentSettings,
    activeLettersOverride: {
      ...currentSettings.activeLettersOverride,
      [level]: unique,
    },
  }
}
