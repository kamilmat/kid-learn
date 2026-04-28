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

export function SkipCountChase({ audioBus, payload, onAnswer }: Props) {
  const step = clamp(payload.args[0] ?? 2, 1, 10)
  const currentIdx = clamp(payload.args[1] ?? 1, 0, 20)
  const nextValue = clamp(payload.args[2] ?? step * (currentIdx + 1), 1, 100)

  useEffect(() => {
    audioBus.stop()
    const audioKey =
      step === 5
        ? 'ask-skip-count-5'
        : step === 10
          ? 'ask-skip-count-10'
          : 'ask-skip-count-2'
    void audioBus.play(audioKey)
  }, [audioBus, step])

  const sequence = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i <= currentIdx; i++) arr.push(step * (i + 1))
    return arr
  }, [step, currentIdx])

  const choices = useMemo(
    () => buildChoices(nextValue, step, 1, 100),
    [nextValue, step],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === nextValue ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-skip-count"
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
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {sequence.map((value, idx) => (
            <NumberCell key={idx}>{value}</NumberCell>
          ))}
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

function NumberCell({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="skip-count-cell"
      style={{
        minWidth: 96,
        minHeight: 96,
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

function buildChoices(correct: number, step: number, min: number, max: number): number[] {
  const offsets = [-step, step, -1, 1, -2, 2]
  const candidates = offsets
    .map((d) => correct + d)
    .filter((v) => v >= min && v <= max && v !== correct)
  const unique = Array.from(new Set(candidates))
  const distractors = unique.sort(() => Math.random() - 0.5).slice(0, 3)
  return [correct, ...distractors].sort(() => Math.random() - 0.5)
}
