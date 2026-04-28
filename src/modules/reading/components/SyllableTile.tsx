// SyllableTile — kafelek z sylabą do ćwiczeń czytania.
// Sekcja Phase 5.1 planu: min 100×80, Lexend, obsługuje drag (forwardRef).

import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type SyllableTileState = 'idle' | 'correct' | 'wrong' | 'highlighted'

export type SyllableTileProps = {
  syllable: string
  selected?: boolean
  state?: SyllableTileState
  onTap?: () => void
}

function stateStyle(state: SyllableTileState): CSSProperties {
  switch (state) {
    case 'idle':
      return { background: '#fef9f2', borderColor: '#d1d5db' }
    case 'correct':
      return { background: '#d1fae5', borderColor: '#10b981' }
    case 'wrong':
      return { background: '#fee2e2', borderColor: '#ef4444' }
    case 'highlighted':
      return { background: '#fef3c7', borderColor: '#f59e0b' }
  }
}

export const SyllableTile = forwardRef<HTMLButtonElement, SyllableTileProps>(
  function SyllableTile({ syllable, selected = false, state = 'idle', onTap }, ref) {
    const handlers = useTapHandler({ onTap: onTap ?? (() => undefined) })

    const baseStyle: CSSProperties = {
      minWidth: 100,
      minHeight: 80,
      border: '3px solid',
      borderRadius: 12,
      fontFamily: 'var(--font-block)',
      fontWeight: 700,
      fontSize: 32,
      letterSpacing: '0.05em',
      color: '#2d2d33',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: onTap ? 'pointer' : 'default',
      transition: 'all 0.18s ease',
      transform: selected ? 'scale(1.08)' : 'scale(1)',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      padding: '8px 16px',
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label={`sylaba ${syllable}`}
        style={{ ...baseStyle, ...stateStyle(state) }}
        {...(onTap ? handlers : {})}
      >
        {syllable}
      </button>
    )
  },
)
