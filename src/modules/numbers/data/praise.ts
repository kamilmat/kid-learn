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

export const NUMBERS_PRAISE_PROCESS_KEYS = [
  'praise-proc-num-1',
  'praise-proc-num-2',
  'praise-proc-num-3',
  'praise-proc-num-4',
  'praise-proc-num-5',
  'praise-proc-num-6',
] as const

export type NumbersPraiseKey =
  | (typeof NUMBERS_PRAISE_KEYS)[number]
  | (typeof NUMBERS_PRAISE_PROCESS_KEYS)[number]
