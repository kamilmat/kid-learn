import { useEffect, useMemo, type ReactNode } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'
import { buildChoices } from '../../utils/buildChoices'
import { DropTarget } from './shared/DropTarget'
import { clamp } from '../../utils/clamp'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  promptKeys: string[]
  onAnswer: (outcome: AnswerOutcome) => void
}

const DROP_TARGET_ID = 'answer-target'

export function SkipCountChase({ audioBus, payload, promptKeys, onAnswer }: Props) {
  const step = clamp(payload.args[0] ?? 2, 1, 10)
  const currentIdx = clamp(payload.args[1] ?? 1, 0, 20)
  const nextValue = clamp(payload.args[2] ?? step * (currentIdx + 1), 1, 100)

  useEffect(() => {
    for (const key of promptKeys) void audioBus.play(key)
  }, [audioBus, promptKeys])

  const sequence = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i <= currentIdx; i++) arr.push(step * (i + 1))
    return arr
  }, [step, currentIdx])

  const choices = useMemo(
    () => buildChoices(nextValue, {
      min: 1,
      max: 100,
      offsets: [-step, step, -1, 1, -2, 2],
    }),
    [nextValue, step],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === nextValue ? 'correct' : 'wrong')
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
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
