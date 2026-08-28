// Pochwały modułu Cyferki — pula kluczy audio odtwarzanych po poprawnej
// odpowiedzi. Wybór robi hook sesji (wstrzykiwalne `rng` + brak powtórki
// z poprzednią), żeby test mógł być deterministyczny.

export const NUMBERS_PRAISE_KEYS = [
  'praise-effort',
  'praise-strategy',
  'praise-precision',
  'praise-mastery',
  'praise-think',
  'praise-brawo',
  'praise-super',
  'praise-tak-jest',
] as const

export type NumbersPraiseKey = (typeof NUMBERS_PRAISE_KEYS)[number]
