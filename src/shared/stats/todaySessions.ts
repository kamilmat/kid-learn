// Ile sesji dziecko już dziś skończyło — we WSZYSTKICH modułach.
//
// WHY: „na dziś wystarczy" i nudge dla rodzica mają patrzeć na cały dzień, nie
// na jeden moduł. Dziecko mogło zrobić Litery, potem Cyferki — to dwie sesje,
// nie dwa niezależne liczniki.
//
// Moduł jest CZYSTY (bez importu store'ów), bo karmi też `exporter.ts`.
// Wariant czytający store'y siedzi w `enoughForToday.ts`.

import type { UnifiedSession } from './aggregate'

// WHY próg 3 pytań, nie >0: dziecko czasem odpala moduł i wychodzi po 1-2
// pytaniach (przypadkowy tap, rozmyślenie) — taki porzucony start nie powinien
// liczyć się jako „sesja" i wywoływać „na dziś wystarczy".
const MIN_QUESTIONS_FOR_COMPLETED_SESSION = 3

/** Sesje ukończone DZIŚ, we wszystkich modułach. Krótkie/porzucone starty się nie liczą. */
export function completedSessionsToday(
  sessions: readonly UnifiedSession[],
  now: number,
): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const from = d.getTime()
  return sessions.filter(
    (s) => s.startedAt >= from && s.questions >= MIN_QUESTIONS_FOR_COMPLETED_SESSION,
  ).length
}

/** Od ilu sesji dziennie mówimy „na dziś wystarczy". */
export const ENOUGH_SESSIONS_TODAY = 2
