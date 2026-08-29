import { shuffled } from '@/shared/srs/distractors'

export interface BuildChoicesOptions {
  /** Ile kafelków ma mieć wynik razem z poprawną odpowiedzią. */
  count?: number
  /** Dolna granica wartości dopuszczalnych jako dystraktor (włącznie). */
  min: number
  /** Górna granica wartości dopuszczalnych jako dystraktor (włącznie). */
  max: number
  /**
   * Dystraktory tylko o te odległości od poprawnej — dla zadań, w których bliskie
   * pomyłki („o jeden za dużo”) są celem dydaktycznym. Bez tego pola pulą jest
   * cały zakres [min, max].
   */
  offsets?: readonly number[]
  /**
   * Faza drugiej próby: zamiast generować dystraktory, pokaż dokładnie te
   * wartości (plus poprawną). Pusta tablica / brak pola = zwykłe losowanie.
   */
  restrictChoicesTo?: readonly number[] | undefined
  rng?: () => number
}

const DEFAULT_CHOICE_COUNT = 4

/**
 * Dystraktory blisko poprawnej odpowiedzi — dziecko ma porównywać wyniki,
 * a nie eliminować wartości odległe o pół zakresu.
 */
export const NEAR_MISS_OFFSETS = [-3, -2, -1, 1, 2, 3] as const

/**
 * Buduje potasowaną listę odpowiedzi zawierającą poprawną wartość.
 * Tasuje Fisher-Yatesem — `sort(() => Math.random() - 0.5)` jest obciążony
 * i przy czterech kafelkach potrafi trzymać poprawną odpowiedź w tym samym miejscu.
 */
export function buildChoices(correct: number, options: BuildChoicesOptions): number[] {
  const { count = DEFAULT_CHOICE_COUNT, min, max, offsets, rng = Math.random } = options

  // Faza retry: zamiast generować dystraktory, pokazujemy dokładnie dwie opcje —
  // poprawną i tę, którą dziecko wybrało. Kolejność losowa (nie da się zapamiętać
  // pozycji). Zakres [min, max] celowo NIE filtruje: wybór dziecka pokazujemy
  // zawsze, nawet gdyby wypadł poza pulę dystraktorów.
  if (options.restrictChoicesTo && options.restrictChoicesTo.length > 0) {
    // `correct` tutaj to wartość policzona LOKALNIE przez ćwiczenie (z payload.args),
    // a `restrictChoicesTo` przychodzi z SessionView (`extractCorrectValue(question)`
    // na poziomie sesji). Gdy `restrictChoicesTo` już zawiera `correct`, obie ścieżki
    // się zgadzają — zwracamy dokładnie te wartości. Gdy NIE zawiera (rozjazd
    // przez odmienne przycięcie/zaokrąglenie), doklejamy `correct` jako siatkę
    // bezpieczeństwa, żeby retry nigdy nie zgubiło prawdziwej odpowiedzi.
    const restrict = options.restrictChoicesTo.includes(correct)
      ? options.restrictChoicesTo
      : [correct, ...options.restrictChoicesTo]
    return shuffled(Array.from(new Set(restrict)), rng)
  }

  const pool: number[] = []
  if (offsets === undefined) {
    for (let n = min; n <= max; n++) pool.push(n)
  } else {
    for (const d of offsets) pool.push(correct + d)
  }

  const seen = new Set<number>([correct])
  const candidates: number[] = []
  for (const v of pool) {
    if (v < min || v > max || seen.has(v)) continue
    seen.add(v)
    candidates.push(v)
  }

  const distractors = shuffled(candidates, rng).slice(0, Math.max(0, count - 1))
  return shuffled([correct, ...distractors], rng)
}
