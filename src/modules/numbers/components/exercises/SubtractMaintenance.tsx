import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  promptKeys: string[]
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  /** Faza drugiej próby: dokładnie te dwie wartości zamiast dystraktorów. */
  restrictChoicesTo?: number[]
}

const DROP_TARGET_ID = 'answer-target'
const DOT_COLOR = '#dc2626'
const REMOVE_DELAY_MS = 1500
const REMOVE_TRANSITION_MS = 600

export function SubtractMaintenance({ audioBus, payload, promptKeys, onAnswer, restrictChoicesTo }: Props) {
  const a = clamp(payload.args[0] ?? 5, 0, 20)
  const b = clamp(payload.args[1] ?? 1, 0, a)
  const result = a - b
  const [removed, setRemoved] = useState(false)

  useEffect(() => {
    for (const key of promptKeys) void audioBus.play(key)
    const t = setTimeout(() => setRemoved(true), REMOVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [audioBus, promptKeys])

  const displayCount = removed ? result : a
  const highlightAfter = removed ? undefined : result

  const choices = useMemo(
    () =>
      buildChoices(result, { restrictChoicesTo, min: 0, max: 20, offsets: NEAR_MISS_OFFSETS }),
    [result, restrictChoicesTo],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === result ? 'correct' : 'wrong', dropped)
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
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
