// QuizCard — pełny ekran pytania.
// Sekcja 6.3 spec: layout sesji (status bar pod KidNav, audio button, countdown,
// siatka 2x2, "Nie wiem" pod siatką).

import type { CSSProperties } from 'react'
import { colors, radii, tapTargets } from '@/app/theme'
import { IskraMascot, type IskraIntensity } from '@/shared/ui/IskraMascot'
import { LetterTile } from './LetterTile'
import type { LetterTileState } from './LetterTile'
import type { CaseMode, StyleMode } from '@/shared/settings/types'
import type { Question, Slot } from '@/modules/letters/types'

export type QuizCardProps = {
  question: Question
  caseMode: CaseMode
  styleMode: StyleMode
  questionNumber: number
  totalQuestions: number
  iskierki: number
  /** Liczba błędnych odpowiedzi — pokazywana w status barze obok ikony ❌. */
  wrongCount: number
  /** Liczba "Nie wiem" + timeout — pokazywana w status barze obok ikony 🤷. */
  dontKnowCount: number
  /** Intensywność małej Iskry w status barze (z useSession, wyliczona ze streak'a). */
  mascotIntensity: IskraIntensity
  /** Litera kliknięta przy wrong — używana do mini-mascotki nad kafelkiem. */
  lastWrongSlot?: Slot | null
  /** Ms remaining; null = ukryj pasek. */
  countdownMs: number | null
  countdownTotalMs: number | null
  /** True gdy rendering w stanie 'feedback' lub 'paused' — blokuj interakcję. */
  interactive: boolean
  /** Dla pokazania selected/correct/wrong overlay'a — patrz sekcja 6.4. */
  tileState?: Partial<Record<Slot, LetterTileState>>
  onTileClick: (letter: string, slot: Slot) => void
  onPlayAudio: () => void
  onDontKnow: () => void
  onPause: () => void
}

const PROGRESS_DOT_SIZE = 14

function progressDotStyle(filled: boolean): CSSProperties {
  return {
    width: PROGRESS_DOT_SIZE,
    height: PROGRESS_DOT_SIZE,
    borderRadius: PROGRESS_DOT_SIZE / 2,
    background: filled ? colors.accentBlue : '#d8d8de',
    display: 'inline-block',
  }
}

// Łagodna paleta — usunięta intensywna czerwień. Kontrast ≥3.0 do tła #eeeef2.
function countdownColor(ratio: number): string {
  if (ratio > 0.4) return colors.accentGreen // zielony
  if (ratio > 0.15) return '#e6c554' // ciepły żółty
  return '#e89270' // miękki pomarańczowy
}

export function gridLayoutFor(count: number): {
  gridTemplateColumns: string
  gridTemplateRows: string
} {
  switch (count) {
    case 3:
      return {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr',
      }
    case 5:
      // 2 rzędy: pierwszy 3, drugi 2 (auto-fit minmax fallback)
      return {
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridTemplateRows: '1fr 1fr',
      }
    case 6:
      return {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr 1fr',
      }
    case 8:
      // 4 kolumny × 2 rzędy — zachowuje proporcje kafelka, mieści się na iPad portrait
      return {
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '1fr 1fr',
      }
    case 10:
      // 5 kolumn × 2 rzędy — pełen alfabet (Pochodnia)
      return {
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: '1fr 1fr',
      }
    case 4:
    default:
      return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
      }
  }
}

export function QuizCard({
  question,
  caseMode,
  styleMode,
  questionNumber,
  totalQuestions,
  iskierki,
  wrongCount,
  dontKnowCount,
  mascotIntensity,
  lastWrongSlot,
  countdownMs,
  countdownTotalMs,
  interactive,
  tileState,
  onTileClick,
  onPlayAudio,
  onDontKnow,
  onPause,
}: QuizCardProps) {
  const ratio =
    countdownMs !== null && countdownTotalMs !== null && countdownTotalMs > 0
      ? Math.max(0, Math.min(1, countdownMs / countdownTotalMs))
      : null

  return (
    <div
      data-testid="quiz-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        maxWidth: 900,
        margin: '0 auto',
        flex: 1,
        minHeight: 0,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Pasek statusu sesji — pod KidNav */}
      <div
        data-testid="session-status-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#ffffff',
          borderRadius: radii.kid,
          border: `1px solid #e2e2e8`,
        }}
      >
        <div
          data-testid="status-counters"
          style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18 }}
        >
          <div
            data-testid="iskierki-counter"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <div data-testid="status-bar-mascot" style={{ width: 44, height: 44 }}>
              <IskraMascot size={44} state="idle" intensity={mascotIntensity} />
            </div>
            <span aria-label={`Iskierki: ${iskierki}`} style={{ fontWeight: 700, color: colors.accentGreen, minWidth: 18 }}>
              {iskierki}
            </span>
          </div>
          <div
            data-testid="wrong-counter"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span aria-hidden="true" style={{ fontSize: 22 }}>❌</span>
            <span aria-label={`Pomyłki: ${wrongCount}`} style={{ fontWeight: 700, color: colors.accentOrange, minWidth: 18 }}>
              {wrongCount}
            </span>
          </div>
          <div
            data-testid="dontknow-counter"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span aria-hidden="true" style={{ fontSize: 22 }}>🤷</span>
            <span aria-label={`Nie wiem: ${dontKnowCount}`} style={{ fontWeight: 700, color: '#7a7a82', minWidth: 18 }}>
              {dontKnowCount}
            </span>
          </div>
        </div>
        <div data-testid="progress-dots" style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <span key={i} style={progressDotStyle(i < questionNumber)} />
          ))}
        </div>
        <button
          type="button"
          aria-label="Pauza"
          data-testid="pause-button"
          onClick={onPause}
          disabled={!interactive}
          style={{
            width: tapTargets.minSize,
            height: tapTargets.minSize,
            borderRadius: radii.kid,
            background: '#ffffff',
            border: `2px solid ${colors.accentBlue}`,
            fontSize: 24,
            cursor: interactive ? 'pointer' : 'default',
          }}
        >
          <span aria-hidden="true">⏸</span>
        </button>
      </div>

      {/* Audio button */}
      <button
        type="button"
        data-testid="audio-button"
        aria-label="Odtwórz literę"
        onClick={onPlayAudio}
        style={{
          width: '100%',
          height: 72,
          flexShrink: 0,
          borderRadius: radii.kid,
          background: colors.accentBlue,
          color: '#ffffff',
          fontSize: 40,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">🔊</span>
      </button>

      {/* Pasek odliczania */}
      {ratio !== null && (
        <div
          data-testid="countdown-bar"
          aria-label="Pozostały czas"
          style={{
            width: '100%',
            height: 8,
            background: '#eeeef2',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="countdown-bar-fill"
            style={{
              width: `${ratio * 100}%`,
              height: '100%',
              background: countdownColor(ratio),
              transition: 'width 0.1s linear, background 0.3s linear',
            }}
          />
        </div>
      )}

      {/* Siatka kafelków — adaptacyjna */}
      <div
        data-testid="tile-grid"
        style={{
          display: 'grid',
          ...gridLayoutFor(question.tiles.length),
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {question.tiles.map((letter, idx) => {
          const slot = idx as Slot
          const s: LetterTileState = tileState?.[slot] ?? 'idle'
          // Dla 5 kafelków: pierwsze 3 na górze (2/6 col-span), 2 na dole (3/6 col-span).
          const tileStyle: CSSProperties | undefined =
            question.tiles.length === 5
              ? idx < 3
                ? { gridColumn: 'span 2' }
                : { gridColumn: 'span 3' }
              : undefined
          return (
            <div
              key={`${question.index}-${slot}`}
              style={{ ...tileStyle, display: 'flex', minHeight: 0, position: 'relative' }}
            >
              {lastWrongSlot === slot && (
                <div
                  data-testid={`mini-mascot-wrong-${slot}`}
                  style={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <IskraMascot size={64} state="surprise" intensity="spark" />
                </div>
              )}
              <LetterTile
                letter={letter}
                caseMode={caseMode}
                styleMode={styleMode}
                chosenCase={question.chosenCase}
                state={s}
                onClick={() => onTileClick(letter, slot)}
                disabled={!interactive}
                testId={`tile-${slot}`}
              />
            </div>
          )
        })}
      </div>

      {/* Nie wiem — kid-only icon, bez tekstu (dziecko nie czyta) */}
      <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <button
          type="button"
          data-testid="dont-know-button"
          aria-label="Nie wiem"
          onClick={onDontKnow}
          disabled={!interactive}
          style={{
            width: 96,
            height: 96,
            borderRadius: radii.kid,
            background: '#ffffff',
            border: `3px solid ${colors.accentOrange}`,
            fontSize: 56,
            cursor: interactive ? 'pointer' : 'default',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <span aria-hidden="true">🤷</span>
        </button>
      </div>
    </div>
  )
}
