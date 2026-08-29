import { useEffect, useMemo, type ReactNode } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { TenFrame } from '../representations/TenFrame'
import { DigitTile } from '../representations/DigitTile'
import { colors } from '@/app/theme'
import type { AnswerOutcome } from '../../types'
import { buildChoices } from '../../utils/buildChoices'
import { DropTarget } from './shared/DropTarget'
import { clamp } from '../../utils/clamp'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[]; op?: '+' | '-' }
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  /** Faza drugiej próby: dokładnie te dwie wartości zamiast dystraktorów. */
  restrictChoicesTo?: number[]
}

const DROP_TARGET_ID = 'addsub-target'

export function ConcreteAddSubtract({ audioBus, payload, onAnswer, restrictChoicesTo }: Props) {
  const a = clamp(payload.args[0] ?? 0, 0, 20)
  const b = clamp(payload.args[1] ?? 0, 0, 20)
  const op: '+' | '-' = payload.op ?? '+'
  const result = op === '+' ? a + b : a - b

  useEffect(() => {
    void audioBus.play(op === '+' ? 'ask-howmany-total' : 'ask-howmany-left')
  }, [audioBus, op])

  const choices = useMemo(
    () => buildChoices(result, { restrictChoicesTo, min: 0, max: Math.max(op === '+' ? a + b : a, result + 2) }),
    [result, a, b, op, restrictChoicesTo],
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
        data-testid="exercise-concrete-addsub"
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
          <TenFrame count={a} size={36} frameGap={12} />
          <Symbol>{op === '+' ? '+' : '−'}</Symbol>
          <div style={{ position: 'relative' }}>
            <TenFrame
              count={b}
              size={36}
              frameGap={12}
              dotColor={op === '-' ? '#94a3b8' : '#dc2626'}
            />
            {op === '-' && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  fontSize: 64,
                  color: '#dc2626',
                  opacity: 0.85,
                  fontWeight: 700,
                }}
              >
                ✕
              </div>
            )}
          </div>
          <Symbol>=</Symbol>
          <DropTarget droppableId={DROP_TARGET_ID} minSize={140}>
            <span style={{ fontSize: 80, opacity: 0.3, fontFamily: 'var(--font-block)' }}>?</span>
          </DropTarget>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {choices.map((d) => (
            <DigitTile key={d} variant="drag" digit={d} dragId={`addsub-digit-${d}`} size="md" />
          ))}
        </div>
      </div>
    </DndContext>
  )
}

function Symbol({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 64,
        fontFamily: 'var(--font-block)',
        fontWeight: 700,
        color: colors.text,
      }}
    >
      {children}
    </span>
  )
}
