import { useEffect, useMemo, useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SILENT_DND_ACCESSIBILITY } from '@/shared/ui/dndAccessibility'
import type { AudioBus } from '@/shared/audio/AudioBus'
import { DotPattern } from '../representations/DotPattern'
import { DigitTile } from '../representations/DigitTile'
import type { AnswerOutcome, ConceptId } from '../../types'
import { buildChoices, NEAR_MISS_OFFSETS } from '../../utils/buildChoices'
import { DropTarget } from './shared/DropTarget'
import { clamp } from '../../utils/clamp'

type Props = {
  audioBus: Pick<AudioBus, 'play' | 'stop'>
  payload: { args: number[]; conceptId?: ConceptId }
  promptKeys: string[]
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  /** Faza drugiej próby: dokładnie te dwie wartości zamiast dystraktorów. */
  restrictChoicesTo?: number[]
  /** Feedback po pomyłce: pokaż POPRAWNĄ liczbę kropek zamiast „?". */
  revealValue?: number | null
}

const FLASH_MS = 2000
const DROP_TARGET_ID = 'subitize-target'

export function SubitizeFlashExercise({
  audioBus,
  payload,
  promptKeys,
  onAnswer,
  restrictChoicesTo,
  revealValue = null,
}: Props) {
  // Liczenie do 10 może iść tym samym ćwiczeniem co subitizing do 6 — zakres
  // odpowiedzi musi iść za konceptem, inaczej „ile kropek: 8" nie ma kafelka.
  const maxN = payload.conceptId === 'iskierka-counting-10' ? 10 : 6
  const correct = clamp(payload.args[0] ?? 1, 1, maxN)
  const [phase, setPhase] = useState<'flash' | 'answer'>('flash')
  // DotPattern zna układ 'dice' tylko do 6 — powyżej wymuszamy scattered.
  // Losujemy raz na mount: układ nie może się zmienić w trakcie pytania.
  const [pattern] = useState<'dice' | 'scattered'>(() =>
    correct > 6 || Math.random() >= 0.6 ? 'scattered' : 'dice',
  )

  useEffect(() => {
    for (const key of promptKeys) void audioBus.play(key)
    const t = setTimeout(() => setPhase('answer'), FLASH_MS)
    return () => clearTimeout(t)
  }, [audioBus, promptKeys])

  const choices = useMemo(
    () =>
      buildChoices(correct, {
        restrictChoicesTo,
        min: 1,
        max: maxN,
        offsets: NEAR_MISS_OFFSETS,
      }),
    [correct, maxN, restrictChoicesTo],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.over?.id !== DROP_TARGET_ID) return
    const dropped = event.active.data.current?.['digit'] as number | undefined
    if (dropped === undefined) return
    onAnswer(dropped === correct ? 'correct' : 'wrong', dropped)
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
          {phase === 'flash' || revealValue !== null ? (
            <DotPattern count={revealValue ?? correct} pattern={pattern} size={200} />
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
