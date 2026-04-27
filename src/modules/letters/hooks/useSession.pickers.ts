// Pickery wyodrębnione z useSession dla testowalności i czystości hooka.

import type { SessionEvent } from '@/modules/letters/types'
import type { IskraIntensity } from '@/shared/ui/IskraMascot'

export const PRAISE_KEYS = [
  'praise-1',
  'praise-2',
  'praise-3',
  'praise-4',
  'praise-5',
  'praise-6',
  'praise-7',
  'praise-8',
  'praise-9',
  'praise-10',
  'praise-11',
  'praise-12',
] as const

export type PraiseKey = (typeof PRAISE_KEYS)[number]

/**
 * Picker pochwał no-repeat-with-last. Gdy losowanie trafi w `lastKey`, dobieramy
 * następny w kolejności (cyklicznie). Zawsze zwraca klucz != lastKey.
 */
export function pickPraiseKey(
  lastKey: PraiseKey | null,
  rng: () => number,
): PraiseKey {
  const idx = Math.floor(rng() * PRAISE_KEYS.length)
  const candidate = PRAISE_KEYS[idx] as PraiseKey
  if (candidate !== lastKey) return candidate
  // Last hit — bierzemy następny modulo
  const fallbackIdx = (idx + 1) % PRAISE_KEYS.length
  return PRAISE_KEYS[fallbackIdx] as PraiseKey
}

export const CORRECTION_PREFIX_KEYS = [
  'correction-prefix-1',
  'correction-prefix-2',
  'correction-prefix-3',
] as const

export type CorrectionPrefixKey =
  | (typeof CORRECTION_PREFIX_KEYS)[number]
  | 'correction-prefix-contrastive'

/**
 * Picker correction-prefix dla wariantu `wrong`. Jeśli `chosenLetter` jest
 * w parze contrastive z `targetLetter` (z `CONTRASTIVE_PAIRS`), zwraca
 * `correction-prefix-contrastive` — inaczej losuje 1/2/3.
 */
export function pickCorrectionPrefix(
  targetLetter: string,
  chosenLetter: string,
  contrastivePairs: Record<string, readonly string[] | string[]>,
  rng: () => number,
): CorrectionPrefixKey {
  const pairs = contrastivePairs[targetLetter] ?? []
  if (pairs.includes(chosenLetter)) {
    return 'correction-prefix-contrastive'
  }
  const idx = Math.floor(rng() * CORRECTION_PREFIX_KEYS.length)
  return CORRECTION_PREFIX_KEYS[idx] as CorrectionPrefixKey
}

export type StreakAudioKey = 'streak-3' | 'streak-5' | 'streak-7-plus'

/** Mapuje streak count na intensywność mascotki Iskry. */
export function streakIntensity(streak: number): IskraIntensity {
  if (streak >= 7) return 'torch'
  if (streak >= 5) return 'fire'
  if (streak >= 3) return 'flame'
  return 'spark'
}

/**
 * Zwraca klucz audio dla TRESHOLD streak'a — null jeśli streak nie jest
 * progiem (3, 5, 7+). Próg 7+ obejmuje wszystkie wartości ≥7 (każda kolejna
 * correct po 7 leci `streak-7-plus`).
 */
export function streakAudioKey(streak: number): StreakAudioKey | null {
  if (streak === 3) return 'streak-3'
  if (streak === 5) return 'streak-5'
  if (streak >= 7) return 'streak-7-plus'
  return null
}

/**
 * Perfect session = wszystkie pytania sesji odpowiedziane (sesja nie przerwana
 * przez quit) i wszystkie outcome = 'correct'.
 */
export function detectPerfectSession(
  events: readonly SessionEvent[],
  sessionLength: number,
): boolean {
  const answers = events.filter((e) => e.type === 'answer')
  if (answers.length !== sessionLength) return false
  return answers.every((e) => e.type === 'answer' && e.outcome === 'correct')
}
