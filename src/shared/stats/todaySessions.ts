// Ile sesji dziecko już dziś skończyło — we WSZYSTKICH modułach.
//
// WHY: „na dziś wystarczy" i nudge dla rodzica mają patrzeć na cały dzień, nie
// na jeden moduł. Dziecko mogło zrobić Litery, potem Cyferki — to dwie sesje,
// nie dwa niezależne liczniki.
//
// Moduł jest CZYSTY (bez importu store'ów), bo karmi też `exporter.ts`.
// Wariant czytający store'y siedzi w `enoughForToday.ts`.

import type { UnifiedSession } from './aggregate'

/** Sesje ukończone DZIŚ, we wszystkich modułach. Puste (0 pytań) się nie liczą. */
export function completedSessionsToday(
  sessions: readonly UnifiedSession[],
  now: number,
): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const from = d.getTime()
  return sessions.filter((s) => s.startedAt >= from && s.questions > 0).length
}

/** Od ilu sesji dziennie mówimy „na dziś wystarczy". */
export const ENOUGH_SESSIONS_TODAY = 2
