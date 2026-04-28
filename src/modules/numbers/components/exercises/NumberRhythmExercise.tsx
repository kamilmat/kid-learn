import { useEffect, useMemo, type ReactNode } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { DotPattern } from '../representations/DotPattern'
import { DigitTile } from '../representations/DigitTile'
import { colors, radii } from '@/app/theme'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

const DROP_TARGET_ID = 'rhythm-target'

export function NumberRhythmExercise({ audioBus, payload, onAnswer }: Props) {
  const pattern = payload.args.length > 0 ? payload.args : [1, 2]
  const expectedNext = pattern[0] ?? 1

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-whats-next')
  }, [audioBus])

  // Sekwencja: pattern × 2 + slot na pytanie
  const sequence = useMemo(() => [...pattern, ...pattern], [pattern])
  const choices = useMemo(() => buildChoices(expectedNext, 1, 6), [expectedNext])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === expectedNext ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-number-rhythm"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: 24,
          gap: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {sequence.map((n, idx) => (
            <RhythmStep key={idx} count={n} />
          ))}
          <DropTarget>
            <span style={{ fontSize: 64, opacity: 0.3, fontFamily: 'var(--font-block)' }}>?</span>
          </DropTarget>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {choices.map((d) => (
            <DigitTile key={d} variant="drag" digit={d} dragId={`digit-${d}`} size="md" />
          ))}
        </div>
      </div>
    </DndContext>
  )
}

function RhythmStep({ count }: { count: number }) {
  return (
    <div
      data-testid="rhythm-step"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 110,
        height: 110,
        background: '#fff',
        border: `3px solid ${colors.text}22`,
        borderRadius: radii.kid,
      }}
    >
      <DotPattern count={count} pattern="dice" size={96} />
    </div>
  )
}

function DropTarget({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP_TARGET_ID })
  return (
    <div
      ref={setNodeRef}
      data-testid="drop-target"
      style={{
        width: 110,
        height: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `4px dashed ${isOver ? '#16a34a' : '#cbd5e1'}`,
        borderRadius: radii.kid,
        background: isOver ? '#dcfce7' : '#fff',
        transition: 'background 120ms',
      }}
    >
      {children}
    </div>
  )
}

function buildChoices(correct: number, min: number, max: number): number[] {
  const pool: number[] = []
  for (let n = min; n <= max; n++) if (n !== correct) pool.push(n)
  const distractors = pool.sort(() => Math.random() - 0.5).slice(0, 3)
  return [correct, ...distractors].sort(() => Math.random() - 0.5)
}
