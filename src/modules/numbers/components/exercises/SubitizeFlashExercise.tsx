import { useEffect, useMemo, useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { DotPattern } from '../representations/DotPattern'
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

const FLASH_MS = 2000
const DROP_TARGET_ID = 'subitize-target'

export function SubitizeFlashExercise({ audioBus, payload, promptKeys, onAnswer }: Props) {
  const correct = clamp(payload.args[0] ?? 1, 1, 6)
  const [phase, setPhase] = useState<'flash' | 'answer'>('flash')

  useEffect(() => {
    for (const key of promptKeys) void audioBus.play(key)
    const t = setTimeout(() => setPhase('answer'), FLASH_MS)
    return () => clearTimeout(t)
  }, [audioBus, promptKeys])

  const choices = useMemo(() => buildChoices(correct, { min: 1, max: 6 }), [correct])

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === correct ? 'correct' : 'wrong')
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
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
        <DropTarget droppableId={DROP_TARGET_ID} minSize={240}>
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
