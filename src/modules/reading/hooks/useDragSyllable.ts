// useDragSyllable — wrapper na @dnd-kit's onDragEnd dla ćwiczenia word-assembly (Płomyk).
// Waliduje drop: sprawdza czy sylaba trafiła w prawy slot.
// onDropCorrect — trafiła; onDropIncorrect — nie trafiła (błędny slot lub poza targetem).

import { useCallback } from 'react'
import type { DragEndEvent } from '@dnd-kit/core'

type Args = {
  slots: string[]                          // oczekiwane sylaby w slotach, np. ['MA', 'MA']
  onDropCorrect: (args: { slotIndex: number; syllable: string }) => void
  onDropIncorrect: () => void
}

type Hook = {
  onDragEnd: (event: DragEndEvent) => void
}

// Parsuje sylabę z active.id — fallback gdy data.current nie ma syllable.
// Format id: 'syl-MA-1' → 'MA'
function parseSyllableFromId(activeId: string | number): string | null {
  const id = String(activeId)
  // Format: syl-{SYLLABLE}-{index}
  const match = /^syl-(.+)-\d+$/.exec(id)
  if (match?.[1]) return match[1]
  // Format: syl-{SYLLABLE} (bez indeksu)
  const matchSimple = /^syl-(.+)$/.exec(id)
  if (matchSimple?.[1]) return matchSimple[1]
  return null
}

export function useDragSyllable({ slots, onDropCorrect, onDropIncorrect }: Args): Hook {
  const onDragEnd = useCallback(
    (event: DragEndEvent): void => {
      // Brak targetu drop — poza slotami
      if (!event.over) {
        onDropIncorrect()
        return
      }

      const overId = String(event.over.id)
      // Sprawdź format: 'slot-{index}'
      const slotMatch = /^slot-(\d+)$/.exec(overId)
      if (!slotMatch) {
        onDropIncorrect()
        return
      }

      const slotIndex = parseInt(slotMatch[1] ?? '0', 10)
      const expectedSyllable = slots[slotIndex]

      // Slot out of bounds
      if (expectedSyllable === undefined) {
        onDropIncorrect()
        return
      }

      // Pobierz sylabę z data.current lub z active.id (fallback)
      const activeData = event.active.data?.current as { syllable?: string } | null | undefined
      const droppedSyllable =
        activeData?.syllable ?? parseSyllableFromId(event.active.id)

      if (!droppedSyllable) {
        onDropIncorrect()
        return
      }

      if (droppedSyllable === expectedSyllable) {
        onDropCorrect({ slotIndex, syllable: droppedSyllable })
      } else {
        onDropIncorrect()
      }
    },
    [slots, onDropCorrect, onDropIncorrect],
  )

  return { onDragEnd }
}
