// DropTarget — wspólne pole upuszczania kafelka w ćwiczeniach Cyferek.
//
// Trzynaście ćwiczeń miało własną, identyczną kopię tego komponentu; różniły
// się wyłącznie rozmiarem, promieniem rogów i id droppable'a. Jedno źródło
// oznacza, że poprawka afordancji (kolor „upuść tutaj", grubość ramki) trafia
// od razu do wszystkich ćwiczeń.

import type { CSSProperties, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'

export type DropTargetProps = {
  /** Id droppable'a — musi zgadzać się z `event.over?.id` w `onDragEnd`. */
  droppableId: string
  children: ReactNode
  /** min-width / min-height pola (px). */
  minSize?: number
  /** Sztywny width/height zamiast minimalnego (rytm liczbowy). */
  fixedSize?: number
  borderRadius?: CSSProperties['borderRadius']
}

export function DropTarget({
  droppableId,
  children,
  minSize = 160,
  fixedSize,
  borderRadius = 16,
}: DropTargetProps) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const size: CSSProperties =
    fixedSize !== undefined
      ? { width: fixedSize, height: fixedSize }
      : { minWidth: minSize, minHeight: minSize }
  return (
    <div
      ref={setNodeRef}
      data-testid="drop-target"
      style={{
        ...size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `4px dashed ${isOver ? '#16a34a' : '#cbd5e1'}`,
        borderRadius,
        background: isOver ? '#dcfce7' : '#fff',
        transition: 'background 120ms',
      }}
    >
      {children}
    </div>
  )
}
