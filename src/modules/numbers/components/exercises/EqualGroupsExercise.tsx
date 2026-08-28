import { useEffect, useMemo } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { colors } from '@/app/theme'
import { ConcreteIcons } from '../representations/ConcreteIcons'
import { DigitTile } from '../representations/DigitTile'
import { pickIconSet } from '../../data/concreteSets'
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
const GROUP_COLORS = ['#fee2e2', '#dbeafe', '#dcfce7', '#fef3c7', '#f3e8ff']

export function EqualGroupsExercise({ audioBus, payload, onAnswer }: Props) {
  const n = clamp(payload.args[0] ?? 2, 1, 5)
  const m = clamp(payload.args[1] ?? 2, 1, 6)
  const total = n * m
  const iconSet = useMemo(() => pickIconSet(n * 10 + m), [n, m])

  useEffect(() => {
    void audioBus.play('ask-howmany-total')
  }, [audioBus])

  const choices = useMemo(
    () =>
      buildChoices(total, { min: 1, max: 30, offsets: NEAR_MISS_OFFSETS }),
    [total],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === total ? 'correct' : 'wrong')
  }

  const additionExpr = Array.from({ length: n }, () => String(m)).join(' + ')

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
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
