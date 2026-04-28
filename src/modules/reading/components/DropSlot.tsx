// DropSlot — slot docelowy dla drag-and-drop sylab.
// Sekcja Phase 5.3 planu: useDroppable z @dnd-kit/core, 100×80.

import type { CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { getSyllableColor } from '../utils/syllableColors'

export type DropSlotState = 'empty' | 'filled' | 'wrong'

export type DropSlotProps = {
  index: number
  filled?: boolean
  syllable?: string
  state?: DropSlotState
}

function slotStyle(state: DropSlotState, isOver: boolean): CSSProperties {
  const base: CSSProperties = {
    width: 100,
    height: 80,
    minWidth: 100,
    minHeight: 80,
    borderRadius: 12,
    fontFamily: 'var(--font-block)',
    fontSize: 32,
    fontWeight: 700,
    color: '#2d2d33',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    letterSpacing: '0.05em',
  }

  if (isOver) {
    return {
      ...base,
      border: '3px solid #f59e0b',
      background: 'rgba(245, 158, 11, 0.12)',
      transform: 'scale(1.08)',
    }
  }

  switch (state) {
    case 'empty':
      return {
        ...base,
        border: '3px dashed #9ca3af',
        background: 'rgba(254, 249, 242, 0.6)',
      }
    case 'filled':
      return {
        ...base,
        border: '3px solid #d1d5db',
        background: '#fef9f2',
      }
    case 'wrong':
      return {
        ...base,
        border: '3px solid #ef4444',
        background: '#fee2e2',
      }
  }
}

export function DropSlot({ index, filled = false, syllable, state = 'empty' }: DropSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` })

  const resolvedState: DropSlotState = filled ? state || 'filled' : state
  const textColor = filled && resolvedState === 'filled' ? getSyllableColor(index) : undefined

  return (
    <div
      ref={setNodeRef}
      data-testid={`drop-slot-${index}`}
      aria-label={filled && syllable ? `slot ${index + 1}: ${syllable}` : `pusty slot ${index + 1}`}
      style={{ ...slotStyle(resolvedState, isOver), ...(textColor ? { color: textColor } : {}) }}
    >
      {syllable ?? ''}
    </div>
  )
}
