// Settings + parent gate Zustand store.
//
// Persistowane w localStorage pod kluczem `iskierki-state-v1` (sekcja 18 spec).
// Persist obejmuje: settings, mathGateState, parentGateUnlockedUntil.
// Unlock TTL = 5 min (sekcja 13.1) — wyliczane on-read przez `isUnlocked(now)`.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { defaultSettings } from './defaults'
import {
  applyAttempt,
  cooldownRemainingMs,
  initialMathGateState,
  isCooldown,
  validateAnswer,
} from './mathGate'
import type { MathGateState, MathProblem, Settings } from './types'

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
      version: 4,
      // Migration:
      //   v2 → v3: `showCountdownBar` z boolean na Partial<Record<Level, boolean>>.
      //   v3 → v4: `timeLimit` z prymitywu (TimeLimit) na Partial<Record<Level, TimeLimit>>.
      // W obu przypadkach drop'ujemy legacy wartość — zostają per-level defaults
      // (iskierka/płomyk: timeLimit='off', ognik/pochodnia: timeLimit=15).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedShape>
        const persistedSettings = (p.settings ?? {}) as Record<string, unknown>
        const sanitizedSettings = { ...persistedSettings }
        if (typeof sanitizedSettings.showCountdownBar === 'boolean') {
          delete sanitizedSettings.showCountdownBar
        }
        const tl = sanitizedSettings.timeLimit
        if (tl === 'off' || typeof tl === 'number') {
          delete sanitizedSettings.timeLimit
        }
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings, ...sanitizedSettings },
        }
      },
    },
  ),
)
