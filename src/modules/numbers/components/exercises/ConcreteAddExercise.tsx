import { useEffect, useMemo, useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { ConcreteIcons } from '../representations/ConcreteIcons'
import { DigitTile } from '../representations/DigitTile'
import { pickIconSet } from '../../data/concreteSets'
import type { AnswerOutcome } from '../../types'
import { buildChoices } from '../../utils/buildChoices'
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

const SECOND_GROUP_DELAY_MS = 1500
const DROP_TARGET_ID = 'concrete-add-target'

export function ConcreteAddExercise({ audioBus, payload, promptKeys, onAnswer, restrictChoicesTo }: Props) {
  const a = clamp(payload.args[0] ?? 1, 0, 10)
  const b = clamp(payload.args[1] ?? 1, 0, 10)
  const sum = a + b
  const iconSet = useMemo(() => pickIconSet(a * 10 + b), [a, b])
  const [showSecond, setShowSecond] = useState(false)

  useEffect(() => {
    for (const key of promptKeys) void audioBus.play(key)
    const t = setTimeout(() => setShowSecond(true), SECOND_GROUP_DELAY_MS)
    return () => clearTimeout(t)
  }, [audioBus, promptKeys])

  const choices = useMemo(() => buildChoices(sum, { restrictChoicesTo, min: 1, max: 10 }), [sum, restrictChoicesTo])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === sum ? 'correct' : 'wrong', dropped)
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-concrete-add"
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
            gap: 24,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <ConcreteIcons count={a} iconSet={iconSet} iconSize={48} layout="wrap" />
          <div
            data-testid="concrete-add-second-group"
            style={{
              opacity: showSecond ? 1 : 0,
              transform: showSecond ? 'translateX(0)' : 'translateX(-12px)',
              transition: 'opacity 320ms ease-out, transform 320ms ease-out',
            }}
          >
            <ConcreteIcons count={b} iconSet={iconSet} iconSize={48} layout="wrap" />
          </div>
          <DropTarget droppableId={DROP_TARGET_ID} minSize={180}>
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
