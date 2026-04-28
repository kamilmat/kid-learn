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

export type SessionLength = 5 | 10 | 15
export type TimeLimit = 'off' | 10 | 15 | 20 | 25
export type CelebrationTempo = 'short' | 'medium' | 'long'
export type DefaultLevelSetting = Level | 'last-used'
export type Voice = 'zofia' // tylko Zofia w MVP — sekcja 13.2
export type TilesPerQuestion = 3 | 4 | 5 | 6 | 8 | 10
export type HumorMode = 'on' | 'off'
export type WordAnimations = 'on' | 'off'
export type SkipCountStep = 2 | 5 | 10 | 'mixed'

// Ustawienia modułu 3 (matematyka) — sekcja 12 spec
export type NumbersSettings = {
  // Iskra "thinking aloud" — competent other (Wygotski). Default true.
  iskraThinkingAloud: boolean
  // Liczba pytań w sesji (microlearning < 10 min). Default 8.
  questionCount: 6 | 8 | 10
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
  sessionLength: SessionLength
  // override per poziom; brak klucza = używaj domyślnej wartości poziomu
  timeLimit: Partial<Record<Level, TimeLimit>>
  // override per poziom; brak klucza = używaj domyślnej wartości poziomu
  showCountdownBar: Partial<Record<Level, boolean>>
  celebrationTempo: CelebrationTempo
  defaultLevel: DefaultLevelSetting
  voice: Voice
  // override per poziom; brak klucza = używaj domyślnej liczby kafelków poziomu
  tilesPerQuestion: Partial<Record<Level, TilesPerQuestion>>
  // Tryb humoru — śmieszne reakcje Iskry (beknięcie, czkawka, apsik)
  humorMode: HumorMode
  // Ustawienia modułu czytania
  reading: {
    wordAnimations: WordAnimations
    wildCelebrationFreq: number                           // 3-15, default 8
    questionsPerSession: Partial<Record<Level, number>>  // default 8 dla wszystkich poziomów
    timeLimit: Partial<Record<Level, TimeLimit>>         // default 'off' dla czytania
  }
  // Ustawienia modułu matematyki (moduł 3)
  numbers: NumbersSettings
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
