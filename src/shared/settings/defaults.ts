// Defaulty — sekcje 10.2, 11, 13.2 spec.

import type {
  CaseMode,
  HumorMode,
  LettersSettings,
  Level,
  NumbersSettings,
  PromptMode,
  Settings,
  StyleMode,
  TilesPerQuestion,
  TimeLimit,
  WordAnimations,
} from './types'

// Moduł 1: default `both` (nazwa → fonem). Sama nazwa nie wystarcza do scalania
// głosek, sam fonem bywa nieidentyfikowalny — para uczy obu (Piasta & Wagner 2010).
export const LETTERS_DEFAULTS: LettersSettings = {
  promptMode: 'both',
  promptModeByLevel: {},
}

// Sekcja 12 spec: defaulty modułu 3 (matematyka)
export const NUMBERS_DEFAULTS: NumbersSettings = {
  iskraThinkingAloud: true,
  questionCount: 8,
  treeCelebrationsOn: true,
  skipCountStep: 'mixed',
  conceptIntros: true,
}

// Lista wszystkich poziomów w kolejności rosnącej trudności. Single source of truth
// dla iteracji per-level (settings UI, persistence, raporty, testy).
export const ALL_LEVELS = ['iskierka', 'plomyk', 'ognik', 'pochodnia'] as const

// Polskie etykiety per poziom — używane wszędzie gdzie pokazujemy nazwę
// poziomu w UI/raportach (settings, eksport, live session). Single source.
export const LEVEL_LABEL: Record<Level, string> = {
  iskierka: 'Iskierka',
  plomyk: 'Płomyk',
  ognik: 'Ognik',
  pochodnia: 'Pochodnia',
}

// Sekcja 11: pule liter per poziom (kumulacja — wyższy poziom zawiera niższe).
const iskierkaPool: readonly string[] = ['a', 'm', 'l', 'e', 'o', 't']

const plomykPool: readonly string[] = [
  ...iskierkaPool,
  's',
  'k',
  'b',
  'd',
  'n',
  'p',
  'r',
  'i',
]

const ognikPool: readonly string[] = [
  ...plomykPool,
  'c',
  'g',
  'j',
  'w',
  'z',
  'h',
  'f',
  'u',
  'y',
  'ł',
]

const pochodniaPool: readonly string[] = [
  ...ognikPool,
  'ą',
  'ć',
  'ę',
  'ń',
  'ó',
  'ś',
  'ź',
  'ż',
]

// Eksportujemy jako mutable copies — konsumenci mogą filtrować/sortować bez
// dotykania źródła prawdy.
export const levelLetterPools: Record<Level, string[]> = {
  iskierka: [...iskierkaPool],
  plomyk: [...plomykPool],
  ognik: [...ognikPool],
  pochodnia: [...pochodniaPool],
}

// Sekcja 10.2 / 11: defaulty wizualne per poziom.
// `tilesPerQuestion` rośnie z poziomem — Iskierka 4, Płomyk 6, Ognik 8, Pochodnia 10.
// `showCountdownBar` — wyłączone dla prostszych poziomów, włączone od Ognika.
export const levelDefaults: Record<
  Level,
  { caseMode: CaseMode; styleMode: StyleMode; tilesPerQuestion: TilesPerQuestion; showCountdownBar: boolean; timeLimit: TimeLimit }
> = {
  iskierka: { caseMode: 'para', styleMode: 'tylko-drukowane', tilesPerQuestion: 4, showCountdownBar: false, timeLimit: 'off' },
  plomyk: { caseMode: 'para', styleMode: 'tylko-drukowane', tilesPerQuestion: 6, showCountdownBar: false, timeLimit: 'off' },
  ognik: {
    caseMode: 'mieszane',
    styleMode: 'mieszane-per-pytanie',
    tilesPerQuestion: 8,
    showCountdownBar: true,
    timeLimit: 15,
  },
  pochodnia: {
    caseMode: 'mieszane',
    styleMode: 'oba-na-kafelku',
    tilesPerQuestion: 10,
    showCountdownBar: true,
    timeLimit: 15,
  },
}

// Sekcja 13.2: domyślne ustawienia globalne MVP.
export const defaultSettings: Settings = {
  activeLettersOverride: {},
  caseMode: {},
  styleMode: {},
  sessionLength: 10,
  timeLimit: {},
  showCountdownBar: {},
  celebrationTempo: 'medium',
  defaultLevel: 'last-used',
  tilesPerQuestion: {},
  humorMode: 'on' as HumorMode,
  secondAttempt: true,
  letters: LETTERS_DEFAULTS,
  reading: {
    wordAnimations: 'on' as WordAnimations,
    wildCelebrationFreq: 8,
    questionsPerSession: {},
  },
  numbers: NUMBERS_DEFAULTS,
}

/**
 * Zwraca efektywną liczbę kafelków na pytanie dla poziomu — override z
 * `settings.tilesPerQuestion[level]` jeśli ustawiony, inaczej `levelDefaults`.
 */
export function getEffectiveTilesPerQuestion(
  settings: Settings,
  level: Level,
): TilesPerQuestion {
  return (
    settings.tilesPerQuestion?.[level] ?? levelDefaults[level].tilesPerQuestion
  )
}

/**
 * Zwraca efektywny tryb promptu litery dla poziomu — override z
 * `settings.letters.promptModeByLevel[level]` jeśli ustawiony, inaczej globalny
 * `settings.letters.promptMode`.
 */
export function getEffectivePromptMode(
  settings: Settings,
  level: Level,
): PromptMode {
  return (
    settings.letters?.promptModeByLevel?.[level] ??
    settings.letters?.promptMode ??
    LETTERS_DEFAULTS.promptMode
  )
}

/**
 * Zwraca efektywną wartość `showCountdownBar` dla poziomu — override z
 * `settings.showCountdownBar[level]` jeśli ustawiony, inaczej `levelDefaults`.
 */
export function getEffectiveShowCountdownBar(
  settings: Settings,
  level: Level,
): boolean {
  return (
    settings.showCountdownBar?.[level] ?? levelDefaults[level].showCountdownBar
  )
}

/**
 * Zwraca efektywny limit czasu dla poziomu — override z
 * `settings.timeLimit[level]` jeśli ustawiony, inaczej `levelDefaults`.
 */
export function getEffectiveTimeLimit(
  settings: Settings,
  level: Level,
): TimeLimit {
  return settings.timeLimit?.[level] ?? levelDefaults[level].timeLimit
}

/**
 * Sanityzuje override puli aktywnych liter dla poziomu.
 *
 * Zwraca `null` gdy override jest nieużywalny i trzeba wziąć default poziomu:
 *  - litery spoza puli poziomu są odrzucane (SRS i generator dystraktorów
 *    zakładają, że każda litera w puli należy do zakresu poziomu),
 *  - po odfiltrowaniu musi zostać co najmniej `tilesPerQuestion` unikalnych
 *    liter — inaczej nie da się zbudować pytania (1 cel + N-1 dystraktorów).
 *
 * Używane zarówno przez `getActiveLetterPool` (read path), jak i przez `merge`
 * w settingsStore (localStorage z poprzedniej wersji mógł zapisać override,
 * który dziś nie przechodzi walidacji).
 */
export function sanitizeActiveLetterOverride(
  override: readonly string[] | undefined,
  level: Level,
  requiredSize: number,
): string[] | null {
  const filtered = filterOverrideToLevelPool(override, level)
  if (filtered === null || filtered.length < requiredSize) return null
  return filtered
}

/**
 * Odfiltrowuje z override'u litery spoza puli poziomu (i duplikaty). NIE
 * ocenia rozmiaru względem `tilesPerQuestion` — zwraca `null` gdy wejście nie
 * jest tablicą LUB gdy po odfiltrowaniu nic nie zostało (override złożony
 * wyłącznie z liter, których poziom już nie zna).
 *
 * WHY osobno od `sanitizeActiveLetterOverride`: persist ma zachować wybór
 * rodzica dosłownie. Kasowanie override'u przy zapisie tylko dlatego, że jest
 * mniejszy niż aktualne `tilesPerQuestion`, gubiło go BEZPOWROTNIE — po
 * obniżeniu liczby kafelków nie było już czego przywrócić. Rozmiar sprawdza
 * dopiero read path (`getActiveLetterPool`), więc fallback jest odwracalny.
 * Pusta tablica to inny przypadek: nie ma czego przywrócić, więc nie ma sensu
 * jej persistować jako override — czyścimy klucz, żeby edytor pokazał pulę
 * domyślną zamiast pustego wyboru.
 */
export function filterOverrideToLevelPool(
  override: readonly string[] | undefined,
  level: Level,
): string[] | null {
  if (!Array.isArray(override)) return null
  const allowed = new Set(levelLetterPools[level])
  const filtered = Array.from(new Set(override)).filter((letter) => allowed.has(letter))
  // Override złożony wyłącznie z liter spoza puli poziomu (np. zmieniła się
  // pula w kodzie) nie ma sensu jako override — traktujemy go jak brak i
  // dajemy edytorowi pokazać pulę domyślną, zamiast persistować pustą tablicę.
  return filtered.length > 0 ? filtered : null
}

/**
 * Zwraca aktywną pulę liter dla poziomu — override jeśli istnieje i jest
 * użyteczny, w przeciwnym wypadku domyślna pula poziomu.
 *
 * Override jest sanityzowany (`sanitizeActiveLetterOverride`): litery spoza
 * puli poziomu wypadają, a zbyt mała reszta (< efektywne `tilesPerQuestion`)
 * powoduje fallback na default. WHY: pula mniejsza niż liczba kafelków
 * zagłodziłaby generator dystraktorów — pytanie nie dałoby się złożyć.
 */
export function getActiveLetterPool(
  settings: Settings,
  level: Level,
): string[] {
  const sanitized = sanitizeActiveLetterOverride(
    settings.activeLettersOverride[level],
    level,
    getEffectiveTilesPerQuestion(settings, level),
  )
  return sanitized ?? [...levelLetterPools[level]]
}
