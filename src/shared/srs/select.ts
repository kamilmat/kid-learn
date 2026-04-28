import { scoreItem } from './scoring'
import type { BaseItemState, Box, LetterState } from './types'

const JITTER_PROBABILITY = 0.15

function weightedSample(
  weights: number[],
  rng: () => number
): number {
  const total = weights.reduce((acc, w) => acc + w, 0)
  if (total <= 0) {
    return Math.floor(rng() * weights.length)
  }
  const target = rng() * total
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i] ?? 0
    if (target < cumulative) {
      return i
    }
  }
  return weights.length - 1
}

function isHighBox(box: Box): boolean {
  return box === 4 || box === 5
}

/**
 * Generic SRS item picker — works on any item type extending BaseItemState.
 *
 * @param statesMap  Map of id → item state (all items in the active pool).
 * @param activePool Array of ids to pick from (subset of statesMap keys).
 * @param lastTarget Id of the last picked item (to avoid immediate repeat), or null.
 * @param now        Current timestamp (ms since epoch).
 * @param rng        Random number generator (default: Math.random).
 * @returns          The id of the chosen item.
 */
export function pickNextItem<T extends BaseItemState>(
  statesMap: Record<string, T>,
  activePool: string[],
  lastTarget: string | null,
  now: number,
  rng: () => number = Math.random,
): string {
  if (activePool.length === 0) {
    throw new Error('pickNextItem: activePool is empty')
  }

  const candidates: T[] = activePool
    .map((id) => statesMap[id])
    .filter((s): s is T => s !== undefined)

  if (candidates.length === 0) {
    throw new Error('pickNextItem: no states for active pool')
  }

  const filtered =
    candidates.length > 1 && lastTarget !== null
      ? candidates.filter((s) => s.id !== lastTarget)
      : candidates

  const useJitter = rng() < JITTER_PROBABILITY
  if (useJitter) {
    const highBox = filtered.filter((s) => isHighBox(s.box))
    if (highBox.length > 0) {
      const idx = Math.floor(rng() * highBox.length)
      const picked = highBox[idx] ?? highBox[0]
      if (picked) return picked.id
    }
  }

  const weights = filtered.map((s) => scoreItem(s, now))
  const idx = weightedSample(weights, rng)
  const chosen = filtered[idx] ?? filtered[0]
  if (!chosen) {
    throw new Error('pickNextItem: failed to select candidate')
  }
  return chosen.id
}

/**
 * Backward-compat wrapper for the letters module.
 *
 * Accepts the original `LetterState[]` + `activePool: string[]` (letters)
 * interface and returns a letter string — same as the old `pickNextLetter`.
 * Internally converts to id-keyed map (letter === id for letter states whose
 * id is `letter-${LETTER.toUpperCase()}`, but the map key here is `s.letter`
 * to match the activePool which contains plain letter strings like "a", "b").
 */
export function pickNextLetter(
  states: LetterState[],
  activePool: string[],
  lastTarget: string | null,
  now: number,
  rng: () => number = Math.random,
): string {
  if (activePool.length === 0) {
    throw new Error('pickNextLetter: activePool is empty')
  }

  // Build a map keyed by s.letter so pickNextItem can look items up by the
  // pool values (which are plain letter strings, not `letter-X` ids).
  // We also override the id field so pickNextItem's lastTarget comparison
  // (s.id !== lastTarget) works correctly against plain letter strings.
  const statesMap: Record<string, LetterState> = {}
  for (const s of states) {
    // Use s.letter as key AND as id for pool-lookup compatibility.
    statesMap[s.letter] = { ...s, id: s.letter }
  }

  return pickNextItem(statesMap, activePool, lastTarget, now, rng)
}
