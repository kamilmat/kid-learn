import { useEffect, useMemo, type ReactNode } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { ConcreteIcons } from '../representations/ConcreteIcons'
import { DigitTile } from '../representations/DigitTile'
import { pickIconSet } from '../../data/concreteSets'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

const DROP_TARGET_ID = 'answer-target'
const GROUP_COLORS = ['#fee2e2', '#dbeafe', '#dcfce7', '#fef3c7', '#f3e8ff']

export function EqualGroupsExercise({ audioBus, payload, onAnswer }: Props) {
  const n = clamp(payload.args[0] ?? 2, 1, 5)
  const m = clamp(payload.args[1] ?? 2, 1, 6)
  const total = n * m
  const iconSet = useMemo(() => pickIconSet(n * 10 + m), [n, m])

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-howmany-total')
  }, [audioBus])

  const choices = useMemo(() => buildChoices(total, 1, 30), [total])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === total ? 'correct' : 'wrong')
  }

  const additionExpr = Array.from({ length: n }, () => String(m)).join(' + ')

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-equal-groups"
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
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {Array.from({ length: n }).map((_, idx) => (
            <ConcreteIcons
              key={idx}
              count={m}
              iconSet={iconSet}
              iconSize={44}
              layout="wrap"
              groupColor={GROUP_COLORS[idx % GROUP_COLORS.length] ?? '#fee2e2'}
            />
          ))}
        </div>

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
            {additionExpr} =
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
