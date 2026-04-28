// WordChoiceExercise — ćwiczenie Ognik: wybierz słowo z 4 opcji.
// Phase 6.2: identyczny wzorzec co SyllableMatchExercise, używa WordTile.

import { useTapHandler } from '@/shared/ui/useTapHandler'
import { WordTile } from '../WordTile'

export type WordChoiceExerciseProps = {
  targetWord: string
  choices: string[]
  onAnswer: (word: string) => void
  onDontKnow: () => void
  onAudioRepeat: () => void
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

export function WordChoiceExercise({
  choices,
  onAnswer,
  onDontKnow,
  onAudioRepeat,
}: WordChoiceExerciseProps) {
  const audioHandlers = useTapHandler({ onTap: onAudioRepeat })
  const dkHandlers = useTapHandler({ onTap: onDontKnow })

  return (
    <div
      data-testid="word-choice-exercise"
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

      {/* 2×2 grid słów */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        {choices.map((word, i) => (
          <WordTile
            key={`${word}-${i}`}
            word={word}
            onTap={() => onAnswer(word)}
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
