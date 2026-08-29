// Iskierki settings types — sekcja 18 (Data model) i sekcja 10.1 / 13.2 spec.

export type Level = 'iskierka' | 'plomyk' | 'ognik' | 'pochodnia'

// Sekcja 10.1: cztery opcje "Wielkość liter".
export type CaseMode = 'tylko-duze' | 'tylko-male' | 'para' | 'mieszane'

// Sekcja 10.1: cztery opcje "Styl pisma".
export type StyleMode =
  | 'tylko-drukowane'
  | 'tylko-pisane'
  | 'mieszane-per-pytanie'
  | 'oba-na-kafelku'

/**
 * Legacy: „Długość sesji" modułu 1 sprzed v5. Zostawiony WYŁĄCZNIE dla migracji
 * persistu — nie używać w nowym kodzie, globalną długość trzyma
 * `Settings.questionsPerSession`.
 */
export type SessionLength = 5 | 10 | 15

/**
 * Globalna długość sesji dla wszystkich modułów (v5). 8 to domyślne
 * microlearning-owe okno; 5 dla dnia „na chwilę", 12 dla starszego dziecka.
 */
export type QuestionsPerSession = 5 | 8 | 12
export type TimeLimit = 'off' | 10 | 15 | 20 | 25
export type CelebrationTempo = 'short' | 'medium' | 'long'
export type DefaultLevelSetting = Level | 'last-used'
export type TilesPerQuestion = 3 | 4 | 5 | 6 | 8 | 10
export type HumorMode = 'on' | 'off'
export type WordAnimations = 'on' | 'off'
export type SkipCountStep = 2 | 5 | 10 | 'mixed'
export type CzytankiTempo = 'turtle' | 'normal'

// Ustawienia modułu 4 (czytanki). Dziecko przełącza je ikonami w scenie —
// settings tylko PAMIĘTAJĄ ostatni wybór między wizytami.
export type CzytankiSettings = {
  // Echo: po każdym zdaniu pauza na powtórzenie przez dziecko. Default false.
  echoMode: boolean
  // Tempo czytania całości: 'turtle' = 0.75× rate. Default 'normal'.
  tempo: CzytankiTempo
  // Sylaby scalone w jedno słowo (bez kolorów i podkreśleń) — krok w stronę
  // czytania całościowego, gdy dziecko nie potrzebuje już podpory sylabowej.
  // Default false.
  mergedSyllables: boolean
}

// Moduł 1: jak brzmi prompt litery. `phoneme` = sam dźwięk („b"), `name` =
// nazwa litery („be"), `both` = nazwa + dźwięk („be… b"). Typ mieszka w
// settings, nie w module liter — inaczej `promptKeys.ts` i settings tworzyłyby
// cykl importów.
export type PromptMode = 'phoneme' | 'name' | 'both'

// Ustawienia modułu 1 (litery)
export type LettersSettings = {
  // Domyślny tryb promptu dla wszystkich poziomów.
  promptMode: PromptMode
  // Override per poziom; brak klucza = `promptMode`.
  promptModeByLevel: Partial<Record<Level, PromptMode>>
}

// Ustawienia modułu 3 (matematyka) — sekcja 12 spec
export type NumbersSettings = {
  // Iskra "thinking aloud" — competent other (Wygotski). Default true.
  iskraThinkingAloud: boolean
  // Override globalnego `questionsPerSession` dla matematyki. Brak = globalna.
  questionCount?: 6 | 8 | 10
  // Drzewko Mistrzostwa — głosowe celebracje przy mastery. Default true.
  treeCelebrationsOn: boolean
  // Pochodnia: po jakim kroku skip count (2/5/10) lub mieszane. Default 'mixed'.
  skipCountStep: SkipCountStep
  // Worked example intros per koncept (Renkl/Sweller). Default true.
  conceptIntros: boolean
}

export type Settings = {
  // override per poziom; brak klucza = używaj domyślnej puli poziomu
  activeLettersOverride: Partial<Record<Level, string[]>>
  caseMode: Partial<Record<Level, CaseMode>>
  styleMode: Partial<Record<Level, StyleMode>>
  /**
   * Ile pytań ma sesja — JEDNA kontrolka dla wszystkich modułów. Per-moduł
   * overrides (`reading.questionsPerSession[level]`, `numbers.questionCount`)
   * są opcjonalne i wygrywają, gdy rodzic je ustawi.
   */
  questionsPerSession: QuestionsPerSession
  // override per poziom; brak klucza = używaj domyślnej wartości poziomu
  timeLimit: Partial<Record<Level, TimeLimit>>
  // override per poziom; brak klucza = używaj domyślnej wartości poziomu
  showCountdownBar: Partial<Record<Level, boolean>>
  celebrationTempo: CelebrationTempo
  defaultLevel: DefaultLevelSetting
  // override per poziom; brak klucza = używaj domyślnej liczby kafelków poziomu
  tilesPerQuestion: Partial<Record<Level, TilesPerQuestion>>
  // Tryb humoru — śmieszne reakcje Iskry (beknięcie, czkawka, apsik)
  humorMode: HumorMode
  // Druga próba po błędzie: to samo pytanie z 2 kafelkami (poprawny + wybrany).
  // Pierwsza pomyłka i tak trafia do SRS — retry uczy autokorekty, nie kasuje błędu.
  secondAttempt: boolean
  // Ustawienia modułu liter (moduł 1)
  letters: LettersSettings
  // Ustawienia modułu czytania
  reading: {
    wordAnimations: WordAnimations
    wildCelebrationFreq: number                           // 3-15, default 8
    // Override globalnego `questionsPerSession` per poziom; brak klucza = globalna.
    questionsPerSession: Partial<Record<Level, number>>
  }
  // Ustawienia modułu matematyki (moduł 3)
  numbers: NumbersSettings
  // Ustawienia modułu czytanek (moduł 4)
  czytanki: CzytankiSettings
}

// Math gate / parent gate state — sekcja 13.1.
export type MathGateState = {
  // od ostatniego sukcesu lub od ostatniego wygaśnięcia cooldownu
  failedAttempts: number
  // timestamp ms; 0 = brak cooldownu
  cooldownUntil: number
}

export type MathProblem = {
  a: number
  b: number
  c: number
  answer: number
  expression: string
}
