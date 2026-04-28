// WordAssemblyExercise — ćwiczenie Płomyk: ułóż słowo z sylab przez drag-and-drop.
// Phase 6.4: DndContext z @dnd-kit/core, useDragSyllable do walidacji.

import { useState, useMemo, useEffect } from 'react'
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  useDraggable,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { useDragSyllable } from '../../hooks/useDragSyllable'
import { SyllableTile } from '../SyllableTile'
import { DropSlot } from '../DropSlot'

export type WordAssemblyExerciseProps = {
  targetWord: string
  syllables: string[]
  distractors: string[]
  onComplete: () => void
  onDropError: () => void
  onDontKnow: () => void
  onAudioRepeat: () => void
}

const audioBtnStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: '50%',
  background: '#6366f1',
  color: 'white',
  fontSize: 36,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

const dkBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 16,
  background: '#fef3c7',
  border: '2px solid #f59e0b',
  fontSize: 24,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

type DraggableSyllableProps = {
  syllable: string
  idSuffix: number
}

function DraggableSyllable({ syllable, idSuffix }: DraggableSyllableProps) {
  const id = `syl-${syllable}-${idSuffix}`
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { syllable },
  })
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <SyllableTile syllable={syllable} />
    </div>
  )
}

export function WordAssemblyExercise({
  syllables,
  distractors,
  onComplete,
  onDropError,
  onDontKnow,
  onAudioRepeat,
}: WordAssemblyExerciseProps) {
  const allSyllables = useMemo(() => {
    const combined = [...syllables, ...distractors]
    // Losowe przetasowanie przy pierwszym renderze i przy zmianie pytania
    return combined.slice().sort(() => Math.random() - 0.5)
  }, [syllables, distractors])

  const [filledSlots, setFilledSlots] = useState<(string | null)[]>(() =>
    Array(syllables.length).fill(null),
  )
  const [available, setAvailable] = useState<string[]>(() => allSyllables)

  // Reset gdy zmienia się pytanie (nowe syllables)
  useEffect(() => {
    setFilledSlots(Array(syllables.length).fill(null))
    setAvailable(allSyllables)
  }, [allSyllables, syllables.length])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
  )

  const { onDragEnd: handleDragEnd } = useDragSyllable({
    slots: syllables,
    onDropCorrect: ({ slotIndex, syllable }) => {
      setFilledSlots((prev) => {
        // Slot już wypełniony — zignoruj
        if (prev[slotIndex] !== null) return prev
        const next = [...prev]
        next[slotIndex] = syllable
        if (next.every((s) => s !== null)) {
          // Defer żeby render zdążył pokazać ostatni drop
          setTimeout(() => onComplete(), 100)
        }
        return next
      })
      setAvailable((prev) => {
        const idx = prev.indexOf(syllable)
        if (idx === -1) return prev
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
      })
    },
    onDropIncorrect: () => onDropError(),
  })

  const onDragEnd = (event: DragEndEvent) => handleDragEnd(event)

  const audioHandlers = useTapHandler({ onTap: onAudioRepeat })
  const dkHandlers = useTapHandler({ onTap: onDontKnow })

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div
        data-testid="word-assembly-exercise"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 16,
        }}
      >
        <button
          type="button"
          aria-label="Powtórz audio"
          style={audioBtnStyle}
          {...audioHandlers}
        >
          🔊
        </button>

        {/* Sloty docelowe */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {syllables.map((_, i) => (
            <DropSlot
              key={i}
              index={i}
              filled={filledSlots[i] !== null}
              syllable={filledSlots[i] ?? ''}
            />
          ))}
        </div>

        {/* Rozsypane sylaby do przeciągania */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
            maxWidth: 600,
          }}
        >
          {available.map((s, i) => (
            <DraggableSyllable key={`${s}-${i}`} syllable={s} idSuffix={i} />
          ))}
        </div>

        <button
          type="button"
          aria-label="Nie wiem"
          style={dkBtnStyle}
          {...dkHandlers}
        >
          🤷
        </button>
      </div>
    </DndContext>
  )
}
