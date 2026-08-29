// Selektor puli „Trudne literki" — powtórka celowana, bez własnego poziomu.
//
// Ranking = ten sam `scoreItem` co losowanie w sesji, więc kolejność zgadza się
// z tym, co SRS i tak by najczęściej podsuwał — tryb tylko odcina resztę puli.

import { scoreItem } from '@/shared/srs/scoring'
import type { LetterState } from '@/shared/srs/types'
import type { Level } from '@/shared/settings/types'
import type { SessionLog } from '@/shared/stats/types'

/** Górna granica sesji „Trudne literki" — tyle pytań i tyle liter w puli. */
export const HARD_LETTERS_CAP = 8

// Poniżej 3 liter powtórka nie ma sensu — sesja z 1-2 pytań to raczej
// frustracja niż ćwiczenie. Kafelek 🔁 jest wtedy przygaszony, a wejście
// wprost z URL-a wraca na wybór poziomu.
export const HARD_LETTERS_MIN_POOL = 3

const LEVEL_ORDER: readonly Level[] = ['iskierka', 'plomyk', 'ognik', 'pochodnia']

/**
 * Litery „do poprawki": widziane i (świeżo mylone albo słabo utrwalone).
 * `totalSeen === 0` odpada — literki, których dziecko jeszcze nie widziało, nie
 * są trudne, tylko nowe; należą do zwykłej sesji poziomu.
 */
export function selectHardLetters(
  letters: Record<string, LetterState>,
  now: number,
  cap = HARD_LETTERS_CAP,
): string[] {
  return Object.values(letters)
    .filter((s) => s.totalSeen > 0 && (s.recentWrong > 0 || s.box <= 2))
    .sort((a, b) => scoreItem(b, now) - scoreItem(a, now))
    .slice(0, cap)
    .map((s) => s.letter)
}

/**
 * Poziom, z którego bierzemy config (case/style/tiles/dystraktory) dla powtórki:
 * najwyższy, na którym dziecko faktycznie grało. Tryby bez poziomu (`hard`,
 * `daily`) nie są w `LEVEL_ORDER`, więc `indexOf` daje -1 i je pomija.
 */
export function configLevelForHard(sessions: readonly SessionLog[]): Level {
  let best = -1
  for (const s of sessions) {
    const i = LEVEL_ORDER.indexOf(s.level as Level)
    if (i > best) best = i
  }
  return LEVEL_ORDER[best] ?? 'iskierka'
}
