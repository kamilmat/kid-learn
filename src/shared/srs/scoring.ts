import type { BaseItemState, Box, LetterState } from './types'

const BOX_WEIGHTS: Record<Box, number> = {
  1: 5.0,
  2: 3.0,
  3: 1.5,
  4: 1.0,
  5: 0.4,
}

const RECENCY_CAP = 3.0
// Bez clampu element z serią błędów rósł w score bez ograniczeń (recentWrong
// nie ma górnej granicy) i monopolizował losowanie — dziecko dostawało w kółko
// ten sam trudny item zamiast przeplatanki.
const RECENT_WRONG_CAP = 3
const MS_PER_HOUR = 3_600_000

export function boxWeight(box: Box): number {
  return BOX_WEIGHTS[box]
}

// Generic scorer — works on any item with box/lastSeen/recentWrong fields.
export function scoreItem<T extends BaseItemState>(state: T, now: number): number {
  // Zegar może cofnąć się (zmiana strefy, ręczne ustawienie daty) — bez clampu
  // `now - lastSeen` byłoby ujemne i dawało ujemny (albo zerowy) score, przez co
  // element wypadałby z losowania. Ujemny upływ czasu traktujemy jak zerowy.
  const elapsedMs = Math.max(0, now - state.lastSeen)
  const recency =
    state.lastSeen <= 0
      ? 1.0
      : Math.min(1 + (elapsedMs / MS_PER_HOUR) * 0.3, RECENCY_CAP)
  const recentWrongBoost = 1 + Math.min(state.recentWrong, RECENT_WRONG_CAP) * 2.0
  return boxWeight(state.box) * recency * recentWrongBoost
}

// Backward-compat alias — letter module keeps calling scoreLetter.
export const scoreLetter = (state: LetterState, now: number): number =>
  scoreItem(state, now)
