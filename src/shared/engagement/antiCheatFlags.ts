import type { SessionEvent } from '../stats/types'

export type AntiCheatFlagType =
  | 'fast-click'
  | 'same-position'
  | 'no-answer'
  | 'many-dont-know'
  | 'visibility'
  | 'long-inactivity'

export type AntiCheatFlag = {
  type: AntiCheatFlagType
  severity: 'warning' | 'alert'
  relatedEventIndices: number[]
}

const FAST_CLICK_THRESHOLD_MS = 1000
const FAST_CLICK_REQUIRED = 3
const SAME_POSITION_REQUIRED = 5
const NO_ANSWER_REQUIRED = 2
const MANY_DONT_KNOW_REQUIRED = 3
const LONG_INACTIVITY_THRESHOLD_MS = 2 * 60 * 1000

/**
 * Analizator post-sesji — przegląda `events` i zwraca listę flag anti-cheat.
 * Reguły zgodne ze spec sekcja 14.5.
 */
export function analyzeSession(events: SessionEvent[]): AntiCheatFlag[] {
  const flags: AntiCheatFlag[] = []

  // 1. Fast-click: 3+ odpowiedzi pod rząd <1s.
  let fastChainIdx: number[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.type !== 'answer') continue
    if (ev.responseMs < FAST_CLICK_THRESHOLD_MS) {
      fastChainIdx.push(i)
      if (fastChainIdx.length >= FAST_CLICK_REQUIRED) {
        flags.push({
          type: 'fast-click',
          severity: 'warning',
          relatedEventIndices: [...fastChainIdx],
        })
        fastChainIdx = []
      }
    } else {
      fastChainIdx = []
    }
  }

  // 2. Same-position: 5+ tap w ten sam slot z rzędu.
  let lastPosition: number | null = null
  let positionStreak: number[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.type !== 'answer') continue
    if (ev.chosenPosition === undefined) {
      lastPosition = null
      positionStreak = []
      continue
    }
    if (ev.chosenPosition === lastPosition) {
      positionStreak.push(i)
    } else {
      lastPosition = ev.chosenPosition
      positionStreak = [i]
    }
    if (positionStreak.length >= SAME_POSITION_REQUIRED) {
      flags.push({
        type: 'same-position',
        severity: 'warning',
        relatedEventIndices: [...positionStreak],
      })
      lastPosition = null
      positionStreak = []
    }
  }

  // 3. No-answer: 2+ timeouty pod rząd.
  let timeoutStreak: number[] = []
  // 4. Many-dont-know: 3+ "nie wiem" pod rząd.
  let dontKnowStreak: number[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.type !== 'answer') continue

    if (ev.outcome === 'timeout') {
      timeoutStreak.push(i)
      if (timeoutStreak.length >= NO_ANSWER_REQUIRED) {
        flags.push({
          type: 'no-answer',
          severity: 'warning',
          relatedEventIndices: [...timeoutStreak],
        })
        timeoutStreak = []
      }
    } else {
      timeoutStreak = []
    }

    if (ev.outcome === 'dontKnow') {
      dontKnowStreak.push(i)
      if (dontKnowStreak.length >= MANY_DONT_KNOW_REQUIRED) {
        flags.push({
          type: 'many-dont-know',
          severity: 'warning',
          relatedEventIndices: [...dontKnowStreak],
        })
        dontKnowStreak = []
      }
    } else {
      dontKnowStreak = []
    }
  }

  // 5. Visibility: page visibility hidden podczas sesji
  //    (event pause z reason='visibility').
  const visibilityIdx: number[] = []
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.type === 'pause' && ev.reason === 'visibility') {
      visibilityIdx.push(i)
    }
  }
  if (visibilityIdx.length > 0) {
    flags.push({
      type: 'visibility',
      severity: 'alert',
      relatedEventIndices: visibilityIdx,
    })
  }

  // 6. Long inactivity: łączny czas pauz w sesji >2 min.
  //    Sumujemy każdą parę pause→resume (lub pause→koniec sesji).
  const pauseIdx: number[] = []
  let totalPauseMs = 0
  let activePauseTs: number | null = null
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!
    if (ev.type === 'pause') {
      activePauseTs = ev.ts
      pauseIdx.push(i)
    } else if (ev.type === 'resume') {
      if (activePauseTs !== null) {
        totalPauseMs += Math.max(0, ev.ts - activePauseTs)
        activePauseTs = null
        pauseIdx.push(i)
      }
    }
  }
  // Pauza bez resume — niedomknięta. Nie liczymy do sumy (nie znamy końca).
  if (totalPauseMs > LONG_INACTIVITY_THRESHOLD_MS) {
    flags.push({
      type: 'long-inactivity',
      severity: 'warning',
      relatedEventIndices: pauseIdx,
    })
  }

  return flags
}
