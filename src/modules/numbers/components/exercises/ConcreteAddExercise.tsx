import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { ConcreteIcons } from '../representations/ConcreteIcons'
import { DigitTile } from '../representations/DigitTile'
import { pickIconSet } from '../../data/concreteSets'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

const SECOND_GROUP_DELAY_MS = 1500
const DROP_TARGET_ID = 'concrete-add-target'

export function ConcreteAddExercise({ audioBus, payload, onAnswer }: Props) {
  const a = clamp(payload.args[0] ?? 1, 0, 10)
  const b = clamp(payload.args[1] ?? 1, 0, 10)
  const sum = a + b
  const iconSet = useMemo(() => pickIconSet(a * 10 + b), [a, b])
  const [showSecond, setShowSecond] = useState(false)

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-howmany-total')
    const t = setTimeout(() => setShowSecond(true), SECOND_GROUP_DELAY_MS)
    return () => clearTimeout(t)
  }, [audioBus])

  const choices = useMemo(() => buildChoices(sum, 1, 10), [sum])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === sum ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
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

function DropTarget({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP_TARGET_ID })
  return (
    <div
      ref={setNodeRef}
      data-testid="drop-target"
      style={{
        minWidth: 180,
        minHeight: 180,
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
  const pool: number[] = []
  for (let n = min; n <= max; n++) if (n !== correct) pool.push(n)
  const distractors = pool.sort(() => Math.random() - 0.5).slice(0, 3)
  return [correct, ...distractors].sort(() => Math.random() - 0.5)
}
