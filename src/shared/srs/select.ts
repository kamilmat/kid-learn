import { scoreLetter } from './scoring'
import type { Box, LetterState } from './types'

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

export function pickNextLetter(
  states: LetterState[],
  activePool: string[],
  lastTarget: string | null,
  now: number,
  rng: () => number = Math.random
): string {
  if (activePool.length === 0) {
    throw new Error('pickNextLetter: activePool is empty')
  }

  const stateMap = new Map(states.map((s) => [s.letter, s]))
  const candidates: LetterState[] = activePool
    .map((letter) => stateMap.get(letter))
    .filter((s): s is LetterState => s !== undefined)

  if (candidates.length === 0) {
    throw new Error('pickNextLetter: no states for active pool')
  }

  const filtered =
    candidates.length > 1 && lastTarget !== null
      ? candidates.filter((s) => s.letter !== lastTarget)
      : candidates

  const useJitter = rng() < JITTER_PROBABILITY
  if (useJitter) {
    const highBox = filtered.filter((s) => isHighBox(s.box))
    if (highBox.length > 0) {
      const idx = Math.floor(rng() * highBox.length)
      const picked = highBox[idx] ?? highBox[0]
      if (picked) return picked.letter
    }
  }

  const weights = filtered.map((s) => scoreLetter(s, now))
  const idx = weightedSample(weights, rng)
  const chosen = filtered[idx] ?? filtered[0]
  if (!chosen) {
    throw new Error('pickNextLetter: failed to select candidate')
  }
  return chosen.letter
}
