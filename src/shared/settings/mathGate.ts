// Math gate (parent gate) — sekcja 13.1 spec.
//
// Wzór: a + b - c, gdzie a, b, c ∈ [1, 9] i a + b > 10
// (przekroczenie dziesiątki — trywialne dla rodzica, trudne dla 7-latka).
//
// Backoff: 3 nieudane próby → 60s cooldown.

import type { MathGateState, MathProblem } from './types'

export const COOLDOWN_MS = 60_000
export const MAX_FAILED_ATTEMPTS = 3

const MIN_DIGIT = 1
const MAX_DIGIT = 9

export const initialMathGateState: MathGateState = {
  failedAttempts: 0,
  cooldownUntil: 0,
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/**
 * Generuje problem matematyczny `a + b - c` z ograniczeniem `a + b > 10`.
 *
 * Strategia: losujemy `a` z [1,9], następnie `b` z [max(1, 11-a), 9]
 * (gwarantuje a+b > 10 bez odrzucania prób). `c` z [1,9].
 *
 * @param rng — generator pseudolosowy [0,1); domyślnie Math.random.
 *              Wstrzykiwany dla testowalności.
 */
export function generateMathProblem(rng: () => number = Math.random): MathProblem {
  const a = randInt(rng, MIN_DIGIT, MAX_DIGIT)
  // b musi spełniać a+b > 10 → b > 10-a → b ≥ 11-a
  const bMin = Math.max(MIN_DIGIT, 11 - a)
  // bMin może być >9 jeśli a=1 (bMin=10), ale a≥1 i b∈[1,9] muszą dać a+b>10.
  // Dla a=1 nie istnieje takie b, więc gwarantujemy a ≥ 2 przez retry.
  if (bMin > MAX_DIGIT) {
    // a=1 — niemożliwe, regeneruj. Maksymalnie kilka iteracji w praktyce.
    return generateMathProblem(rng)
  }
  const b = randInt(rng, bMin, MAX_DIGIT)
  const c = randInt(rng, MIN_DIGIT, MAX_DIGIT)
  const answer = a + b - c
  const expression = `${a} + ${b} - ${c}`
  return { a, b, c, answer, expression }
}

/**
 * Parsuje user input i sprawdza czy odpowiedź = a + b - c.
 *
 * Akceptuje:
 *  - cyfry, opcjonalny minus, białe znaki na początku/końcu
 *  - tylko liczby całkowite
 *
 * Odrzuca:
 *  - puste / same białe znaki
 *  - litery, ułamki dziesiętne, wyrażenia
 */
export function validateAnswer(
  problem: Pick<MathProblem, 'a' | 'b' | 'c'>,
  userInput: string,
): boolean {
  const trimmed = userInput.trim()
  if (trimmed.length === 0) return false
  // Tylko liczby całkowite (z opcjonalnym minusem).
  if (!/^-?\d+$/.test(trimmed)) return false
  const parsed = Number.parseInt(trimmed, 10)
  if (Number.isNaN(parsed)) return false
  return parsed === problem.a + problem.b - problem.c
}

/**
 * State machine kroku gate'a.
 *
 * - success: reset failedAttempts i cooldownUntil.
 * - fail (failedAttempts+1 < 3): inkrementuj.
 * - fail (failedAttempts+1 === 3): ustaw cooldownUntil = now + 60s,
 *   reset failedAttempts (kolejne próby liczone od nowa po wygaśnięciu).
 *
 * Funkcja nie odczytuje aktualnego cooldownu — wywołujący powinien
 * wcześniej sprawdzić `isCooldown(state, now)` i zignorować attempt.
 */
export function applyAttempt(
  state: MathGateState,
  success: boolean,
  now: number,
): MathGateState {
  if (success) {
    return { failedAttempts: 0, cooldownUntil: 0 }
  }
  const nextFailed = state.failedAttempts + 1
  if (nextFailed >= MAX_FAILED_ATTEMPTS) {
    return { failedAttempts: 0, cooldownUntil: now + COOLDOWN_MS }
  }
  return { failedAttempts: nextFailed, cooldownUntil: state.cooldownUntil }
}

export function isCooldown(state: MathGateState, now: number): boolean {
  return state.cooldownUntil > now
}

export function cooldownRemainingMs(
  state: MathGateState,
  now: number,
): number {
  return Math.max(0, state.cooldownUntil - now)
}
