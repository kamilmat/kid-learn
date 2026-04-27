// Iskierki letters module — typy domeny.
// Sekcja 18 spec: SessionLog / SessionEvent.
//
// Re-eksportujemy z `@/shared/srs/types` typy używane przez sesję, żeby
// konsumenci modułu (komponenty, hook) mogli importować z jednego miejsca.

import type {
  DisplayCase as SrsDisplayCase,
  DisplayStyle as SrsDisplayStyle,
  LetterState as SrsLetterState,
  Outcome as SrsOutcome,
} from '@/shared/srs/types'
import type { Level } from '@/shared/settings/types'

export type DisplayCase = SrsDisplayCase
export type DisplayStyle = SrsDisplayStyle
export type LetterState = SrsLetterState
export type Outcome = SrsOutcome

// Pozycja kafelka w siatce 2x2 — sekcja 6.3.
export type Slot = 0 | 1 | 2 | 3

// Sekcja 18: SessionEvent — log struktura per sesja.
export type SessionEvent =
  | {
      type: 'question-start'
      ts: number
      targetLetter: string
      distractors: string[]
      positions: Slot[]
      style: DisplayStyle
      case: DisplayCase
    }
  | {
      type: 'answer'
      ts: number
      outcome: Outcome
      chosenLetter?: string
      chosenPosition?: Slot
      responseMs: number
    }
  | { type: 'pause'; ts: number; reason: 'manual' | 'idle' | 'visibility' }
  | { type: 'resume'; ts: number }

// Sekcja 18: SessionLog — pełna historia sesji.
export type SessionLog = {
  id: string
  startedAt: number
  endedAt: number | null
  level: Level
  events: SessionEvent[]
}

// Stan widoku sesji — patrz `useSession`.
export type SessionStatus =
  | 'preparing'
  | 'playing'
  | 'paused'
  | 'feedback'
  | 'finished'

// Pojedyncze pytanie — wszystko, co potrzebne do wyrenderowania ekranu pytania.
export type Question = {
  index: number // 0-based numer pytania w sesji
  targetLetter: string
  // 4 litery w kolejności wyświetlania (slot 0..3); zawiera `targetLetter`
  tiles: string[]
  // dla `targetLetter` w którym slocie się znajduje
  targetSlot: Slot
  // wybrany dla tego pytania case (pojedyncza wielkość) — używany przez tryb `mieszane`
  chosenCase: 'upper' | 'lower'
  // wybrany dla tego pytania styl pisma (jeśli mieszane-per-pytanie / oba-na-kafelku)
  chosenStyle: DisplayStyle
  // czy każdy kafelek pokazuje parę "Bb" (`para`)
  pairOnTile: boolean
  // czy kafelek pokazuje jednocześnie drukowany + pisany (`oba-na-kafelku`)
  bothStyles: boolean
  startedAt: number
}

export type FeedbackVariant = 'correct' | 'wrong' | 'dontKnow' | 'mastery' | 'timeout'

export type FeedbackState = {
  variant: FeedbackVariant
  targetLetter: string
  chosenLetter?: string
  chosenSlot?: Slot
  durationMs: number
}
