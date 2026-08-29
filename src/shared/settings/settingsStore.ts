// Settings + parent gate Zustand store.
//
// Persistowane w localStorage pod kluczem `iskierki-state-v1` (sekcja 18 spec).
// Persist obejmuje: settings, mathGateState, parentGateUnlockedUntil.
// Unlock TTL = 5 min (sekcja 13.1) — wyliczane on-read przez `isUnlocked(now)`.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  ALL_LEVELS,
  defaultSettings,
  filterOverrideToLevelPool,
} from './defaults'
import {
  applyAttempt,
  cooldownRemainingMs,
  initialMathGateState,
  isCooldown,
  validateAnswer,
} from './mathGate'
import type {
  Level,
  MathGateState,
  MathProblem,
  PromptMode,
  QuestionsPerSession,
  Settings,
} from './types'

const VALID_PROMPT_MODES: ReadonlySet<PromptMode> = new Set(['phoneme', 'name', 'both'])
const VALID_QUESTIONS_PER_SESSION: ReadonlySet<QuestionsPerSession> = new Set([5, 8, 12])

export const STORAGE_KEY = 'iskierki-state-v1'
export const UNLOCK_TTL_MS = 5 * 60_000 // 5 min — sekcja 13.1

export type TryUnlockResult =
  | { success: true }
  | { success: false; cooldownMs?: number; reason: 'cooldown' | 'wrong-answer' }

export type SettingsStore = {
  settings: Settings
  mathGateState: MathGateState
  /** Timestamp ms; 0 = lock. Nie sprawdzaj bezpośrednio — użyj isUnlocked(now). */
  parentGateUnlockedUntil: number

  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  setSettings: (settings: Settings) => void

  tryUnlockGate: (
    input: string,
    problem: Pick<MathProblem, 'a' | 'b' | 'c'>,
    now: number,
  ) => TryUnlockResult

  isUnlocked: (now: number) => boolean
  lockGate: () => void

  // Test/utility — reset całego state'u do defaultów. Nie używać w UI.
  _resetForTests: () => void
}

type PersistedShape = {
  settings: Settings
  mathGateState: MathGateState
  parentGateUnlockedUntil: number
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      mathGateState: initialMathGateState,
      parentGateUnlockedUntil: 0,

      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }))
      },

      setSettings: (settings) => {
        set({ settings })
      },

      tryUnlockGate: (input, problem, now) => {
        const state = get()
        if (isCooldown(state.mathGateState, now)) {
          return {
            success: false,
            reason: 'cooldown',
            cooldownMs: cooldownRemainingMs(state.mathGateState, now),
          }
        }
        const correct = validateAnswer(problem, input)
        const nextGate = applyAttempt(state.mathGateState, correct, now)
        if (correct) {
          set({
            mathGateState: nextGate,
            parentGateUnlockedUntil: now + UNLOCK_TTL_MS,
          })
          return { success: true }
        }
        // Niepoprawne — zaktualizuj state, lock pozostaje.
        const cooldownMs = cooldownRemainingMs(nextGate, now)
        set({ mathGateState: nextGate })
        if (cooldownMs > 0) {
          return { success: false, reason: 'cooldown', cooldownMs }
        }
        return { success: false, reason: 'wrong-answer' }
      },

      isUnlocked: (now) => {
        return get().parentGateUnlockedUntil > now
      },

      lockGate: () => {
        set({ parentGateUnlockedUntil: 0 })
      },

      _resetForTests: () => {
        set({
          settings: defaultSettings,
          mathGateState: initialMathGateState,
          parentGateUnlockedUntil: 0,
        })
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedShape => ({
        settings: state.settings,
        mathGateState: state.mathGateState,
        parentGateUnlockedUntil: state.parentGateUnlockedUntil,
      }),
      version: 6,
      // Bez `migrate` zustand ODRZUCA persist przy niezgodnej wersji (merge dostaje
      // undefined) — przepuszczamy blob dalej, resztę roboty robi `merge` poniżej.
      //
      // Tutaj siedzą TYLKO kroki, które muszą być odpalone raz, przy przejściu
      // wersji. Idempotentne guardy zostają w `merge` (biegnie przy każdym
      // rehydrate).
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as PersistedShape
        if (version < 5) {
          const s = p.settings as unknown as Record<string, unknown> | undefined
          const numbers = s?.numbers as Record<string, unknown> | undefined
          // v4 → v5: `numbers.questionCount` z pola obowiązkowego stało się
          // OVERRIDEM globalnego `questionsPerSession`. Wartość równa ówczesnemu
          // defaultowi (8) nie była świadomym wyborem rodzica — kasujemy ją, żeby
          // globalna kontrolka faktycznie rządziła. Inna wartość to wybór i
          // zostaje jako override.
          if (numbers && numbers.questionCount === 8) {
            delete numbers.questionCount
          }
        }
        if (version < 6) {
          // v5 → v6: domyślny tryb promptu liter wraca do „jak się czyta"
          // (nagrania rodzica). `both` z v5 nie było wyborem rodzica, tylko
          // ówczesnym defaultem — nadpisujemy; inne wartości zostają.
          const s = p.settings as unknown as Record<string, unknown> | undefined
          const letters = s?.letters as Record<string, unknown> | undefined
          if (letters && letters.promptMode === 'both') {
            letters.promptMode = 'phoneme'
          }
        }
        return p
      },
      // Migration:
      //   v2 → v3: `showCountdownBar` z boolean na Partial<Record<Level, boolean>>.
      //   v3 → v4: `timeLimit` z prymitywu (TimeLimit) na Partial<Record<Level, TimeLimit>>.
      //   v4: `humorMode` + `reading` (nowe pola modułu 2) — obsługiwane przez merge.
      //   v4 → v5: `sessionLength` → globalne `questionsPerSession`;
      //            `numbers.questionCount` staje się overridem (patrz `migrate`).
      // W obu przypadkach drop'ujemy legacy wartość — zostają per-level defaults
      // (iskierka/płomyk: timeLimit='off', ognik/pochodnia: timeLimit=15).
      //
      // Konwencja append-only: nowe migracje DOPISUJEMY pod istniejącymi guardami,
      // nigdy nie reorderujemy ani nie usuwamy starych (np. `showCountdownBar`
      // boolean guard). Legacy guard można usunąć dopiero gdy pewność że żaden
      // user nie ma już persistu z tej wersji w localStorage — w praktyce
      // miesiącami po release nowej wersji.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedShape>
        const persistedSettings = (p.settings ?? {}) as Record<string, unknown>
        const sanitizedSettings = { ...persistedSettings }
        if (typeof sanitizedSettings.showCountdownBar === 'boolean') {
          delete sanitizedSettings.showCountdownBar
        }
        const tl = sanitizedSettings.timeLimit
        // Drop wszystkie legacy prymitywy — per-level shape jest zawsze obiektem.
        // Bardziej odporne niż enumeracja typeof === 'number' || === 'off'.
        if (tl !== null && tl !== undefined && typeof tl !== 'object') {
          delete sanitizedSettings.timeLimit
        }
        // v4 → v5: uzupełnij brakujące pola modułu 2 gdy brak w localStorage.
        if (!sanitizedSettings.humorMode) {
          sanitizedSettings.humorMode = 'on'
        }
        // Druga próba po błędzie — dodana po v4, więc stary persist jej nie ma.
        if (typeof sanitizedSettings.secondAttempt !== 'boolean') {
          sanitizedSettings.secondAttempt = defaultSettings.secondAttempt
        }
        // Deep-merge modułu 1 (`letters.promptMode`) — pole dodane po v4, stary
        // persist go nie ma; bez tego `promptMode` byłoby `undefined`.
        const persistedLetters = sanitizedSettings.letters as Record<string, unknown> | undefined
        const mergedLetters: Record<string, unknown> = {
          ...defaultSettings.letters,
          ...(persistedLetters ?? {}),
        }
        // Guard: `promptMode` uszkodzony/spoza unii w localStorage psułby
        // `promptAudioKeys` switch — sanityzujemy do domyślnego `both`.
        if (!VALID_PROMPT_MODES.has(mergedLetters.promptMode as PromptMode)) {
          mergedLetters.promptMode = defaultSettings.letters.promptMode
        }
        const rawPromptModeByLevel = mergedLetters.promptModeByLevel as
          | Record<string, unknown>
          | undefined
        const validPromptModeByLevel: Partial<Record<Level, PromptMode>> = {}
        if (rawPromptModeByLevel && typeof rawPromptModeByLevel === 'object') {
          for (const level of ALL_LEVELS) {
            const value = rawPromptModeByLevel[level]
            if (VALID_PROMPT_MODES.has(value as PromptMode)) {
              validPromptModeByLevel[level] = value as PromptMode
            }
          }
        }
        mergedLetters.promptModeByLevel = validPromptModeByLevel
        sanitizedSettings.letters = mergedLetters
        // Deep-merge: stary persist mógł zapisać `reading` bez pól dodanych później
        // (np. wildCelebrationFreq -> undefined -> NaN w useReadingSession).
        const persistedReading = sanitizedSettings.reading as Record<string, unknown> | undefined
        const mergedReading: Record<string, unknown> = {
          ...defaultSettings.reading,
          ...(persistedReading ?? {}),
        }
        // legacy: `reading.timeLimit` nigdy nie było użyte (moduł 2 nie ma timera)
        delete mergedReading.timeLimit
        sanitizedSettings.reading = mergedReading
        // v5: uzupełnij brakujące pola modułu 3 (numbers).
        const persistedNumbers = sanitizedSettings.numbers as Record<string, unknown> | undefined
        sanitizedSettings.numbers = {
          ...defaultSettings.numbers,
          ...(persistedNumbers ?? {}),
        }
        // Moduł 4 (czytanki): echo/tempo dodane po v4 — deep-merge jak `reading`.
        const persistedCzytanki = sanitizedSettings.czytanki as Record<string, unknown> | undefined
        sanitizedSettings.czytanki = {
          ...defaultSettings.czytanki,
          ...(persistedCzytanki ?? {}),
        }
        // v4 → v5: `sessionLength` (5|10|15, tylko Litery) → globalne
        // `questionsPerSession` (5|8|12) wspólne dla wszystkich modułów.
        const legacyLength = sanitizedSettings.sessionLength
        if (
          sanitizedSettings.questionsPerSession === undefined &&
          typeof legacyLength === 'number'
        ) {
          sanitizedSettings.questionsPerSession =
            legacyLength >= 15 ? 12 : legacyLength <= 5 ? 5 : 8
        }
        delete sanitizedSettings.sessionLength
        // Guard: wartość spoza unii (ręcznie zepsuty localStorage) dałaby sesję
        // o dziwnej długości — wracamy do defaultu.
        if (!VALID_QUESTIONS_PER_SESSION.has(sanitizedSettings.questionsPerSession as QuestionsPerSession)) {
          delete sanitizedSettings.questionsPerSession
        }
        const mergedSettings = {
          ...defaultSettings,
          ...sanitizedSettings,
        } as Settings
        // Override puli aktywnych liter: z persistu wyrzucamy WYŁĄCZNIE litery,
        // których dany poziom nie zna (zmieniła się pula w kodzie). Rozmiaru NIE
        // oceniamy — override mniejszy niż `tilesPerQuestion` zostaje zapisany,
        // a `getActiveLetterPool` (read path) i tak zwróci wtedy domyślną pulę.
        // WHY: wcześniej merge kasował taki override na zawsze, więc obniżenie
        // liczby kafelków w ustawieniach nie przywracało wyboru rodzica.
        const persistedOverrides = mergedSettings.activeLettersOverride
        const rawOverrides: Partial<Record<Level, string[]>> =
          persistedOverrides &&
          typeof persistedOverrides === 'object' &&
          !Array.isArray(persistedOverrides)
            ? persistedOverrides
            : {}
        const validOverrides: Partial<Record<Level, string[]>> = {}
        for (const level of ALL_LEVELS) {
          const filtered = filterOverrideToLevelPool(rawOverrides[level], level)
          if (filtered) validOverrides[level] = filtered
        }
        mergedSettings.activeLettersOverride = validOverrides
        return {
          ...current,
          ...p,
          settings: mergedSettings,
        }
      },
    },
  ),
)
