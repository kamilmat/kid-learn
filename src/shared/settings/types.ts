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
export type TilesPerQuestion = 3 | 4 | 5 | 6

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
