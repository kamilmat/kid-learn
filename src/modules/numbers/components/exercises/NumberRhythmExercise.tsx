import { useEffect, useMemo } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { DotPattern } from '../representations/DotPattern'
import { DigitTile } from '../representations/DigitTile'
import { colors, radii } from '@/app/theme'
import type { AnswerOutcome } from '../../types'
import { buildChoices } from '../../utils/buildChoices'
import { DropTarget } from './shared/DropTarget'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  promptKeys: string[]
  onAnswer: (outcome: AnswerOutcome) => void
}

const DROP_TARGET_ID = 'rhythm-target'

export function NumberRhythmExercise({ audioBus, payload, promptKeys, onAnswer }: Props) {
  const pattern = payload.args.length > 0 ? payload.args : [1, 2]
  const expectedNext = pattern[0] ?? 1

  useEffect(() => {
    for (const key of promptKeys) void audioBus.play(key)
  }, [audioBus, promptKeys])

  // Sekwencja: pattern × 2 + slot na pytanie
  const sequence = useMemo(() => [...pattern, ...pattern], [pattern])
  const choices = useMemo(() => buildChoices(expectedNext, { min: 1, max: 6 }), [expectedNext])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === expectedNext ? 'correct' : 'wrong')
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
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
          <DropTarget droppableId={DROP_TARGET_ID} fixedSize={110} borderRadius={radii.kid}>
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
