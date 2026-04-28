import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { DotPattern } from '../representations/DotPattern'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome } from '../../types'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[] }
  onAnswer: (outcome: AnswerOutcome) => void
}

const FLASH_MS = 2000
const DROP_TARGET_ID = 'subitize-target'

export function SubitizeFlashExercise({ audioBus, payload, onAnswer }: Props) {
  const correct = clamp(payload.args[0] ?? 1, 1, 6)
  const [phase, setPhase] = useState<'flash' | 'answer'>('flash')

  useEffect(() => {
    audioBus.stop()
    void audioBus.play('ask-howmany')
    const t = setTimeout(() => setPhase('answer'), FLASH_MS)
    return () => clearTimeout(t)
  }, [audioBus])

  const choices = useMemo(() => buildChoices(correct, 1, 6), [correct])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === correct ? 'correct' : 'wrong')
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-subitize-flash"
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
        <DropTarget>
          {phase === 'flash' ? (
            <DotPattern count={correct} pattern="dice" size={200} />
          ) : (
            <span style={{ fontSize: 96, opacity: 0.3, fontFamily: 'var(--font-block)' }}>?</span>
          )}
        </DropTarget>
        {phase === 'answer' && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {choices.map((d) => (
              <DigitTile key={d} variant="drag" digit={d} dragId={`digit-${d}`} size="md" />
            ))}
          </div>
        )}
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
        minWidth: 240,
        minHeight: 240,
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
