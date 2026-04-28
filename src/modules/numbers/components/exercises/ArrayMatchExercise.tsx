import { useEffect, useMemo, type ReactNode } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'

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
    audioBus.stop()
    void audioBus.play('ask-howmany-total')
  }, [audioBus])

  const choices = useMemo(() => buildChoices(total, 1, 36), [total])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    // TODO commutativity bonus question — v2
    onAnswer(dropped === total ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
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
          <DropTarget>
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

function DropTarget({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP_TARGET_ID })
  return (
    <div
      ref={setNodeRef}
      data-testid="drop-target"
      style={{
        minWidth: 140,
        minHeight: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `4px dashed ${isOver ? '#16a34a' : '#cbd5e1'}`,
        borderRadius: 16,
        background: isOver ? '#dcfce7' : '#fff',
        transition: 'background 120ms',
      }}
    >
      {children}
    </div>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function buildChoices(correct: number, min: number, max: number): number[] {
  const candidates = [-3, -2, -1, 1, 2, 3]
    .map((d) => correct + d)
    .filter((v) => v >= min && v <= max && v !== correct)
  const distractors = candidates.sort(() => Math.random() - 0.5).slice(0, 3)
  return [correct, ...distractors].sort(() => Math.random() - 0.5)
}
