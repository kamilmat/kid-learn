// Session log types — zgodne ze spec sekcja 18.
// `Level` jest re-eksportowany z @/shared/settings/types — settings to bardziej
// fundamentalna warstwa i powinno być jedno źródło prawdy dla typu poziomu
// (5ty poziom = aktualizacja jednego miejsca, nie kilku silently divergent).

import type { Level } from '@/shared/settings/types'
export type { Level }

export type SessionEventQuestionStart = {
  type: 'question-start'
  ts: number
  targetLetter: string
  distractors: string[]
  positions: number[]
  style: 'print' | 'handwritten'
  case: 'upper' | 'lower' | 'pair'
}

export type SessionEventAnswer = {
  type: 'answer'
  ts: number
  outcome: 'correct' | 'wrong' | 'dontKnow' | 'timeout'
  chosenLetter?: string
  chosenPosition?: 0 | 1 | 2 | 3
  responseMs: number
}

export type SessionEventPause = {
  type: 'pause'
  ts: number
  reason: 'manual' | 'idle' | 'visibility'
}

export type SessionEventResume = {
  type: 'resume'
  ts: number
}

export type SessionEvent =
  | SessionEventQuestionStart
  | SessionEventAnswer
  | SessionEventPause
  | SessionEventResume

export type SessionLog = {
  id: string
  startedAt: number
  endedAt: number | null
  level: Level
  events: SessionEvent[]
}
