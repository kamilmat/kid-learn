// Defaulty — sekcje 10.2, 11, 13.2 spec.

import type {
  CaseMode,
  HumorMode,
  Level,
  NumbersSettings,
  Settings,
  StyleMode,
  TilesPerQuestion,
  TimeLimit,
  WordAnimations,
} from './types'

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
  voice: 'zofia',
  tilesPerQuestion: {},
  humorMode: 'on' as HumorMode,
  reading: {
    wordAnimations: 'on' as WordAnimations,
    wildCelebrationFreq: 8,
    questionsPerSession: {},
    timeLimit: {},
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
 * Zwraca aktywną pulę liter dla poziomu — override jeśli istnieje
 * (i ma sens), w przeciwnym wypadku domyślna pula poziomu.
 *
 * Override z pustą tablicą lub mniejszy niż minimum (sekcja 13.2: min 4)
 * jest ignorowany przez `validateAndApplyOverride`, ale `getActiveLetterPool`
 * pozostaje konserwatywny: jeśli override istnieje (klucz obecny), zwracamy
 * go w niezmienionej postaci — walidacja jest warstwą wyżej.
 */
export function getActiveLetterPool(
  settings: Settings,
  level: Level,
): string[] {
  const override = settings.activeLettersOverride[level]
  if (override !== undefined) {
    return [...override]
  }
  return [...levelLetterPools[level]]
}
