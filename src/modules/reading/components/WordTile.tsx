// WordTile — kafelek z pełnym słowem do ćwiczeń czytania.
// Sekcja Phase 5.2 planu: min 140×60, Lexend, auto-scale fontu.

import type { CSSProperties } from 'react'
import { useTapHandler } from '@/shared/ui/useTapHandler'

export type WordTileState = 'idle' | 'correct' | 'wrong' | 'highlighted'

export type WordTileProps = {
  word: string
  state?: WordTileState
  onTap?: () => void
}

function stateStyle(state: WordTileState): CSSProperties {
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

// Długie słowa (>5 znaków) dostają mniejszy font żeby zmieścić się w kafelku.
function fontSizeForWord(word: string): number {
  return word.length > 5 ? 28 : 32
}

export function WordTile({ word, state = 'idle', onTap }: WordTileProps) {
  const handlers = useTapHandler({ onTap: onTap ?? (() => undefined) })

  const baseStyle: CSSProperties = {
    minWidth: 140,
    minHeight: 60,
    border: '3px solid',
    borderRadius: 12,
    fontFamily: 'var(--font-block)',
    fontWeight: 700,
    fontSize: fontSizeForWord(word),
    letterSpacing: '0.05em',
    color: '#2d2d33',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onTap ? 'pointer' : 'default',
    transition: 'all 0.18s ease',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    padding: '8px 16px',
  }

  return (
    <button
      type="button"
      aria-label={`słowo ${word}`}
      style={{ ...baseStyle, ...stateStyle(state) }}
      {...(onTap ? handlers : {})}
    >
      {word}
    </button>
  )
}
