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
  payload: { args: number[]; conceptId?: ConceptId; factId?: string }
  promptKeys: string[]
  onAnswer: (outcome: AnswerOutcome, chosenValue?: number) => void
  /** Faza drugiej próby: dokładnie te dwie wartości zamiast dystraktorów. */
  restrictChoicesTo?: number[]
  /** Feedback po pomyłce: pokaż POPRAWNĄ liczbę kropek zamiast „?". */
  revealValue?: number | null
}

const FLASH_MS = 2000
const DROP_TARGET_ID = 'subitize-target'

/** FNV-1a — stabilne ziarno układu kropek z id faktu. */
function hashFactId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

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
  // Ziarno z id faktu zamiast Math.random: układ jest stały dla tego samego
  // pytania (także po odsłonięciu korekty), a nie losowany przy każdym mouncie.
  const seed = hashFactId(payload.factId ?? `subitize-${correct}`)
  // DotPattern zna układ 'dice' tylko do 6 — powyżej wymuszamy scattered.
  const pattern: 'dice' | 'scattered' = correct > 6 || seed % 5 >= 3 ? 'scattered' : 'dice'

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
            <DotPattern count={revealValue ?? correct} pattern={pattern} size={200} seed={seed} />
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
