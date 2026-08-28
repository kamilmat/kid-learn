// Walidacja aktywnych liter — sekcja 13.2 spec.
//
// "Walidacja: minimum 4 zaznaczone litery (siatka 2×2 wymaga 1 docelowej +
// 3 dystraktorów). UI nie pozwala zapisać <4." — minimum jest jednak
// PER-POZIOM: `max(4, efektywne tilesPerQuestion)`, bo Ognik/Pochodnia
// pokazują 8/10 kafelków naraz.
//
// Override musi być podzbiorem PULI POZIOMU (nie całego alfabetu) — dziecko
// nie może uczyć się liter spoza zakresu poziomu (chroni SRS + dystraktory).

import { getEffectiveTilesPerQuestion, levelLetterPools } from './defaults'
import type { Level, Settings } from './types'

/** Absolutne dno: siatka 2×2 to 1 cel + 3 dystraktory. */
export const MIN_ACTIVE_LETTERS = 4

/**
 * Minimalna liczba aktywnych liter dla poziomu.
 *
 * WHY per-level: pytanie pokazuje `tilesPerQuestion` kafelków (1 cel +
 * N-1 dystraktorów), więc pula mniejsza niż N zagłodziłaby generator.
 * Wyższe poziomy mają 6/8/10 kafelków — jedno globalne „4" pozwalało zapisać
 * override, którego sesja i tak nie umiała użyć (read path cicho wracał do
 * domyślnej puli i rodzic nie wiedział dlaczego).
 */
export function getMinActiveLetters(settings: Settings, level: Level): number {
  return Math.max(MIN_ACTIVE_LETTERS, getEffectiveTilesPerQuestion(settings, level))
}

/**
 * Czy zestaw liter jest dopuszczalny jako override puli aktywnych liter dla
 * poziomu. Bez `settings`/`level` sprawdza tylko absolutne minimum (4).
 */
export function isActiveLettersValid(
  letters: string[],
  settings?: Settings,
  level?: Level,
): boolean {
  if (!Array.isArray(letters)) return false
  const min =
    settings && level ? getMinActiveLetters(settings, level) : MIN_ACTIVE_LETTERS
  return new Set(letters).size >= min
}

export type OverrideError = { error: string }

/**
 * Stosuje override puli aktywnych liter dla poziomu.
 *
 * Reguły:
 *  - litery muszą być częścią puli poziomu (nie pozwalamy "wymyślać" liter
 *    spoza zakresu — chroni to SRS i generator dystraktorów).
 *  - minimum `getMinActiveLetters(settings, level)` unikalnych liter.
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
  const min = getMinActiveLetters(currentSettings, level)
  if (unique.length < min) {
    return {
      error: `Minimum ${min} liter wymagane dla tego poziomu — tyle kafelków pokazuje jedno pytanie (wybrano ${unique.length}).`,
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
