// ReverseQuizCard — ekran pytania odwrotnego „widzisz literę → wybierz dźwięk".
//
// Różnica wobec QuizCard: litera jest PODANA (wielka, u góry), a wybór dotyczy
// dźwięku. Dziecko odsłuchuje kandydatów (🔊) dowolną liczbę razy — dopiero
// osobny przycisk ✔ pod kafelkiem jest odpowiedzią. Rozdzielenie „słucham"
// od „wybieram" jest tu kluczowe: bez niego pierwszy odsłuch byłby odpowiedzią.

import type { CSSProperties } from 'react'
import { colors, radii, tapTargets } from '@/app/theme'
import { IskraMascot, type IskraIntensity } from '@/shared/ui/IskraMascot'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { toUpper } from '@/modules/letters/data/alphabet'
import type { LetterTileState } from './LetterTile'
import type { CaseMode, StyleMode } from '@/shared/settings/types'
import type { Question, Slot } from '@/modules/letters/types'

export type ReverseQuizCardProps = {
  question: Question
  caseMode: CaseMode
  styleMode: StyleMode
  questionNumber: number
  totalQuestions: number
  iskierki: number
  wrongCount: number
  dontKnowCount: number
  mascotIntensity: IskraIntensity
  interactive: boolean
  tileState?: Partial<Record<Slot, LetterTileState>>
  /** Odsłuch kandydata — NIE jest odpowiedzią. */
  onPlayCandidate: (letter: string) => void
  /** Zatwierdzenie kandydata (✔) — to jest odpowiedź. */
  onTileClick: (letter: string, slot: Slot) => void
  onDontKnow: () => void
  onPause: () => void
}

const CANDIDATE_SIZE = 120
const CONFIRM_SIZE = tapTargets.minSize
// Litera-cel wypełnia środek ekranu, ale w niskim viewporcie (iPad landscape,
// split view) 160px razem z paskiem statusu i rzędem kandydatów nie mieści się
// w flexboxie — stąd clamp do wysokości okna zamiast stałej wartości.
const TARGET_FONT_SIZE = 'min(160px, 18vh)'
// `oba-na-kafelku`: dwie formy jedna pod drugą muszą zmieścić się w tej samej
// przestrzeni co jedna — stąd osobny, mniejszy clamp.
const TARGET_FONT_SIZE_BOTH = 'min(104px, 12vh)'

function letterTextFor(
  letter: string,
  caseMode: CaseMode,
  chosenCase: 'upper' | 'lower',
): string {
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

function candidateStyle(state: LetterTileState): CSSProperties {
  switch (state) {
    case 'correct':
      return { background: '#f3fbef', border: `3px solid ${colors.accentGreen}` }
    case 'wrong':
      return { background: '#fff4ea', border: `3px solid ${colors.accentOrange}` }
    case 'highlighted-correct':
      return {
        background: '#f3fbef',
        border: `3px solid ${colors.accentGreen}`,
        boxShadow: `0 0 0 8px ${colors.accentGreen}66`,
      }
    case 'selected':
      return { background: '#ffffff', border: `3px solid ${colors.accentBlue}` }
    case 'idle':
      return { background: '#ffffff', border: '2px solid #e2e2e8' }
  }
}

function Candidate({
  letter,
  slot,
  state,
  interactive,
  onPlayCandidate,
  onTileClick,
}: {
  letter: string
  slot: Slot
  state: LetterTileState
  interactive: boolean
  onPlayCandidate: (letter: string) => void
  onTileClick: (letter: string, slot: Slot) => void
}) {
  const playTap = useTapHandler({
    onTap: () => onPlayCandidate(letter),
    disabled: !interactive,
  })
  const confirmTap = useTapHandler({
    onTap: () => onTileClick(letter, slot),
    disabled: !interactive,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        data-testid={`candidate-${slot}`}
        aria-label={`Posłuchaj dźwięku ${slot + 1}`}
        {...playTap}
        disabled={!interactive}
        style={{
          width: CANDIDATE_SIZE,
          height: CANDIDATE_SIZE,
          borderRadius: radii.kid,
          fontSize: 56,
          cursor: interactive ? 'pointer' : 'default',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          ...candidateStyle(state),
        }}
      >
        <span aria-hidden="true">🔊</span>
      </button>
      <button
        type="button"
        data-testid={`confirm-${slot}`}
        data-letter={letter}
        aria-label={`Wybierz dźwięk ${slot + 1}`}
        {...confirmTap}
        disabled={!interactive}
        style={{
          width: CONFIRM_SIZE,
          height: CONFIRM_SIZE,
          borderRadius: radii.kid,
          background: '#ffffff',
          border: `3px solid ${colors.accentGreen}`,
          fontSize: 30,
          cursor: interactive ? 'pointer' : 'default',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span aria-hidden="true">✔</span>
      </button>
    </div>
  )
}

export function ReverseQuizCard({
  question,
  caseMode,
  styleMode,
  questionNumber,
  totalQuestions,
  iskierki,
  wrongCount,
  dontKnowCount,
  mascotIntensity,
  interactive,
  tileState,
  onPlayCandidate,
  onTileClick,
  onDontKnow,
  onPause,
}: ReverseQuizCardProps) {
  const pauseTap = useTapHandler({ onTap: onPause, disabled: !interactive })
  const dontKnowTap = useTapHandler({ onTap: onDontKnow, disabled: !interactive })

  // `question.bothStyles` (= styleMode `oba-na-kafelku`) pokazuje literę-cel w
  // obu formach naraz, tak jak robi to LetterTile w wariancie podstawowym —
  // bez tego dziecko widziało tylko pisaną i traciło połowę ćwiczenia.
  const showHandwritten = styleMode === 'tylko-pisane' || question.bothStyles
  const showPrint = styleMode !== 'tylko-pisane'
  const fontSize = question.bothStyles ? TARGET_FONT_SIZE_BOTH : TARGET_FONT_SIZE
  const letterText = letterTextFor(question.targetLetter, caseMode, question.chosenCase)

  return (
    <div
      data-testid="reverse-quiz-card"
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
      <div
        data-testid="session-status-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#ffffff',
          borderRadius: radii.kid,
          border: '1px solid #e2e2e8',
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
            <span
              aria-label={`Iskierki: ${iskierki}`}
              style={{ fontWeight: 700, color: colors.accentGreen, minWidth: 18 }}
            >
              {iskierki}
            </span>
          </div>
          <div
            data-testid="wrong-counter"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span aria-hidden="true" style={{ fontSize: 22 }}>❌</span>
            <span
              aria-label={`Pomyłki: ${wrongCount}`}
              style={{ fontWeight: 700, color: colors.accentOrange, minWidth: 18 }}
            >
              {wrongCount}
            </span>
          </div>
          <div
            data-testid="dontknow-counter"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span aria-hidden="true" style={{ fontSize: 22 }}>🤷</span>
            <span
              aria-label={`Nie wiem: ${dontKnowCount}`}
              style={{ fontWeight: 700, color: '#7a7a82', minWidth: 18 }}
            >
              {dontKnowCount}
            </span>
          </div>
        </div>
        <div data-testid="progress-dots" style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: i < questionNumber ? colors.accentBlue : '#d8d8de',
                display: 'inline-block',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Pauza"
          data-testid="pause-button"
          {...pauseTap}
          disabled={!interactive}
          style={{
            width: tapTargets.minSize,
            height: tapTargets.minSize,
            borderRadius: radii.kid,
            background: '#ffffff',
            border: `2px solid ${colors.accentBlue}`,
            fontSize: 24,
            cursor: interactive ? 'pointer' : 'default',
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span aria-hidden="true">⏸</span>
        </button>
      </div>

      {/* Litera jest tu pytaniem, nie odpowiedzią — stąd rozmiar jak w feedbacku. */}
      <div
        data-testid="reverse-target-letter"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: caseMode === 'para' ? '0.18em' : undefined,
          background: '#ffffff',
          border: '1px solid #e2e2e8',
          borderRadius: radii.kid,
        }}
      >
        {showPrint && (
          <span
            data-testid="reverse-target-print"
            style={{ fontSize, fontFamily: 'system-ui, sans-serif', fontStyle: 'normal' }}
          >
            {letterText}
          </span>
        )}
        {showHandwritten && (
          <span
            data-testid="reverse-target-handwritten"
            style={{ fontSize, fontFamily: 'var(--font-handwritten)', fontStyle: 'italic' }}
          >
            {letterText}
          </span>
        )}
      </div>

      <div
        data-testid="candidate-row"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          flexShrink: 0,
        }}
      >
        {question.tiles.map((letter, idx) => (
          <Candidate
            key={`${question.index}-${idx}`}
            letter={letter}
            slot={idx}
            state={tileState?.[idx] ?? 'idle'}
            interactive={interactive}
            onPlayCandidate={onPlayCandidate}
            onTileClick={onTileClick}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <button
          type="button"
          data-testid="dont-know-button"
          aria-label="Nie wiem"
          {...dontKnowTap}
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
            touchAction: 'manipulation',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span aria-hidden="true">🤷</span>
        </button>
      </div>
    </div>
  )
}
