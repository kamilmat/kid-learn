import { useEffect, useMemo, type ReactNode } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { TenFrame } from '../representations/TenFrame'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

const DROP_TARGET_ID = 'answer-target'
const DOT_COLOR = '#dc2626'

export function DoublesExercise({ audioBus, payload, onAnswer }: Props) {
  const n = clamp(payload.args[0] ?? 1, 1, 10)
  const correct = n * 2

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-howmany-total')
  }, [audioBus])

  const choices = useMemo(() => buildChoices(correct, 1, 20), [correct])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === correct ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-doubles"
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
            gap: 20,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <TenFrame count={n} dotColor={DOT_COLOR} size={44} />
          <MathSymbol>+</MathSymbol>
          <TenFrame count={n} dotColor={DOT_COLOR} size={44} />
          <MathSymbol>=</MathSymbol>
          <DropTarget>
            <span style={{ fontSize: 96, opacity: 0.3, fontFamily: 'var(--font-block)' }}>?</span>
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

function MathSymbol({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-block)',
        fontSize: 80,
        fontWeight: 700,
        color: colors.text,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

function DropTarget({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP_TARGET_ID })
  return (
    <div
      ref={setNodeRef}
      data-testid="drop-target"
      style={{
        minWidth: 160,
        minHeight: 160,
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
