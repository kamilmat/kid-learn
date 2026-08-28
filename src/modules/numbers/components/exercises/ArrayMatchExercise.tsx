import { useEffect, useMemo } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'
import { buildChoices, NEAR_MISS_OFFSETS } from '../../utils/buildChoices'
import { DropTarget } from './shared/DropTarget'
import { clamp } from '../../utils/clamp'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

const DROP_TARGET_ID = 'answer-target'
const DOT_COLOR = '#dc2626'

export function ArrayMatchExercise({ audioBus, payload, onAnswer }: Props) {
  const rows = clamp(payload.args[0] ?? 2, 1, 6)
  const cols = clamp(payload.args[1] ?? 2, 1, 6)
  const total = rows * cols

  useEffect(() => {
    void audioBus.play('ask-howmany-total')
  }, [audioBus])

  const choices = useMemo(
    () =>
      buildChoices(total, { min: 1, max: 36, offsets: NEAR_MISS_OFFSETS }),
    [total],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    // TODO commutativity bonus question — v2
    onAnswer(dropped === total ? 'correct' : 'wrong')
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-array-match"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: 24,
          gap: 20,
        }}
      >
        <ArrayGrid rows={rows} cols={cols} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-block)',
              fontSize: 56,
              fontWeight: 700,
              color: colors.text,
              lineHeight: 1,
            }}
          >
            {rows} × {cols} =
          </span>
          <DropTarget droppableId={DROP_TARGET_ID} minSize={140}>
            <span style={{ fontSize: 80, opacity: 0.3, fontFamily: 'var(--font-block)' }}>?</span>
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

function ArrayGrid({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div
      data-testid="array-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 32px)`,
        gridTemplateRows: `repeat(${rows}, 32px)`,
        gap: 12,
        padding: 16,
        border: `3px solid ${colors.text}33`,
        borderRadius: 12,
        background: '#fff',
      }}
    >
      {Array.from({ length: rows * cols }).map((_, idx) => (
        <div
          key={idx}
          data-testid="array-dot"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: DOT_COLOR,
          }}
        />
      ))}
    </div>
  )
}
