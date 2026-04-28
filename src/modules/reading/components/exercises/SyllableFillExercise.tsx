// SyllableFillExercise — ćwiczenie Pochodnia: uzupełnij brakującą sylabę.
// Phase 6.3: wyświetla słowo z luką, 4 opcje sylab poniżej.
//
// Gap rendering:
//   missingPosition='first'  → [GAP, ...visibleSyllables]
//   missingPosition='middle' → [visibleSyllables[0], GAP, ...visibleSyllables.slice(1)]
//   missingPosition='last'   → [...visibleSyllables, GAP]

import { useTapHandler } from '@/shared/ui/useTapHandler'
import { SyllableTile } from '../SyllableTile'
import type { SyllableFillVariant } from '../../types'

export type SyllableFillExerciseProps = {
  targetWord: string
  visibleSyllables: string[]
  missingPosition: SyllableFillVariant
  missingSyllable: string
  choices: string[]
  onAnswer: (syllable: string) => void
  onDontKnow: () => void
  onAudioRepeat: () => void
}

// Buduje tablicę wyświetlanych sylab, gdzie null = luka
function buildDisplaySyllables(
  visibleSyllables: string[],
  missingPosition: SyllableFillVariant,
): (string | null)[] {
  switch (missingPosition) {
    case 'first':
      return [null, ...visibleSyllables]
    case 'middle':
      return [visibleSyllables[0] ?? null, null, ...visibleSyllables.slice(1)]
    case 'last':
      return [...visibleSyllables, null]
  }
}

const audioBtnStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: '50%',
  background: '#6366f1',
  color: 'white',
  fontSize: 36,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

const dkBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 16,
  background: '#fef3c7',
  border: '2px solid #f59e0b',
  fontSize: 24,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

const syllableBoxStyle: React.CSSProperties = {
  minWidth: 80,
  minHeight: 60,
  border: '3px solid #d1d5db',
  borderRadius: 12,
  background: '#fef9f2',
  fontFamily: 'var(--font-block)',
  fontSize: 28,
  fontWeight: 700,
  color: '#2d2d33',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 12px',
  letterSpacing: '0.05em',
}

const gapSlotStyle: React.CSSProperties = {
  minWidth: 80,
  minHeight: 60,
  border: '3px dashed #9ca3af',
  borderRadius: 12,
  background: 'rgba(254, 249, 242, 0.6)',
  fontFamily: 'var(--font-block)',
  fontSize: 28,
  fontWeight: 700,
  color: '#9ca3af',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 12px',
}

export function SyllableFillExercise({
  visibleSyllables,
  missingPosition,
  choices,
  onAnswer,
  onDontKnow,
  onAudioRepeat,
}: SyllableFillExerciseProps) {
  const audioHandlers = useTapHandler({ onTap: onAudioRepeat })
  const dkHandlers = useTapHandler({ onTap: onDontKnow })

  const displaySyllables = buildDisplaySyllables(visibleSyllables, missingPosition)

  return (
    <div
      data-testid="syllable-fill-exercise"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
      }}
    >
      <button
        type="button"
        aria-label="Powtórz audio"
        style={audioBtnStyle}
        {...audioHandlers}
      >
        🔊
      </button>

      {/* Wiersz sylab słowa z luką */}
      <div
        data-testid="word-display"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {displaySyllables.map((syl, i) =>
          syl === null ? (
            <div
              key={`gap-${i}`}
              data-testid="gap-slot"
              style={gapSlotStyle}
              aria-label="brakująca sylaba"
            >
              ?
            </div>
          ) : (
            <div key={`syl-${i}-${syl}`} style={syllableBoxStyle}>
              {syl}
            </div>
          ),
        )}
      </div>

      {/* Rząd opcji sylab do wyboru */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          maxWidth: 600,
        }}
      >
        {choices.map((syllable) => (
          <SyllableTile
            key={syllable}
            syllable={syllable}
            onTap={() => onAnswer(syllable)}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Nie wiem"
        style={dkBtnStyle}
        {...dkHandlers}
      >
        🤷
      </button>
    </div>
  )
}
