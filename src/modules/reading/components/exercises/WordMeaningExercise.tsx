// WordMeaningExercise — sprawdzian rozumienia: obrazek → słowo.
// Dziecko widzi emoji desygnatu i wskazuje słowo, które je nazywa.
// Brak `box` na kafelkach: pełny kolor sylab wspiera dekodowanie, bo tu
// nie ma podpowiedzi audio z targetem — prompt mówi tylko „popatrz na obrazek".

import { useTapHandler } from '@/shared/ui/useTapHandler'
import { WordTile } from '../WordTile'
import { ALL_WORDS } from '../../data/words'

export type WordMeaningExerciseProps = {
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
  minWidth: 96,
  minHeight: 60,
  padding: '12px 24px',
  borderRadius: 16,
  background: '#fef3c7',
  border: '2px solid #f59e0b',
  fontSize: 24,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

export function WordMeaningExercise({
  targetWord,
  choices,
  onAnswer,
  onDontKnow,
  onAudioRepeat,
}: WordMeaningExerciseProps) {
  const audioHandlers = useTapHandler({ onTap: onAudioRepeat })
  const dkHandlers = useTapHandler({ onTap: onDontKnow })

  const emoji = ALL_WORDS.find((w) => w.text === targetWord)?.albumEmoji ?? '❓'

  return (
    <div
      data-testid="word-meaning-exercise"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 16,
      }}
    >
      <div
        data-testid="word-meaning-emoji"
        aria-hidden="true"
        style={{ fontSize: 200, lineHeight: 1, flexShrink: 0 }}
      >
        {emoji}
      </div>

      {/* 2×2 grid słów */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        {choices.map((word, i) => {
          const syllables = ALL_WORDS.find((w) => w.text === word)?.syllables
          return (
            <WordTile
              key={`${word}-${i}`}
              word={word}
              {...(syllables ? { syllables } : {})}
              onTap={() => onAnswer(word)}
            />
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <button type="button" aria-label="Nie wiem" style={dkBtnStyle} {...dkHandlers}>
          🤷
        </button>
        <button type="button" aria-label="Powtórz audio" style={audioBtnStyle} {...audioHandlers}>
          🔊
        </button>
      </div>
    </div>
  )
}
