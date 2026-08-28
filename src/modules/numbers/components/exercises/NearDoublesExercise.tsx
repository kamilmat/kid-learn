import { useEffect, useMemo, type ReactNode } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { TenFrame } from '../representations/TenFrame'
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
const HIGHLIGHT_COLOR = '#16a34a'

export function NearDoublesExercise({ audioBus, payload, onAnswer }: Props) {
  const a = clamp(payload.args[0] ?? 1, 1, 9)
  // Wymuś b = a+1 (NearDoubles definicja)
  const b = clamp(payload.args[1] ?? a + 1, a + 1, 10)
  const correct = a + b

  useEffect(() => {
    void audioBus.play('ask-howmany-total')
  }, [audioBus])

  const choices = useMemo(
    () =>
      buildChoices(correct, { min: 1, max: 20, offsets: NEAR_MISS_OFFSETS }),
    [correct],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === correct ? 'correct' : 'wrong')
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-near-doubles"
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
          <TenFrame count={a} dotColor={DOT_COLOR} size={44} />
          <MathSymbol>+</MathSymbol>
          <TenFrame
            count={b}
            dotColor={DOT_COLOR}
            highlightColor={HIGHLIGHT_COLOR}
            highlightAfter={a}
            size={44}
          />
          <MathSymbol>=</MathSymbol>
          <DropTarget droppableId={DROP_TARGET_ID}>
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
