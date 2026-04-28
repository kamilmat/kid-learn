import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
const REMOVE_DELAY_MS = 1500
const REMOVE_TRANSITION_MS = 600

export function SubtractMaintenance({ audioBus, payload, onAnswer }: Props) {
  const a = clamp(payload.args[0] ?? 5, 0, 20)
  const b = clamp(payload.args[1] ?? 1, 0, a)
  const result = a - b
  const [removed, setRemoved] = useState(false)

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-howmany-left')
    const t = setTimeout(() => setRemoved(true), REMOVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [audioBus])

  const displayCount = removed ? result : a
  const highlightAfter = removed ? undefined : result

  const choices = useMemo(() => buildChoices(result, 0, 20), [result])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === result ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-subtract-maintenance"
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
          <div
            data-testid="subtract-frame"
            style={{
              transition: `opacity ${REMOVE_TRANSITION_MS}ms ease-out`,
            }}
          >
            <TenFrame
              count={displayCount}
              dotColor={DOT_COLOR}
              size={44}
              highlightColor="#9ca3af"
              {...(highlightAfter !== undefined ? { highlightAfter } : {})}
            />
          </div>
          <MathSymbol>−</MathSymbol>
          <NumberCell>{b}</NumberCell>
          <MathSymbol>=</MathSymbol>
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

function NumberCell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minWidth: 80,
        minHeight: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `3px solid ${colors.text}33`,
        borderRadius: 12,
        background: '#fff',
        fontFamily: 'var(--font-block)',
        fontSize: 56,
        fontWeight: 700,
        color: colors.text,
        padding: '0 16px',
      }}
    >
      {children}
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
