// „Literka dnia" — jedna litera na dobę, wybierana raz i zamrożona w store.
//
// Wybór to ten sam ranking `scoreItem`, co losowanie w sesji, więc literka dnia
// to po prostu „ta, którą SRS podsunąłby najczęściej" — mikrosesja daje jej
// cztery ekspozycje pod rząd zamiast rozproszenia po całej sesji.

import { scoreItem } from '@/shared/srs/scoring'
import type { LetterState } from '@/shared/srs/types'

/** Klucz doby w czasie LOKALNYM — `toISOString()` przesunęłoby dobę o strefę. */
export function dayKey(now: number): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/**
 * Litera o najwyższym `scoreItem` w puli. Litera jeszcze nigdy niewidziana nie
 * ma `LetterState`, więc dostaje pierwszeństwo przed wszystkimi widzianymi.
 */
export function pickDailyLetter(
  letters: Record<string, LetterState>,
  pool: readonly string[],
  now: number,
): string | null {
  let best: { letter: string; score: number } | null = null
  for (const letter of pool) {
    const st = letters[letter]
    const score = st ? scoreItem(st, now) : Number.POSITIVE_INFINITY
    if (!best || score > best.score) best = { letter, score }
  }
  return best?.letter ?? null
}
