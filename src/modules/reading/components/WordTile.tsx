// WordTile — kafelek z pełnym słowem do ćwiczeń czytania.
// Sylaby kolorowane wg pozycji (paleta z syllableColors) — dziecko widzi
// gdzie kończy się jedna sylaba a zaczyna następna.

import type { CSSProperties } from 'react'
import { useTapHandler } from '@/shared/ui/useTapHandler'
import { getSyllableColor } from '../utils/syllableColors'

export type WordTileState = 'idle' | 'correct' | 'wrong' | 'highlighted'

export type WordTileProps = {
  word: string
  syllables?: string[]
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

function fontSizeForWord(word: string): number {
  return word.length > 5 ? 28 : 32
}

export function WordTile({ word, syllables, state = 'idle', onTap }: WordTileProps) {
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

  // W stanach correct/wrong/highlighted używamy jednolitego koloru dla czytelności
  // (background już niesie semantykę). Kolory sylab tylko w stanie idle.
  const showSyllableColors = state === 'idle' && syllables && syllables.length > 0

  return (
    <button
      type="button"
      aria-label={`słowo ${word}`}
      style={{ ...baseStyle, ...stateStyle(state) }}
      {...(onTap ? handlers : {})}
    >
      {showSyllableColors ? (
        <span aria-hidden="true">
          {syllables.map((syl, i) => (
            <span key={i} style={{ color: getSyllableColor(i) }}>
              {syl}
            </span>
          ))}
        </span>
      ) : (
        word
      )}
    </button>
  )
}
