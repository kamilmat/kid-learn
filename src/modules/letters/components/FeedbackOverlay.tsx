// FeedbackOverlay — overlay po odpowiedzi.
// Sekcja 6.4 / 6.5 spec: warianty correct / dontKnow / timeout / mastery.
// Wariant `wrong` NIE renderuje overlayu — feedback wizualny pochodzi tylko
// z kafelków w QuizCard (czerwony wybrany / zielony poprawny). Audio feedback
// nadal odtwarzany przez useSession.
// Auto-dismiss po `durationMs` (zależnym od `celebrationTempo`).

import { useEffect, type ReactElement } from 'react'
import { colors, radii } from '@/app/theme'
import { toUpper } from '@/modules/letters/data/alphabet'
import {
  getAssociation,
  type AssociationPosition,
} from '@/modules/letters/data/associations'
import type { FeedbackState } from '@/modules/letters/types'
import type { CaseMode, StyleMode } from '@/shared/settings/types'

export type FeedbackOverlayProps = {
  feedback: FeedbackState
  /** Wywoływane po `durationMs`. */
  onDismiss: () => void
  /** Tryb wielkości litery — żeby pokazać wielką literę spójnie z kafelkami. */
  caseMode?: CaseMode
  /** Tryb stylu (drukowane/pisane) — spójność z kafelkami. */
  styleMode?: StyleMode
  /** Wybór wielkości dla bieżącego pytania (mieszane → upper/lower). */
  chosenCase?: 'upper' | 'lower'
}

function letterTextFor(letter: string, caseMode: CaseMode, chosenCase: 'upper' | 'lower'): string {
  switch (caseMode) {
    case 'tylko-duze':
      return toUpper(letter)
    case 'tylko-male':
      return letter
    case 'para':
      return `${toUpper(letter)}${letter}`
    case 'mieszane':
      return chosenCase === 'upper' ? toUpper(letter) : letter
  }
}

function backgroundFor(variant: FeedbackState['variant']): string {
  switch (variant) {
    case 'correct':
    case 'mastery':
      return `${colors.accentGreen}cc`
    case 'wrong':
      return `${colors.accentOrange}cc`
    case 'dontKnow':
    case 'timeout':
      return '#2d2d33ee'
  }
}

function headlineFor(variant: FeedbackState['variant']): string {
  switch (variant) {
    case 'correct':
      return 'Brawo!'
    case 'mastery':
      return 'Iskra!'
    case 'wrong':
      return 'Posłuchaj jeszcze raz'
    case 'dontKnow':
      return 'Nie szkodzi!'
    case 'timeout':
      return 'Następnym razem szybciej'
  }
}

/**
 * Renderuje słowo asocjacji z podświetloną literą docelową — zwiększony
 * font, akcentowy kolor + outline. Dla 'middle' szukamy pierwszego wystąpienia
 * `targetLetter` (case-insensitive). Jeśli nie znajdziemy — zwykły tekst.
 */
function renderHighlightedWord(
  word: string,
  targetLetter: string,
  position: AssociationPosition,
): ReactElement {
  const lowerWord = word.toLowerCase()
  const lowerTarget = targetLetter.toLowerCase()
  let idx = -1
  if (position === 'start') {
    if (lowerWord.startsWith(lowerTarget)) {
      idx = 0
    }
  } else if (position === 'end') {
    if (lowerWord.endsWith(lowerTarget)) {
      idx = word.length - lowerTarget.length
    }
  } else {
    idx = lowerWord.indexOf(lowerTarget)
  }
  if (idx < 0) {
    return <span>{word}</span>
  }
  const before = word.slice(0, idx)
  const highlighted = word.slice(idx, idx + lowerTarget.length)
  const after = word.slice(idx + lowerTarget.length)
  return (
    <span>
      {before}
      <span
        data-testid="feedback-association-highlight"
        style={{
          fontSize: '1.4em',
          color: '#ffe44d',
          fontWeight: 800,
          textShadow:
            '0 0 6px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.35)',
        }}
      >
        {highlighted}
      </span>
      {after}
    </span>
  )
}

export function FeedbackOverlay({
  feedback,
  onDismiss,
  caseMode = 'tylko-duze',
  styleMode = 'tylko-drukowane',
  chosenCase = 'upper',
}: FeedbackOverlayProps) {
  const letterText = letterTextFor(feedback.targetLetter, caseMode, chosenCase)
  const useHandwriting = styleMode === 'tylko-pisane' || styleMode === 'oba-na-kafelku'
  useEffect(() => {
    if (feedback.variant === 'wrong') return
    const timer = setTimeout(() => {
      onDismiss()
    }, feedback.durationMs)
    return () => {
      clearTimeout(timer)
    }
  }, [feedback, onDismiss])

  // Dla 'wrong' nie renderujemy overlayu — feedback wizualny pochodzi z kafelków.
  if (feedback.variant === 'wrong') {
    return null
  }

  let association:
    | { word: string; imagePath: string; emoji: string; position: AssociationPosition }
    | null = null
  try {
    const a = getAssociation(feedback.targetLetter)
    association = {
      word: a.word,
      imagePath: a.imagePath,
      emoji: a.emoji,
      position: a.position,
    }
  } catch {
    association = null
  }

  return (
    <div
      data-testid="feedback-overlay"
      data-variant={feedback.variant}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: backgroundFor(feedback.variant),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        color: '#ffffff',
        textAlign: 'center',
        padding: 24,
      }}
    >
      {feedback.variant === 'mastery' && (
        <div
          data-testid="iskra-mascot"
          aria-hidden="true"
          style={{ fontSize: 96 }}
        >
          🔥
        </div>
      )}
      <div data-testid="feedback-headline" style={{ fontSize: 36, fontWeight: 700 }}>
        {headlineFor(feedback.variant)}
      </div>
      {/* Wielka litera w spójnym stylu (drukowanym lub pisanym jak na kafelkach).
          Dla wszystkich wariantów (correct, dontKnow, timeout, mastery). */}
      <div
        data-testid="feedback-target-letter"
        style={{
          fontSize: 160,
          fontWeight: 800,
          fontFamily: useHandwriting
            ? 'var(--font-handwritten)'
            : 'system-ui, sans-serif',
          fontStyle: useHandwriting ? 'italic' : 'normal',
          background: '#ffffff22',
          borderRadius: radii.kid,
          padding: '8px 32px',
          lineHeight: 1,
        }}
      >
        {letterText}
      </div>
      {(feedback.variant === 'correct' ||
        feedback.variant === 'dontKnow' ||
        feedback.variant === 'timeout' ||
        feedback.variant === 'mastery') &&
        association !== null && (
          <div
            data-testid="feedback-association"
            style={{ fontSize: 48, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
          >
            <div
              data-testid="letter-image"
              aria-hidden="true"
              style={{
                fontSize: 220,
                lineHeight: 1,
                filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.3))',
              }}
            >
              {association.emoji}
            </div>
            <div>
              {renderHighlightedWord(
                association.word,
                feedback.targetLetter,
                association.position,
              )}
            </div>
          </div>
        )}
      {feedback.variant === 'correct' && (
        <div data-testid="iskierki-burst" aria-hidden="true" style={{ fontSize: 48 }}>
          ✨ ✨ ✨
        </div>
      )}
    </div>
  )
}
