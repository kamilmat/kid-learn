import { useEffect, useMemo } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
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
  /** Feedback po pomyłce: dołóż brakujące kropki, żeby dziecko ZOBACZYŁO ile. */
  revealValue?: number | null
}

const DROP_TARGET_ID = 'tenframe-fill-target'

export function TenFrameFill({
  audioBus,
  payload,
  promptKeys,
  onAnswer,
  restrictChoicesTo,
  revealValue = null,
}: Props) {
  const filled = clamp(payload.args[0] ?? 0, 0, 10)
  const missing = clamp(payload.args[1] ?? 10 - filled, 1, 10)

  useEffect(() => {
    for (const key of promptKeys) void audioBus.play(key)
  }, [audioBus, promptKeys])

  const choices = useMemo(
    () => buildChoices(missing, { restrictChoicesTo, min: 1, max: 10, offsets: NEAR_MISS_OFFSETS }),
    [missing, restrictChoicesTo],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === missing ? 'correct' : 'wrong', dropped)
  }

  return (
    <DndContext accessibility={SILENT_DND_ACCESSIBILITY} onDragEnd={handleDragEnd}>
      <div
        data-testid="exercise-ten-frame-fill"
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
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* fiveStructure wyłączone: dziecko DOKŁADA kropki, a drugi odcień
              czytałby się jako „te są już wypełnione". */}
          <TenFrame
            count={revealValue === null ? filled : Math.min(10, filled + revealValue)}
            size={48}
            fiveStructure={false}
            {...(revealValue === null
              ? {}
              : { highlightColor: '#16a34a', highlightAfter: filled })}
          />
          <DropTarget droppableId={DROP_TARGET_ID}>
            <span style={{ fontSize: 96, opacity: 0.3, fontFamily: 'var(--font-block)' }}>?</span>
          </DropTarget>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {choices.map((d) => (
            <DigitTile key={d} variant="drag" digit={d} dragId={`tff-digit-${d}`} size="md" />
          ))}
        </div>
      </div>
    </DndContext>
  )
}
